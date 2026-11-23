import { useRef, useState } from "react";
import toma from "./assets/stream.jpg";
import { Icono } from "./iconos.jsx";

const MOMENTOS = ["Tráfico real", "Ataque", "Detección", "Moderación"];

export default function Reproductor({ conectado, stats, paso, espectadores, alerta }) {
  const marco = useRef(null);
  const [pausado, setPausado] = useState(false);
  const [silencio, setSilencio] = useState(true);
  const serie = stats.serie_riesgo || [];
  const riesgo = Math.round(serie[serie.length - 1] || 0);
  const ataque = Boolean(stats.ataque_activo);

  function pantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else marco.current?.requestFullscreen?.();
  }

  return (
    <div
      ref={marco}
      className={`group relative aspect-video w-full overflow-hidden bg-black ${ataque ? "en-ataque" : ""}`}
    >
      <img
        src={toma}
        alt="Transmisión de demostración: carrera futurista en una ciudad de neón"
        className={`toma absolute inset-0 size-full object-cover ${pausado ? "pausada" : ""} ${conectado ? "" : "opacity-30 grayscale"}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      {ataque && <div className="vineta pointer-events-none absolute inset-0" aria-hidden="true" />}

      <div className="absolute left-3 top-3 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[13px] font-extrabold uppercase tracking-wide text-white ${
            conectado ? "bg-[#eb0400]" : "bg-[#53535f]"
          }`}
        >
          {conectado ? "En vivo" : "Sin señal"}
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[13px] font-semibold text-white tabular backdrop-blur-sm">
          <Icono nombre="usuario" className="size-3.5 text-[#ff8280]" />
          {espectadores}
        </span>
      </div>

      <dl className="absolute right-3 top-3 flex gap-1 rounded-md bg-black/60 p-1 text-white backdrop-blur-sm">
        <Hud titulo="msg/s" valor={stats.mensajes_por_segundo || 0} />
        <Hud
          titulo="riesgo"
          valor={`${riesgo}%`}
          tono={riesgo >= 70 ? "text-[#ff8280]" : riesgo >= 40 ? "text-[#ffca5f]" : "text-[#5cffb0]"}
        />
        <Hud titulo="bloq." valor={stats.cuentas_bloqueadas || 0} />
      </dl>

      {ataque && (
        <p className="absolute left-1/2 top-3 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#eb0400]/90 px-3 py-1 text-xs font-bold text-white sm:inline-flex">
          <Icono nombre="rayo" className="size-3.5" />
          Ataque en curso · {stats.cantidad_bots} bots
        </p>
      )}

      {!conectado && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-white">
          <Icono nombre="senal" className="size-10 text-[#adadb8]" />
          <p className="text-lg font-bold">Reconectando con el servidor…</p>
          <p className="text-sm text-[#adadb8]">El análisis se reanudará automáticamente.</p>
        </div>
      )}

      {alerta && (
        <div
          key={alerta.clave}
          role="status"
          className="alerta-entrada absolute bottom-16 left-3 flex max-w-[min(360px,80%)] items-center gap-3 rounded-md border border-[#eb0400]/60 bg-[#18181b]/95 p-2.5 pr-4 text-white shadow-2xl"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded bg-[#eb0400]">
            <Icono nombre="bot" className="size-6" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#ff8280]">
              Bot detectado · {alerta.riesgo}%
            </span>
            <span className="block truncate text-sm font-bold">{alerta.usuario}</span>
            <span className="block truncate text-xs text-[#adadb8]">{alerta.razon}</span>
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 px-2 pb-2 pt-6 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Control etiqueta={pausado ? "Reproducir" : "Pausar"} onClick={() => setPausado((valor) => !valor)}>
          <Icono nombre={pausado ? "play" : "pausa"} className="size-5" />
        </Control>
        <Control etiqueta={silencio ? "Activar sonido" : "Silenciar"} onClick={() => setSilencio((valor) => !valor)}>
          <span className="relative">
            <Icono nombre="volumen" className="size-5" />
            {silencio && <span className="absolute left-1/2 top-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-white" />}
          </span>
        </Control>
        <ol className="ml-2 hidden items-center gap-1 md:flex" aria-label="Momento de la demostración">
          {MOMENTOS.map((momento, indice) => {
            const actual = indice + 1 === paso;
            const hecho = indice + 1 < paso;
            return (
              <li
                key={momento}
                aria-current={actual ? "step" : undefined}
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  actual ? "bg-[#9147ff] text-white" : hecho ? "bg-white/20 text-white" : "bg-black/40 text-white/60"
                }`}
              >
                {indice + 1}. {momento}
              </li>
            );
          })}
        </ol>
        <span className="ml-auto" />
        <Control etiqueta="Pantalla completa" onClick={pantallaCompleta}>
          <Icono nombre="pantalla" className="size-5" />
        </Control>
      </div>
    </div>
  );
}

function Hud({ titulo, valor, tono = "text-white" }) {
  return (
    <div className="min-w-12 rounded px-2 py-0.5 text-center">
      <dd className={`text-sm font-extrabold leading-tight tabular ${tono}`}>{valor}</dd>
      <dt className="text-[10px] uppercase tracking-wide text-white/70">{titulo}</dt>
    </div>
  );
}

function Control({ etiqueta, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded hover:bg-white/15"
    >
      {children}
    </button>
  );
}
