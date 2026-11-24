import { useMemo, useRef, useState } from "react";
import TarjetaVideo, { Tendencia } from "../componentes/TarjetaVideo.jsx";
import { nivelRiesgo } from "../datos/motor.js";
import { haceCuanto, NIVELES, numero } from "../formato.js";
import { Icono } from "../iconos.jsx";
import { miniatura } from "../youtube.js";

const CATEGORIAS = [
  { id: "alto", titulo: "Alto riesgo", detalle: "20% o más de bots", icono: "bot", fondo: "from-[#eb0400] to-[#5c0a0a]" },
  { id: "medio", titulo: "Riesgo medio", detalle: "Entre 8% y 19%", icono: "alerta", fondo: "from-[#ffb31a] to-[#6b3d00]" },
  { id: "bajo", titulo: "Bajo riesgo", detalle: "Menos de 8%", icono: "check", fondo: "from-[#00a85c] to-[#053d27]" },
  { id: "varios", titulo: "Con comparación", detalle: "Dos o más análisis", icono: "comparar", fondo: "from-[#9147ff] to-[#2a1260]" },
  { id: "empeoran", titulo: "Empeoran", detalle: "Más bots que antes", icono: "subir", fondo: "from-[#ff4f8b] to-[#4d0a24]" },
];

function cumple(video, categoria) {
  if (!categoria) return true;
  if (categoria === "varios") return video.total_analisis > 1;
  if (categoria === "empeoran") return video.previo && video.ultimo.porcentaje_bots > video.previo.porcentaje_bots;
  return nivelRiesgo(video.ultimo.porcentaje_bots) === categoria;
}

