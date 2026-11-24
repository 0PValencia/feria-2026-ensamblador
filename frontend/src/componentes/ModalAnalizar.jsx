import { useEffect, useRef, useState } from "react";
import { fechaCorta } from "../formato.js";
import { Icono } from "../iconos.jsx";
import { analizarVideo, buscarGuardado } from "../servicio/analisis.js";
import { datosPublicos, extraerId, miniatura } from "../youtube.js";

const LIMITES = [100, 500, 1000];
const PASOS = [
  ["validar", "Validar enlace"],
  ["descargar", "Descargar comentarios"],
  ["reglas", "Aplicar las tres reglas"],
  ["guardar", "Guardar y comparar"],
];

export default function ModalAnalizar({ urlInicial = "", onCerrar, onListo }) {
  const [url, setUrl] = useState(urlInicial);
  const [limite, setLimite] = useState(500);
  const [publicos, setPublicos] = useState(null);
  const [estado, setEstado] = useState("editando");
  const [paso, setPaso] = useState(null);
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");
  const entrada = useRef(null);

  const id = extraerId(url);
  const guardado = id ? buscarGuardado(id) : null;
  const ocupado = estado === "analizando";

  useEffect(() => {
    entrada.current?.focus();
  }, []);

  useEffect(() => {
    const cerrar = (evento) => evento.key === "Escape" && !ocupado && onCerrar();
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [ocupado, onCerrar]);

  useEffect(() => {
    setPublicos(null);
    if (!id) return undefined;
    let vigente = true;
    datosPublicos(id).then((datos) => vigente && setPublicos(datos || { titulo: `Video ${id}`, canal: "" }));
    return () => {
      vigente = false;
    };
  }, [id]);

  async function enviar(evento) {
    evento.preventDefault();
    if (!id) {
      setError("Pega un enlace de YouTube válido, por ejemplo youtube.com/watch?v=… o youtu.be/…");
      return;
    }
    setError("");
    setEstado("analizando");
    try {
      const resultado = await analizarVideo(url, {
        limite,
        alAvanzar: (nuevoPaso, texto) => {
          setPaso(nuevoPaso);
          setDetalle(texto);
        },
      });
      setEstado("listo");
      setTimeout(() => onListo(resultado.video_id), 500);
    } catch (fallo) {
      setEstado("editando");
      setError(fallo.message || "No se pudo analizar el video.");
    }
  }

  const indicePaso = PASOS.findIndex(([clave]) => clave === paso);
  const llamadas = Math.ceil(limite / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-3 py-[8vh]">
      <button type="button" tabIndex={-1} aria-label="Cerrar" onClick={() => !ocupado && onCerrar()} className="fixed inset-0 cursor-default" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-analizar"
        className="alerta-entrada relative w-full max-w-[520px] rounded-md bg-[#18181b] shadow-[0_12px_48px_rgba(0,0,0,.8)]"
      >
        <header className="flex items-center gap-3 px-5 pb-1 pt-5">
          <span className="flex size-9 items-center justify-center rounded-md bg-[#9147ff]/20 text-[#bf94ff]">
            <Icono nombre="youtube" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="titulo-analizar" className="text-lg font-bold">
              Analizar video de YouTube
            </h2>
            <p className="text-[13px] text-[#adadb8]">Guardamos el enlace y el análisis para compararlo después.</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            className="flex size-8 items-center justify-center rounded hover:bg-[#2f2f35] disabled:opacity-40"
          >
            <Icono nombre="cerrar" className="size-4" />
          </button>
        </header>

        {estado === "editando" ? (
          <form onSubmit={enviar} className="flex flex-col gap-4 p-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Enlace del video</span>
              <input
                ref={entrada}
                value={url}
                onChange={(evento) => {
                  setUrl(evento.target.value);
                  setError("");
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                inputMode="url"
                aria-invalid={Boolean(error)}
                aria-describedby="ayuda-enlace"
                className={`h-10 rounded-md border-2 bg-[#0e0e10] px-3 text-sm outline-none ${
                  error ? "border-[#eb0400]" : "border-[#3a3a3d] focus:border-[#9147ff]"
                }`}
              />
              <span id="ayuda-enlace" className={`text-xs ${error ? "font-semibold text-[#ff8280]" : "text-[#adadb8]"}`}>
                {error || "Acepta youtube.com/watch, youtu.be, Shorts, transmisiones o el videoId."}
              </span>
            </label>

            {id && (
              <div className="flex gap-3 rounded-md bg-[#1f1f23] p-2.5">
                <img src={miniatura(id, "mqdefault")} alt="" className="aspect-video w-32 shrink-0 rounded object-cover" />
                <div className="min-w-0 py-0.5">
                  <p className="line-clamp-2 text-sm font-semibold">{publicos ? publicos.titulo : "Buscando el video…"}</p>
                  {publicos?.canal && <p className="truncate text-xs text-[#adadb8]">{publicos.canal}</p>}
                  {guardado && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#9147ff]/20 px-2 py-0.5 text-xs font-semibold text-[#bf94ff]">
                      <Icono nombre="comparar" className="size-3" />
                      {guardado.total_analisis} análisis previo{guardado.total_analisis > 1 ? "s" : ""} · se comparará con el del{" "}
                      {fechaCorta(guardado.ultimo)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Comentarios a analizar</legend>
              <div className="grid grid-cols-3 gap-2">
                {LIMITES.map((valor) => (
                  <label
                    key={valor}
                    className={`flex cursor-pointer flex-col items-center rounded-md border-2 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#bf94ff] ${
                      limite === valor ? "border-[#9147ff] bg-[#9147ff]/15" : "border-transparent bg-[#2f2f35] hover:bg-[#3a3a3d]"
                    }`}
                  >
                    <input type="radio" name="limite" className="sr-only" checked={limite === valor} onChange={() => setLimite(valor)} />
                    <span className="font-bold tabular">{valor}</span>
                    <span className="text-[11px] text-[#adadb8]">hasta {Math.ceil(valor / 100)} páginas</span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-[#adadb8]">
                Usa unas {llamadas} llamadas a commentThreads.list ({llamadas} unidades de las 10 000 diarias).
              </p>
            </fieldset>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onCerrar} className="h-9 rounded-md bg-[#2f2f35] px-4 text-sm font-semibold hover:bg-[#3a3a3d]">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!url.trim()}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#9147ff] px-4 text-sm font-semibold text-white hover:bg-[#772ce8] disabled:cursor-not-allowed disabled:bg-[#3a3a3d] disabled:text-[#7a7a85]"
              >
                <Icono nombre={guardado ? "refrescar" : "rayo"} className="size-4" />
                {guardado ? "Analizar de nuevo" : "Analizar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5" role="status" aria-live="polite">
            <ol className="flex flex-col gap-3">
              {PASOS.map(([clave, titulo], i) => {
                const hecho = estado === "listo" || i < indicePaso;
                const actual = estado !== "listo" && i === indicePaso;
                return (
                  <li key={clave} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        hecho ? "bg-[#00a85c] text-white" : actual ? "bg-[#9147ff] text-white" : "bg-[#2f2f35] text-[#7a7a85]"
                      }`}
                    >
                      {hecho ? <Icono nombre="check" className="size-3.5" /> : actual ? <span className="animate-spin size-3 rounded-full border-2 border-white border-t-transparent" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${hecho || actual ? "" : "text-[#7a7a85]"}`}>{titulo}</span>
                      {actual && <span className="block text-xs text-[#adadb8]">{detalle}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#2f2f35]">
              <div
                className="h-full rounded-full bg-[#9147ff] transition-[width] duration-500"
                style={{ width: `${estado === "listo" ? 100 : ((indicePaso + 0.5) / PASOS.length) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold">{estado === "listo" ? "Análisis guardado. Abriendo resultados…" : "Analizando, no cierres esta ventana."}</p>
          </div>
        )}
      </section>
    </div>
  );
}
