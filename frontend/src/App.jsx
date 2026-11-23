import { useEffect, useRef, useState } from "react";
import { IconoEscudo } from "./iconos.jsx";
import PanelEstadisticas from "./PanelEstadisticas.jsx";
import PanelMuro from "./PanelMuro.jsx";
import PanelSimulador from "./PanelSimulador.jsx";
import { crearSocket } from "./socket.js";

const MOMENTOS = [
  ["Tráfico normal", "Los mensajes variados se ven en verde."],
  ["Ataque", "El muro se llena de avisos casi iguales."],
  ["Detección", "Las cuentas del ataque pasan a rojo con su razón."],
  ["Moderación", "Bloquea con un clic y mira la proporción de bots bloqueados."],
];

const STATS_VACIAS = {
  comentarios_procesados: 0,
  mensajes_descartados: 0,
  usuarios_reales: 0,
  usuarios_sospechosos: 0,
  usuarios_bot: 0,
  cuentas_bloqueadas: 0,
  bots_bloqueados: 0,
  bots_evaluados: 0,
  bots_marcados: 0,
  tasa_deteccion: 0,
  mensajes_por_segundo: 0,
  tiempo_analisis_ms: 0,
  tiempo_deteccion_s: null,
  porcentaje_reales: 0,
  porcentaje_bots_bloqueados: 0,
  serie_mps: [],
  serie_riesgo: [],
  bloqueados: [],
  ataque_activo: false,
  intensidad: null,
  cantidad_bots: 0,
};

function momentoActual(stats) {
  if ((stats.cuentas_bloqueadas || 0) > 0) return 4;
  if ((stats.usuarios_bot || 0) > 0 || (stats.bots_marcados || 0) > 0) return 3;
  if (stats.ataque_activo) return 2;
  return 1;
}

