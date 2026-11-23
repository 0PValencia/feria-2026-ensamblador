import { Avatar, ChipRazon, colorNombre, iconoClase } from "./comun.jsx";
import { Icono } from "./iconos.jsx";

const TARJETA = {
  real: "border-[#2f9a45] bg-[#163221]",
  sospechoso: "border-[#e0a100] bg-[#3a2c0c]",
  bot: "border-[#ff8b98] pulso-bot",
};

const INSIGNIA = {
  real: "bg-[#146c3a] text-[#e9fff2]",
  sospechoso: "bg-[#8a6208] text-[#fff6dd]",
  bot: "bg-[#a3162a] text-[#fff1f3]",
};

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

function alertasActivas(comentarios, bloqueado) {
  const alertas = [];
  const vistos = new Set();
  for (const comentario of comentarios) {
    if (vistos.has(comentario.usuario)) continue;
    vistos.add(comentario.usuario);
    if (comentario.clasificacion === "real" || bloqueado.has(comentario.usuario)) continue;
    alertas.push(comentario);
  }
  return alertas;
}

export default function PanelMuro({ comentarios, bloqueados, nombrePropio, onBloquear }) {
  const bloqueado = new Set(bloqueados);
  const alertas = alertasActivas(comentarios, bloqueado);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#141318]" aria-label="Muro de moderación">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <Leyenda icono="check" texto="Real" clase="text-[#8ee8a8]" />
        <Leyenda icono="alerta" texto="Sospechoso" clase="text-[#ffd27a]" />
        <Leyenda icono="bot" texto="Bot" clase="text-[#ffb3bc]" />
        <span className="ml-auto text-sm text-[#d2ccdf] tabular">{comentarios.length}</span>
      </div>
      {alertas.length > 0 && (
        <ul className="flex shrink-0 gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {alertas.map((alerta) => (
            <li key={alerta.usuario}>
              <button
                type="button"
                aria-label={`Bloquear a ${alerta.usuario}`}
                onClick={() => onBloquear(alerta.usuario)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#a3162a] px-3 font-semibold text-white"
              >
                <Avatar nombre={alerta.usuario} tam="sm" />
                <span className="max-w-28 truncate">{alerta.usuario}</span>
                <Icono nombre="ban" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto scroll px-4 py-4">
        {comentarios.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center text-[#d2ccdf]">
            <Icono nombre="muro" className="size-16 text-[#6442a4]" />
            <p className="text-lg font-semibold text-white">El chat en vivo aparece aquí</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {comentarios.map((comentario) => {
              const clase = comentario.clasificacion;
              const esAlerta = clase === "sospechoso" || clase === "bot";
              const yaBloqueado = bloqueado.has(comentario.usuario);
              if (!esAlerta) {
                return (
                  <li key={comentario.id}>
                    <article
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${TARJETA.real}`}
                      aria-label={`${comentario.etiqueta}. ${comentario.usuario}`}
                    >
                      <Avatar nombre={comentario.usuario} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold" style={{ color: colorNombre(comentario.usuario) }}>
                            {comentario.usuario}
                          </p>
                          {comentario.usuario === nombrePropio && (
                            <span className="rounded-full bg-white/15 px-2 text-sm">Tú</span>
                          )}
                          <time className="ml-auto shrink-0 text-sm text-[#d2ccdf] tabular">{comentario.hora}</time>
                        </div>
                        <p className="break-words leading-6">{comentario.texto}</p>
                      </div>
                      <span className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold sm:inline-flex ${INSIGNIA.real}`}>
                        <Icono nombre="check" className="size-4" />
                        Real
                        <span className="sr-only">{comentario.etiqueta}</span>
                      </span>
                    </article>
                  </li>
                );
              }
              return (
                <li key={comentario.id}>
                  <article
                    className={`flex gap-4 rounded-2xl border px-4 py-4 ${TARJETA[clase] || TARJETA.real}`}
                    aria-label={`${comentario.etiqueta}. ${comentario.usuario}`}
                  >
                    <Avatar nombre={comentario.usuario} tam="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-lg font-bold" style={{ color: colorNombre(comentario.usuario) }}>
                          {comentario.usuario}
                        </p>
                        {comentario.usuario === nombrePropio && (
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-sm">Tú</span>
                        )}
                        <time className="text-sm text-[#d2ccdf] tabular">{comentario.hora}</time>
                      </div>
                      <p className="mt-1 break-words text-base leading-6">{comentario.texto}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${INSIGNIA[clase]}`}>
                          <Icono nombre={iconoClase(clase)} className="size-4" />
                          {comentario.etiqueta}
                        </span>
                        {comentario.razones?.map((razon) => (
                          <ChipRazon key={razon} razon={razon} detalle={evidencia(razon, comentario.reglas)} />
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 self-center">
                      {yaBloqueado ? (
                        <p className="inline-flex items-center gap-1.5 text-sm font-bold">
                          <Icono nombre="candado" className="size-4" />
                          Bloqueada
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onBloquear(comentario.usuario)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#9f1239] px-4 font-bold text-white"
                        >
                          <Icono nombre="ban" className="size-4" />
                          Bloquear
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function Leyenda({ icono, texto, clase }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${clase}`}>
      <Icono nombre={icono} className="size-4" />
      {texto}
    </span>
  );
}
