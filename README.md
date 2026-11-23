# SocialBotGuard

Simulador web para detectar, en un muro de comentarios, el ataque de spam repetitivo con pequeñas variaciones. El tráfico es sintético y local: no se conecta a redes sociales ni a cuentas reales.

La aplicación sigue la sección 5 del informe: tres reglas explicables, riesgo de 0 % a 100 %, WebSockets y tres paneles.

## Reglas

| Regla | Condición | Puntos | Razón |
| --- | --- | --- | --- |
| Frecuencia | Más de 3 comentarios en la ventana de 5 s | +40 % | Mensajes enviados muy rápido |
| Similitud | `difflib.SequenceMatcher` mayor a 0,8 contra un mensaje anterior del mismo usuario | +50 % | Mensajes repetidos o casi idénticos |
| Patrones | Dos o más enlaces, o más del 70 % de las letras en mayúscula (mensaje de al menos 10 letras) | +20 % | Contenido con enlaces o mayúsculas excesivas |

El texto se normaliza antes de comparar: minúsculas, sin tildes, sin emoticonos, sin signos repetidos y sin espacios extra. El riesgo se recorta a 100 % y se mantiene durante 30 s de observación.

- 0 % a 39 %: usuario real, en verde, `[Usuario Real]`
- 40 % a 69 %: sospechoso, en ámbar, con la razón
- 70 % a 100 %: bot, en rojo, `[BOT DETECTADO - xx % Confianza]`

El motor no mira el nombre de la cuenta. Por eso las cuentas del ataque usan nombres comunes.

## Requisitos

- Python 3.10 o superior
- Node.js 20 o superior
- Un navegador actual

## Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd frontend && npm install && npm run build && cd ..
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

Abrir `http://127.0.0.1:8000`.

También se puede usar `./iniciar.sh`, que crea el entorno, instala, construye el frontend y arranca el servidor.

Durante el desarrollo, en una terminal el servidor y en otra `cd frontend && npm run dev`. La interfaz queda en `http://127.0.0.1:5173` y habla con el puerto 8000.

## Windows

```bat
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
cd frontend
npm install
npm run build
cd ..
.venv\Scripts\uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

## Pruebas

```bash
cd backend
python -m pytest
```

## Alcance

El prototipo solo detecta spam repetitivo de una misma cuenta con reglas fijas. No compara mensajes entre cuentas, no usa aprendizaje automático y no lee plataformas reales.
