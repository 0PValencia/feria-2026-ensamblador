from difflib import SequenceMatcher

from app.configuracion import Umbrales
from app.detector import (
    RAZON_FRECUENCIA,
    RAZON_PATRONES,
    RAZON_SIMILITUD,
    analizar,
    clasificar,
    contar_urls,
    normalizar,
)


def test_normaliza_tildes_espacios_signos_y_emoticonos():
    assert normalizar("Gána   dinero!!! fácil 🔥") == "gana dinero! facil"
    assert normalizar("GANA  DINERO   FÁCIL") == "gana dinero facil"


def test_ejemplo_de_similitud_del_informe():
    base = normalizar("Gana dinero fácil aquí")
    variante = normalizar("Gana dinero fácil aquí!!")
    assert SequenceMatcher(None, base, variante).ratio() > 0.8


def test_urls_y_mayusculas_en_los_bordes():
    assert contar_urls("mira www.a.com y https://b.com/x.") == 2
    assert contar_urls("solo www.a.com por favor") == 1
    umbrales = Umbrales()
    casi = analizar("ABCDEFGhij", [], 1, umbrales)
    assert casi.disparo_mayusculas is False
    altas = analizar("ABCDEFGHij", [], 1, umbrales)
    assert altas.disparo_mayusculas is True
    assert altas.patrones is True
    assert altas.riesgo == 20


def test_frecuencia_se_cumple_recien_despues_del_maximo():
    umbrales = Umbrales()
    tres = analizar("un aviso distinto", [], 3, umbrales)
    cuatro = analizar("otro aviso distinto", [], 4, umbrales)
    assert tres.frecuencia is False
    assert cuatro.frecuencia is True
    assert cuatro.razones == [RAZON_FRECUENCIA]
    assert cuatro.riesgo == 40


def test_similitud_exige_mas_que_el_umbral():
    umbrales = Umbrales()
    primero = normalizar("abcdef")
    segundo = normalizar("abcxyz")
    ratio = SequenceMatcher(None, primero, segundo).ratio()
    justo = analizar("abcxyz", [primero], 1, Umbrales(similitud_umbral=ratio))
    holgado = analizar("abcxyz", [primero], 1, Umbrales(similitud_umbral=ratio - 0.01))
    assert justo.similitud is False
    assert holgado.similitud is True
    assert holgado.razones == [RAZON_SIMILITUD]


def test_patrones_suman_una_sola_vez_aunque_haya_urls_y_mayusculas():
    texto = "GANA DINERO FACIL AQUI www.ejemplo.com www.ejemplo.com/promo"
    evaluacion = analizar(texto, [], 1, Umbrales())
    assert evaluacion.disparo_urls is True
    assert evaluacion.razones == [RAZON_PATRONES]
    assert evaluacion.riesgo == 20


def test_las_tres_reglas_se_recortan_a_100():
    previo = normalizar("GANA DINERO FACIL AQUI www.ejemplo.com www.ejemplo.com/promo")
    texto = "GANA DINERO FACIL AQUI www.ejemplo.com www.ejemplo.com/promo!!"
    evaluacion = analizar(texto, [previo], 4, Umbrales())
    assert evaluacion.frecuencia and evaluacion.similitud and evaluacion.patrones
    assert evaluacion.riesgo == 100


def test_clasificacion_de_la_seccion_5_4():
    umbrales = Umbrales()
    assert clasificar(0, umbrales) == ("real", "[Usuario Real]")
    assert clasificar(39, umbrales)[0] == "real"
    assert clasificar(40, umbrales) == ("sospechoso", "[Sospechoso - 40 %]")
    assert clasificar(69, umbrales)[0] == "sospechoso"
    assert clasificar(70, umbrales) == ("bot", "[BOT DETECTADO - 70 % Confianza]")
    assert clasificar(100, umbrales)[1] == "[BOT DETECTADO - 100 % Confianza]"
