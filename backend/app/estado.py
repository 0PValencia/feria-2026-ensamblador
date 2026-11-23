"""Historial por usuario, clasificación y estadísticas en memoria."""

from __future__ import annotations

import re
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from difflib import SequenceMatcher

from app.configuracion import Umbrales, umbrales_desde
from app.detector import (
    RAZON_MANTENIDO,
    analizar,
    clasificar,
    normalizar,
)
from app.persistencia import Bitacora
from app.simulador import BOTS, HUMANOS, MENSAJES_HUMANOS

_NOMBRE = re.compile(r"\s+")
PAUSA_MINIMA_HUMANO = 2.2


def sanitizar_nombre(valor: str | None) -> str:
    limpio = _NOMBRE.sub(" ", (valor or "").strip())
    limpio = "".join(c for c in limpio if c.isalnum() or c in " _.-")
    limpio = limpio[:24].strip(" .-_")
    return limpio or "Visitante"


def sanitizar_texto(valor: str | None) -> str:
    return (valor or "").replace("\x00", "").strip()[:500]


def separar_visitante(nombre: str) -> str:
    """Evita que un visitante de la feria comparta historial con una cuenta sintética."""
    if nombre in HUMANOS or nombre in BOTS:
        return f"{nombre} visitante"[:24]
    return nombre


@dataclass
class Usuario:
    nombre: str
    origen: str
    textos: deque = field(default_factory=deque)
    tiempos: deque = field(default_factory=deque)
    evaluaciones: deque = field(default_factory=deque)
    t_primer: float | None = None
    t_detectado: float | None = None
    mensajes: int = 0
    clasificacion: str = "real"
    riesgo: int = 0


