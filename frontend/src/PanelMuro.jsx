import { Avatar, ChipRazon, colorNombre } from "./comun.jsx";
import { Icono } from "./iconos.jsx";

function evidencia(razon, reglas) {
  if (!reglas) return razon;
  if (razon === "Mensajes enviados muy rápido") {
    return `${razon} (${reglas.mensajes_en_ventana} en la ventana, +${reglas.puntos_frecuencia} %)`;
  }
  if (razon === "Mensajes repetidos o casi idénticos") {
    return `${razon} (similitud ${Number(reglas.similitud_max).toFixed(2)}, +${reglas.puntos_similitud} %)`;
  }
  if (razon === "Contenido con enlaces o mayúsculas excesivas") {
    const partes = [];
    if (reglas.disparo_urls) partes.push(`${reglas.urls} enlaces`);
    if (reglas.disparo_mayusculas) {
      partes.push(`${Math.round(reglas.proporcion_mayusculas * 100)} % mayúsculas`);
    }
    const extra = partes.length ? ` (${partes.join(", ")})` : "";
    return `${razon}${extra} (+${reglas.puntos_patrones} %)`;
  }
  return razon;
}

export function alertasActivas(comentarios, bloqueados) {
  const bloqueado = new Set(bloqueados);
  const alertas = [];
  const vistos = new Set();
  for (const comentario of comentarios) {
    if (vistos.has(comentario.usuario)) continue;
    vistos.add(comentario.usuario);
    if (comentario.clasificacion === "real" || bloqueado.has(comentario.usuario)) continue;
    alertas.push(comentario);
  }
  return alertas.sort((a, b) => b.riesgo - a.riesgo);
}

export default function PanelMuro({ alertas, filtro, onLimpiarFiltro, onBloquear }) {
  return (
    <section aria-labelledby="titulo-cola" className="px-4 pb-8 pt-2 sm:px-6">
      <div className="mb-3 flex items-center gap-3">
        <h2 id="titulo-cola" className="flex items-center gap-2 text-base font-bold">
          <Icono nombre="escudo" className="size-5 text-[#bf94ff]" />
          Cola de moderación
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold tabular ${
            alertas.length ? "bg-[#eb0400] text-white" : "bg-[#2f2f35] text-[#adadb8]"
          }`}
        >
          {alertas.length}
        </span>
        {filtro && (
          <button
            type="button"
            onClick={onLimpiarFiltro}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#2f2f35] px-3 py-1 text-xs font-semibold hover:bg-[#3a3a3d]"
          >
            Filtro: {filtro}
            <Icono nombre="cerrar" className="size-3.5" />
          </button>
        )}
      </div>

      {alertas.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-[#2f2f35] px-4 py-5 text-sm text-[#adadb8]">
          <Icono nombre="check" className="size-5 text-[#00c76f]" />
          {filtro ? "Ninguna alerta coincide con el filtro." : "Sin alertas. Todo el tráfico parece real."}
        </div>
      ) : (
        <ol className="grid gap-2 lg:grid-cols-2">
          {alertas.map((alerta) => {
            const bot = alerta.clasificacion === "bot";
            return (
              <li
                key={alerta.usuario}
                className={`flex gap-3 rounded-md border-l-4 bg-[#1f1f23] p-3 ${bot ? "border-[#eb0400] alerta-bot" : "border-[#ffb31a]"}`}
              >
                <Avatar nombre={alerta.usuario} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold" style={{ color: colorNombre(alerta.usuario) }}>
                      {alerta.usuario}
                    </p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-px text-[11px] font-extrabold uppercase tabular ${
                        bot ? "bg-[#eb0400] text-white" : "bg-[#ffb31a] text-[#18181b]"
                      }`}
                    >
                      {bot ? "Bot" : "Sospechoso"} {alerta.riesgo}%
                    </span>
                    <time className="ml-auto shrink-0 text-xs text-[#7a7a85] tabular">{alerta.hora}</time>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[#adadb8]" title={alerta.texto}>
                    “{alerta.texto}”
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {alerta.razones?.map((razon) => (
                      <ChipRazon key={razon} razon={razon} detalle={evidencia(razon, alerta.reglas)} />
                    ))}
                    <span className="sr-only">{alerta.etiqueta}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onBloquear(alerta.usuario)}
                  aria-label={`Bloquear a ${alerta.usuario}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-md bg-[#2f2f35] px-3 text-sm font-bold text-[#efeff1] hover:bg-[#eb0400]"
                >
                  <Icono nombre="ban" className="size-4" />
                  <span className="hidden sm:inline">Bloquear</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
