import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { Avatar, ChipRazon, colorNombre } from "../comun.jsx";
import { Tendencia } from "../componentes/TarjetaVideo.jsx";
import { nivelRiesgo } from "../datos/motor.js";
import { fechaCompleta, fechaCorta, haceCuanto, NIVELES, numero } from "../formato.js";
import { Icono } from "../iconos.jsx";
import { comparar, eliminarVideo, obtenerVideo } from "../servicio/analisis.js";
import { miniatura, urlEmbed } from "../youtube.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);
ChartJS.defaults.color = "#adadb8";
ChartJS.defaults.font.family = '"Inter", "Open Sans", sans-serif';

const INSIGNIA = {
  bot: { clase: "bg-[#eb0400] text-white", icono: "bot", texto: "Bot" },
  sospechoso: { clase: "bg-[#ffb31a] text-[#18181b]", icono: "alerta", texto: "Sospechoso" },
};

export default function DetalleVideo({ id, version, onReanalizar, onEliminado }) {
  const [video, setVideo] = useState(undefined);
  const [indice, setIndice] = useState(null);
  const [base, setBase] = useState(null);
  const [autor, setAutor] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerVideo(id).then((datos) => {
      if (!vigente) return;
      setVideo(datos);
      if (datos) {
        setIndice(datos.analisis.length - 1);
        setBase(datos.analisis.length > 1 ? datos.analisis.length - 2 : null);
      }
    });
    return () => {
      vigente = false;
    };
  }, [id, version]);

  const actual = video && indice != null ? video.analisis[indice] : null;
  const anterior = video && base != null && base !== indice ? video.analisis[base] : null;
  const cambios = useMemo(() => (actual && anterior ? comparar(actual, anterior) : null), [actual, anterior]);

  if (video === undefined) {
    return (
      <div className="animate-pulse">
        <div className="aspect-video max-h-[70vh] bg-[#18181b]" />
        <div className="space-y-3 p-6">
          <div className="h-5 w-1/2 rounded bg-[#1f1f23]" />
          <div className="h-4 w-1/3 rounded bg-[#1f1f23]" />
        </div>
      </div>
    );
  }

  if (video === null) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Icono nombre="youtube" className="size-12 text-[#53535f]" />
        <h1 className="text-xl font-bold">Este video no está guardado</h1>
        <p className="text-[#adadb8]">Puede que se haya eliminado. Analízalo para guardarlo de nuevo.</p>
        <a href="#/" className="text-sm font-semibold text-[#bf94ff] hover:underline">
          Volver a Explorar
        </a>
      </div>
    );
  }

  const nivelClave = nivelRiesgo(actual.resumen.porcentaje_bots);
  const nivel = NIVELES[nivelClave];
  const opcionesBase = video.analisis.map((a, i) => ({ a, i })).filter(({ i }) => i !== indice);

  return (
    <div className="flex flex-col xl:h-full xl:flex-row">
      <div className="scroll min-w-0 flex-1 xl:overflow-y-auto">
        <div className="aspect-video max-h-[calc(100dvh-50px-120px)] w-full bg-black">
          <iframe
            src={urlEmbed(video.id)}
            title={`Video de YouTube: ${video.titulo}`}
            className="size-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        <section className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:px-6" aria-label="Información del video">
          <div className="relative shrink-0 self-start">
            <span className={`block rounded-full p-[3px] ${nivel.punto}`}>
              <img src={miniatura(video.id, "default")} alt="" className="size-16 rounded-full border-[3px] border-[#0e0e10] object-cover" />
            </span>
            <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1 text-[10px] font-extrabold uppercase ${nivel.fondo}`}>
              {nivelClave}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-snug">{video.titulo}</h1>
            <p className="mt-0.5 text-sm font-semibold text-[#bf94ff]">{video.canal}</p>
            <p className="mt-0.5 text-[13px] text-[#adadb8]">
              Guardado el {fechaCorta(video.guardado)} · {video.analisis.length} análisis · último {haceCuanto(video.analisis.at(-1).fecha)}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              <li className="rounded-full bg-[#2f2f35] px-2.5 py-0.5 text-xs font-semibold text-[#adadb8]">YouTube</li>
              <li className="rounded-full bg-[#2f2f35] px-2.5 py-0.5 text-xs font-semibold text-[#adadb8]">{nivel.titulo}</li>
              <li className="rounded-full bg-[#2f2f35] px-2.5 py-0.5 text-xs font-semibold text-[#adadb8]">
                {numero(actual.resumen.comentarios)} comentarios
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onReanalizar(video.url)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#9147ff] px-4 text-sm font-semibold text-white hover:bg-[#772ce8]"
            >
              <Icono nombre="refrescar" className="size-4" />
              Analizar de nuevo
            </button>
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#2f2f35] px-3 text-sm font-semibold hover:bg-[#3a3a3d]"
            >
              <Icono nombre="externo" className="size-4" />
              YouTube
            </a>
            <BotonEliminar
              onConfirmar={async () => {
                await eliminarVideo(video.id);
                onEliminado();
              }}
            />
          </div>
        </section>

        <div className="space-y-8 border-t border-[#2f2f35] px-4 py-5 sm:px-6">
          <section aria-labelledby="titulo-historial">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 id="titulo-historial" className="flex items-center gap-2 text-base font-bold">
                <Icono nombre="historial" className="size-5 text-[#bf94ff]" />
                Historial de análisis
              </h2>
              {video.analisis.length > 1 && (
                <label className="ml-auto flex items-center gap-2 text-sm">
                  <Icono nombre="comparar" className="size-4 text-[#adadb8]" />
                  <span className="text-[#adadb8]">Comparar con</span>
                  <select
                    value={base ?? ""}
                    onChange={(evento) => setBase(evento.target.value === "" ? null : Number(evento.target.value))}
                    className="h-8 rounded-md border-2 border-[#3a3a3d] bg-[#18181b] px-2 text-sm font-semibold outline-none focus:border-[#9147ff]"
                  >
                    <option value="">Sin comparar</option>
                    {opcionesBase.map(({ a, i }) => (
                      <option key={a.id} value={i}>
                        Análisis {i + 1} · {fechaCorta(a.fecha)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <ol className="scroll flex gap-2 overflow-x-auto pb-1">
              {video.analisis.map((a, i) => {
                const seleccionado = i === indice;
                const esBase = i === base && base !== indice;
                const nv = NIVELES[nivelRiesgo(a.resumen.porcentaje_bots)];
                return (
                  <li key={a.id} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={seleccionado}
                      onClick={() => {
                        setIndice(i);
                        if (base === i) setBase(i > 0 ? i - 1 : null);
                        else if (base == null && i > 0) setBase(i - 1);
                      }}
                      className={`w-44 rounded-md border-2 p-3 text-left transition-colors ${
                        seleccionado ? "border-[#9147ff] bg-[#9147ff]/10" : esBase ? "border-dashed border-[#53535f] bg-[#18181b]" : "border-transparent bg-[#1f1f23] hover:bg-[#26262c]"
                      }`}
                    >
                      <span className="flex items-center justify-between text-xs font-bold">
                        Análisis {i + 1}
                        {seleccionado ? (
                          <span className="rounded bg-[#9147ff] px-1.5 text-[10px] uppercase text-white">Viendo</span>
                        ) : esBase ? (
                          <span className="rounded bg-[#3a3a3d] px-1.5 text-[10px] uppercase">Base</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#adadb8]">{fechaCompleta(a.fecha)}</span>
                      <span className="mt-2 flex items-end justify-between">
                        <span className={`text-xl font-extrabold tabular ${nv.texto}`}>{a.resumen.porcentaje_bots}%</span>
                        <span className="text-xs text-[#adadb8] tabular">{a.resumen.comentarios} com.</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => onReanalizar(video.url)}
                  className="flex h-full min-h-[92px] w-36 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-[#3a3a3d] text-sm font-semibold text-[#adadb8] hover:border-[#9147ff] hover:text-[#bf94ff]"
                >
                  <Icono nombre="mas" className="size-5" />
                  Nuevo análisis
                </button>
              </li>
            </ol>
          </section>

          <section aria-labelledby="titulo-resumen">
            <h2 id="titulo-resumen" className="mb-3 flex items-center gap-2 text-base font-bold">
              <Icono nombre="grafica" className="size-5 text-[#bf94ff]" />
              Resumen del análisis {indice + 1}
              {anterior && <span className="text-sm font-normal text-[#adadb8]">vs análisis {base + 1}</span>}
            </h2>
            <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-6">
              <Kpi titulo="Comentarios" valor={actual.resumen.comentarios} previo={anterior?.resumen.comentarios} sufijo="" neutral />
              <Kpi titulo="Cuentas únicas" valor={actual.resumen.cuentas} previo={anterior?.resumen.cuentas} sufijo="" neutral />
              <Kpi titulo="Cuentas bot" valor={actual.resumen.cuentas_bot} previo={anterior?.resumen.cuentas_bot} sufijo="" tono="text-[#ff8280]" />
              <Kpi titulo="Sospechosas" valor={actual.resumen.cuentas_sospechosas} previo={anterior?.resumen.cuentas_sospechosas} sufijo="" tono="text-[#ffca5f]" />
              <Kpi titulo="% comentarios bot" valor={actual.resumen.porcentaje_bots} previo={anterior?.resumen.porcentaje_bots} formato={(v) => `${v}%`} tono={nivel.texto} />
              <Kpi titulo="Riesgo medio" valor={actual.resumen.riesgo_medio} previo={anterior?.resumen.riesgo_medio} formato={(v) => `${v}%`} />
            </dl>
            <div className="mt-3 grid gap-3 lg:grid-cols-5">
              <Grafico titulo="Evolución entre análisis" className="lg:col-span-3">
                {video.analisis.length > 1 ? (
                  <Line data={datosEvolucion(video.analisis, indice)} options={OPCIONES_LINEA} />
                ) : (
                  <SinComparar onReanalizar={() => onReanalizar(video.url)} />
                )}
              </Grafico>
              <Grafico titulo="Cuentas por clasificación" className="lg:col-span-2">
                <Doughnut
                  data={{
                    labels: ["Reales", "Sospechosas", "Bots"],
                    datasets: [
                      {
                        data: [actual.resumen.cuentas_reales, actual.resumen.cuentas_sospechosas, actual.resumen.cuentas_bot],
                        backgroundColor: ["#00a85c", "#ffb31a", "#eb0400"],
                        borderColor: "#1f1f23",
                        borderWidth: 3,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    cutout: "62%",
                    plugins: { legend: { position: "right", labels: { color: "#efeff1", boxWidth: 12, padding: 12 } } },
                  }}
                />
              </Grafico>
            </div>
          </section>

          {cambios && (
            <section aria-labelledby="titulo-cambios">
              <h2 id="titulo-cambios" className="mb-3 flex items-center gap-2 text-base font-bold">
                <Icono nombre="comparar" className="size-5 text-[#bf94ff]" />
                Qué cambió desde el análisis {base + 1}
              </h2>
              <div className="grid gap-2 md:grid-cols-3">
                <GrupoCambio
                  titulo="Nuevas cuentas marcadas"
                  descripcion="No estaban marcadas antes"
                  cuentas={cambios.nuevas}
                  tono="border-[#eb0400]"
                  onElegir={setAutor}
                />
                <GrupoCambio
                  titulo="Siguen marcadas"
                  descripcion="Aparecen en ambos análisis"
                  cuentas={cambios.siguen}
                  tono="border-[#ffb31a]"
                  onElegir={setAutor}
                />
                <GrupoCambio
                  titulo="Ya no aparecen marcadas"
                  descripcion="Bajaron de riesgo o se fueron"
                  cuentas={cambios.salieron}
                  tono="border-[#00a85c]"
                  onElegir={setAutor}
                />
              </div>
              <p className="mt-2 text-[13px] text-[#adadb8]">
                {cambios.comentariosNuevos.size} comentarios nuevos desde el {fechaCorta(anterior.fecha)}.
              </p>
            </section>
          )}

          <CuentasMarcadas cuentas={actual.cuentas} cambios={cambios} onElegir={setAutor} />
        </div>
      </div>

      <aside className="flex h-[75dvh] shrink-0 flex-col border-[#2f2f35] xl:h-full xl:w-[360px] xl:border-l">
        <PanelComentarios
          comentarios={actual.comentarios}
          nuevos={cambios?.comentariosNuevos}
          autor={autor}
          onQuitarAutor={() => setAutor(null)}
        />
      </aside>
    </div>
  );
}

const OPCIONES_LINEA = {
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: { legend: { position: "bottom", labels: { color: "#efeff1", boxWidth: 12 } } },
  scales: {
    x: { grid: { color: "rgba(173,173,184,.1)" } },
    y: { beginAtZero: true, ticks: { callback: (v) => `${v}%` }, grid: { color: "rgba(173,173,184,.1)" } },
  },
};

function datosEvolucion(analisis, indice) {
  const radios = analisis.map((_, i) => (i === indice ? 6 : 3));
  return {
    labels: analisis.map((a, i) => `#${i + 1} · ${fechaCorta(a.fecha)}`),
    datasets: [
      {
        label: "% comentarios bot",
        data: analisis.map((a) => a.resumen.porcentaje_bots),
        borderColor: "#eb0400",
        backgroundColor: "rgba(235,4,0,.15)",
        fill: true,
        tension: 0.3,
        pointRadius: radios,
      },
      {
        label: "% sospechosos",
        data: analisis.map((a) => a.resumen.porcentaje_sospechosos),
        borderColor: "#ffb31a",
        backgroundColor: "rgba(255,179,26,.1)",
        fill: true,
        tension: 0.3,
        pointRadius: radios,
      },
    ],
  };
}

