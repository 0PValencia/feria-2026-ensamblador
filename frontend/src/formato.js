const compacto = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const corta = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const completa = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const numero = (n) => compacto.format(n || 0);
export const fechaCorta = (iso) => corta.format(new Date(iso));
export const fechaCompleta = (iso) => completa.format(new Date(iso));

export function haceCuanto(iso) {
  const segundos = (Date.parse(iso) - Date.now()) / 1000;
  const pasos = [
    [60, "second"],
    [3600, "minute", 60],
    [86400, "hour", 3600],
    [2592000, "day", 86400],
    [Infinity, "month", 2592000],
  ];
  for (const [limite, unidad, divisor = 1] of pasos) {
    if (Math.abs(segundos) < limite) return relativo.format(Math.round(segundos / divisor), unidad);
  }
  return "";
}

export const NIVELES = {
  alto: { titulo: "Alto riesgo", corto: "ALTO RIESGO", fondo: "bg-[#eb0400]", texto: "text-[#ff8280]", punto: "bg-[#eb0400]" },
  medio: { titulo: "Riesgo medio", corto: "RIESGO MEDIO", fondo: "bg-[#ffb31a] text-[#18181b]", texto: "text-[#ffca5f]", punto: "bg-[#ffb31a]" },
  bajo: { titulo: "Bajo riesgo", corto: "BAJO RIESGO", fondo: "bg-[#00a85c]", texto: "text-[#5cffb0]", punto: "bg-[#00c76f]" },
};
