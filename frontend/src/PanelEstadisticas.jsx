import { useEffect, useId, useMemo, useState } from "react";
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
import { Icono } from "./iconos.jsx";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);
ChartJS.defaults.color = "#adadb8";
ChartJS.defaults.font.family = '"Open Sans", "Segoe UI", sans-serif';
ChartJS.defaults.font.size = 13;

const CAMPOS = [
  ["ventana_segundos", "Ventana (s)", "0.5", false, "Tiempo durante el que se cuentan los mensajes seguidos de una misma cuenta. Una ventana más larga atrapa ráfagas más lentas, pero también puede marcar a usuarios muy activos."],
  ["mensajes_maximos", "Mensajes en la ventana", "1", true, "Cuántos mensajes puede enviar una cuenta dentro de la ventana sin sumar riesgo. Si lo bajas, los bots se detectan antes; si lo subes, hay menos falsos positivos."],
  ["similitud_umbral", "Similitud (0 a 1)", "0.05", false, "Qué tan parecido debe ser un mensaje a otro anterior de la misma cuenta para contarlo como repetido. 0 es totalmente distinto y 1 es idéntico; 0,8 detecta copias con pequeñas variaciones."],
  ["puntos_frecuencia", "Puntos de frecuencia", "1", true, "Riesgo (en %) que se suma cuando la cuenta supera los mensajes permitidos en la ventana."],
  ["puntos_similitud", "Puntos de similitud", "1", true, "Riesgo (en %) que se suma cuando el mensaje es casi idéntico a uno anterior de la misma cuenta."],
  ["puntos_patrones", "Puntos de patrones", "1", true, "Riesgo (en %) que se suma si el mensaje tiene dos o más enlaces o demasiadas mayúsculas."],
  ["mayusculas_umbral", "Mayúsculas (0 a 1)", "0.05", false, "Proporción de letras en mayúscula desde la que el mensaje cuenta como sospechoso (0,7 = 70 %). Solo se revisan mensajes con al menos 10 letras."],
  ["umbral_sospechoso", "Sospechoso desde %", "1", true, "Riesgo mínimo para marcar la cuenta como sospechosa (ámbar). Por debajo, la cuenta se considera real."],
  ["umbral_bot", "Bot desde %", "1", true, "Riesgo mínimo para marcar la cuenta como bot (rojo), mostrar la alerta y sugerir el bloqueo. Debe ser mayor que el umbral de sospechoso."],
  ["ventana_observacion", "Observación (s)", "1", false, "Segundos que la cuenta conserva su riesgo más alto tras un mensaje sospechoso. Evita que un bot lento parezca limpio entre mensaje y mensaje."],
];

