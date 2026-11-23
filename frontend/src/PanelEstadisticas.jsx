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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);
ChartJS.defaults.color = "#d5e0f5";
ChartJS.defaults.font.family = '"Segoe UI", "Helvetica Neue", sans-serif';
ChartJS.defaults.font.size = 13;

const CAMPOS = [
  ["ventana_segundos", "Ventana de frecuencia (segundos)", "0.5", false],
  ["mensajes_maximos", "Mensajes permitidos en la ventana", "1", true],
  ["similitud_umbral", "Similitud que debe superarse (0 a 1)", "0.05", false],
  ["puntos_frecuencia", "Puntos por frecuencia", "1", true],
  ["puntos_similitud", "Puntos por similitud", "1", true],
  ["puntos_patrones", "Puntos por patrones", "1", true],
  ["mayusculas_umbral", "Proporción de mayúsculas que debe superarse", "0.05", false],
  ["umbral_sospechoso", "Desde este % es sospechoso", "1", true],
  ["umbral_bot", "Desde este % es bot", "1", true],
  ["ventana_observacion", "Ventana de observación (segundos)", "1", false],
];

function opcionesLinea(maximo) {
  const vertical = {
    beginAtZero: true,
    ticks: { color: "#d5e0f5" },
    grid: { color: "rgba(213, 224, 245, 0.12)" },
  };
  if (typeof maximo === "number") vertical.max = maximo;
  return {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { maxTicksLimit: 6, color: "#d5e0f5" },
        grid: { color: "rgba(213, 224, 245, 0.12)" },
      },
      y: vertical,
    },
  };
}

function etiquetas(cantidad) {
  return Array.from({ length: cantidad }, (_, indice) =>
    indice === cantidad - 1 ? "ahora" : `-${cantidad - 1 - indice}s`,
  );
}

