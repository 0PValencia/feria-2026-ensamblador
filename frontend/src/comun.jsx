import { Icono } from "./iconos.jsx";

const COLORES = ["#ff8b9a", "#8ee8a8", "#9dc4ff", "#ffd27a", "#e7b3ff", "#8eefe8", "#ffd0e0", "#d5f09a"];

export function colorNombre(nombre) {
  let hash = 0;
  const texto = nombre || "?";
  for (let i = 0; i < texto.length; i += 1) hash = (hash * 33 + texto.charCodeAt(i)) >>> 0;
  return COLORES[hash % COLORES.length];
}

export function Avatar({ nombre, tam = "md" }) {
  const medida = tam === "sm" ? "size-8 text-sm" : tam === "lg" ? "size-12 text-xl" : "size-10 text-base";
  const letra = (nombre || "?").trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[#18181b] ${medida}`}
      style={{ backgroundColor: colorNombre(nombre) }}
      aria-hidden="true"
    >
      {letra}
    </span>
  );
}

const CHIPS = {
  "Mensajes enviados muy rápido": ["rayo", "Muy rápido"],
  "Mensajes repetidos o casi idénticos": ["copiar", "Casi idéntico"],
  "Contenido con enlaces o mayúsculas excesivas": ["enlace", "Enlaces o mayúsculas"],
  "Riesgo mantenido por la actividad reciente": ["reloj", "Riesgo reciente"],
};

export function iconoClase(clase) {
  if (clase === "bot") return "bot";
  if (clase === "sospechoso") return "alerta";
  return "check";
}

export function ChipRazon({ razon, detalle }) {
  const [icono, corto] = CHIPS[razon] || ["alerta", razon];
  return (
    <span
      title={detalle || razon}
      className="inline-flex h-6 items-center gap-1 rounded-full bg-[#2f2f35] px-2 text-xs font-semibold text-[#efeff1]"
    >
      <Icono nombre={icono} className="size-3.5" />
      {corto}
      <span className="sr-only">. {detalle || razon}</span>
    </span>
  );
}
