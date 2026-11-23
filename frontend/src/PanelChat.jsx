import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { colorNombre } from "./comun.jsx";
import { Icono } from "./iconos.jsx";

const INSIGNIA = {
  bot: { clase: "bg-[#eb0400] text-white", icono: "bot", texto: "Bot" },
  sospechoso: { clase: "bg-[#ffb31a] text-[#18181b]", icono: "alerta", texto: "Sospechoso" },
};

export default function PanelChat({
  comentarios,
  bloqueados,
  conectado,
  nombre,
  setNombre,
  texto,
  setTexto,
  onEnviar,
  onBloquear,
}) {
  const lista = useRef(null);
  const [pegado, setPegado] = useState(true);
  const [ajustes, setAjustes] = useState(false);
  const bloqueado = new Set(bloqueados);
  const orden = [...comentarios].slice(0, 150).reverse();

  useLayoutEffect(() => {
    const caja = lista.current;
    if (caja && pegado) caja.scrollTop = caja.scrollHeight;
  }, [comentarios, pegado]);

  useEffect(() => {
    if (!ajustes) return undefined;
    const cerrar = (evento) => evento.key === "Escape" && setAjustes(false);
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [ajustes]);

  function alDesplazar() {
    const caja = lista.current;
    if (!caja) return;
    setPegado(caja.scrollHeight - caja.scrollTop - caja.clientHeight < 40);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#18181b]" aria-label="Chat del directo">
      <header className="relative flex h-12 shrink-0 items-center justify-center border-b border-[#2f2f35] px-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#efeff1]">Chat del directo</h2>
        <span className="absolute right-3 inline-flex items-center gap-1 text-xs text-[#adadb8] tabular">
          <Icono nombre="muro" className="size-3.5" />
          {comentarios.length}
        </span>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={lista} onScroll={alDesplazar} className="scroll absolute inset-0 overflow-y-auto py-2">
          {orden.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#adadb8]">¡Te damos la bienvenida al chat!</p>
          ) : (
            <ol aria-live="off">
              {orden.map((comentario) => {
                const eliminado = bloqueado.has(comentario.usuario);
                const insignia = INSIGNIA[comentario.clasificacion];
                return (
                  <li
                    key={comentario.id}
                    className={`group relative px-4 py-1 text-[13px] leading-5 hover:bg-[#26262c] ${
                      comentario.clasificacion === "bot" && !eliminado ? "border-l-2 border-[#eb0400] bg-[#eb0400]/[0.07] pl-[14px]" : ""
                    }`}
                  >
                    <span className="mr-1.5 text-[11px] text-[#7a7a85] tabular">{comentario.hora.slice(0, 5)}</span>
                    {insignia && !eliminado && (
                      <span
                        title={comentario.etiqueta}
                        className={`mr-1 inline-flex size-[18px] translate-y-[3px] items-center justify-center rounded-[3px] ${insignia.clase}`}
                      >
                        <Icono nombre={insignia.icono} className="size-3" />
                        <span className="sr-only">{insignia.texto}. </span>
                      </span>
                    )}
                    <span className="font-bold" style={{ color: colorNombre(comentario.usuario) }}>
                      {comentario.usuario}
                    </span>
                    <span className="text-[#efeff1]">: </span>
                    {eliminado ? (
                      <span className="italic text-[#7a7a85]">&lt;mensaje eliminado&gt;</span>
                    ) : (
                      <span className="break-words text-[#efeff1]">{comentario.texto}</span>
                    )}
                    {!eliminado && comentario.clasificacion !== "real" && (
                      <button
                        type="button"
                        onClick={() => onBloquear(comentario.usuario)}
                        aria-label={`Bloquear a ${comentario.usuario}`}
                        title="Bloquear"
                        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded bg-[#2f2f35] text-[#efeff1] opacity-0 transition-opacity hover:bg-[#eb0400] focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Icono nombre="ban" className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        {!pegado && (
          <button
            type="button"
            onClick={() => setPegado(true)}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-md bg-[#000]/85 px-3 py-1.5 text-xs font-bold text-[#efeff1] shadow-lg hover:bg-black"
          >
            <Icono nombre="flechaAbajo" className="size-3.5" />
            Chat pausado · ver mensajes nuevos
          </button>
        )}
      </div>

      <form
        className="relative shrink-0 p-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          onEnviar();
          setPegado(true);
        }}
      >
        {ajustes && (
          <div className="absolute inset-x-3 bottom-full mb-1 rounded-md border border-[#2f2f35] bg-[#1f1f23] p-3 shadow-2xl">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#adadb8]">Tu nombre en el chat</span>
              <input
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                maxLength={24}
                autoComplete="nickname"
                placeholder="Visitante"
                autoFocus
                className="h-9 rounded-md border-2 border-[#3a3a3d] bg-[#0e0e10] px-2.5 text-sm text-[#efeff1] outline-none focus:border-[#9147ff]"
              />
            </label>
          </div>
        )}
        <label className="block">
          <span className="sr-only">Enviar un mensaje</span>
          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter" && !evento.shiftKey) {
                evento.preventDefault();
                onEnviar();
                setPegado(true);
              }
            }}
            rows={1}
            maxLength={500}
            placeholder="Enviar un mensaje"
            className="block max-h-24 min-h-10 w-full resize-none rounded-md border-2 border-transparent bg-[#2f2f35] px-3 py-2 text-sm leading-5 text-[#efeff1] outline-none placeholder:text-[#adadb8] hover:border-[#3a3a3d] focus:border-[#9147ff] focus:bg-[#0e0e10]"
          />
        </label>
        <div className="mt-2 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs text-[#adadb8]">
            Como <span className="font-bold" style={{ color: colorNombre(nombre || "Visitante") }}>{nombre.trim() || "Visitante"}</span>
          </span>
          <button
            type="button"
            aria-label="Ajustes del chat"
            aria-expanded={ajustes}
            onClick={() => setAjustes((abierto) => !abierto)}
            className={`flex size-8 items-center justify-center rounded-md hover:bg-[#2f2f35] ${ajustes ? "bg-[#2f2f35]" : ""}`}
          >
            <Icono nombre="engranaje" className="size-4" />
          </button>
          <button
            type="submit"
            disabled={!conectado || texto.trim() === ""}
            className="h-8 rounded-md bg-[#9147ff] px-3 text-sm font-bold text-white hover:bg-[#772ce8] disabled:cursor-not-allowed disabled:bg-[#3a3a3d] disabled:text-[#7a7a85]"
          >
            Chat
          </button>
        </div>
      </form>
    </section>
  );
}
