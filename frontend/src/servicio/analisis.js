// Capa de datos de la interfaz.
//
// Hoy funciona en modo de ejemplo: guarda los videos en localStorage y genera
// comentarios sintéticos. Cada función indica el endpoint del backend que la
// reemplaza (contrato completo en docs/ANALISIS_YOUTUBE.md). Las vistas solo
// usan estas funciones, así que conectar el backend no cambia la interfaz.

import { analizar, UMBRALES_POR_DEFECTO } from "../datos/motor.js";
import { flujoParaNuevo, generarFlujo, VIDEOS_EJEMPLO } from "../datos/ejemplo.js";
import { datosPublicos, extraerId, urlVideo } from "../youtube.js";

export const MODO_EJEMPLO = true;

const CLAVE = "sbg-youtube-v1";
const CLAVE_UMBRALES = "sbg-umbrales-v1";
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function leer() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (Array.isArray(guardado?.videos)) return guardado;
  } catch {
    /* datos dañados: se vuelve a los de ejemplo */
  }
  const inicial = {
    videos: VIDEOS_EJEMPLO.map((v) => ({
      ...v,
      url: urlVideo(v.id),
      guardado: v.analisis[0].fecha,
      analisis: v.analisis.map((a, i) => ({ ...a, id: `${v.id}-a${i + 1}` })),
    })),
  };
  localStorage.setItem(CLAVE, JSON.stringify(inicial));
  return inicial;
}

function escribir(estado) {
  localStorage.setItem(CLAVE, JSON.stringify(estado));
}

const cache = new Map();

function resultado(video, registro) {
  const clave = `${registro.id}-${registro.n}`;
  if (!cache.has(clave)) {
    const flujo = generarFlujo(video.id, video.flujo).slice(0, registro.n);
    cache.set(clave, analizar(flujo, registro.umbrales || UMBRALES_POR_DEFECTO));
  }
  return { ...registro, ...cache.get(clave) };
}

function resumenVideo(video) {
  const ultimo = resultado(video, video.analisis[video.analisis.length - 1]);
  const previo = video.analisis.length > 1 ? resultado(video, video.analisis[video.analisis.length - 2]) : null;
  return {
    id: video.id,
    url: video.url,
    titulo: video.titulo,
    canal: video.canal,
    guardado: video.guardado,
    total_analisis: video.analisis.length,
    ultimo: { id: ultimo.id, fecha: ultimo.fecha, ...ultimo.resumen },
    previo: previo ? { id: previo.id, fecha: previo.fecha, ...previo.resumen } : null,
  };
}

/** GET /api/videos — videos guardados con el resumen de su último análisis. */
export async function listarVideos() {
  await esperar(150);
  return leer()
    .videos.map(resumenVideo)
    .sort((a, b) => Date.parse(b.ultimo.fecha) - Date.parse(a.ultimo.fecha));
}

/** GET /api/videos/{id} — video con todos sus análisis (comentarios y cuentas incluidos). */
export async function obtenerVideo(id) {
  await esperar(200);
  const video = leer().videos.find((v) => v.id === id);
  if (!video) return null;
  return {
    id: video.id,
    url: video.url,
    titulo: video.titulo,
    canal: video.canal,
    guardado: video.guardado,
    analisis: video.analisis.map((registro) => resultado(video, registro)),
  };
}

/** Busca un video ya guardado a partir de un enlace o videoId. */
export function buscarGuardado(texto) {
  const id = extraerId(texto);
  if (!id) return null;
  const video = leer().videos.find((v) => v.id === id);
  return video ? { id, total_analisis: video.analisis.length, ultimo: video.analisis[video.analisis.length - 1].fecha } : null;
}

/**
 * POST /api/analisis { url, limite } — descarga comentarios con commentThreads.list,
 * aplica las reglas, guarda el análisis y devuelve { video_id, analisis_id }.
 * `alAvanzar(paso, detalle)` informa el progreso (en el backend llega por Socket.IO).
 */
