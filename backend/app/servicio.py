"""Bucles del tráfico sintético y difusión de eventos por Socket.IO."""

from __future__ import annotations

import asyncio
import logging
import random
import time

from app.estado import Estado, sanitizar_nombre, sanitizar_texto, separar_visitante
from app.simulador import BOTS, PLANTILLAS, RITMO_ATAQUE, variar

log = logging.getLogger("socialbotguard")


class Servicio:
    def __init__(self, sio, estado: Estado):
        self.sio = sio
        self.estado = estado
        self.lock = asyncio.Lock()
        self._vivo = False
        self.trafico_humano = True
        self.ataque_activo = False
        self.intensidad: str | None = None
        self.cantidad_bots = 0
        self._parar_bots = asyncio.Event()
        self.tarea_humana: asyncio.Task | None = None
        self.tarea_bots: asyncio.Task | None = None
        self.tarea_series: asyncio.Task | None = None
        self._ultima_emision = 0.0
        self._emision_programada: asyncio.Task | None = None

    async def arrancar(self, con_trafico_humano: bool) -> None:
        self._vivo = True
        self.trafico_humano = con_trafico_humano
        if con_trafico_humano:
            self.tarea_humana = asyncio.create_task(self._bucle_humano())
        self.tarea_series = asyncio.create_task(self._bucle_series())

    async def detener(self) -> None:
        self._vivo = False
        await self.detener_ataque()
        for tarea in (self.tarea_humana, self.tarea_series, self._emision_programada):
            if tarea is not None:
                tarea.cancel()
        for tarea in (self.tarea_humana, self.tarea_series, self._emision_programada):
            if tarea is None:
                continue
            try:
                await tarea
            except asyncio.CancelledError:
                pass
        self.tarea_humana = None
        self.tarea_series = None
        self._emision_programada = None

    def _extra(self) -> dict:
        return {
            "ataque_activo": self.ataque_activo,
            "intensidad": self.intensidad,
            "cantidad_bots": self.cantidad_bots,
            "trafico_humano": self.trafico_humano,
        }

    def estadisticas(self) -> dict:
        return {**self.estado.resumen(), **self._extra()}

    def snapshot(self) -> dict:
        return {
            "comentarios": self.estado.comentarios(),
            "estadisticas": self.estadisticas(),
            "umbrales": self.estado.umbrales.como_dict(),
            "ritmos": RITMO_ATAQUE,
        }

    async def procesar_y_emitir(self, nombre: str, texto: str, origen: str) -> None:
        async with self.lock:
            evento = self.estado.procesar(nombre, texto, origen)
            estadisticas = self.estadisticas()
        if evento is None:
            return
        if evento.get("descartado"):
            if evento.get("avisar"):
                await self.sio.emit("descartado", {"usuario": evento["usuario"]})
        else:
            await self.sio.emit("comentario", evento)
        await self._publicar_estadisticas(estadisticas)

    async def _publicar_estadisticas(self, estadisticas: dict, forzar: bool = False) -> None:
        ahora = time.monotonic()
        espera = 0.25 - (ahora - self._ultima_emision)
        if not forzar and espera > 0:
            if self._emision_programada is None or self._emision_programada.done():
                self._emision_programada = asyncio.create_task(self._emitir_luego(espera))
            return
        self._ultima_emision = time.monotonic()
        await self.sio.emit("estadisticas", estadisticas)

    async def _emitir_luego(self, espera: float) -> None:
        try:
            await asyncio.sleep(max(espera, 0))
            async with self.lock:
                estadisticas = self.estadisticas()
            self._ultima_emision = time.monotonic()
            await self.sio.emit("estadisticas", estadisticas)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("No se pudieron emitir las estadísticas")

    async def _bucle_humano(self) -> None:
        while self._vivo:
            try:
                await asyncio.sleep(random.uniform(0.9, 1.4))
                if not self._vivo or not self.trafico_humano:
                    continue
                async with self.lock:
                    elegido = self.estado.siguiente_humano(time.monotonic())
                if elegido is None:
                    continue
                nombre, texto = elegido
                await self.procesar_y_emitir(nombre, texto, "humano")
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Fallo el generador de usuarios reales")

    async def _bucle_series(self) -> None:
        while self._vivo:
            try:
                await asyncio.sleep(1)
                if not self._vivo:
                    break
                async with self.lock:
                    self.estado.cerrar_segundo()
                    estadisticas = self.estadisticas()
                await self.sio.emit("estadisticas", estadisticas)
                self._ultima_emision = time.monotonic()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Fallo la serie de estadísticas")

    async def _bucle_bots(self, nombres: list[str], plantillas: dict[str, str], por_segundo: int) -> None:
        intervalo = 1 / por_segundo
        paso = 0
        try:
            while not self._parar_bots.is_set():
                nombre = nombres[paso % len(nombres)]
                texto = variar(plantillas[nombre], paso)
                await self.procesar_y_emitir(nombre, texto, "bot")
                paso += 1
                try:
                    await asyncio.wait_for(self._parar_bots.wait(), timeout=intervalo)
                    break
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Fallo el generador del ataque")
        async with self.lock:
            if self.tarea_bots is asyncio.current_task():
                self.ataque_activo = False
                self.tarea_bots = None

    async def simular_ataque(self, cantidad: int, intensidad: str) -> None:
        await self.detener_ataque()
        nombres = BOTS[:cantidad]
        plantillas = {nombre: PLANTILLAS[indice % len(PLANTILLAS)] for indice, nombre in enumerate(nombres)}
        ritmo = RITMO_ATAQUE[intensidad]
        async with self.lock:
            self._parar_bots = asyncio.Event()
            self.ataque_activo = True
            self.intensidad = intensidad
            self.cantidad_bots = cantidad
        self.tarea_bots = asyncio.create_task(self._bucle_bots(nombres, plantillas, ritmo))
        async with self.lock:
            estadisticas = self.estadisticas()
        await self.sio.emit("estadisticas", estadisticas)

    async def detener_ataque(self) -> None:
        self._parar_bots.set()
        tarea = self.tarea_bots
        if tarea is not None and tarea is not asyncio.current_task():
            try:
                await asyncio.wait_for(tarea, timeout=3)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                tarea.cancel()
        async with self.lock:
            self.ataque_activo = False
            self.intensidad = None
            self.cantidad_bots = 0

    async def comentar(self, nombre: str, texto: str) -> None:
        nombre = separar_visitante(sanitizar_nombre(nombre))
        await self.procesar_y_emitir(nombre, sanitizar_texto(texto), "visitante")

    async def bloquear(self, nombre: str) -> None:
        async with self.lock:
            hecho = self.estado.bloquear(sanitizar_nombre(nombre))
            estadisticas = self.estadisticas()
        if hecho:
            await self.sio.emit("estadisticas", estadisticas)

    async def desbloquear(self, nombre: str) -> None:
        async with self.lock:
            hecho = self.estado.desbloquear(sanitizar_nombre(nombre))
            estadisticas = self.estadisticas()
        if hecho:
            await self.sio.emit("estadisticas", estadisticas)

    async def configurar(self, datos: dict) -> dict:
        async with self.lock:
            umbrales = self.estado.configurar(datos)
            payload = umbrales.como_dict()
        await self.sio.emit("umbrales", payload)
        return payload

    async def reiniciar(self) -> None:
        await self.detener_ataque()
        async with self.lock:
            self.estado.reiniciar()
            foto = self.snapshot()
        await self.sio.emit("estado", foto)
