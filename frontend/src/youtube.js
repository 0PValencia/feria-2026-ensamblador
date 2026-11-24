// Utilidades para enlaces de YouTube. No requieren clave de API.

const PATRON_ID = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/;

export function extraerId(texto) {
  const limpio = (texto || "").trim();
  if (/^[\w-]{11}$/.test(limpio)) return limpio;
  const coincidencia = limpio.match(PATRON_ID);
  return coincidencia ? coincidencia[1] : null;
}

export function urlVideo(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function urlEmbed(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

export function miniatura(id, calidad = "hqdefault") {
  return `https://i.ytimg.com/vi/${id}/${calidad}.jpg`;
}

/** Título y canal públicos mediante oEmbed (sin clave). Devuelve null si falla. */
export async function datosPublicos(id) {
  try {
    const respuesta = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(urlVideo(id))}&format=json`,
    );
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return { titulo: datos.title, canal: datos.author_name };
  } catch {
    return null;
  }
}
