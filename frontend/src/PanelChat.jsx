import { useEffect, useRef } from "react";
import { colorNombre, iconoClase } from "./comun.jsx";
import { Icono } from "./iconos.jsx";

export default function PanelChat({
  comentarios,
  bloqueados,
  conectado,
  texto,
  setTexto,
  onEnviar,
}) {
  const lista = useRef(null);
  const bloqueado = new Set(bloqueados);
  const orden = [...comentarios].reverse();

  useEffect(() => {
    const caja = lista.current;
    if (!caja) return;
    caja.scrollTop = caja.scrollHeight;
  }, [comentarios]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#373340]" aria-label="Chat del directo">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <Icono nombre="muro" className="size-5" />
        <h2 className="text-base font-bold">Chat</h2>
        <span className="ml-auto text-sm text-[#d2ccdf] tabular">{comentarios.length}</span>
      </header>
      <div ref={lista} className="min-h-0 flex-1 overflow-y-auto scroll px-3 py-3">
        {orden.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[#d2ccdf]">Sin mensajes todavía.</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {orden.map((comentario) => {
              const clase = comentario.clasificacion;
              const tono = clase === "bot" ? "text-[#ffb3bc]" : clase === "sospechoso" ? "text-[#ffd27a]" : "text-[#8ee8a8]";
              return (
                <li key={comentario.id} className="rounded-lg px-2 py-1.5 leading-6 hover:bg-white/5">
                  <p className="break-words text-[15px]">
                    <Icono nombre={iconoClase(clase)} className={`mr-1.5 inline size-4 align-text-bottom ${tono}`} />
                    {bloqueado.has(comentario.usuario) && (
                      <Icono nombre="candado" className="mr-1.5 inline size-4 align-text-bottom text-[#d2ccdf]" />
                    )}
                    <span className="font-bold" style={{ color: colorNombre(comentario.usuario) }}>
                      {comentario.usuario}
                    </span>
                    <span className="sr-only"> {comentario.etiqueta}. </span>
                    <span className="text-[#f7f5fb]"> {comentario.texto}</span>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <form
        className="shrink-0 border-t border-white/10 p-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          onEnviar();
        }}
      >
        <label className="block rounded-lg bg-[#1e1d24] px-3 py-2">
          <span className="sr-only">Mensaje</span>
          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter" && !evento.shiftKey) {
                evento.preventDefault();
                onEnviar();
              }
            }}
            rows={2}
            maxLength={500}
            placeholder="Enviar un mensaje"
            className="w-full resize-none bg-transparent text-base leading-6 text-[#f7f5fb] outline-none placeholder:text-[#b7b0c8]"
          />
        </label>
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={!conectado || texto.trim() === ""}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#6442a4] px-5 font-bold text-white disabled:cursor-not-allowed disabled:bg-[#4a4458]"
          >
            <Icono nombre="enviar" className="size-4" />
            Enviar
          </button>
        </div>
      </form>
    </section>
  );
}
