"""Umbrales configurables de las tres reglas (sección 5.3 y RF8)."""

from dataclasses import asdict, dataclass


@dataclass
class Umbrales:
    """Valores por defecto del documento base.

    La frecuencia se cumple cuando hay MÁS mensajes que `mensajes_maximos`
    dentro de la ventana. Con el valor 3, el cuarto mensaje suma riesgo.
    La similitud se cumple cuando el ratio es MAYOR que `similitud_umbral`.
    """

    ventana_segundos: float = 5.0
    mensajes_maximos: int = 3
    similitud_umbral: float = 0.8
    puntos_frecuencia: int = 40
    puntos_similitud: int = 50
    puntos_patrones: int = 20
    mayusculas_umbral: float = 0.7
    letras_minimas: int = 10
    urls_minimas: int = 2
    umbral_sospechoso: int = 40
    umbral_bot: int = 70
    ventana_observacion: float = 30.0
    historial_max: int = 15

    def como_dict(self) -> dict:
        return asdict(self)


_CAMPOS = {
    "ventana_segundos": (float, 1, 60),
    "mensajes_maximos": (int, 1, 30),
    "similitud_umbral": (float, 0.1, 1),
    "puntos_frecuencia": (int, 0, 100),
    "puntos_similitud": (int, 0, 100),
    "puntos_patrones": (int, 0, 100),
    "mayusculas_umbral": (float, 0.1, 1),
    "letras_minimas": (int, 1, 200),
    "urls_minimas": (int, 1, 10),
    "umbral_sospechoso": (int, 1, 99),
    "umbral_bot": (int, 2, 100),
    "ventana_observacion": (float, 5, 180),
    "historial_max": (int, 1, 50),
}


def umbrales_desde(actual: Umbrales, datos: dict) -> Umbrales:
    """Devuelve una copia validada. No modifica `actual` si hay un error."""
    if not isinstance(datos, dict):
        raise ValueError("Los umbrales deben enviarse como un objeto.")
    valores = actual.como_dict()
    for clave, bruto in datos.items():
        if clave not in _CAMPOS:
            continue
        tipo, minimo, maximo = _CAMPOS[clave]
        if isinstance(bruto, bool) or not isinstance(bruto, (int, float, str)):
            raise ValueError(f"Valor no numérico para {clave}.")
        if tipo is int and isinstance(bruto, float) and not bruto.is_integer():
            raise ValueError(f"{clave} debe ser un número entero.")
        try:
            numero = tipo(bruto)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Valor no numérico para {clave}.") from exc
        if numero < minimo or numero > maximo:
            raise ValueError(f"{clave} debe estar entre {minimo} y {maximo}.")
        valores[clave] = numero
    nuevo = Umbrales(**valores)
    if nuevo.umbral_bot <= nuevo.umbral_sospechoso:
        raise ValueError("El umbral de bot debe ser mayor que el de sospechoso.")
    return nuevo
