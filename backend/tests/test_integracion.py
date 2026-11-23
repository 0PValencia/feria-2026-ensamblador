import asyncio
import os
import threading
import time
import urllib.request

os.environ["SOCIALBOTGUARD_SIN_SQLITE"] = "1"
os.environ["SOCIALBOTGUARD_SIN_TRAFICO"] = "1"

import socketio
import uvicorn

from app.main import app

PUERTO = 8765
BASE = f"http://127.0.0.1:{PUERTO}"


class _Servidor(uvicorn.Server):
    def install_signal_handlers(self):
        return


def _esperar_salud() -> None:
    for _ in range(50):
        try:
            with urllib.request.urlopen(f"{BASE}/api/salud", timeout=0.3) as respuesta:
                if respuesta.status == 200:
                    return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("SocialBotGuard no respondió en /api/salud")


def test_flujo_de_socket_con_deteccion_y_bloqueo():
    config = uvicorn.Config(app, host="127.0.0.1", port=PUERTO, log_level="error")
    servidor = _Servidor(config)
    hilo = threading.Thread(target=servidor.run, daemon=True)
    hilo.start()
    try:
        _esperar_salud()
        asyncio.run(_escenario())
    finally:
        servidor.should_exit = True
        hilo.join(timeout=5)


async def _escenario() -> None:
    cliente = socketio.AsyncClient()
    cola = asyncio.Queue()
    bloqueados = asyncio.Event()

    @cliente.on("comentario")
    async def al_comentar(data):
        await cola.put(data)

    @cliente.on("descartado")
    async def al_descartar(data):
        await cola.put({"descartado": True, **data})

    @cliente.on("estadisticas")
    async def al_contar(data):
        if "Claudia" in data.get("bloqueados", []):
            bloqueados.set()

    await cliente.connect(BASE, transports=["websocket", "polling"])
    try:
        await cliente.emit(
            "comentario",
            {"usuario": "Claudia", "texto": "Hola, vengo a ver la feria de ingenieria"},
        )
        primero = await asyncio.wait_for(cola.get(), timeout=5)
        assert primero["clasificacion"] == "real"
        assert primero["etiqueta"] == "[Usuario Real]"
        assert primero["procesamiento_ms"] < 200

        plantilla = "GANA DINERO FÁCIL AQUÍ www.ejemplo.com www.ejemplo.com/promo"
        variantes = [
            plantilla,
            plantilla + "!!",
            plantilla + " 🔥",
            plantilla.replace("FÁCIL", "FASIL"),
        ]
        ultimo = None
        for texto in variantes:
            await cliente.emit("comentario", {"usuario": "Claudia", "texto": texto})
            ultimo = await asyncio.wait_for(cola.get(), timeout=5)
        assert ultimo["clasificacion"] == "bot"
        assert ultimo["riesgo"] == 100
        assert ultimo["etiqueta"] == "[BOT DETECTADO - 100 % Confianza]"
        assert "Mensajes enviados muy rápido" in ultimo["razones"]
        assert "Mensajes repetidos o casi idénticos" in ultimo["razones"]
        assert "Contenido con enlaces o mayúsculas excesivas" in ultimo["razones"]

        await cliente.emit("bloquear", {"usuario": "Claudia"})
        await asyncio.wait_for(bloqueados.wait(), timeout=5)
        await cliente.emit("comentario", {"usuario": "Claudia", "texto": plantilla + " ?"})
        descartado = await asyncio.wait_for(cola.get(), timeout=5)
        assert descartado["descartado"] is True
        assert descartado["usuario"] == "Claudia"
    finally:
        await cliente.disconnect()