export default function Explorar({ videos, filtro, onAnalizar }) {
  const [categoria, setCategoria] = useState(null);
  const [todos, setTodos] = useState(false);
  const rejilla = useRef(null);

  const visibles = useMemo(
    () =>
      (videos || []).filter(
        (v) =>
          cumple(v, categoria) &&
          (!filtro || v.titulo.toLowerCase().includes(filtro) || v.canal.toLowerCase().includes(filtro)),
      ),
    [videos, categoria, filtro],
  );

  if (videos && videos.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#9147ff]/20 text-[#bf94ff]">
          <Icono nombre="youtube" className="size-8" />
        </span>
        <h1 className="text-2xl font-bold">Analiza tu primer video</h1>
        <p className="max-w-md text-[#adadb8]">
          Pega el enlace de un video público de YouTube. Guardaremos el enlace y el análisis de sus comentarios para compararlo con
          los siguientes.
        </p>
        <button
          type="button"
          onClick={onAnalizar}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#9147ff] px-4 font-semibold text-white hover:bg-[#772ce8]"
        >
          <Icono nombre="mas" className="size-4" />
          Analizar video
        </button>
      </div>
    );
  }

  const limite = todos ? visibles.length : 8;
  const categoriaActual = CATEGORIAS.find((c) => c.id === categoria);

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8">
      {!filtro && <Carrusel videos={videos} />}

      <section ref={rejilla} className="scroll-mt-4 pt-6" aria-labelledby="titulo-recientes">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="titulo-recientes" className="text-lg font-semibold">
            {filtro ? (
              <>
                Resultados para <span className="text-[#bf94ff]">“{filtro}”</span>
              </>
            ) : (
              <>
                <span className="text-[#bf94ff]">Videos analizados</span> recientemente
              </>
            )}
          </h2>
          {categoriaActual && (
            <button
              type="button"
              onClick={() => setCategoria(null)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2f2f35] px-3 py-1 text-xs font-semibold hover:bg-[#3a3a3d]"
            >
              {categoriaActual.titulo}
              <Icono nombre="cerrar" className="size-3.5" />
            </button>
          )}
        </div>
        {!videos ? (
          <div className="grid gap-x-3 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-[#1f1f23]" />
                <div className="mt-3 h-4 w-3/4 rounded bg-[#1f1f23]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-[#1f1f23]" />
              </div>
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#2f2f35] px-4 py-8 text-center text-sm text-[#adadb8]">
            Ningún video coincide. Prueba otra búsqueda o quita el filtro.
          </p>
        ) : (
          <div className="grid gap-x-3 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
            {visibles.slice(0, limite).map((video) => (
              <TarjetaVideo key={video.id} video={video} />
            ))}
          </div>
        )}
        {visibles.length > 8 && (
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#2f2f35]" />
            <button
              type="button"
              onClick={() => setTodos((valor) => !valor)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-semibold text-[#bf94ff] hover:bg-[#2f2f35]"
            >
              {todos ? "Ver menos" : "Ver más"}
              <Icono nombre={todos ? "subir" : "abajo"} className="size-4" />
            </button>
            <span className="h-px flex-1 bg-[#2f2f35]" />
          </div>
        )}
      </section>

      <section className="pt-8" aria-labelledby="titulo-niveles">
        <h2 id="titulo-niveles" className="mb-3 text-lg font-semibold">
          <span className="text-[#bf94ff]">Niveles de riesgo</span> para revisar
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIAS.map((cat) => {
            const total = (videos || []).filter((v) => cumple(v, cat.id)).length;
            const activa = categoria === cat.id;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  aria-pressed={activa}
                  onClick={() => {
                    setCategoria(activa ? null : cat.id);
                    setTodos(true);
                    rejilla.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="group block w-full text-left"
                >
                  <span className={`relative block transition-colors ${activa ? "bg-[#9147ff]" : "group-hover:bg-[#9147ff]"}`}>
                    <span
                      className={`flex aspect-[4/3] flex-col justify-between bg-gradient-to-br p-3 transition-transform ${cat.fondo} ${
                        activa ? "-translate-y-1.5 translate-x-1.5" : "group-hover:-translate-y-1.5 group-hover:translate-x-1.5"
                      }`}
                    >
                      <Icono nombre={cat.icono} className="size-9 text-white/90" />
                      <span className="text-4xl font-extrabold leading-none text-white tabular">{total}</span>
                    </span>
                  </span>
                  <span className="mt-2 block text-sm font-semibold group-hover:text-[#bf94ff]">{cat.titulo}</span>
                  <span className="block text-[13px] text-[#adadb8]">{cat.detalle}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Carrusel({ videos }) {
  const [indice, setIndice] = useState(0);
  const destacados = (videos || []).slice(0, 5);
  if (!videos) return <div className="mt-6 aspect-[16/6] animate-pulse bg-[#18181b]" />;
  if (!destacados.length) return null;
  const n = destacados.length;
  const actual = destacados[indice % n];
  const nivel = NIVELES[nivelRiesgo(actual.ultimo.porcentaje_bots)];
  const mover = (paso) => setIndice((i) => (i + paso + n) % n);

  return (
    <section className="relative pt-6" aria-roledescription="carrusel" aria-label="Videos destacados">
      <div className="relative mx-auto flex items-center justify-center md:min-h-[240px] md:px-12">
        {n > 1 &&
          [-2, -1, 1, 2].map((desplazamiento) => {
            if (n < 3 && Math.abs(desplazamiento) === 2) return null;
            const video = destacados[(indice + desplazamiento + n * 2) % n];
            const distancia = Math.abs(desplazamiento);
            return (
              <button
                key={desplazamiento}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => mover(desplazamiento)}
                className="absolute left-1/2 top-1/2 hidden aspect-video w-[40%] overflow-hidden bg-black transition-all duration-300 md:block"
                style={{
                  transform: `translate(-50%, -50%) translateX(${desplazamiento * (distancia === 1 ? 62 : 92)}%) scale(${1 - distancia * 0.14})`,
                  zIndex: 10 - distancia,
                  opacity: distancia === 1 ? 0.55 : 0.25,
                }}
              >
                <img src={miniatura(video.id)} alt="" className="size-full object-cover" />
              </button>
            );
          })}

        <article className="relative z-20 flex w-full flex-col bg-[#18181b] shadow-[0_8px_32px_rgba(0,0,0,.7)] md:w-[min(820px,76%)] md:flex-row">
          <a href={`#/video/${actual.id}`} className="group relative block aspect-video shrink-0 bg-black md:w-[64%]">
            <img src={miniatura(actual.id, "hqdefault")} alt="" className="size-full object-cover" />
            <span className={`absolute left-2 top-2 rounded px-1.5 py-px text-[12px] font-extrabold tracking-wide ${nivel.fondo}`}>
              {nivel.corto}
            </span>
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <span className="flex size-14 scale-90 items-center justify-center rounded-full bg-[#9147ff] opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
                <Icono nombre="play" className="size-6 text-white" />
              </span>
            </span>
          </a>
          <div className="flex min-w-0 flex-1 flex-col p-4">
            <div className="flex items-center gap-2.5">
              <img src={miniatura(actual.id, "default")} alt="" className="size-12 shrink-0 rounded-full object-cover" />
              <div className="min-w-0">
                <a href={`#/video/${actual.id}`} className="block truncate font-semibold text-[#bf94ff] hover:underline">
                  {actual.canal}
                </a>
                <p className="text-[13px] text-[#adadb8]">Analizado {haceCuanto(actual.ultimo.fecha)}</p>
              </div>
            </div>
            <h2 className="mt-3 line-clamp-2 text-sm font-semibold" title={actual.titulo}>
              {actual.titulo}
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded bg-[#1f1f23] px-2.5 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-[#adadb8]">Bots</dt>
                <dd className={`text-xl font-extrabold tabular ${nivel.texto}`}>{actual.ultimo.porcentaje_bots}%</dd>
              </div>
              <div className="rounded bg-[#1f1f23] px-2.5 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-[#adadb8]">Comentarios</dt>
                <dd className="text-xl font-extrabold tabular">{numero(actual.ultimo.comentarios)}</dd>
              </div>
            </dl>
            <ul className="mt-3 flex flex-wrap gap-1">
              <li className="rounded-full bg-[#2f2f35] px-2 py-0.5 text-xs font-semibold">{actual.total_analisis} análisis</li>
              {actual.previo && (
                <li className="rounded-full bg-[#2f2f35] px-2 py-0.5 text-xs">
                  <Tendencia actual={actual.ultimo.porcentaje_bots} previo={actual.previo.porcentaje_bots} /> vs anterior
                </li>
              )}
            </ul>
          </div>
        </article>

        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Video anterior"
              className="absolute left-0 top-1/2 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-md text-[#efeff1] hover:bg-[#2f2f35] md:flex"
            >
              <Icono nombre="izquierda" className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Video siguiente"
              className="absolute right-0 top-1/2 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-md text-[#efeff1] hover:bg-[#2f2f35] md:flex"
            >
              <Icono nombre="derecha" className="size-6" />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 md:hidden">
          {destacados.map((video, i) => (
            <button
              key={video.id}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ver destacado ${i + 1}`}
              aria-current={i === indice % n}
              className={`h-1.5 rounded-full transition-all ${i === indice % n ? "w-6 bg-[#9147ff]" : "w-1.5 bg-[#3a3a3d]"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
