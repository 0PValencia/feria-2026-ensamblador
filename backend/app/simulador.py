"""Generadores de tráfico sintético: usuarios reales y spam repetitivo con variaciones.

Las variaciones imitan la evasión descrita en la sección 5.6: signos, emoticonos,
un cambio de letra, espacios duplicados y mayúsculas alternadas. Cada cuenta
repite su propia plantilla. No se comparan mensajes entre cuentas distintas:
eso queda fuera del alcance (sección 5.8).
"""

from __future__ import annotations

RITMO_ATAQUE = {"baja": 2, "media": 8, "alta": 20}

HUMANOS = [
    "Lucía",
    "Mateo",
    "Andrés",
    "Camila",
    "Diego",
    "Sofía",
    "Javier",
    "Mariana",
]

BOTS = [
    "Valeria",
    "Nicolás",
    "Paola",
    "Hernán",
    "Rocío",
    "Gustavo",
    "Elena",
    "Raúl",
    "Bruno",
    "Nadia",
    "Iván",
    "Carmen",
    "Felipe",
    "Lara",
    "Óscar",
    "Julia",
    "Mario",
    "Noelia",
    "Pedro",
    "Sara",
    "Tomás",
    "Vera",
    "Adrián",
    "Bianca",
    "Ciro",
    "Dalia",
    "Emilio",
    "Fabiola",
    "Hugo",
    "Hilda",
]

MENSAJES_HUMANOS = [
    "La explicación del protocolo se entendió muy bien, gracias.",
    "¿A qué hora presentan el proyecto de redes locales?",
    "Me gustó el stand de robótica, el brazo se movía suave.",
    "Alguien tiene el cronograma de los talleres de la tarde?",
    "Este chat de la feria está bastante ordenado hoy.",
    "Voy a pasar por el laboratorio de telecomunicaciones.",
    "El café de la entrada está rico y la fila está corta.",
    "¿Dónde queda el aula de la demostración de sensores?",
    "Buen dato lo de las contraseñas únicas, lo voy a aplicar.",
    "Mi grupo expone en el segundo piso, pasen a ver el prototipo.",
    "No sabía que el tráfico automático ya superaba al humano.",
    "La diapositiva de los casos de Twitch fue muy clara.",
    "¿Puedo hacer una pregunta al final de la charla?",
    "Estoy en la fila del auditorio, ¿alcanzo a entrar?",
    "El prototipo de la mesa vecina también usa sensores.",
    "Hoy el campus está lleno, cuídense en las escaleras.",
    "Me anoto al taller de Linux de las cuatro y cuarto.",
    "¿Queda lugar en el stand de ciberseguridad o ya cerraron?",
    "La música del patio se escucha hasta este pasillo.",
    "Después de esta demo voy a revisar las fuentes del informe.",
    "Qué buena onda que expliquen cada regla en voz alta.",
    "Llegué tarde, ¿ya empezaron con la parte de los gráficos?",
    "El proyector del aula 3 se ve nítido desde atrás.",
    "Saludos desde el grupo de redes, éxito en la defensa.",
]

PLANTILLAS = [
    "GANA DINERO FÁCIL AQUÍ www.ejemplo.com www.ejemplo.com/promo",
    "HAZ CLIC Y GANA PREMIOS HOY www.premio.ejemplo www.premio.ejemplo/giro",
    "OFERTA EXCLUSIVA SIGUEME YA www.oferta.ejemplo www.oferta.ejemplo/ahora",
    "DINERO RAPIDO SIN ESFUERZO www.rapido.ejemplo www.rapido.ejemplo/alta",
    "COMPRA SEGUIDORES BARATOS www.fama.ejemplo www.fama.ejemplo/pack",
    "BONO GRATIS SOLO HOY www.bono.ejemplo www.bono.ejemplo/reclama",
]


def alternar_mayusculas(texto: str) -> str:
    salida = []
    usar_alta = True
    for caracter in texto:
        if caracter.isalpha():
            salida.append(caracter.upper() if usar_alta else caracter.lower())
            usar_alta = not usar_alta
        else:
            salida.append(caracter)
    return "".join(salida)


def variar(plantilla: str, paso: int) -> str:
    """Pequeña variación determinista de una plantilla de spam."""
    modo = paso % 6
    if modo == 0:
        return plantilla
    if modo == 1:
        return plantilla + "!!"
    if modo == 2:
        return plantilla + " 🔥"
    if modo == 3:
        if "FÁCIL" in plantilla:
            return plantilla.replace("FÁCIL", "FASIL", 1)
        if "CLIC" in plantilla:
            return plantilla.replace("CLIC", "CLIK", 1)
        return plantilla.replace("A", "Á", 1)
    if modo == 4:
        return plantilla.replace(" ", "  ", 1)
    return alternar_mayusculas(plantilla)
