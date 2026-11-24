// Generador determinista de comentarios de ejemplo. Se reemplaza por la
// YouTube Data API cuando el backend esté conectado (ver docs/ANALISIS_YOUTUBE.md).

function aleatorio(semilla) {
  let h = 1779033703 ^ semilla.length;
  for (let i = 0; i < semilla.length; i += 1) {
    h = Math.imul(h ^ semilla.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const NOMBRES = [
  "Laura Torres", "Kevin Rojas", "Mariana López", "Andrés Gil", "Sofía Ramírez", "Diego Herrera",
  "Valentina Cruz", "Javier Mendoza", "Camila Vargas", "Mateo Castro", "Lucía Romero", "Tomás Silva",
  "Isabella Ortiz", "Sebastián Ruiz", "Paula Navarro", "Nicolás Peña", "Daniela Ríos", "Gabriel Soto",
  "Renata Flores", "Emilio Vega", "Antonella Paz", "Joaquín Mora", "Martina Salas", "Bruno Campos",
];

const REALES = [
  "Esta canción me trae demasiados recuerdos",
  "Quién más la escucha en 2026?",
  "El minuto 1:20 es lo mejor de todo el video",
  "Llegué aquí por un video de reacciones y no me arrepiento",
  "La producción de este video sigue siendo increíble",
  "Mi papá me la puso cuando era niño y ahora se la pongo a mi hermana",
  "Qué buena calidad para los años que tiene",
  "Alguien sabe dónde se grabó esto?",
  "No me canso de verlo, siempre encuentro un detalle nuevo",
  "La versión en vivo también es muy buena",
  "Vine por la tarea de música y me quedé un buen rato",
  "El ritmo es contagioso, imposible no moverse",
  "Saludos desde Cochabamba",
  "Lo escuché en la radio esta mañana y tuve que buscarlo",
  "Este video merece muchas más vistas",
  "La letra tiene más sentido cuando creces",
];

const CAMPANAS = [
  "Gana 500 dólares al día desde casa, escríbeme al WhatsApp que está en mi perfil",
  "Sorteo de un iPhone para los primeros 100 que entren a premios-gratis.xyz/ya y www.reclama.io/hoy",
  "SUSCRÍBETE A MI CANAL Y TE SIGO DE VUELTA, ACTIVOS TODOS",
  "Invierte en cripto con mi mentor, me cambió la vida, búscalo en Telegram",
];

const VARIACIONES = ["", "!!", " de verdad", " hoy mismo", " ya", ", no es broma", " 100%", "..."];

function nombreBot(rng) {
  const base = NOMBRES[Math.floor(rng() * NOMBRES.length)].split(" ")[0];
  return `${base} ${Math.floor(rng() * 9000 + 1000)}`;
}

/**
 * Flujo cronológico de comentarios de un video. Cada análisis toma los primeros
 * `n` comentarios, así un análisis posterior contiene al anterior y suma nuevos.
 */
export function generarFlujo(semilla, { total, publicado, ataques = [] }) {
  const rng = aleatorio(semilla);
  const lista = [];
  let tiempo = Date.parse(publicado);
  let secuencia = 0;
  const pendientes = [...ataques].sort((a, b) => a.desde - b.desde);
  const usadas = new Map();

  while (lista.length < total) {
    if (pendientes.length && lista.length >= pendientes[0].desde) {
      const ataque = pendientes.shift();
      const campana = CAMPANAS[Math.floor(rng() * CAMPANAS.length)];
      for (let b = 0; b < ataque.bots && lista.length < total; b += 1) {
        const autor = nombreBot(rng);
        const rafaga = 3 + Math.floor(rng() * 3);
        let marca = tiempo + Math.floor(rng() * 60000);
        for (let r = 0; r < rafaga && lista.length < total; r += 1) {
          marca += 600 + Math.floor(rng() * 1100);
          lista.push({
            id: `${semilla}-${(secuencia += 1)}`,
            autor,
            texto: campana + VARIACIONES[Math.floor(rng() * VARIACIONES.length)],
            fecha: new Date(marca).toISOString(),
            me_gusta: Math.floor(rng() * 2),
          });
        }
      }
      tiempo += 120000;
      continue;
    }
    tiempo += Math.floor(60000 + rng() * 5400000);
    const autor = NOMBRES[Math.floor(rng() * NOMBRES.length)];
    // De vez en cuando alguien muy activo escribe varios comentarios distintos en segundos:
    // solo cumple la regla de frecuencia y queda como sospechoso, no como bot.
    if (rng() < 0.035 && lista.length + 4 <= total) {
      const activo = `${autor.split(" ")[0]} ${["Fan", "Live", "Music"][Math.floor(rng() * 3)]}`;
      [...REALES].sort(() => rng() - 0.5).slice(0, 4).forEach((frase, i) => {
        lista.push({
          id: `${semilla}-${(secuencia += 1)}`,
          autor: activo,
          texto: frase,
          fecha: new Date(tiempo + i * 1200).toISOString(),
          me_gusta: Math.floor(rng() * 20),
        });
      });
      continue;
    }
    // Una persona real no repite la misma frase: se elige una que no haya usado.
    const propias = usadas.get(autor) || new Set();
    const libres = REALES.filter((frase) => !propias.has(frase));
    const texto = libres.length ? libres[Math.floor(rng() * libres.length)] : `${REALES[0]} (${propias.size})`;
    propias.add(texto);
    usadas.set(autor, propias);
    lista.push({
      id: `${semilla}-${(secuencia += 1)}`,
      autor,
      texto,
      fecha: new Date(tiempo).toISOString(),
      me_gusta: Math.floor(rng() * 400),
    });
  }
  return lista.sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
}

const dias = (n) => new Date(Date.now() - n * 86400000).toISOString();

/** Videos guardados de ejemplo. `analisis[].n` es cuántos comentarios del flujo se tomaron. */
export const VIDEOS_EJEMPLO = [
  {
    id: "kJQP7kiw5Fk",
    titulo: "Luis Fonsi - Despacito ft. Daddy Yankee",
    canal: "Luis Fonsi",
    flujo: { total: 190, publicado: dias(40), ataques: [{ desde: 70, bots: 6 }, { desde: 150, bots: 9 }] },
    analisis: [{ n: 90, fecha: dias(21) }, { n: 140, fecha: dias(9) }, { n: 190, fecha: dias(1) }],
  },
  {
    id: "dQw4w9WgXcQ",
    titulo: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    canal: "Rick Astley",
    flujo: { total: 150, publicado: dias(30), ataques: [{ desde: 100, bots: 4 }] },
    analisis: [{ n: 95, fecha: dias(12) }, { n: 150, fecha: dias(2) }],
  },
  {
    id: "9bZkp7q19f0",
    titulo: "PSY - GANGNAM STYLE M/V",
    canal: "officialpsy",
    flujo: { total: 170, publicado: dias(35), ataques: [{ desde: 30, bots: 10 }] },
    analisis: [{ n: 120, fecha: dias(14) }, { n: 170, fecha: dias(3) }],
  },
  {
    id: "JGwWNGJdvx8",
    titulo: "Ed Sheeran - Shape of You (Official Music Video)",
    canal: "Ed Sheeran",
    flujo: { total: 120, publicado: dias(20), ataques: [] },
    analisis: [{ n: 120, fecha: dias(4) }],
  },
  {
    id: "OPf0YbXqDm0",
    titulo: "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars",
    canal: "Mark Ronson",
    flujo: { total: 140, publicado: dias(25), ataques: [{ desde: 60, bots: 3 }] },
    analisis: [{ n: 140, fecha: dias(5) }],
  },
  {
    id: "fJ9rUzIMcZQ",
    titulo: "Queen – Bohemian Rhapsody (Official Video Remastered)",
    canal: "Queen Official",
    flujo: { total: 130, publicado: dias(28), ataques: [] },
    analisis: [{ n: 80, fecha: dias(15) }, { n: 130, fecha: dias(6) }],
  },
  {
    id: "RgKAFK5djSk",
    titulo: "Wiz Khalifa - See You Again ft. Charlie Puth",
    canal: "Wiz Khalifa",
    flujo: { total: 160, publicado: dias(33), ataques: [{ desde: 40, bots: 5 }, { desde: 120, bots: 7 }] },
    analisis: [{ n: 160, fecha: dias(7) }],
  },
  {
    id: "jNQXAC9IVRw",
    titulo: "Me at the zoo",
    canal: "jawed",
    flujo: { total: 90, publicado: dias(18), ataques: [] },
    analisis: [{ n: 90, fecha: dias(8) }],
  },
];

/** Parámetros de flujo para un video nuevo analizado desde la interfaz. */
export function flujoParaNuevo(id, limite) {
  const rng = aleatorio(id);
  const total = Math.max(60, Math.min(limite, 240));
  const ataques = rng() > 0.35 ? [{ desde: Math.floor(total * (0.3 + rng() * 0.4)), bots: 2 + Math.floor(rng() * 8) }] : [];
  return { total: total + 120, publicado: dias(10 + Math.floor(rng() * 30)), ataques, inicial: total };
}
