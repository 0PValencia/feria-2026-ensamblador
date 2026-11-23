import time

from app.estado import Estado, sanitizar_nombre, separar_visitante
from app.persistencia import Bitacora
from app.simulador import variar


PLANTILLA = "GANA DINERO FÁCIL AQUÍ www.ejemplo.com www.ejemplo.com/promo"

ACTIVOS = [
    "Qué buena charla, entendí el ejemplo de la ventana deslizante.",
    "Voy a pasar por el stand de redes después de esta demostración.",
    "Alguien anota el horario de los talleres de la tarde?",
    "El proyector del aula se ve nítido desde la última fila.",
]


def test_usuario_real_con_mensajes_variados_y_ritmo_humano():
    estado = Estado()
    resultado = None
    for indice, mensaje in enumerate(ACTIVOS):
        resultado = estado.procesar("Ana", mensaje, "visitante", ahora=indice * 4)
    assert resultado["clasificacion"] == "real"
    assert resultado["etiqueta"] == "[Usuario Real]"
    assert resultado["riesgo"] == 0
    assert resultado["reglas"]["frecuencia"] is False


def test_usuario_muy_activo_queda_sospechoso_y_no_bot():
    estado = Estado()
    resultado = None
    for indice, mensaje in enumerate(ACTIVOS):
        resultado = estado.procesar("seguidor", mensaje, "visitante", ahora=indice * 1.0)
    assert resultado["reglas"]["frecuencia"] is True
    assert resultado["reglas"]["similitud"] is False
    assert resultado["reglas"]["patrones"] is False
    assert resultado["riesgo"] == 40
    assert resultado["clasificacion"] == "sospechoso"
    assert "Mensajes enviados muy rápido" in resultado["razones"]


def test_bot_que_repite_el_mismo_texto_a_alta_frecuencia():
    estado = Estado()
    resultado = None
    for indice in range(4):
        resultado = estado.procesar(
            "clon",
            "compra este curso de la feria ahora",
            "bot",
            ahora=indice * 0.3,
        )
    assert resultado["clasificacion"] == "bot"
    assert resultado["riesgo"] == 90
    assert resultado["reglas"]["frecuencia"] and resultado["reglas"]["similitud"]
    assert resultado["reglas"]["patrones"] is False


def test_ejemplo_del_informe_llega_a_100():
    estado = Estado()
    variantes = [variar(PLANTILLA, paso) for paso in range(4)]
    resultado = None
    for indice, mensaje in enumerate(variantes):
        resultado = estado.procesar("Valeria", mensaje, "bot", ahora=indice * 0.7)
    assert resultado["reglas"]["frecuencia"]
    assert resultado["reglas"]["similitud"]
    assert resultado["reglas"]["patrones"]
    assert resultado["riesgo"] == 100
    assert resultado["clasificacion"] == "bot"
    assert resultado["etiqueta"] == "[BOT DETECTADO - 100 % Confianza]"
    assert resultado["procesamiento_ms"] < 200


def test_un_solo_mensaje_con_patrones_no_marca_bot():
    estado = Estado()
    resultado = estado.procesar("Paola", PLANTILLA, "bot", ahora=0)
    assert resultado["riesgo"] == 20
    assert resultado["clasificacion"] == "real"
    assert resultado["etiqueta"] == "[Usuario Real]"


def test_bot_lento_solo_se_detecta_por_similitud():
    estado = Estado()
    resultado = None
    for indice in range(3):
        resultado = estado.procesar(
            "lento",
            variar("Gana dinero facil aqui", indice).replace("www.ejemplo.com", "").replace("www.ejemplo.com/promo", ""),
            "bot",
            ahora=indice * 12,
        )
    assert resultado["reglas"]["frecuencia"] is False
    assert resultado["reglas"]["similitud"] is True
    assert resultado["reglas"]["patrones"] is False
    assert resultado["riesgo"] == 50
    assert resultado["clasificacion"] == "sospechoso"