export default function App() {
  const socketRef = useRef(null);
  const anunciados = useRef(new Set());
  const [conectado, setConectado] = useState(false);
  const [comentarios, setComentarios] = useState([]);
  const [stats, setStats] = useState(STATS_VACIAS);
  const [umbrales, setUmbrales] = useState(null);
  const [ritmos, setRitmos] = useState({ baja: 2, media: 8, alta: 20 });
  const [nombre, setNombre] = useState(() => localStorage.getItem("sbg-nombre") || "");
  const [texto, setTexto] = useState("");
  const [cantidad, setCantidad] = useState("6");
  const [intensidad, setIntensidad] = useState("media");
  const [aviso, setAviso] = useState("");
  const [anuncio, setAnuncio] = useState("");

  useEffect(() => {
    localStorage.setItem("sbg-nombre", nombre);
  }, [nombre]);

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(""), 3500);
    return () => clearTimeout(id);
  }, [aviso]);

  useEffect(() => {
    const ultimo = comentarios[0];
    if (!ultimo || ultimo.clasificacion !== "bot") return;
    if (anunciados.current.has(ultimo.usuario)) return;
    anunciados.current.add(ultimo.usuario);
    setAnuncio(`Bot detectado: ${ultimo.usuario}. ${(ultimo.razones || []).join(". ")}`);
  }, [comentarios]);

  useEffect(() => {
    const socket = crearSocket();
    socketRef.current = socket;
    socket.on("connect", () => setConectado(true));
    socket.on("disconnect", () => setConectado(false));
    socket.on("estado", (data) => {
      anunciados.current.clear();
      setComentarios(data.comentarios || []);
      setStats({ ...STATS_VACIAS, ...(data.estadisticas || {}) });
      setUmbrales(data.umbrales || null);
      if (data.ritmos) setRitmos(data.ritmos);
    });
    socket.on("comentario", (comentario) => {
      setComentarios((previos) => [comentario, ...previos].slice(0, 200));
    });
    socket.on("estadisticas", (data) => setStats({ ...STATS_VACIAS, ...data }));
    socket.on("umbrales", (data) => setUmbrales(data));
    socket.on("descartado", (data) => {
      setAviso(`Mensaje de ${data.usuario} descartado: la cuenta está bloqueada.`);
    });
    socket.on("error_usuario", (data) => setAviso(data.mensaje || "No se pudo completar la acción."));
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  function emitir(evento, datos) {
    socketRef.current?.emit(evento, datos);
  }

  function enviar() {
    const limpio = texto.trim();
    if (!limpio) return;
    emitir("comentario", { usuario: nombre, texto: limpio });
    setTexto("");
  }

  function atacar() {
    const bots = Number(cantidad);
    if (!Number.isInteger(bots) || bots < 1 || bots > 30) {
      setAviso("La cantidad de bots debe estar entre 1 y 30.");
      return;
    }
    emitir("simular_ataque", { cantidad_bots: bots, intensidad });
  }

  const paso = momentoActual(stats);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0c1222] text-[#f4f7ff] min-[1200px]:h-dvh">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#31415f] px-4 py-3">
        <div className="flex items-center gap-3">
          <IconoEscudo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SocialBotGuard</h1>
            <p className="text-sm text-[#d5e0f5]">
              Detección en tiempo real de spam repetitivo · UAGRM · INF221 · Grupo SX
            </p>
          </div>
        </div>
        <p className={conectado ? "text-[#b6f3cf]" : "text-[#ffc9d0]"}>
          <span
            className={`mr-2 inline-block size-2.5 rounded-full ${conectado ? "bg-[#3ddc84]" : "bg-[#ff5d73]"}`}
            aria-hidden="true"
          />
          {conectado ? "En vivo" : "Sin conexión con el servidor"}
        </p>
      </header>

      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>
      {aviso && (
        <p role="status" className="mx-3 mt-3 rounded-lg bg-[#243556] px-4 py-3">
          {aviso}
        </p>
      )}

      <ol className="mx-3 mt-3 grid shrink-0 grid-cols-2 gap-2 min-[1200px]:grid-cols-4">
        {MOMENTOS.map(([titulo, detalle], indice) => {
          const numero = indice + 1;
          const activo = numero === paso;
          return (
            <li
              key={titulo}
              aria-current={activo ? "step" : undefined}
              className={`rounded-xl border px-3 py-2 ${
                activo ? "border-[#9dc1ff] bg-[#1a2d52]" : "border-[#31415f] bg-[#121a2e]"
              }`}
            >
              <p className="text-sm text-[#d5e0f5]">Momento {numero}</p>
              <p className="font-semibold">{titulo}</p>
              <p className="text-sm text-[#d5e0f5]">{detalle}</p>
            </li>
          );
        })}
      </ol>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 min-[1200px]:grid-cols-[320px_minmax(0,1fr)_360px]">
        <PanelSimulador
          conectado={conectado}
          nombre={nombre}
          setNombre={setNombre}
          texto={texto}
          setTexto={setTexto}
          cantidad={cantidad}
          setCantidad={setCantidad}
          intensidad={intensidad}
          setIntensidad={setIntensidad}
          ritmos={ritmos}
          ataqueActivo={Boolean(stats.ataque_activo)}
          onEnviar={enviar}
          onAtacar={atacar}
          onDetener={() => emitir("detener_ataque")}
        />
        <PanelMuro
          comentarios={comentarios}
          bloqueados={stats.bloqueados || []}
          nombrePropio={nombre.trim()}
          onBloquear={(usuario) => emitir("bloquear", { usuario })}
        />
        <PanelEstadisticas
          stats={stats}
          umbrales={umbrales}
          conectado={conectado}
          onConfigurar={(datos) => emitir("configurar_umbrales", datos)}
          onReiniciar={() => emitir("reiniciar")}
          onDesbloquear={(usuario) => emitir("desbloquear", { usuario })}
        />
      </main>
    </div>
  );
}
