const TARJETA = {
  real: "border-[#1f9d57] bg-[#102418]",
  sospechoso: "border-[#e0a100] bg-[#2a2208]",
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
    <section className="flex h-[78dvh] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#31415f] bg-[#121a2e] min-[1200px]:h-full">
      <header className="shrink-0 border-b border-[#31415f] px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Muro de moderación</h2>
            <p className="text-sm text-[#d5e0f5]">Los mensajes más recientes aparecen arriba.</p>
          </div>
          <p className="text-sm text-[#d5e0f5] tabular">{comentarios.length} en pantalla</p>
        </div>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          <li className="rounded-full bg-[#146c3a] px-3 py-1 text-[#e9fff2]">Verde: usuario real</li>
          <li className="rounded-full bg-[#8a6208] px-3 py-1 text-[#fff6dd]">Ámbar: sospechoso</li>
          <li className="rounded-full bg-[#a3162a] px-3 py-1 text-[#fff1f3]">Rojo: bot</li>
        </ul>
        {alertas.length > 0 && (
          <ul className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto">
            {alertas.map((alerta) => (
              <li key={alerta.usuario} className="flex items-center justify-between gap-2 rounded-lg bg-[#0c1222] px-2 py-1">
                <span className="text-sm">
                  {alerta.usuario} · {alerta.etiqueta}
                </span>
                <button
                  type="button"
                  aria-label={`Bloquear a ${alerta.usuario}`}
                  onClick={() => onBloquear(alerta.usuario)}
                  className="min-h-11 shrink-0 rounded-lg bg-[#9f1239] px-3 font-semibold text-white"
                >
                  Bloquear
                </button>
              </li>
            ))}
          </ul>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {comentarios.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#31415f] px-4 py-8 text-center text-[#d5e0f5]">
            Aún no hay comentarios. El tráfico sintético de usuarios reales empieza con el servidor.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {comentarios.map((comentario) => {
              const clase = comentario.clasificacion;
              const esAlerta = clase === "sospechoso" || clase === "bot";
              const yaBloqueado = bloqueado.has(comentario.usuario);
              return (
                <li key={comentario.id}>
                  <article
                    className={`rounded-xl border px-3 py-3 ${TARJETA[clase] || TARJETA.real}`}
                    aria-label={`${comentario.etiqueta}. ${comentario.usuario}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">
                        {comentario.usuario}
                        {comentario.usuario === nombrePropio ? (
                          <span className="ml-2 text-sm font-medium text-[#d5e0f5]">Tu mensaje</span>
                        ) : null}
                      </p>
                      <time className="text-sm text-[#d5e0f5] tabular">{comentario.hora}</time>
                    </div>
                    <p className="mt-1 break-all">{comentario.texto}</p>
                    <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${INSIGNIA[clase]}`}>
                      {comentario.etiqueta}
                    </p>
                    {comentario.razones?.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {comentario.razones.map((razon) => (
                          <li key={razon} className="text-sm text-[#f4f7ff]">
                            Razón: {evidencia(razon, comentario.reglas)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {comentario.mantenido && comentario.riesgo !== comentario.riesgo_mensaje && (
                      <p className="mt-1 text-sm text-[#d5e0f5]">
                        Este mensaje, por sí solo, suma {comentario.riesgo_mensaje} %.
                      </p>
                    )}
                    {esAlerta && (
                      <div className="mt-3">
                        {yaBloqueado ? (
                          <p className="text-sm font-semibold">Cuenta bloqueada</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onBloquear(comentario.usuario)}
                            className="min-h-11 rounded-lg bg-[#9f1239] px-4 font-semibold text-white"
                          >
                            Bloquear
                          </button>
                        )}
                      </div>
                    )}
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
