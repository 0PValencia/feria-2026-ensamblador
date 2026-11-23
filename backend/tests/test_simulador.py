from difflib import SequenceMatcher

from app.detector import contar_urls, normalizar
from app.simulador import MENSAJES_HUMANOS, PLANTILLAS, variar


def test_los_mensajes_humanos_no_se_parecen_entre_si():
    normas = [normalizar(mensaje) for mensaje in MENSAJES_HUMANOS]
    peor = 0.0
    for i, uno in enumerate(normas):
        for otro in normas[i + 1 :]:
            peor = max(peor, SequenceMatcher(None, uno, otro).ratio())
    assert peor <= 0.8


def test_las_variaciones_siguen_parecidas_y_conservan_dos_enlaces():
    for plantilla in PLANTILLAS:
        base = normalizar(plantilla)
        anterior = base
        for paso in range(12):
            texto = variar(plantilla, paso)
            assert contar_urls(texto) >= 2
            norma = normalizar(texto)
            assert SequenceMatcher(None, base, norma).ratio() > 0.8
            assert SequenceMatcher(None, anterior, norma).ratio() > 0.8
            anterior = norma
