const INTENSIDADES = [
  ["baja", "Baja"],
  ["media", "Media"],
  ["alta", "Alta"],
];

export default function PanelSimulador({
  conectado,
  nombre,
  setNombre,
  texto,
  setTexto,
  cantidad,
  setCantidad,
  intensidad,
  setIntensidad,
  ritmos,
  ataqueActivo,
  onEnviar,
  onAtacar,
  onDetener,
}) {
  return (
    <section className="flex h-[78dvh] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#31415f] bg-[#121a2e] min-[1200px]:h-full">
      <header className="shrink-0 border-b border-[#31415f] px-4 py-3">
        <h2 className="text-lg font-semibold">Simulador de chat</h2>
        <p className="text-sm text-[#d5e0f5]">Escribe como visitante o lanza el ataque sintético.</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            onEnviar();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="font-medium">Tu nombre</span>
            <input
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              maxLength={24}
              autoComplete="nickname"
              placeholder="Visitante"
              className="min-h-11 rounded-lg border border-[#31415f] bg-[#0c1222] px-3 text-[#f4f7ff] placeholder:text-[#9aabca]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Comentario</span>
            <textarea
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" && !evento.shiftKey) {
                  evento.preventDefault();
                  onEnviar();
                }
              }}
              rows={3}
              maxLength={500}
              placeholder="Escribe un mensaje para el muro"
              className="rounded-lg border border-[#31415f] bg-[#0c1222] px-3 py-2 text-[#f4f7ff] placeholder:text-[#9aabca]"
            />
          </label>
          <button
            type="submit"
            disabled={!conectado || texto.trim() === ""}
            className="min-h-11 rounded-lg bg-[#1d4ed8] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#243556]"
          >
            Enviar comentario
          </button>
        </form>

        <form
          className="flex flex-col gap-3 border-t border-[#31415f] pt-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            onAtacar();
          }}
        >
          <h3 className="font-semibold">Ataque de spam repetitivo</h3>
          <p className="text-sm text-[#d5e0f5]">
            Crea cuentas ficticias que publican variantes de un mismo aviso: signos, emoticonos,
            una letra cambiada, espacios dobles o mayúsculas alternadas.
          </p>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Cantidad de bots</span>
            <input
              type="number"
              min={1}
              max={30}
              value={cantidad}
              onChange={(evento) => setCantidad(evento.target.value)}
              className="min-h-11 rounded-lg border border-[#31415f] bg-[#0c1222] px-3 tabular"
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">Intensidad</legend>
            <div className="grid grid-cols-3 gap-2">
              {INTENSIDADES.map(([id, titulo]) => (
                <label
                  key={id}
                  className={`flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#9dc1ff] ${
                    intensidad === id
                      ? "border-[#9dc1ff] bg-[#1a2d52]"
                      : "border-[#31415f] bg-[#0c1222]"
                  }`}
                >
                  <input
                    type="radio"
                    name="intensidad"
                    value={id}
                    checked={intensidad === id}
                    onChange={() => setIntensidad(id)}
                    className="sr-only"
                  />
                  <span className="font-semibold">{titulo}</span>
                  <span className="text-sm text-[#d5e0f5]">{ritmos[id] ?? "—"} msg/s</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={!conectado}
            className="min-h-12 rounded-lg bg-[#1d4ed8] px-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#243556]"
          >
            Simular Ataque de Bots
          </button>
          {ataqueActivo && (
            <button
              type="button"
              onClick={onDetener}
              className="min-h-11 rounded-lg border border-[#9dc1ff] px-4 font-semibold text-[#f4f7ff]"
            >
              Detener ataque
            </button>
          )}
          <p className="text-sm text-[#d5e0f5]">
            {ataqueActivo
              ? "El ataque está en curso. Puedes reemplazarlo o detenerlo."
              : "El tráfico de usuarios reales sigue activo junto con el ataque."}
          </p>
        </form>
        <p className="mt-auto text-sm text-[#d5e0f5]">
          Tráfico sintético y local. No se conecta a redes ni a cuentas reales.
        </p>
      </div>
    </section>
  );
}
