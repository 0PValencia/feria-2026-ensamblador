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
      className="flex flex-col gap-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        onAtacar();
      }}
    >
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Icono nombre="rayo" className="size-4" />
        Ataque
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Menos bots"
          onClick={() => ajustar(-1)}
          className="flex size-11 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
        >
          <Icono nombre="menos" />
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Cantidad de bots</span>
          <input
            type="number"
            min={1}
            max={30}
            value={cantidad}
            onChange={(evento) => setCantidad(evento.target.value)}
            className="h-11 w-full rounded-lg border border-white/25 bg-black/25 text-center text-lg font-bold tabular text-white"
          />
        </label>
        <button
          type="button"
          aria-label="Más bots"
          onClick={() => ajustar(1)}
          className="flex size-11 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
        >
          <Icono nombre="mas" />
        </button>
      </div>
      <fieldset>
        <legend className="sr-only">Intensidad</legend>
        <div className="grid grid-cols-3 gap-2">
          {INTENSIDADES.map(([id, titulo, icono]) => {
            const activo = intensidad === id;
            return (
              <label
                key={id}
                title={`${ritmos[id] ?? "—"} mensajes por segundo`}
                className={`flex min-h-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white ${
                  activo ? "bg-white text-[#4c2f86]" : "bg-white/15 text-white hover:bg-white/25"
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
              </label>
            );
          })}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={!conectado}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-3 text-base font-bold text-[#4c2f86] disabled:cursor-not-allowed disabled:bg-white/40"
      >
        <Icono nombre="rayo" className="size-5" />
        Simular ataque
      </button>
      {ataqueActivo && (
        <button
          type="button"
          onClick={onDetener}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white px-3 font-bold"
        >
          <Icono nombre="ban" className="size-4" />
          Detener
        </button>
      )}
      <p className="text-sm text-white/85">Tráfico local, sin cuentas reales.</p>
    </form>
  );
}
