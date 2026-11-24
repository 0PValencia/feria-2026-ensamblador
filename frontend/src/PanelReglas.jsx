import { useEffect, useId, useState } from "react";
import { Icono } from "./iconos.jsx";

const CAMPOS = [
  ["ventana_segundos", "Ventana (s)", "0.5", false, "Tiempo durante el que se cuentan los comentarios seguidos de una misma cuenta, según su fecha de publicación en YouTube. Una ventana más larga atrapa ráfagas más lentas, pero también puede marcar a usuarios muy activos."],
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

export default function PanelReglas({ umbrales, onGuardar, onRestablecer }) {
  const [formulario, setFormulario] = useState(umbrales);
  const [confirmar, setConfirmar] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => setFormulario(umbrales), [umbrales]);

  function guardar(evento) {
    evento.preventDefault();
    const datos = {};
    for (const [clave, , , entero] of CAMPOS) {
      const numero = Number(formulario?.[clave]);
      if (!Number.isFinite(numero)) {
        setMensaje({ error: true, texto: "Revisa los valores: todos deben ser números." });
        return;
      }
      datos[clave] = entero ? Math.trunc(numero) : numero;
    }
    try {
      onGuardar(datos);
      setMensaje({ error: false, texto: "Guardado. Se usará en el próximo análisis." });
    } catch (error) {
      setMensaje({ error: true, texto: error.message });
    }
  }

  return (
    <section className="px-5 py-5" aria-label="Reglas de detección">
      <div className="relative flex items-start gap-2 rounded-md bg-[#9147ff]/10 px-3 py-2.5 text-sm text-[#efeff1]">
        <Ayuda
          titulo="Cómo modificar las reglas"
          texto="Cada comentario suma puntos de riesgo según las tres reglas: frecuencia, similitud y patrones. Cambia un valor y pulsa Aplicar: el próximo análisis usará los nuevos valores y quedará guardado con ellos, así sabrás con qué reglas se hizo cada comparación. Restablecer vuelve a los valores del documento base."
        />
        <p>
          Toca <span className="font-bold">?</span> para saber qué hace cada valor. Los cambios se aplican en el próximo análisis;
          los anteriores no se modifican.
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
                  onChange={(evento) => setFormulario((actual) => ({ ...actual, [clave]: evento.target.value }))}
                  className="min-h-11 rounded-md border-2 border-[#3a3a3d] bg-[#0e0e10] px-3 tabular outline-none focus:border-[#9147ff]"
                />
              </div>
            ))}
          </div>
          {mensaje && (
            <p role="status" className={`text-sm font-semibold ${mensaje.error ? "text-[#ff8280]" : "text-[#5cffb0]"}`}>
              {mensaje.texto}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#9147ff] px-4 font-bold text-white hover:bg-[#772ce8]"
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
                onRestablecer();
                setMensaje({ error: false, texto: "Valores por defecto restablecidos." });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#3a3a3d] px-4 font-bold hover:bg-[#2f2f35]"
            >
              <Icono nombre="refrescar" className="size-4" />
              {confirmar ? "Confirmar" : "Restablecer"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
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