export async function analizarVideo(texto, { limite = 500, alAvanzar = () => {} } = {}) {
  const id = extraerId(texto);
  if (!id) throw new Error("El enlace no corresponde a un video de YouTube.");

  alAvanzar("validar", "Comprobando el enlace");
  const publicos = await datosPublicos(id);
  await esperar(400);

  const estado = leer();
  let video = estado.videos.find((v) => v.id === id);
  let n;
  if (video) {
    const anterior = video.analisis[video.analisis.length - 1].n;
    n = anterior + 25 + Math.floor(Math.random() * 40);
    const ataques = [...video.flujo.ataques];
    if (Math.random() > 0.45) ataques.push({ desde: anterior + 5, bots: 2 + Math.floor(Math.random() * 6) });
    video.flujo = { ...video.flujo, total: Math.max(video.flujo.total, n), ataques };
  } else {
    const flujo = flujoParaNuevo(id, limite);
    n = flujo.inicial;
    video = {
      id,
      url: urlVideo(id),
      titulo: publicos?.titulo || `Video ${id}`,
      canal: publicos?.canal || "Canal de YouTube",
      guardado: new Date().toISOString(),
      flujo,
      analisis: [],
    };
    estado.videos.push(video);
  }

  const paginas = Math.max(1, Math.ceil(n / 100));
  for (let p = 1; p <= paginas; p += 1) {
    alAvanzar("descargar", `Página ${p} de ${paginas} · ${Math.min(n, p * 100)} comentarios`);
    await esperar(450);
  }
  alAvanzar("reglas", "Frecuencia, similitud y patrones");
  await esperar(700);
  alAvanzar("guardar", "Guardando el análisis para compararlo después");
  await esperar(400);

  const registro = {
    id: `${id}-a${video.analisis.length + 1}`,
    n,
    fecha: new Date().toISOString(),
    umbrales: obtenerUmbrales(),
  };
  video.analisis.push(registro);
  escribir(estado);
  return { video_id: id, analisis_id: registro.id };
}

/** DELETE /api/videos/{id} — elimina el video y su historial. */
export async function eliminarVideo(id) {
  const estado = leer();
  estado.videos = estado.videos.filter((v) => v.id !== id);
  escribir(estado);
}

/** GET /api/umbrales */
export function obtenerUmbrales() {
  try {
    return { ...UMBRALES_POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE_UMBRALES)) };
  } catch {
    return { ...UMBRALES_POR_DEFECTO };
  }
}

/** PUT /api/umbrales — se aplican en el próximo análisis. */
export function guardarUmbrales(umbrales) {
  if (Number(umbrales.umbral_bot) <= Number(umbrales.umbral_sospechoso)) {
    throw new Error("El umbral de bot debe ser mayor que el de sospechoso.");
  }
  localStorage.setItem(CLAVE_UMBRALES, JSON.stringify(umbrales));
}

export function restablecerUmbrales() {
  localStorage.removeItem(CLAVE_UMBRALES);
  return { ...UMBRALES_POR_DEFECTO };
}

/** Compara dos análisis del mismo video (también lo calcula el backend). */
export function comparar(actual, anterior) {
  if (!anterior) return null;
  const marcadas = (a) => new Map(a.cuentas.filter((c) => c.clasificacion !== "real").map((c) => [c.autor, c]));
  const ahora = marcadas(actual);
  const antes = marcadas(anterior);
  const idsAntes = new Set(anterior.comentarios.map((c) => c.id));
  const delta = {};
  for (const clave of Object.keys(actual.resumen)) delta[clave] = actual.resumen[clave] - (anterior.resumen[clave] ?? 0);
  return {
    delta,
    nuevas: [...ahora.values()].filter((c) => !antes.has(c.autor)),
    siguen: [...ahora.values()].filter((c) => antes.has(c.autor)),
    salieron: [...antes.values()].filter((c) => !ahora.has(c.autor)),
    comentariosNuevos: new Set(actual.comentarios.filter((c) => !idsAntes.has(c.id)).map((c) => c.id)),
  };
}
