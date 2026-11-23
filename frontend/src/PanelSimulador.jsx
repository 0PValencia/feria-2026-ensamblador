import { Icono } from "./iconos.jsx";

const INTENSIDADES = [
  ["baja", "Baja", "senal"],
  ["media", "Media", "rayo"],
  ["alta", "Alta", "alerta"],
];

export default function PanelSimulador({
  conectado,
  cantidad,
  setCantidad,
  intensidad,
  setIntensidad,
  ritmos,
  ataqueActivo,
  onAtacar,
  onDetener,
}) {
  function ajustar(delta) {
    const actual = Number(cantidad);
    const base = Number.isFinite(actual) ? actual : 1;
    setCantidad(String(Math.min(30, Math.max(1, base + delta))));
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(evento) => {
        evento.preventDefault();
        onAtacar();
      }}
    >
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#adadb8]">Cuentas bot</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Menos bots"
            onClick={() => ajustar(-1)}
            className="flex size-10 items-center justify-center rounded-md bg-[#2f2f35] hover:bg-[#3a3a3d]"
          >
            <Icono nombre="menos" className="size-4" />
          </button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Cantidad de bots</span>
            <input
              type="number"
              min={1}
              max={30}
              value={cantidad}
              onChange={(evento) => setCantidad(evento.target.value)}
              className="h-10 w-full rounded-md border-2 border-[#3a3a3d] bg-[#0e0e10] text-center text-lg font-bold tabular text-[#efeff1] outline-none focus:border-[#9147ff]"
            />
          </label>
          <button
            type="button"
            aria-label="Más bots"
            onClick={() => ajustar(1)}
            className="flex size-10 items-center justify-center rounded-md bg-[#2f2f35] hover:bg-[#3a3a3d]"
          >
            <Icono nombre="mas" className="size-4" />
          </button>
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-[#adadb8]">Intensidad</legend>
        <div className="grid grid-cols-3 gap-2">
          {INTENSIDADES.map(([id, titulo, icono]) => {
            const activo = intensidad === id;
            return (
              <label
                key={id}
                className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 px-1 py-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#bf94ff] ${
                  activo
                    ? "border-[#9147ff] bg-[#9147ff]/15 text-[#efeff1]"
                    : "border-transparent bg-[#2f2f35] text-[#adadb8] hover:text-[#efeff1]"
                }`}
              >
                <input
                  type="radio"
                  name="intensidad"
                  value={id}
                  checked={activo}
                  onChange={() => setIntensidad(id)}
                  className="sr-only"
                />
                <Icono nombre={icono} className="size-4" />
                <span className="text-sm font-bold">{titulo}</span>
                <span className="text-[11px] tabular text-[#adadb8]">{ritmos[id] ?? "—"} msg/s</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {ataqueActivo ? (
        <button
          type="button"
          onClick={onDetener}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#eb0400] px-3 font-bold text-white hover:bg-[#c90300]"
        >
          <Icono nombre="ban" className="size-4" />
          Detener ataque
        </button>
      ) : (
        <button
          type="submit"
          disabled={!conectado}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#9147ff] px-3 font-bold text-white hover:bg-[#772ce8] disabled:cursor-not-allowed disabled:bg-[#3a3a3d]"
        >
          <Icono nombre="rayo" className="size-4" />
          Simular ataque de bots
        </button>
      )}
      <p className="text-xs leading-5 text-[#adadb8]">
        Tráfico sintético y local. Ninguna cuenta real participa.
      </p>
    </form>
  );
}