function Kpi({ titulo, valor, previo, formato = (v) => numero(v), sufijo = "%", tono = "text-[#efeff1]", neutral = false }) {
  return (
    <div className="rounded-md bg-[#1f1f23] px-3 py-2.5">
      <dt className="text-xs text-[#adadb8]">{titulo}</dt>
      <dd className="flex items-baseline gap-2">
        <span className={`text-2xl font-extrabold tabular ${tono}`}>{formato(valor)}</span>
        {previo != null &&
          (neutral ? (
            <span className="text-xs font-semibold text-[#adadb8] tabular">
              {valor - previo >= 0 ? "+" : ""}
              {valor - previo}
            </span>
          ) : (
            <Tendencia actual={valor} previo={previo} sufijo={sufijo} className="text-xs" />
          ))}
      </dd>
    </div>
  );
}

function Grafico({ titulo, className = "", children }) {
  return (
    <section className={`rounded-md bg-[#1f1f23] p-4 ${className}`}>
      <h3 className="mb-2 text-sm font-bold">{titulo}</h3>
      <div className="h-56">{children}</div>
    </section>
  );
}

function SinComparar({ onReanalizar }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <Icono nombre="comparar" className="size-8 text-[#53535f]" />
      <p className="text-sm text-[#adadb8]">Solo hay un análisis. Analiza el video otra vez para ver cómo cambia.</p>
      <button type="button" onClick={onReanalizar} className="text-sm font-semibold text-[#bf94ff] hover:underline">
        Analizar de nuevo
      </button>
    </div>
  );
}