export default function PanelEstadisticas({
  stats,
  umbrales,
  conectado,
  onConfigurar,
  onReiniciar,
  onDesbloquear,
}) {
  const [formulario, setFormulario] = useState(umbrales);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    if (umbrales) setFormulario(umbrales);
  }, [umbrales]);

  const reales = stats.usuarios_reales || 0;
  const bloqueadosBots = stats.bots_bloqueados || 0;
  const hayGrafico = reales + bloqueadosBots > 0;
  const serieMps = stats.serie_mps || [];
  const serieRiesgo = stats.serie_riesgo || [];

  const dona = useMemo(
    () => ({
      labels: [
        `Usuarios reales (${reales})`,
        `Bots bloqueados (${bloqueadosBots})`,
      ],
      datasets: [
        {
          data: [reales, bloqueadosBots],
          backgroundColor: ["#1f9d57", "#e23b4e"],
          borderColor: "#121a2e",
          borderWidth: 2,
        },
      ],
    }),
    [reales, bloqueadosBots],
  );

  const lineaMps = useMemo(
    () => ({
      labels: etiquetas(serieMps.length),
      datasets: [
        {
          label: "Mensajes por segundo",
          data: serieMps,
          borderColor: "#9dc1ff",
          backgroundColor: "rgba(157, 193, 255, 0.25)",
          fill: true,
          pointRadius: 0,
          tension: 0.25,
        },
      ],
    }),
    [serieMps],
  );

  const lineaRiesgo = useMemo(
    () => ({
      labels: etiquetas(serieRiesgo.length),
      datasets: [
        {
          label: "Riesgo medio",
          data: serieRiesgo,
          borderColor: "#ffb020",
          backgroundColor: "rgba(255, 176, 32, 0.2)",
          fill: true,
          pointRadius: 0,
          tension: 0.25,
        },
      ],
    }),
    [serieRiesgo],
  );

  function cambiar(clave, valor) {
    setFormulario((actual) => ({ ...actual, [clave]: valor }));
  }

  function guardar(evento) {
    evento.preventDefault();
    const payload = {};
    for (const [clave, , , entero] of CAMPOS) {
      const numero = Number(formulario?.[clave]);
      if (!Number.isFinite(numero)) return;
      payload[clave] = entero ? Math.trunc(numero) : numero;
    }
    onConfigurar(payload);
  }

  const tasa = Math.round((stats.tasa_deteccion || 0) * 100);
  const deteccion =
    stats.tiempo_deteccion_s == null ? "—" : `${Number(stats.tiempo_deteccion_s).toFixed(2)} s`;

  return (
    <section className="flex h-[78dvh] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#31415f] bg-[#121a2e] min-[1200px]:h-full">
      <header className="shrink-0 border-b border-[#31415f] px-4 py-3">
        <h2 className="text-lg font-semibold">Estadísticas</h2>
        <p className="text-sm text-[#d5e0f5]">Comentarios, ritmo del muro y cuentas bloqueadas.</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <dl className="grid grid-cols-2 gap-2">
          <Dato titulo="Comentarios procesados" valor={stats.comentarios_procesados || 0} />
          <Dato titulo="Mensajes por segundo" valor={stats.mensajes_por_segundo || 0} />
          <Dato titulo="Cuentas bloqueadas" valor={stats.cuentas_bloqueadas || 0} />
          <Dato titulo="Tasa de detección" valor={`${tasa} %`} />
          <Dato titulo="Tiempo medio de análisis" valor={`${Number(stats.tiempo_analisis_ms || 0).toFixed(2)} ms`} />
          <Dato titulo="Tiempo medio hasta marcar un bot" valor={deteccion} />
        </dl>
        <p className="mt-2 text-sm text-[#d5e0f5]">
          {stats.bots_marcados || 0} de {stats.bots_evaluados || 0} cuentas del ataque llegaron a
          bot. Mensajes descartados tras un bloqueo: {stats.mensajes_descartados || 0}. Activos:{" "}
          {stats.usuarios_reales || 0} reales, {stats.usuarios_sospechosos || 0} sospechosos,{" "}
          {stats.usuarios_bot || 0} bots.
        </p>

        <h3 className="mt-4 font-semibold">Usuarios reales frente a bots bloqueados</h3>
        {hayGrafico ? (
          <div className="mt-2 h-44">
            <Doughnut
              data={dona}
              options={{
                animation: false,
                plugins: { legend: { position: "bottom", labels: { color: "#f4f7ff" } } },
              }}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#d5e0f5]">
            Todavía no hay usuarios reales ni bots bloqueados para comparar.
          </p>
        )}
        <p className="mt-2 text-sm text-[#d5e0f5]">
          {reales} usuarios reales ({stats.porcentaje_reales || 0} %) y {bloqueadosBots} bots
          bloqueados ({stats.porcentaje_bots_bloqueados || 0} %).
        </p>

        <h3 className="mt-4 font-semibold">Mensajes por segundo</h3>
        {serieMps.length > 0 ? (
          <div className="mt-2 h-36">
            <Line data={lineaMps} options={opcionesLinea(undefined)} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#d5e0f5]">Esperando el primer segundo de medición.</p>
        )}

        <h3 className="mt-4 font-semibold">Evolución del riesgo durante el ataque</h3>
        {serieRiesgo.length > 0 ? (
          <div className="mt-2 h-36">
            <Line data={lineaRiesgo} options={opcionesLinea(100)} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#d5e0f5]">El riesgo medio aparece al llegar comentarios.</p>
        )}
        <p className="mt-1 text-sm text-[#d5e0f5]">
          Último punto: {serieRiesgo.length ? serieRiesgo[serieRiesgo.length - 1] : 0} % de riesgo medio.
        </p>

        <h3 className="mt-4 font-semibold">Cuentas bloqueadas</h3>
        {(stats.bloqueados || []).length === 0 ? (
          <p className="mt-1 text-sm text-[#d5e0f5]">Ninguna cuenta bloqueada.</p>
        ) : (
          <ul className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
            {stats.bloqueados.map((cuenta) => (
              <li key={cuenta} className="flex items-center justify-between gap-2 rounded-lg bg-[#0c1222] px-3 py-2">
                <span>{cuenta}</span>
                <button
                  type="button"
                  onClick={() => onDesbloquear(cuenta)}
                  className="min-h-11 rounded-lg border border-[#9dc1ff] px-3 font-semibold"
                >
                  Desbloquear
                </button>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-xl border border-[#31415f] px-3 py-2">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Umbrales de las reglas</summary>
          {formulario ? (
            <form className="mt-2 flex flex-col gap-3" onSubmit={guardar}>
              <p className="text-sm text-[#d5e0f5]">
                La frecuencia suma puntos cuando llegan más mensajes que el máximo, dentro de la
                ventana. La similitud y las mayúsculas suman cuando superan el valor. Se aplican a
                los comentarios que lleguen después.
              </p>
              {CAMPOS.map(([clave, etiqueta, paso]) => (
                <label key={clave} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{etiqueta}</span>
                  <input
                    type="number"
                    step={paso}
                    value={formulario[clave] ?? ""}
                    onChange={(evento) => cambiar(clave, evento.target.value)}
                    className="min-h-11 rounded-lg border border-[#31415f] bg-[#0c1222] px-3 tabular"
                  />
                </label>
              ))}
              <button
                type="submit"
                disabled={!conectado}
                className="min-h-11 rounded-lg bg-[#1d4ed8] px-4 font-semibold text-white disabled:bg-[#243556]"
              >
                Aplicar umbrales
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirmar) {
                    setConfirmar(true);
                    return;
                  }
                  setConfirmar(false);
                  onReiniciar();
                }}
                className="min-h-11 rounded-lg border border-[#ff8b98] px-4 font-semibold"
              >
                {confirmar ? "Confirmar reinicio" : "Reiniciar simulación"}
              </button>
            </form>
          ) : (
            <p className="py-2 text-sm text-[#d5e0f5]">Cargando umbrales…</p>
          )}
        </details>
      </div>
    </section>
  );
}

function Dato({ titulo, valor }) {
  return (
    <div className="rounded-xl bg-[#0c1222] px-3 py-2">
      <dt className="text-sm text-[#d5e0f5]">{titulo}</dt>
      <dd className="text-2xl font-semibold tabular">{valor}</dd>
    </div>
  );
}