class Estado:
    def __init__(self, umbrales: Umbrales | None = None, bitacora: Bitacora | None = None):
        self.umbrales = umbrales or Umbrales()
        self.bitacora = bitacora
        self._secuencia = 0
        self._reiniciar_estructuras()

    def _reiniciar_estructuras(self) -> None:
        self.usuarios: dict[str, Usuario] = {}
        self.bloqueados: set[str] = set()
        self.muro: deque = deque(maxlen=200)
        self.procesados = 0
        self.descartados = 0
        self.marcas: deque = deque()
        self.riesgos_recientes: deque = deque()
        self.tiempos_analisis: deque = deque(maxlen=200)
        self.serie_mps: deque = deque(maxlen=60)
        self.serie_riesgo: deque = deque(maxlen=60)
        self.cursor_humano = {nombre: 0 for nombre in HUMANOS}
        self.ultimo_aviso_descarte = -1e18

    def reiniciar(self) -> None:
        self._reiniciar_estructuras()
        if self.bitacora is not None:
            self.bitacora.vaciar()

    def configurar(self, datos: dict) -> Umbrales:
        self.umbrales = umbrales_desde(self.umbrales, datos)
        return self.umbrales

    def bloquear(self, nombre: str) -> bool:
        if nombre not in self.usuarios and nombre not in self.bloqueados:
            return False
        self.bloqueados.add(nombre)
        return True

    def desbloquear(self, nombre: str) -> bool:
        if nombre not in self.bloqueados:
            return False
        self.bloqueados.discard(nombre)
        return True

    def _usuario(self, nombre: str, origen: str) -> Usuario:
        usuario = self.usuarios.get(nombre)
        if usuario is None:
            usuario = Usuario(nombre=nombre, origen=origen)
            self.usuarios[nombre] = usuario
        return usuario

    def siguiente_humano(self, ahora: float) -> tuple[str, str] | None:
        elegido = None
        marca = None
        for nombre in HUMANOS:
            usuario = self.usuarios.get(nombre)
            ultima = usuario.tiempos[-1] if usuario and usuario.tiempos else -1e18
            if ahora - ultima < PAUSA_MINIMA_HUMANO:
                continue
            if marca is None or ultima < marca:
                elegido = nombre
                marca = ultima
        if elegido is None:
            return None
        texto = self._mensaje_humano(elegido)
        if texto is None:
            return None
        return elegido, texto

    def _mensaje_humano(self, nombre: str) -> str | None:
        usuario = self.usuarios.get(nombre)
        ultimo = usuario.textos[-1] if usuario and usuario.textos else None
        inicio = self.cursor_humano.get(nombre, 0)
        total = len(MENSAJES_HUMANOS)
        for desplazamiento in range(total):
            indice = (inicio + desplazamiento) % total
            candidato = MENSAJES_HUMANOS[indice]
            norm = normalizar(candidato)
            if ultimo is not None and SequenceMatcher(None, norm, ultimo).ratio() > 0.8:
                continue
            self.cursor_humano[nombre] = indice + 1
            return candidato
        return None

    def procesar(
        self,
        nombre: str,
        texto: str,
        origen: str,
        ahora: float | None = None,
    ) -> dict | None:
        texto = sanitizar_texto(texto)
        if not texto:
            return None
        ahora = time.monotonic() if ahora is None else ahora
        if nombre in self.bloqueados:
            self.descartados += 1
            avisar = ahora - self.ultimo_aviso_descarte >= 2
            if avisar:
                self.ultimo_aviso_descarte = ahora
            self._registrar(nombre, origen, texto, None, None, "", True)
            return {"descartado": True, "usuario": nombre, "avisar": avisar}

        t0 = time.perf_counter()
        usuario = self._usuario(nombre, origen)
        if usuario.t_primer is None:
            usuario.t_primer = ahora

        norm = normalizar(texto)
        previos = list(usuario.textos)
        usuario.textos.append(norm)
        while len(usuario.textos) > self.umbrales.historial_max:
            usuario.textos.popleft()

        usuario.tiempos.append(ahora)
        while usuario.tiempos and ahora - usuario.tiempos[0] > self.umbrales.ventana_segundos:
            usuario.tiempos.popleft()

        cruda = analizar(texto, previos, len(usuario.tiempos), self.umbrales)
        usuario.evaluaciones.append((ahora, cruda))
        while (
            usuario.evaluaciones
            and ahora - usuario.evaluaciones[0][0] > self.umbrales.ventana_observacion
        ):
            usuario.evaluaciones.popleft()

        _ts, pico = max(usuario.evaluaciones, key=lambda item: item[1].riesgo)
        mantenido = pico.riesgo > cruda.riesgo
        elegida = pico if mantenido else cruda
        razones = list(elegida.razones)
        if mantenido:
            razones = [RAZON_MANTENIDO, *razones]

        clasificacion, etiqueta = clasificar(elegida.riesgo, self.umbrales)
        usuario.clasificacion = clasificacion
        usuario.riesgo = elegida.riesgo
        usuario.mensajes += 1
        if clasificacion == "bot" and usuario.t_detectado is None:
            usuario.t_detectado = ahora

        self.tiempos_analisis.append((time.perf_counter() - t0) * 1000)
        self.procesados += 1
        self.marcas.append(ahora)
        while self.marcas and ahora - self.marcas[0] > 60:
            self.marcas.popleft()
        self.riesgos_recientes.append((ahora, elegida.riesgo))
        while self.riesgos_recientes and ahora - self.riesgos_recientes[0][0] > 60:
            self.riesgos_recientes.popleft()

        self._secuencia += 1
        publico = {
            "id": self._secuencia,
            "usuario": nombre,
            "origen": usuario.origen,
            "texto": texto,
            "hora": datetime.now().strftime("%H:%M:%S"),
            "riesgo": elegida.riesgo,
            "riesgo_mensaje": cruda.riesgo,
            "clasificacion": clasificacion,
            "etiqueta": etiqueta,
            "razones": razones,
            "mantenido": mantenido,
            "reglas": elegida.reglas(),
            "procesamiento_ms": round(self.tiempos_analisis[-1], 3),
        }
        self.muro.append(publico)
        self._registrar(
            nombre,
            usuario.origen,
            texto,
            elegida.riesgo,
            clasificacion,
            " | ".join(razones),
            False,
        )
        return publico

    def _registrar(
        self,
        nombre: str,
        origen: str,
        texto: str,
        riesgo: int | None,
        clasificacion: str | None,
        razones: str,
        descartado: bool,
    ) -> None:
        if self.bitacora is None:
            return
        self.bitacora.registrar(
            datetime.now().isoformat(timespec="seconds"),
            nombre,
            origen,
            texto,
            riesgo,
            clasificacion,
            razones,
            descartado,
        )

    def cerrar_segundo(self, ahora: float | None = None) -> None:
        ahora = time.monotonic() if ahora is None else ahora
        riesgos = [riesgo for marca, riesgo in self.riesgos_recientes if ahora - marca <= 1]
        promedio = round(sum(riesgos) / len(riesgos), 1) if riesgos else 0
        self.serie_mps.append(self._mps(ahora))
        self.serie_riesgo.append(promedio)

    def _mps(self, ahora: float) -> int:
        return sum(1 for marca in self.marcas if ahora - marca <= 1)

    def resumen(self, ahora: float | None = None) -> dict:
        ahora = time.monotonic() if ahora is None else ahora
        activos = [
            usuario
            for usuario in self.usuarios.values()
            if usuario.nombre not in self.bloqueados and usuario.mensajes > 0
        ]
        reales = sum(1 for usuario in activos if usuario.clasificacion == "real")
        sospechosos = sum(1 for usuario in activos if usuario.clasificacion == "sospechoso")
        bots_activos = sum(1 for usuario in activos if usuario.clasificacion == "bot")
        bots = [usuario for usuario in self.usuarios.values() if usuario.origen == "bot" and usuario.mensajes > 0]
        bots_marcados = sum(1 for usuario in bots if usuario.t_detectado is not None)
        bots_bloqueados = sum(
            1
            for nombre in self.bloqueados
            if nombre in self.usuarios and self.usuarios[nombre].origen == "bot"
        )
        base_grafico = reales + bots_bloqueados
        latencias = [
            usuario.t_detectado - usuario.t_primer
            for usuario in self.usuarios.values()
            if usuario.t_detectado is not None and usuario.t_primer is not None
        ]
        return {
            "comentarios_procesados": self.procesados,
            "mensajes_descartados": self.descartados,
            "usuarios_reales": reales,
            "usuarios_sospechosos": sospechosos,
            "usuarios_bot": bots_activos,
            "cuentas_bloqueadas": len(self.bloqueados),
            "bots_bloqueados": bots_bloqueados,
            "bots_evaluados": len(bots),
            "bots_marcados": bots_marcados,
            "tasa_deteccion": round(bots_marcados / len(bots), 4) if bots else 0,
            "mensajes_por_segundo": self._mps(ahora),
            "tiempo_analisis_ms": round(
                sum(self.tiempos_analisis) / len(self.tiempos_analisis), 3
            )
            if self.tiempos_analisis
            else 0,
            "tiempo_deteccion_s": round(sum(latencias) / len(latencias), 3) if latencias else None,
            "porcentaje_reales": round(100 * reales / base_grafico, 1) if base_grafico else 0,
            "porcentaje_bots_bloqueados": round(100 * bots_bloqueados / base_grafico, 1)
            if base_grafico
            else 0,
            "serie_mps": list(self.serie_mps),
            "serie_riesgo": list(self.serie_riesgo),
            "bloqueados": sorted(self.bloqueados),
        }

    def comentarios(self) -> list[dict]:
        return list(reversed(self.muro))
