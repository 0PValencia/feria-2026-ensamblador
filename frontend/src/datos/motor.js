// Versión en el navegador de las tres reglas del backend (backend/app/detector.py).
// Solo se usa para generar los datos de ejemplo. El backend real hace el análisis.

export const UMBRALES_POR_DEFECTO = {
  ventana_segundos: 5,
  mensajes_maximos: 3,
  similitud_umbral: 0.8,
  puntos_frecuencia: 40,
  puntos_similitud: 50,
  puntos_patrones: 20,
  mayusculas_umbral: 0.7,
  umbral_sospechoso: 40,
  umbral_bot: 70,
  ventana_observacion: 30,
};

export const RAZONES = {
  frecuencia: "Mensajes enviados muy rápido",
  similitud: "Mensajes repetidos o casi idénticos",
  patrones: "Contenido con enlaces o mayúsculas excesivas",
};

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Aproximación de difflib.SequenceMatcher.ratio() con bigramas de caracteres.
function similitud(a, b) {
  if (a === b) return 1;
  const pares = (texto) => {
    const lista = [];
    for (let i = 0; i < texto.length - 1; i += 1) lista.push(texto.slice(i, i + 2));
    return lista;
  };
  const pa = pares(a);
  const pb = pares(b);
  if (!pa.length || !pb.length) return 0;
  const conteo = new Map();
  for (const par of pa) conteo.set(par, (conteo.get(par) || 0) + 1);
  let comunes = 0;
  for (const par of pb) {
    const n = conteo.get(par);
    if (n) {
      comunes += 1;
      conteo.set(par, n - 1);
    }
  }
  return (2 * comunes) / (pa.length + pb.length);
}

export function clasificar(riesgo, u) {
  if (riesgo >= u.umbral_bot) return "bot";
  if (riesgo >= u.umbral_sospechoso) return "sospechoso";
  return "real";
}

/** Aplica las reglas en orden cronológico y devuelve comentarios, cuentas y resumen. */
export function analizar(comentarios, u = UMBRALES_POR_DEFECTO) {
  const historial = new Map();
  const resultado = comentarios.map((comentario) => {
    const marca = Date.parse(comentario.fecha) / 1000;
    const previo = historial.get(comentario.autor) || [];
    const texto = normalizar(comentario.texto);
    const razones = [];
    let riesgo = 0;

    const enVentana = previo.filter((p) => marca - p.marca <= u.ventana_segundos).length + 1;
    if (enVentana > u.mensajes_maximos) {
      riesgo += u.puntos_frecuencia;
      razones.push(RAZONES.frecuencia);
    }
    const maxSimilitud = previo.reduce((max, p) => Math.max(max, similitud(texto, p.texto)), 0);
    if (maxSimilitud > u.similitud_umbral) {
      riesgo += u.puntos_similitud;
      razones.push(RAZONES.similitud);
    }
    const enlaces = (comentario.texto.match(/https?:\/\/|www\.|\b\w+\.(?:ly|com|net|xyz|io)\//gi) || []).length;
    const letras = comentario.texto.replace(/[^a-záéíóúñ]/gi, "");
    const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
    const gritando = letras.length >= 10 && mayusculas / letras.length > u.mayusculas_umbral;
    if (enlaces >= 2 || gritando) {
      riesgo += u.puntos_patrones;
      razones.push(RAZONES.patrones);
    }

    // Se mantiene el riesgo más alto de la cuenta durante la ventana de observación.
    const reciente = previo.filter((p) => marca - p.marca <= u.ventana_observacion);
    const pico = reciente.reduce((max, p) => Math.max(max, p.riesgo), 0);
    const final = Math.min(100, Math.max(riesgo, pico));
    historial.set(comentario.autor, [...previo, { marca, texto, riesgo: final }].slice(-15));

    return { ...comentario, riesgo: final, clasificacion: clasificar(final, u), razones };
  });

  const cuentasMapa = new Map();
  for (const c of resultado) {
    const cuenta = cuentasMapa.get(c.autor) || {
      autor: c.autor,
      riesgo: 0,
      comentarios: 0,
      razones: new Set(),
      ejemplo: c.texto,
    };
    cuenta.comentarios += 1;
    if (c.riesgo >= cuenta.riesgo) {
      cuenta.riesgo = c.riesgo;
      cuenta.ejemplo = c.texto;
    }
    c.razones.forEach((r) => cuenta.razones.add(r));
    cuentasMapa.set(c.autor, cuenta);
  }
  const cuentas = [...cuentasMapa.values()]
    .map((cuenta) => ({ ...cuenta, razones: [...cuenta.razones], clasificacion: clasificar(cuenta.riesgo, u) }))
    .sort((a, b) => b.riesgo - a.riesgo);

  const contar = (lista, clase) => lista.filter((x) => x.clasificacion === clase).length;
  const resumen = {
    comentarios: resultado.length,
    cuentas: cuentas.length,
    cuentas_reales: contar(cuentas, "real"),
    cuentas_sospechosas: contar(cuentas, "sospechoso"),
    cuentas_bot: contar(cuentas, "bot"),
    comentarios_bot: contar(resultado, "bot"),
    comentarios_sospechosos: contar(resultado, "sospechoso"),
    riesgo_medio: resultado.length
      ? Math.round(resultado.reduce((s, c) => s + c.riesgo, 0) / resultado.length)
      : 0,
  };
  const porcentaje = (n) => (resumen.comentarios ? Math.round((n / resumen.comentarios) * 100) : 0);
  resumen.porcentaje_bots = porcentaje(resumen.comentarios_bot);
  resumen.porcentaje_sospechosos = porcentaje(resumen.comentarios_sospechosos);
  return { comentarios: resultado, cuentas, resumen };
}

/** Nivel de riesgo del video según el porcentaje de comentarios clasificados como bot. */
export function nivelRiesgo(porcentajeBots) {
  if (porcentajeBots >= 20) return "alto";
  if (porcentajeBots >= 8) return "medio";
  return "bajo";
}
