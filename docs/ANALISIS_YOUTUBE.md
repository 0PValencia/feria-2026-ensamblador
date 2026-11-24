# SocialBotGuard · Análisis de comentarios de YouTube

Este documento define cómo funciona la nueva versión de SocialBotGuard. Deja de ser un
simulador: el moderador pega el enlace de un video público de YouTube, el sistema
descarga sus comentarios con la YouTube Data API v3, los evalúa con las mismas tres
reglas del documento base y **guarda el enlace y el resultado**. Cada nuevo análisis del
mismo video se compara con los anteriores para ver si la actividad automatizada crece o
disminuye.

> Estado actual: la interfaz está terminada y funciona en **modo de ejemplo** (datos
> sintéticos guardados en el navegador). El backend descrito aquí es el que debe
> implementarse para usar comentarios reales. Ver [Conectar el frontend](#11-conectar-el-frontend).

---

## 1. Flujo de uso

1. **Explorar** (inicio). Muestra los videos guardados: un carrusel con los más
   recientes, la cuadrícula "Videos analizados recientemente" y los "Niveles de riesgo"
   (alto, medio, bajo, con comparación, empeoran), que funcionan como filtros.
2. **Analizar video**. Desde el botón morado de la barra superior o pegando un enlace en
   el buscador. El modal valida el enlace, muestra la miniatura y el título, deja elegir
   cuántos comentarios descargar (100, 500 o 1000) e indica la cuota que se usará. Si el
   video ya está guardado, avisa con qué análisis se comparará.
3. **Progreso**. Cuatro pasos: validar enlace → descargar comentarios (por páginas) →
   aplicar las tres reglas → guardar y comparar.
4. **Página del video**. Reproductor de YouTube, historial de análisis, resumen con
   variaciones respecto del análisis base, gráficos, qué cambió, cuentas marcadas y el
   panel lateral con todos los comentarios clasificados.
5. **Analizar de nuevo**. Crea otro análisis del mismo video; el anterior queda como base
   de comparación.

## 2. Arquitectura

```
Navegador (React + Vite)
   │  REST /api/*            ▲ Socket.IO "analisis_progreso"
   ▼                         │
FastAPI (backend/app) ───────┘
   ├─ cliente YouTube Data API v3  (requests, clave en el servidor)
   ├─ motor de reglas               (detector.py, sin cambios)
   └─ SQLite                        (backend/data/socialbotguard.sqlite)
```

- La clave de la API **nunca** llega al navegador. Se guarda en la variable de entorno
  del servidor `YOUTUBE_API_KEY`, restringida a la YouTube Data API v3.
- El navegador solo usa servicios públicos sin clave: miniaturas (`i.ytimg.com`), el
  reproductor (`youtube-nocookie.com/embed`) y, en modo de ejemplo, oEmbed para el título.

## 3. Obtención de datos (YouTube Data API v3)

### 3.1 Metadatos del video · `videos.list`

| Parámetro | Valor |
| --- | --- |
| `part` | `snippet,statistics` |
| `id` | videoId |
| Costo | 1 unidad |

Se guardan `snippet.title`, `snippet.channelTitle`, `snippet.channelId`,
`snippet.publishedAt` y `statistics.commentCount`.

### 3.2 Comentarios · `commentThreads.list`

| Parámetro | Valor |
| --- | --- |
| `part` | `snippet` |
| `videoId` | videoId |
| `maxResults` | `100` (máximo por página) |
| `order` | `time` |
| `textFormat` | `plainText` |
| `pageToken` | `nextPageToken` de la respuesta anterior |
| Costo | 1 unidad por página |

Se pide página tras página hasta llegar al límite elegido (100, 500 o 1000) o a la
última página. Analizar 1000 comentarios cuesta unas 10 unidades de las 10 000 diarias
que tiene un proyecto por defecto (se reinician a medianoche, hora del Pacífico).

### 3.3 Enlaces aceptados

`youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`,
`youtube.com/live/ID`, `youtube.com/embed/ID` o el `ID` de 11 caracteres. La misma
expresión está en `frontend/src/youtube.js` (`extraerId`) y debe repetirse en el backend.

### 3.4 Errores controlados

| Respuesta de la API | Mensaje para el usuario |
| --- | --- |
| 404 `videoNotFound` | "El video no existe o es privado." |
| 403 `commentsDisabled` | "Este video tiene los comentarios desactivados." |
| 403 `quotaExceeded` | "Se agotó la cuota diaria de YouTube. Intenta mañana." |
| 400 / enlace inválido | "El enlace no corresponde a un video de YouTube." |
| Error de red | "No se pudo conectar con YouTube. Intenta otra vez." |

Si la descarga se corta a mitad, se guarda el análisis con los comentarios obtenidos y
el campo `completo = false`.

## 4. Adaptación al motor de reglas

De cada `topLevelComment.snippet` se toma:

| Campo del motor | Origen en YouTube |
| --- | --- |
| `autor_id` (usuario) | `authorChannelId.value` (si falta, `authorDisplayName`) |
| `autor` (se muestra) | `authorDisplayName` |
| `texto` | `textDisplay` (en texto plano) |
| `fecha` | `publishedAt` |
| `comentario_id` | `id` del comentario |
| `me_gusta` | `likeCount` |

Los comentarios se ordenan cronológicamente y pasan por las tres reglas **sin
modificarlas** (`backend/app/detector.py`):

| Regla | Condición | Puntos |
| --- | --- | --- |
| Frecuencia | Más de `mensajes_maximos` (3) comentarios del mismo autor en `ventana_segundos` (5 s) según `publishedAt` | +40 |
| Similitud | `difflib.SequenceMatcher` > `similitud_umbral` (0,8) contra un comentario anterior del mismo autor | +50 |
| Patrones | 2 o más enlaces, o más del 70 % de mayúsculas (mínimo 10 letras) | +20 |

El riesgo de un comentario se recorta a 100 y la cuenta conserva su riesgo más alto
durante `ventana_observacion` (30 s). Clasificación con los cortes configurables:

- 0–39: real · 40–69: sospechoso · 70–100: bot.

Los umbrales vigentes se **copian dentro de cada análisis**. Así, si el moderador los
cambia desde "Reglas de detección", los análisis viejos conservan los valores con los que
se hicieron y la comparación indica si se usaron reglas distintas.

> `publishedAt` tiene precisión de segundos y YouTube agrupa poco los comentarios
> automáticos, por eso la regla de similitud suele ser la que más detecta en este origen.

## 5. Métricas de un análisis

| Métrica | Definición |
| --- | --- |
| `comentarios` | Comentarios analizados |
| `cuentas` | Autores distintos |
| `cuentas_reales` / `cuentas_sospechosas` / `cuentas_bot` | Autores por clasificación (riesgo máximo del autor) |
| `comentarios_bot` / `comentarios_sospechosos` | Comentarios por clasificación |
| `porcentaje_bots` | `comentarios_bot / comentarios × 100`, redondeado |
| `porcentaje_sospechosos` | `comentarios_sospechosos / comentarios × 100` |
| `riesgo_medio` | Promedio del riesgo de todos los comentarios |

**Nivel de riesgo del video** (etiquetas de las tarjetas y filtros):

| Nivel | `porcentaje_bots` |
| --- | --- |
| Alto | 20 % o más |
| Medio | 8 % a 19 % |
| Bajo | menos de 8 % |

## 6. Guardado (SQLite)

```sql
CREATE TABLE videos (
  id            TEXT PRIMARY KEY,        -- videoId de YouTube
  url           TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  canal         TEXT NOT NULL,
  canal_id      TEXT,
  publicado     TEXT,                    -- ISO 8601
  guardado      TEXT NOT NULL
);

CREATE TABLE analisis (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id      TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  fecha         TEXT NOT NULL,
  limite        INTEGER NOT NULL,        -- 100, 500 o 1000
  completo      INTEGER NOT NULL DEFAULT 1,
  umbrales      TEXT NOT NULL,           -- JSON con los umbrales usados
  resumen       TEXT NOT NULL            -- JSON con las métricas de la sección 5
);

CREATE TABLE comentarios (
  analisis_id   INTEGER NOT NULL REFERENCES analisis(id) ON DELETE CASCADE,
  comentario_id TEXT NOT NULL,           -- id de YouTube, sirve para detectar nuevos
  autor_id      TEXT NOT NULL,
  autor         TEXT NOT NULL,
  texto         TEXT NOT NULL,
  fecha         TEXT NOT NULL,
  me_gusta      INTEGER DEFAULT 0,
  riesgo        INTEGER NOT NULL,
  clasificacion TEXT NOT NULL,           -- real | sospechoso | bot
  razones       TEXT NOT NULL,           -- JSON
  PRIMARY KEY (analisis_id, comentario_id)
);

CREATE TABLE cuentas (
  analisis_id   INTEGER NOT NULL REFERENCES analisis(id) ON DELETE CASCADE,
  autor_id      TEXT NOT NULL,
  autor         TEXT NOT NULL,
  riesgo        INTEGER NOT NULL,        -- máximo del autor
  clasificacion TEXT NOT NULL,
  comentarios   INTEGER NOT NULL,
  razones       TEXT NOT NULL,           -- JSON, unión de razones
  ejemplo       TEXT NOT NULL,           -- comentario con mayor riesgo
  PRIMARY KEY (analisis_id, autor_id)
);
```

Se guarda cada análisis completo, aunque repita comentarios del anterior, para poder
mostrar cualquier punto del historial tal como estaba.

## 7. Comparación entre análisis

Por defecto, el análisis que se ve se compara con el **inmediatamente anterior**. En la
página del video se puede elegir cualquier otro como base o "Sin comparar".

| Resultado | Cálculo |
| --- | --- |
| Variación de métricas | `actual.resumen[x] − base.resumen[x]` para cada métrica |
| Nuevas cuentas marcadas | Autores sospechosos o bot en el actual que no lo eran en la base |
| Siguen marcadas | Autores marcados en ambos |
| Ya no aparecen marcadas | Marcados en la base y reales o ausentes en el actual |
| Comentarios nuevos | `comentario_id` del actual que no existen en la base |

Colores: subir el porcentaje de bots, cuentas bot o riesgo se muestra en rojo; bajar, en
verde. El conteo de comentarios y cuentas se muestra neutro.

## 8. API REST

Todas las respuestas son JSON. Las fechas van en ISO 8601 (UTC).

### `GET /api/videos`

Videos guardados con el resumen del último análisis y del anterior (para la tendencia).

```json
[
  {
    "id": "kJQP7kiw5Fk",
    "url": "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
    "titulo": "Luis Fonsi - Despacito ft. Daddy Yankee",
    "canal": "Luis Fonsi",
    "guardado": "2026-11-03T19:27:00Z",
    "total_analisis": 3,
    "ultimo": { "id": 12, "fecha": "2026-11-23T19:27:00Z", "comentarios": 190, "porcentaje_bots": 10, "...": "métricas de la sección 5" },
    "previo": { "id": 9, "fecha": "2026-11-15T19:27:00Z", "porcentaje_bots": 5, "...": "..." }
  }
]
```

### `GET /api/videos/{video_id}`

Video con todos sus análisis. Cada análisis incluye `resumen`, `umbrales`, `cuentas` y
`comentarios` con los campos de las tablas de la sección 6. Para videos con muchos
análisis se puede paginar con `GET /api/analisis/{id}/comentarios?pagina=1`.

### `POST /api/analisis`

```json
{ "url": "https://youtu.be/kJQP7kiw5Fk", "limite": 500 }
```

Respuesta inmediata `202 Accepted`:

```json
{ "analisis_id": 13, "video_id": "kJQP7kiw5Fk" }
```

El progreso llega por Socket.IO, evento `analisis_progreso`:

```json
{ "analisis_id": 13, "paso": "descargar", "detalle": "Página 2 de 5 · 200 comentarios", "porcentaje": 40 }
```

`paso` toma los valores `validar`, `descargar`, `reglas`, `guardar`, `listo` o `error`
(con `mensaje` de la sección 3.4).

### `DELETE /api/videos/{video_id}`

Elimina el video y todo su historial (borrado en cascada).

### `GET /api/umbrales` · `PUT /api/umbrales`

Lee o actualiza los umbrales con la validación existente de
`backend/app/configuracion.py` (`umbrales_desde`). Se aplican en el próximo análisis.

## 9. Interfaz

Estilo Twitch, tema oscuro y morado. Archivos en `frontend/src/`:

| Archivo | Contenido |
| --- | --- |
| `App.jsx` | Barra superior (logo, Explorar, buscador, reglas, "Analizar video"), barra lateral "Videos analizados", rutas, panel de reglas y aviso de modo de ejemplo |
| `vistas/Explorar.jsx` | Carrusel destacado, cuadrícula de videos y niveles de riesgo |
| `vistas/DetalleVideo.jsx` | Reproductor, historial, resumen, gráficos, cambios, cuentas marcadas y comentarios |
| `componentes/ModalAnalizar.jsx` | Enlace, vista previa, límite de comentarios y progreso |
| `componentes/TarjetaVideo.jsx` | Tarjeta de video y tendencia |
| `PanelReglas.jsx` | Umbrales con ayuda "?" en cada valor |
| `servicio/analisis.js` | Única capa de datos que usan las vistas |
| `youtube.js` | Enlaces, miniaturas y reproductor |
| `datos/motor.js`, `datos/ejemplo.js` | Reglas y datos sintéticos del modo de ejemplo |

Rutas (hash): `#/` Explorar y `#/video/{videoId}` página del video.

## 10. Requisitos de configuración

| Variable | Dónde | Uso |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | Servidor | Clave de Google Cloud con la YouTube Data API v3 habilitada y restringida a esa API |

## 11. Conectar el frontend

Las vistas solo llaman a las funciones de `frontend/src/servicio/analisis.js`. Para usar
el backend:

1. Cambiar `MODO_EJEMPLO` a `false` (oculta el aviso morado).
2. Reemplazar el cuerpo de cada función por la llamada indicada en su comentario:
   `listarVideos` → `GET /api/videos`, `obtenerVideo` → `GET /api/videos/{id}`,
   `analizarVideo` → `POST /api/analisis` + escuchar `analisis_progreso` y llamar a
   `alAvanzar(paso, detalle)`, `eliminarVideo` → `DELETE`, `obtenerUmbrales` /
   `guardarUmbrales` → `/api/umbrales`.
3. Mantener la forma de los objetos devueltos (secciones 5 y 8). `comparar()` puede
   seguir calculándose en el navegador o venir del backend con la misma forma.
4. `buscarGuardado` puede resolverse con la lista ya cargada de `listarVideos`.

En el backend se elimina el simulador (`simulador.py` y los eventos de ataque de
`main.py`) y se agregan el cliente de YouTube, las tablas de la sección 6 y los
endpoints de la sección 8. `detector.py` y `configuracion.py` no cambian.

## 12. Privacidad y ética

- Solo se leen comentarios **públicos** con una clave de API; no se usa OAuth ni se
  actúa sobre YouTube (no se borran ni reportan comentarios).
- La clasificación es una **señal para revisar**, no una prueba: se muestra siempre la
  razón de cada marca.
- Se guarda lo mínimo para comparar (texto, autor, fecha, riesgo). "Eliminar video"
  borra todo su historial.

## 13. Limitaciones

- Las reglas comparan comentarios **de un mismo autor**; no detectan campañas
  coordinadas entre cuentas distintas.
- Solo se analizan comentarios de primer nivel (`commentThreads`), no las respuestas.
- `order=time` trae primero los más recientes: con un límite bajo, un video antiguo se
  analiza parcialmente.
- La cuota diaria limita cuántos análisis grandes se pueden hacer por día.
