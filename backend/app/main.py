"""Servidor SocialBotGuard: FastAPI + Socket.IO.

El tráfico es sintético y local. No hay conexión con redes sociales reales.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

import socketio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.estado import Estado, sanitizar_nombre
from app.persistencia import Bitacora
from app.servicio import Servicio

RAIZ = Path(__file__).resolve().parents[1]
DIST = RAIZ.parent / "frontend" / "dist"


def _ruta_sqlite() -> Path | None:
    if os.environ.get("SOCIALBOTGUARD_SIN_SQLITE") == "1":
        return None
    return RAIZ / "data" / "eventos.sqlite"


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", logger=False, engineio_logger=False)
estado = Estado(bitacora=Bitacora(_ruta_sqlite()))
servicio = Servicio(sio, estado)


@asynccontextmanager
async def _vida(app: FastAPI):
    await servicio.arrancar(con_trafico_humano=os.environ.get("SOCIALBOTGUARD_SIN_TRAFICO") != "1")
    yield
    await servicio.detener()


fastapi_app = FastAPI(title="SocialBotGuard", lifespan=_vida)


@fastapi_app.get("/api/salud")
def salud() -> dict:
    return {"ok": True, "servicio": "SocialBotGuard"}


@fastapi_app.get("/api/estado")
def api_estado() -> dict:
    return servicio.snapshot()


def _datos(data) -> dict:
    return data if isinstance(data, dict) else {}


@sio.event
async def connect(sid, environ):
    async with servicio.lock:
        foto = servicio.snapshot()
    await sio.emit("estado", foto, to=sid)


@sio.on("comentario")
async def comentario(sid, data):
    datos = _datos(data)
    await servicio.comentar(str(datos.get("usuario") or ""), str(datos.get("texto") or ""))


@sio.on("simular_ataque")
async def simular_ataque(sid, data):
    datos = _datos(data)
    try:
        cantidad = int(datos.get("cantidad_bots", 6))
        intensidad = str(datos.get("intensidad", "media"))
    except (TypeError, ValueError):
        await sio.emit("error_usuario", {"mensaje": "La cantidad de bots no es un número."}, to=sid)
        return
    if intensidad not in ("baja", "media", "alta"):
        await sio.emit("error_usuario", {"mensaje": "La intensidad debe ser baja, media o alta."}, to=sid)
        return
    if not 1 <= cantidad <= 30:
        await sio.emit("error_usuario", {"mensaje": "La cantidad de bots debe estar entre 1 y 30."}, to=sid)
        return
    await servicio.simular_ataque(cantidad, intensidad)


@sio.on("detener_ataque")
async def detener_ataque(sid, data=None):
    await servicio.detener_ataque()
    async with servicio.lock:
        estadisticas = servicio.estadisticas()
    await sio.emit("estadisticas", estadisticas)


@sio.on("bloquear")
async def bloquear(sid, data):
    datos = _datos(data)
    nombre = sanitizar_nombre(str(datos.get("usuario") or ""))
    await servicio.bloquear(nombre)


@sio.on("desbloquear")
async def desbloquear(sid, data):
    datos = _datos(data)
    nombre = sanitizar_nombre(str(datos.get("usuario") or ""))
    await servicio.desbloquear(nombre)


@sio.on("configurar_umbrales")
async def configurar_umbrales(sid, data):
    try:
        await servicio.configurar(_datos(data))
    except ValueError as exc:
        await sio.emit("error_usuario", {"mensaje": str(exc)}, to=sid)


@sio.on("reiniciar")
async def reiniciar(sid, data=None):
    await servicio.reiniciar()


if DIST.exists():
    fastapi_app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