function opcionesLinea(maximo) {
  const vertical = {
    beginAtZero: true,
    ticks: { color: "#adadb8" },
    grid: { color: "rgba(210, 204, 223, 0.12)" },
  };
  if (typeof maximo === "number") vertical.max = maximo;
  return {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { maxTicksLimit: 6, color: "#adadb8" },
        grid: { color: "rgba(210, 204, 223, 0.12)" },
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
  seccion,
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
      labels: [`Reales (${reales})`, `Bots bloqueados (${bloqueadosBots})`],
      datasets: [
        {
          data: [reales, bloqueadosBots],
          backgroundColor: ["#1f9d57", "#e23b4e"],
          borderColor: "#1f1f23",
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
          borderColor: "#b9a2e8",
          backgroundColor: "rgba(100, 66, 164, 0.35)",
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
    <section className="px-5 py-5" aria-label={seccion === "reglas" ? "Reglas" : "Estadísticas"}>
      {seccion === "graficos" && (
        <>
          <dl className="grid grid-cols-2 gap-2">
            <Dato icono="muro" titulo="Procesados" valor={stats.comentarios_procesados || 0} />
            <Dato icono="senal" titulo="Msg/s" valor={stats.mensajes_por_segundo || 0} />
            <Dato icono="candado" titulo="Bloqueados" valor={stats.cuentas_bloqueadas || 0} />
            <Dato icono="escudo" titulo="Detección" valor={`${tasa} %`} />
            <Dato icono="reloj" titulo="Análisis" valor={`${Number(stats.tiempo_analisis_ms || 0).toFixed(2)} ms`} />
            <Dato icono="bot" titulo="Hasta marcar" valor={deteccion} />
          </dl>
          <p className="mt-3 text-sm text-[#adadb8]">
            {stats.bots_marcados || 0} de {stats.bots_evaluados || 0} cuentas del ataque llegaron a bot.
            Activos: {stats.usuarios_reales || 0} reales, {stats.usuarios_sospechosos || 0} sospechosos,{" "}
            {stats.usuarios_bot || 0} bots.
          </p>
          <div className="mt-5 grid gap-3">
            <Grafico titulo="Reales y bots" icono="usuarios">
              {hayGrafico ? (
                <Doughnut
                  data={dona}
                  options={{
                    animation: false,
                    plugins: { legend: { position: "bottom", labels: { color: "#efeff1", boxWidth: 12 } } },
                  }}
                />
              ) : (
                <Vacio texto="Aún no hay cuentas para comparar." />
              )}
            </Grafico>
            <Grafico titulo="Mensajes por segundo" icono="senal">
              {serieMps.length > 0 ? (
                <Line data={lineaMps} options={opcionesLinea(undefined)} />
              ) : (
                <Vacio texto="Esperando el primer segundo." />
              )}
            </Grafico>
            <Grafico titulo="Riesgo del ataque" icono="rayo">
              {serieRiesgo.length > 0 ? (
                <Line data={lineaRiesgo} options={opcionesLinea(100)} />
              ) : (
                <Vacio texto="Aparece al llegar comentarios." />
              )}
            </Grafico>
          </div>
          <h3 className="mt-6 flex items-center gap-2 font-bold">
            <Icono nombre="candado" className="size-5" />
            Cuentas bloqueadas
          </h3>
          {(stats.bloqueados || []).length === 0 ? (
            <p className="mt-2 text-sm text-[#adadb8]">Ninguna.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {stats.bloqueados.map((cuenta) => (
                <li key={cuenta} className="flex items-center justify-between gap-2 rounded-md bg-[#1f1f23] px-3 py-2">
                  <span className="truncate font-semibold">{cuenta}</span>
                  <button
                    type="button"
                    onClick={() => onDesbloquear(cuenta)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[#bf94ff] px-3 font-semibold"
                  >
                    <Icono nombre="check" className="size-4" />
                    Desbloquear
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {seccion === "reglas" && (
        <>
          <div className="relative flex items-start gap-2 rounded-md bg-[#9147ff]/10 px-3 py-2.5 text-sm text-[#efeff1]">
            <Ayuda
              titulo="Cómo modificar las reglas"
              texto="Cada comentario suma puntos de riesgo según las tres reglas: frecuencia, similitud y patrones. Cambia un valor, pulsa Aplicar y los comentarios nuevos se evaluarán con él. Reiniciar borra la simulación y vuelve a empezar."
            />
            <p>
              Toca <span className="font-bold">?</span> para saber qué hace cada valor. Los cambios se aplican a los comentarios que lleguen
              después de guardar.
            </p>
          </div>
          {formulario ? (
            <form className="mt-4 flex flex-col gap-4" onSubmit={guardar}>
              <div className="grid grid-cols-2 gap-2">
                {CAMPOS.map(([clave, etiqueta, paso, , ayuda]) => (
                  <div key={clave} className="relative flex flex-col gap-1.5 rounded-md bg-[#1f1f23] px-3 py-3">
                    <span className="flex items-start justify-between gap-2">
                      <label htmlFor={`regla-${clave}`} className="text-sm font-semibold">
                        {etiqueta}
                      </label>
                      <Ayuda titulo={etiqueta} texto={ayuda} />
                    </span>
                    <input
                      id={`regla-${clave}`}
                      type="number"
                      step={paso}
                      value={formulario[clave] ?? ""}
                      onChange={(evento) => cambiar(clave, evento.target.value)}
                      className="min-h-11 rounded-md border-2 border-[#3a3a3d] bg-[#0e0e10] px-3 tabular outline-none focus:border-[#9147ff]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!conectado}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#9147ff] px-4 font-bold text-white hover:bg-[#772ce8] disabled:bg-[#3a3a3d]"
                >
                  <Icono nombre="check" className="size-4" />
                  Aplicar
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#ff8b98] px-4 font-bold"
                >
                  <Icono nombre="refrescar" className="size-4" />
                  {confirmar ? "Confirmar reinicio" : "Reiniciar"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-sm text-[#adadb8]">Cargando reglas…</p>
          )}
        </>
      )}
    </section>
  );
}

function Dato({ icono, titulo, valor }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-[#1f1f23] px-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#9147ff]/20 text-[#bf94ff]">
        <Icono nombre={icono} className="size-4" />
      </span>
      <div>
        <dt className="text-xs text-[#adadb8]">{titulo}</dt>
        <dd className="text-xl font-bold tabular leading-tight">{valor}</dd>
      </div>
    </div>
  );
}

function Grafico({ titulo, icono, children }) {
  return (
    <section className="rounded-md bg-[#1f1f23] p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold">
        <Icono nombre={icono} className="size-4 text-[#bf94ff]" />
        {titulo}
      </h3>
      <div className="h-48">{children}</div>
    </section>
  );
}

function Vacio({ texto }) {
  return <p className="flex h-full items-center text-sm text-[#adadb8]">{texto}</p>;
}

function Ayuda({ titulo, texto }) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-label={`Ayuda: ${titulo}`}
        aria-expanded={abierta}
        aria-controls={id}
        onClick={() => setAbierta((valor) => !valor)}
        onBlur={() => setAbierta(false)}
        onKeyDown={(evento) => evento.key === "Escape" && abierta && (evento.stopPropagation(), setAbierta(false))}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold leading-none transition-colors ${
          abierta ? "bg-[#9147ff] text-white" : "bg-[#3a3a3d] text-[#efeff1] hover:bg-[#9147ff]"
        }`}
      >
        ?
      </button>
      {abierta && (
        <div
          id={id}
          role="tooltip"
          className="alerta-entrada absolute inset-x-2 top-full z-10 mt-1 rounded-md border border-[#3a3a3d] bg-[#0e0e10] p-3 text-xs font-normal leading-5 text-[#efeff1] shadow-2xl"
        >
          <p className="mb-1 font-bold text-[#bf94ff]">{titulo}</p>
          {texto}
        </div>
      )}
    </>
  );
}
