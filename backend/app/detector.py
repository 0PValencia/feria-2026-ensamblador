"""Motor de las tres reglas: frecuencia, similitud y patrones.

Las razones visibles usan el texto de la sección 5.3 del informe.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from app.configuracion import Umbrales

RAZON_FRECUENCIA = "Mensajes enviados muy rápido"
RAZON_SIMILITUD = "Mensajes repetidos o casi idénticos"
RAZON_PATRONES = "Contenido con enlaces o mayúsculas excesivas"
RAZON_MANTENIDO = "Riesgo mantenido por la actividad reciente"

_URL = re.compile(r"https?://[^\s]+|www\.[^\s]+", re.IGNORECASE)
_SIGNOS_REPETIDOS = re.compile(r"([^\w\s])\1+", re.UNICODE)
_ESPACIOS = re.compile(r"\s+")


def _es_emoji(caracter: str) -> bool:
    codigo = ord(caracter)
    if codigo in (0x200D, 0xFE0F, 0xFE0E):
        return True
    return unicodedata.category(caracter) == "So"


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes, sin emoticonos, sin signos repetidos ni espacios extra."""
    descompuesto = unicodedata.normalize("NFKD", texto.lower())
    sin_tildes = "".join(c for c in descompuesto if not unicodedata.combining(c))
    sin_emoji = "".join(" " if _es_emoji(c) else c for c in sin_tildes)
    sin_signos = _SIGNOS_REPETIDOS.sub(r"\1", sin_emoji)
    return _ESPACIOS.sub(" ", sin_signos).strip()


def contar_urls(texto: str) -> int:
    return len(_URL.findall(texto))


def proporcion_mayusculas(texto: str) -> tuple[int, float]:
    letras = [c for c in texto if c.isalpha()]
    if not letras:
        return 0, 0.0
    altas = sum(1 for c in letras if c.isupper())
    return len(letras), altas / len(letras)


@dataclass
class Evaluacion:
    riesgo: int
    razones: list[str] = field(default_factory=list)
    frecuencia: bool = False
    similitud: bool = False
    patrones: bool = False
    similitud_max: float = 0.0
    mensajes_en_ventana: int = 0
    urls: int = 0
    proporcion_mayusculas: float = 0.0
    disparo_urls: bool = False
    disparo_mayusculas: bool = False
    puntos_frecuencia: int = 0
    puntos_similitud: int = 0
    puntos_patrones: int = 0

    def reglas(self) -> dict:
        return {
            "frecuencia": self.frecuencia,
            "similitud": self.similitud,
            "patrones": self.patrones,
            "similitud_max": round(self.similitud_max, 2),
            "mensajes_en_ventana": self.mensajes_en_ventana,
            "urls": self.urls,
            "proporcion_mayusculas": round(self.proporcion_mayusculas, 2),
            "disparo_urls": self.disparo_urls,
            "disparo_mayusculas": self.disparo_mayusculas,
            "puntos_frecuencia": self.puntos_frecuencia,
            "puntos_similitud": self.puntos_similitud,
            "puntos_patrones": self.puntos_patrones,
        }


def analizar(
    texto: str,
    previos_normalizados: list[str],
    mensajes_en_ventana: int,
    umbrales: Umbrales,
) -> Evaluacion:
    """Evalúa un comentario contra el historial reciente del mismo usuario."""
    norm = normalizar(texto)
    razones: list[str] = []
    puntos_f = puntos_s = puntos_p = 0

    # «más de N comentarios»: el valor por defecto 3 se cumple a partir del cuarto.
    frecuencia = mensajes_en_ventana > umbrales.mensajes_maximos
    if frecuencia:
        puntos_f = umbrales.puntos_frecuencia
        razones.append(RAZON_FRECUENCIA)

    similitud_max = 0.0
    if previos_normalizados:
        similitud_max = max(
            SequenceMatcher(None, norm, previo).ratio() for previo in previos_normalizados
        )
    # «mayor a 0,8»: un ratio exactamente igual al umbral no suma.
    similitud = similitud_max > umbrales.similitud_umbral
    if similitud:
        puntos_s = umbrales.puntos_similitud
        razones.append(RAZON_SIMILITUD)

    urls = contar_urls(texto)
    letras, proporcion = proporcion_mayusculas(texto)
    disparo_urls = urls >= umbrales.urls_minimas
    disparo_mayusculas = (
        letras >= umbrales.letras_minimas and proporcion > umbrales.mayusculas_umbral
    )
    patrones = disparo_urls or disparo_mayusculas
    if patrones:
        puntos_p = umbrales.puntos_patrones
        razones.append(RAZON_PATRONES)

    return Evaluacion(
        riesgo=min(100, puntos_f + puntos_s + puntos_p),
        razones=razones,
        frecuencia=frecuencia,
        similitud=similitud,
        patrones=patrones,
        similitud_max=similitud_max,
        mensajes_en_ventana=mensajes_en_ventana,
        urls=urls,
        proporcion_mayusculas=proporcion,
        disparo_urls=disparo_urls,
        disparo_mayusculas=disparo_mayusculas,
        puntos_frecuencia=puntos_f,
        puntos_similitud=puntos_s,
        puntos_patrones=puntos_p,
    )


def clasificar(riesgo: int, umbrales: Umbrales) -> tuple[str, str]:
    """0–39 real, 40–69 sospechoso, 70–100 bot, con los cortes configurados."""
    riesgo = max(0, min(100, int(riesgo)))
    if riesgo >= umbrales.umbral_bot:
        return "bot", f"[BOT DETECTADO - {riesgo} % Confianza]"
    if riesgo >= umbrales.umbral_sospechoso:
        return "sospechoso", f"[Sospechoso - {riesgo} %]"
    return "real", "[Usuario Real]"
