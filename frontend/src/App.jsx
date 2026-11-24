import { useCallback, useEffect, useMemo, useState } from "react";
import { Icono, Marca } from "./iconos.jsx";
import { NIVELES } from "./formato.js";
import { nivelRiesgo } from "./datos/motor.js";
import ModalAnalizar from "./componentes/ModalAnalizar.jsx";
import PanelReglas from "./PanelReglas.jsx";
import {
  guardarUmbrales,
  listarVideos,
  MODO_EJEMPLO,
  obtenerUmbrales,
  restablecerUmbrales,
} from "./servicio/analisis.js";
import DetalleVideo from "./vistas/DetalleVideo.jsx";
import Explorar from "./vistas/Explorar.jsx";
import { irA } from "./navegacion.js";
import { extraerId, miniatura } from "./youtube.js";

function leerRuta() {
  const partes = window.location.hash.replace(/^#\/?/, "").split("/");
  return partes[0] === "video" && partes[1] ? { vista: "video", id: partes[1] } : { vista: "explorar" };
}


export default function App() {
  const [ruta, setRuta] = useState(leerRuta);
  const [videos, setVideos] = useState(null);
  const [version, setVersion] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState(false);
  const [modal, setModal] = useState(null);
  const [reglas, setReglas] = useState(false);
  const [umbrales, setUmbrales] = useState(obtenerUmbrales);
  const [lateral, setLateral] = useState(true);
  const [aviso, setAviso] = useState(() => MODO_EJEMPLO && localStorage.getItem("sbg-aviso-ejemplo") !== "visto");

  const recargar = useCallback(() => {
    listarVideos().then(setVideos);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    recargar();
    const alCambiar = () => {
      setRuta(leerRuta());
      document.querySelector("main")?.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, [recargar]);

  useEffect(() => {
    if (!reglas) return undefined;
    const cerrar = (evento) => evento.key === "Escape" && setReglas(false);
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [reglas]);

  const filtro = busqueda.trim().toLowerCase();
  const idPegado = extraerId(busqueda);
  const coincidencias = useMemo(
    () =>
      (videos || []).filter(
        (v) => !filtro || v.titulo.toLowerCase().includes(filtro) || v.canal.toLowerCase().includes(filtro),
      ),
    [videos, filtro],
  );

  function abrirAnalisis(url = "") {
    setSugerencias(false);
    setModal({ url });
  }

  function enviarBusqueda(evento) {
    evento.preventDefault();
    if (idPegado) {
      abrirAnalisis(busqueda.trim());
      setBusqueda("");
    } else if (coincidencias[0]) {
      irA(`/video/${coincidencias[0].id}`);
      setSugerencias(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-clip bg-[#0e0e10] text-[#efeff1]">
      <header className="relative z-30 flex h-[50px] shrink-0 items-center gap-2 bg-[#18181b] px-2 shadow-[0_1px_2px_rgba(0,0,0,.9)] sm:px-3">
        <a href="#/" className="flex items-center rounded p-1 hover:bg-[#2f2f35]" aria-label="Bot, simulador de bots. Inicio">
          <span className="sm:hidden">
            <Marca compacta />
          </span>
          <span className="hidden sm:block">
            <Marca />
          </span>
        </a>
        <a
          href="#/"
          aria-current={ruta.vista === "explorar" ? "page" : undefined}
          className={`ml-2 hidden rounded px-2 py-1 text-lg font-semibold hover:text-[#bf94ff] md:block ${
            ruta.vista === "explorar" ? "text-[#bf94ff]" : "text-[#efeff1]"
          }`}
        >
          Explorar
        </a>

        <form onSubmit={enviarBusqueda} className="relative mx-auto flex min-w-0 max-w-[400px] flex-1 px-1" role="search">
          <label className="flex h-9 min-w-0 flex-1 items-center rounded-l-md border-2 border-r-0 border-[#3a3a3d] bg-[#18181b] px-3 focus-within:border-[#9147ff] focus-within:bg-[#0e0e10]">
            <span className="sr-only">Buscar video o pegar un enlace de YouTube</span>
            <input
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(evento.target.value);
                setSugerencias(true);
              }}
              onFocus={() => setSugerencias(true)}
              onBlur={() => setTimeout(() => setSugerencias(false), 150)}
              placeholder="Buscar o pegar enlace de YouTube"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#adadb8]"
            />
          </label>
          <button
            type="submit"
            aria-label="Buscar"
            className="flex h-9 w-10 shrink-0 items-center justify-center rounded-r-md bg-[#2f2f35] hover:bg-[#3a3a3d]"
          >
            <Icono nombre="buscar" className="size-4" />
          </button>
          {sugerencias && busqueda.trim() && (
            <div className="absolute inset-x-1 top-full mt-1 overflow-hidden rounded-md border border-[#2f2f35] bg-[#18181b] py-1 shadow-2xl">
              {idPegado && (
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#26262c]"
                >
                  <img src={miniatura(idPegado, "default")} alt="" className="h-9 w-12 rounded object-cover" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#bf94ff]">Analizar este enlace</span>
                    <span className="block truncate text-xs text-[#adadb8]">Video {idPegado}</span>
                  </span>
                </button>
              )}
              {!idPegado &&
                coincidencias.slice(0, 6).map((video) => (
                  <a
                    key={video.id}
                    href={`#/video/${video.id}`}
                    onClick={() => setSugerencias(false)}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-[#26262c]"
                  >
                    <img src={miniatura(video.id, "default")} alt="" className="h-9 w-12 rounded object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{video.titulo}</span>
                      <span className="block truncate text-xs text-[#adadb8]">{video.canal}</span>
                    </span>
                  </a>
                ))}
              {!idPegado && coincidencias.length === 0 && (
                <p className="px-3 py-2 text-sm text-[#adadb8]">Sin resultados. Pega un enlace para analizar un video nuevo.</p>
              )}
            </div>
          )}
        </form>

        <div className="flex items-center gap-1.5">
          <span className="group relative">
            <button
              type="button"
              aria-label="Reglas de detección"
              aria-pressed={reglas}
              onClick={() => setReglas((abierto) => !abierto)}
              className={`flex size-9 items-center justify-center rounded-md ${reglas ? "bg-[#9147ff]/25 text-[#bf94ff]" : "hover:bg-[#2f2f35]"}`}
            >
              <Icono nombre="reglas" />
            </button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-1/2 top-full z-40 mt-2 translate-x-1/2 whitespace-nowrap rounded bg-[#efeff1] px-2 py-1 text-xs font-bold text-[#0e0e10] opacity-0 transition-opacity delay-150 group-hover:opacity-100"
            >
              Reglas de detección
            </span>
          </span>
          <button
            type="button"
            onClick={() => abrirAnalisis()}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-md bg-[#9147ff] px-2.5 text-sm font-semibold text-white hover:bg-[#772ce8]"
          >
            <Icono nombre="mas" className="size-4" />
            <span className="hidden sm:inline">Analizar video</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-clip">
        <aside
          className={`hidden shrink-0 flex-col bg-[#1f1f23] transition-[width] lg:flex ${lateral ? "w-60" : "w-[50px]"}`}
          aria-label="Videos analizados"
        >
          <div className={`flex h-11 shrink-0 items-center ${lateral ? "justify-between pl-3 pr-1.5" : "justify-center"}`}>
            {lateral && <h2 className="text-sm font-semibold">Videos analizados</h2>}
            <button
              type="button"
              onClick={() => setLateral((abierto) => !abierto)}
              aria-label={lateral ? "Contraer barra lateral" : "Expandir barra lateral"}
              className="flex size-8 items-center justify-center rounded hover:bg-[#2f2f35]"
            >
              <Icono nombre={lateral ? "colapsar" : "expandir"} className="size-4" />
            </button>
          </div>
          <ul className="scroll min-h-0 flex-1 overflow-y-auto pb-3">
            {(videos || []).map((video) => {
              const nivel = NIVELES[nivelRiesgo(video.ultimo.porcentaje_bots)];
              const activo = ruta.vista === "video" && ruta.id === video.id;
              return (
                <li key={video.id}>
                  <a
                    href={`#/video/${video.id}`}
                    title={lateral ? undefined : `${video.titulo} · ${video.ultimo.porcentaje_bots}% bots`}
                    aria-current={activo ? "page" : undefined}
                    className={`flex items-center gap-2.5 py-1.5 hover:bg-[#26262c] ${lateral ? "px-2.5" : "justify-center"} ${
                      activo ? "bg-[#2f2f35]" : ""
                    }`}
                  >
                    <span className="relative shrink-0">
                      <img src={miniatura(video.id, "default")} alt="" className="size-8 rounded-full object-cover" />
                      {!lateral && (
                        <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#1f1f23] ${nivel.punto}`} />
                      )}
                    </span>
                    {lateral && (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{video.canal}</span>
                          <span className="block truncate text-xs text-[#adadb8]">{video.titulo}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-[13px] tabular">
                          <span className={`size-2 rounded-full ${nivel.punto}`} />
                          {video.ultimo.porcentaje_bots}%
                        </span>
                      </>
                    )}
                  </a>
                </li>
              );
            })}
            {videos && videos.length === 0 && lateral && (
              <li className="px-3 py-2 text-sm text-[#adadb8]">Aún no hay videos guardados.</li>
            )}
          </ul>
        </aside>

        <main className="scroll min-w-0 flex-1 overflow-y-auto">
          {ruta.vista === "video" ? (
            <DetalleVideo
              key={ruta.id}
              id={ruta.id}
              version={version}
              onReanalizar={(url) => abrirAnalisis(url)}
              onEliminado={() => {
                recargar();
                irA("/");
              }}
            />
          ) : (
            <Explorar videos={videos} filtro={filtro} onAnalizar={() => abrirAnalisis()} />
          )}
        </main>

        {reglas && (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Cerrar panel"
              onClick={() => setReglas(false)}
              className="fixed inset-0 top-[50px] z-20 cursor-default bg-black/50"
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-reglas"
              className="panel-entrada fixed bottom-0 right-0 top-[50px] z-20 flex w-full flex-col border-l border-[#2f2f35] bg-[#18181b] shadow-[-12px_0_32px_rgba(0,0,0,.6)] sm:w-[440px]"
            >
              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#2f2f35] px-4">
                <Icono nombre="reglas" className="size-4 text-[#bf94ff]" />
                <h2 id="titulo-reglas" className="text-sm font-bold">
                  Reglas de detección
                </h2>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setReglas(false)}
                  aria-label="Cerrar"
                  className="ml-auto flex size-8 items-center justify-center rounded hover:bg-[#2f2f35]"
                >
                  <Icono nombre="cerrar" className="size-4" />
                </button>
              </header>
              <div className="scroll min-h-0 flex-1 overflow-y-auto">
                <PanelReglas
                  umbrales={umbrales}
                  onGuardar={(datos) => {
                    guardarUmbrales(datos);
                    setUmbrales(datos);
                  }}
                  onRestablecer={() => setUmbrales(restablecerUmbrales())}
                />
              </div>
            </section>
          </>
        )}
      </div>

      {aviso && (
        <div className="flex shrink-0 items-center gap-3 bg-[#772ce8] px-3 py-2 sm:px-4">
          <span className="hidden size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#18181b] sm:flex">
            <Marca compacta />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-bold">Modo de ejemplo.</span> Los videos se guardan en este navegador y los comentarios son
            sintéticos hasta conectar el backend con la YouTube Data API.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("sbg-aviso-ejemplo", "visto");
              setAviso(false);
            }}
            className="h-[30px] shrink-0 rounded-md bg-white px-3 text-sm font-semibold text-[#18181b] hover:bg-[#e5e5e5]"
          >
            Entendido
          </button>
        </div>
      )}

      {modal && (
        <ModalAnalizar
          urlInicial={modal.url}
          onCerrar={() => setModal(null)}
          onListo={(videoId) => {
            setModal(null);
            recargar();
            irA(`/video/${videoId}`);
          }}
        />
      )}
    </div>
  );
}