function GrupoCambio({ titulo, descripcion, cuentas, tono, onElegir }) {
  return (
    <div className={`rounded-md border-l-4 bg-[#1f1f23] p-3 ${tono}`}>
      <p className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{titulo}</span>
        <span className="text-2xl font-extrabold tabular">{cuentas.length}</span>
      </p>
      <p className="text-xs text-[#adadb8]">{descripcion}</p>
      {cuentas.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {cuentas.slice(0, 6).map((c) => (
            <li key={c.autor}>
              <button
                type="button"
                onClick={() => onElegir(c.autor)}
                className="inline-flex max-w-[150px] items-center gap-1 rounded-full bg-[#2f2f35] py-0.5 pl-0.5 pr-2 text-xs font-semibold hover:bg-[#3a3a3d]"
              >
                <Avatar nombre={c.autor} tam="sm" />
                <span className="truncate">{c.autor}</span>
              </button>
            </li>
          ))}
          {cuentas.length > 6 && <li className="px-1 py-1 text-xs text-[#adadb8]">y {cuentas.length - 6} más</li>}
        </ul>
      )}
    </div>
  );
}

function CuentasMarcadas({ cuentas, cambios, onElegir }) {
  const marcadas = cuentas.filter((c) => c.clasificacion !== "real");
  const nuevas = new Set(cambios?.nuevas.map((c) => c.autor));
  return (
    <section aria-labelledby="titulo-cuentas">
      <div className="mb-3 flex items-center gap-3">
        <h2 id="titulo-cuentas" className="flex items-center gap-2 text-base font-bold">
          <Icono nombre="escudo" className="size-5 text-[#bf94ff]" />
          Cuentas marcadas
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular ${marcadas.length ? "bg-[#eb0400] text-white" : "bg-[#2f2f35] text-[#adadb8]"}`}>
          {marcadas.length}
        </span>
      </div>
      {marcadas.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-[#2f2f35] px-4 py-5 text-sm text-[#adadb8]">
          <Icono nombre="check" className="size-5 text-[#00c76f]" />
          Ninguna cuenta superó los umbrales. Los comentarios parecen de personas reales.
        </div>
      ) : (
        <ol className="grid gap-2 2xl:grid-cols-2">
          {marcadas.map((cuenta) => {
            const bot = cuenta.clasificacion === "bot";
            return (
              <li key={cuenta.autor} className={`flex gap-3 rounded-md border-l-4 bg-[#1f1f23] p-3 ${bot ? "border-[#eb0400]" : "border-[#ffb31a]"}`}>
                <Avatar nombre={cuenta.autor} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-bold" style={{ color: colorNombre(cuenta.autor) }}>
                      {cuenta.autor}
                    </p>
                    <span className={`shrink-0 rounded px-1.5 py-px text-[11px] font-extrabold uppercase tabular ${bot ? "bg-[#eb0400] text-white" : "bg-[#ffb31a] text-[#18181b]"}`}>
                      {bot ? "Bot" : "Sospechosa"} {cuenta.riesgo}%
                    </span>
                    {nuevas.has(cuenta.autor) && (
                      <span className="rounded bg-[#9147ff] px-1.5 py-px text-[10px] font-extrabold uppercase text-white">Nueva</span>
                    )}
                    <span className="ml-auto text-xs text-[#adadb8] tabular">{cuenta.comentarios} comentarios</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[#adadb8]" title={cuenta.ejemplo}>
                    “{cuenta.ejemplo}”
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {cuenta.razones.map((razon) => (
                      <ChipRazon key={razon} razon={razon} />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onElegir(cuenta.autor)}
                  aria-label={`Ver comentarios de ${cuenta.autor}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-md bg-[#2f2f35] px-3 text-sm font-semibold hover:bg-[#3a3a3d]"
                >
                  <Icono nombre="comentarios" className="size-4" />
                  <span className="hidden sm:inline">Ver</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

const PESTANAS = [
  ["todos", "Todos"],
  ["bot", "Bots"],
  ["sospechoso", "Sosp."],
  ["real", "Reales"],
];

function PanelComentarios({ comentarios, nuevos, autor, onQuitarAutor }) {
  const [pestana, setPestana] = useState("todos");
  const [soloNuevos, setSoloNuevos] = useState(false);
  const orden = useMemo(() => [...comentarios].reverse(), [comentarios]);
  const conteo = (clase) => (clase === "todos" ? comentarios.length : comentarios.filter((c) => c.clasificacion === clase).length);
  const visibles = orden.filter(
    (c) =>
      (pestana === "todos" || c.clasificacion === pestana) &&
      (!autor || c.autor === autor) &&
      (!soloNuevos || !nuevos || nuevos.has(c.id)),
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#18181b]" aria-label="Comentarios analizados">
      <header className="flex h-12 shrink-0 items-center justify-center border-b border-[#2f2f35] px-3">
        <h2 className="text-xs font-bold uppercase tracking-wider">Comentarios analizados</h2>
      </header>
      <div className="shrink-0 border-b border-[#2f2f35] px-3 py-2">
        <div role="tablist" aria-label="Filtrar por clasificación" className="grid grid-cols-4 gap-1">
          {PESTANAS.map(([clave, titulo]) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={pestana === clave}
              onClick={() => setPestana(clave)}
              className={`flex flex-col items-center rounded px-1 py-1 leading-tight ${pestana === clave ? "bg-[#9147ff] text-white" : "text-[#adadb8] hover:bg-[#2f2f35]"}`}
            >
              <span className="text-xs font-semibold">{titulo}</span>
              <span className="text-[11px] tabular opacity-80">{conteo(clave)}</span>
            </button>
          ))}
        </div>
        {(autor || nuevos) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {autor && (
              <button
                type="button"
                onClick={onQuitarAutor}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#2f2f35] px-2 py-0.5 text-xs font-semibold hover:bg-[#3a3a3d]"
              >
                <span className="truncate">Cuenta: {autor}</span>
                <Icono nombre="cerrar" className="size-3" />
              </button>
            )}
            {nuevos && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#adadb8]">
                <input type="checkbox" checked={soloNuevos} onChange={(e) => setSoloNuevos(e.target.checked)} className="accent-[#9147ff]" />
                Solo nuevos ({nuevos.size})
              </label>
            )}
          </div>
        )}
      </div>
      <ol className="scroll min-h-0 flex-1 overflow-y-auto py-2">
        {visibles.slice(0, 300).map((c) => {
          const insignia = INSIGNIA[c.clasificacion];
          return (
            <li
              key={c.id}
              className={`px-4 py-1 text-[13px] leading-5 hover:bg-[#26262c] ${c.clasificacion === "bot" ? "border-l-2 border-[#eb0400] bg-[#eb0400]/[0.07] pl-[14px]" : ""}`}
            >
              <span className="mr-1.5 text-[11px] text-[#7a7a85] tabular">{fechaCorta(c.fecha)}</span>
              {nuevos?.has(c.id) && (
                <span className="mr-1 rounded-sm bg-[#9147ff] px-1 text-[10px] font-extrabold uppercase text-white">Nuevo</span>
              )}
              {insignia && (
                <span
                  title={`${insignia.texto} · ${c.riesgo}%`}
                  className={`mr-1 inline-flex size-[18px] translate-y-[3px] items-center justify-center rounded-[3px] ${insignia.clase}`}
                >
                  <Icono nombre={insignia.icono} className="size-3" />
                  <span className="sr-only">{insignia.texto}. </span>
                </span>
              )}
              <span className="font-bold" style={{ color: colorNombre(c.autor) }}>
                {c.autor}
              </span>
              <span>: </span>
              <span className="break-words">{c.texto}</span>
            </li>
          );
        })}
        {visibles.length === 0 && <li className="px-4 py-10 text-center text-sm text-[#adadb8]">No hay comentarios con este filtro.</li>}
        {visibles.length > 300 && (
          <li className="px-4 py-3 text-center text-xs text-[#adadb8]">Se muestran 300 de {visibles.length}. Usa los filtros para acotar.</li>
        )}
      </ol>
    </section>
  );
}

function BotonEliminar({ onConfirmar }) {
  const [confirmar, setConfirmar] = useState(false);
  return confirmar ? (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onConfirmar}
        className="h-9 rounded-md bg-[#eb0400] px-3 text-sm font-semibold text-white hover:bg-[#c90300]"
      >
        Eliminar video e historial
      </button>
      <button type="button" onClick={() => setConfirmar(false)} aria-label="Cancelar" className="flex size-9 items-center justify-center rounded-md hover:bg-[#2f2f35]">
        <Icono nombre="cerrar" className="size-4" />
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirmar(true)}
      aria-label="Eliminar video"
      title="Eliminar video"
      className="flex size-9 items-center justify-center rounded-md bg-[#2f2f35] hover:bg-[#3a3a3d]"
    >
      <Icono nombre="basura" className="size-4" />
    </button>
  );
}