def test_los_patrones_se_suman_al_resto_de_las_reglas():
    estado = Estado()
    aviso = "ESTO ES UN AVISO ENTERAMENTE EN MAYUSCULAS"
    estado.procesar("griton", aviso, "bot", ahora=0)
    resultado = estado.procesar("griton", aviso + "!", "bot", ahora=10)
    assert resultado["reglas"]["disparo_mayusculas"] is True
    assert resultado["reglas"]["similitud"] is True
    assert resultado["reglas"]["frecuencia"] is False
    assert resultado["riesgo"] == 70
    assert resultado["clasificacion"] == "bot"


def test_la_ventana_de_observacion_mantiene_y_luego_suelta_el_riesgo():
    estado = Estado()
    for indice in range(4):
        estado.procesar("Valeria", variar(PLANTILLA, indice), "bot", ahora=indice * 0.2)
    mantenido = estado.procesar(
        "Valeria",
        "hoy solo pasaba a saludar a los compañeros de la feria",
        "bot",
        ahora=10,
    )
    assert mantenido["mantenido"] is True
    assert mantenido["clasificacion"] == "bot"
    assert mantenido["riesgo_mensaje"] == 0
    suelto = estado.procesar(
        "Valeria",
        "mañana vuelvo para ver el stand de telecomunicaciones",
        "bot",
        ahora=50,
    )
    assert suelto["clasificacion"] == "real"
    assert suelto["riesgo"] == 0


def test_bloqueo_descarta_y_el_desbloqueo_vuelve_a_aceptar():
    estado = Estado()
    estado.procesar("Ana", "hola a todos en la feria de ingenieria", "visitante", ahora=0)
    assert estado.bloquear("Ana") is True
    descartado = estado.procesar(
        "Ana",
        "otro mensaje distinto sobre el laboratorio",
        "visitante",
        ahora=5,
    )
    assert descartado["descartado"] is True
    assert estado.descartados == 1
    assert estado.procesados == 1
    assert estado.comentarios()[0]["usuario"] == "Ana"
    assert len(estado.comentarios()) == 1
    assert estado.desbloquear("Ana") is True
    retomado = estado.procesar(
        "Ana",
        "volvimos despues de la revision del moderador",
        "visitante",
        ahora=20,
    )
    assert retomado["clasificacion"] == "real"


def test_reiniciar_vacia_muro_bloqueos_y_bitacora(tmp_path):
    bitacora = Bitacora(tmp_path / "eventos.sqlite")
    estado = Estado(bitacora=bitacora)
    estado.procesar("Ana", "un comentario de prueba para la bitacora", "visitante", ahora=0)
    estado.bloquear("Ana")
    assert bitacora.contar() == 1
    estado.reiniciar()
    assert estado.procesados == 0
    assert estado.comentarios() == []
    assert estado.bloqueados == set()
    assert bitacora.contar() == 0


def test_configurar_umbrales_cambia_la_clasificacion_siguiente():
    estado = Estado()
    estado.configurar({"puntos_patrones": 80})
    resultado = estado.procesar("z", "mira www.a.com y tambien www.b.com ahora", "visitante", ahora=0)
    assert resultado["riesgo"] == 80
    assert resultado["clasificacion"] == "bot"


def test_nombres_de_visitante_no_pisan_a_las_cuentas_sinteticas():
    assert sanitizar_nombre("   ") == "Visitante"
    assert len(sanitizar_nombre("x" * 40)) == 24
    assert separar_visitante("Lucía") == "Lucía visitante"
    assert separar_visitante("Claudia") == "Claudia"


def test_el_analisis_aguanta_el_ritmo_de_20_mensajes_por_segundo():
    estado = Estado()
    peor = 0.0
    inicio = time.perf_counter()
    total = 1200
    for indice in range(total):
        marca = time.perf_counter()
        estado.procesar(
            f"cuenta_{indice % 20}",
            f"aviso {indice} www.a.com www.b.com",
            "bot",
            ahora=indice * 0.05,
        )
        peor = max(peor, time.perf_counter() - marca)
    transcurrido = time.perf_counter() - inicio
    assert peor < 0.2
    assert transcurrido / total < 0.02
