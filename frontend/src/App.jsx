import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./comun.jsx";
import { Icono, Marca } from "./iconos.jsx";
import PanelChat from "./PanelChat.jsx";
import PanelEstadisticas from "./PanelEstadisticas.jsx";
import PanelMuro from "./PanelMuro.jsx";
import PanelSimulador from "./PanelSimulador.jsx";
import { crearSocket } from "./socket.js";

const NAV = [
  ["muro", "En vivo", "vivo"],
  ["stats", "Estadísticas", "grafica"],
  ["reglas", "Reglas", "reglas"],
];

const MOMENTOS = ["Tráfico", "Ataque", "Detección", "Moderación"];

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

function canalesDe(comentarios) {
  const mapa = new Map();
  for (const comentario of comentarios) {
    const previo = mapa.get(comentario.usuario);
    if (!previo) mapa.set(comentario.usuario, { ...comentario, cantidad: 1 });
    else previo.cantidad += 1;
  }
  return [...mapa.values()].slice(0, 16);
}

function coincide(comentario, filtro) {
  if (!filtro) return true;
  const texto = filtro.toLowerCase();
  return (
    comentario.usuario.toLowerCase().includes(texto) ||
    comentario.texto.toLowerCase().includes(texto)
  );
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
  const [vista, setVista] = useState("muro");
  const [busqueda, setBusqueda] = useState("");

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
    setVista("muro");
  }

  const paso = momentoActual(stats);
  const canales = useMemo(() => canalesDe(comentarios), [comentarios]);
  const visibles = useMemo(
    () => comentarios.filter((comentario) => coincide(comentario, busqueda.trim())),
    [comentarios, busqueda],
  );
  const alertas = useMemo(() => {
    const bloqueado = new Set(stats.bloqueados || []);
    const vistos = new Set();
    let total = 0;
    for (const comentario of comentarios) {
      if (vistos.has(comentario.usuario)) continue;
      vistos.add(comentario.usuario);
      if (comentario.clasificacion !== "real" && !bloqueado.has(comentario.usuario)) total += 1;
    }
    return total;
  }, [comentarios, stats.bloqueados]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#1e1d24] text-[#f7f5fb] xl:h-dvh xl:flex-row xl:overflow-hidden">
      <aside className="flex shrink-0 flex-col bg-[#6442a4] text-white xl:w-[240px]">
        <div className="flex h-14 items-center px-4">
          <Marca />
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pb-3 xl:hidden">
          {NAV.map(([id, titulo, icono]) => (
            <button
              key={id}
              type="button"
              aria-current={vista === id ? "page" : undefined}
              onClick={() => setVista(id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold ${
                vista === id ? "bg-white/20" : "bg-white/10"
              }`}
            >
              <Icono nombre={icono} className="size-4" />
              {titulo}
            </button>
          ))}
        </div>
        <div className="hidden min-h-0 flex-1 flex-col xl:flex">
          <nav className="flex flex-col gap-1 px-3" aria-label="Secciones">
            {NAV.map(([id, titulo, icono]) => (
              <button
                key={id}
                type="button"
                aria-current={vista === id ? "page" : undefined}
                onClick={() => setVista(id)}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-[15px] font-bold ${
                  vista === id ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                <Icono nombre={icono} />
                {titulo}
              </button>
            ))}
          </nav>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto scroll px-3 pb-3">
            <p className="mb-2 flex items-center gap-2 px-2 text-sm font-bold text-white/85">
              <Icono nombre="usuarios" className="size-4" />
              En el chat
            </p>
            {canales.length === 0 ? (
              <p className="px-2 text-sm text-white/80">Aún no hay cuentas.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {canales.map((canal) => {
                  const activo = busqueda === canal.usuario;
                  const estado =
                    canal.clasificacion === "bot"
                      ? "Bot"
                      : canal.clasificacion === "sospechoso"
                        ? "Sospechoso"
                        : "Real";
                  return (
                    <li key={canal.usuario}>
                      <button
                        type="button"
                        onClick={() => {
                          setVista("muro");
                          setBusqueda((actual) => (actual === canal.usuario ? "" : canal.usuario));
                        }}
                        aria-pressed={activo}
                        className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left ${
                          activo ? "bg-white/20" : "hover:bg-white/10"
                        }`}
                      >
                        <Avatar nombre={canal.usuario} tam="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{canal.usuario}</span>
                          <span className="block text-xs text-white/80">{estado}</span>
                        </span>
                        <span className="text-xs font-semibold tabular">{canal.cantidad}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="shrink-0 border-t border-white/15 p-3">
            <PanelSimulador
              conectado={conectado}
              cantidad={cantidad}
              setCantidad={setCantidad}
              intensidad={intensidad}
              setIntensidad={setIntensidad}
              ritmos={ritmos}
              ataqueActivo={Boolean(stats.ataque_activo)}
              onAtacar={atacar}
              onDetener={() => emitir("detener_ataque")}
            />
          </div>
        </div>
        <details className="border-t border-white/15 px-3 py-2 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold">
            <Icono nombre="rayo" className="size-4" />
            Ataque
          </summary>
          <div className="pb-3">
            <PanelSimulador
              conectado={conectado}
              cantidad={cantidad}
              setCantidad={setCantidad}
              intensidad={intensidad}
              setIntensidad={setIntensidad}
              ritmos={ritmos}
              ataqueActivo={Boolean(stats.ataque_activo)}
              onAtacar={atacar}
              onDetener={() => emitir("detener_ataque")}
            />
          </div>
        </details>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-col gap-2 bg-[#26222c] px-3 py-2 xl:h-14 xl:flex-row xl:items-center xl:gap-3 xl:px-4 xl:py-0">
          <label className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg bg-[#1e1d24] px-3 xl:w-auto xl:max-w-xl xl:flex-1">
            <Icono nombre="buscar" className="size-5 text-[#d2ccdf]" />
            <span className="sr-only">Buscar en el chat</span>
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar en el chat"
              className="w-full bg-transparent text-[#f7f5fb] outline-none placeholder:text-[#b7b0c8]"
            />
            {busqueda && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda("")} className="flex size-8 items-center justify-center">
                <Icono nombre="cerrar" className="size-4" />
              </button>
            )}
          </label>
          <p className={`hidden items-center gap-2 text-sm font-semibold sm:flex ${conectado ? "text-[#8ee8a8]" : "text-[#ffb3bc]"}`}>
            <span className={`size-2.5 rounded-full ${conectado ? "bg-[#3cb43a]" : "bg-[#e91916]"}`} aria-hidden="true" />
            {conectado ? "En vivo" : "Sin conexión"}
          </p>
          <div className="flex items-center gap-2 xl:ml-auto">
            <label className="text-right">
              <span className="sr-only">Tu nombre</span>
              <input
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                maxLength={24}
                autoComplete="nickname"
                placeholder="Visitante"
                className="w-28 bg-transparent text-right text-sm font-bold outline-none placeholder:text-[#b7b0c8] sm:w-36"
              />
              <span className="block text-xs font-semibold text-[#8ee8a8]">en línea</span>
            </label>
            <Avatar nombre={nombre || "Visitante"} />
            <button
              type="button"
              aria-label={alertas ? `${alertas} alertas` : "Sin alertas"}
              onClick={() => setVista("muro")}
              className="relative flex size-11 items-center justify-center rounded-lg hover:bg-white/10"
            >
              <Icono nombre="campana" />
              {alertas > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e91916] px-1 text-[10px] font-bold">
                  {alertas > 9 ? "9+" : alertas}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          <div className="relative flex min-h-[68dvh] min-w-0 flex-1 flex-col xl:min-h-0">
            <p className="sr-only" aria-live="polite">
              {anuncio}
            </p>
            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#1e1d24] px-4 py-2">
              <Avatar nombre="SocialBotGuard" tam="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-bold leading-tight">SocialBotGuard</h1>
                <p className="truncate text-sm text-[#d2ccdf]">
                  Momento {paso}: {MOMENTOS[paso - 1]}
                </p>
              </div>
              <div role="tablist" aria-label="Vistas del directo" className="hidden items-center gap-1 xl:flex">
                {NAV.map(([id, titulo, icono]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={vista === id}
                    aria-controls="panel-vista"
                    onClick={() => setVista(id)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold ${
                      vista === id ? "bg-white/10 text-white" : "text-[#d2ccdf] hover:bg-white/5"
                    }`}
                  >
                    <Icono nombre={icono} className="size-4" />
                    {titulo}
                  </button>
                ))}
              </div>
              <span
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold sm:px-4 ${
                  conectado ? "bg-[#e91916]" : "bg-[#4a4458]"
                }`}
              >
                <span className="size-2.5 rounded-full bg-white" aria-hidden="true" />
                {conectado ? "EN VIVO" : "SIN SEÑAL"}
              </span>
            </div>
            {aviso && (
              <p role="status" className="shrink-0 bg-[#4a4458] px-4 py-2 text-sm font-semibold">
                {aviso}
              </p>
            )}

            <div id="panel-vista" role="tabpanel" aria-labelledby={`tab-${vista}`} className="flex min-h-0 flex-1 flex-col">
              {vista === "muro" ? (
                <PanelMuro
                  comentarios={visibles}
                  bloqueados={stats.bloqueados || []}
                  nombrePropio={nombre.trim()}
                  onBloquear={(usuario) => emitir("bloquear", { usuario })}
                />
              ) : (
                <PanelEstadisticas
                  seccion={vista === "reglas" ? "reglas" : "graficos"}
                  stats={stats}
                  umbrales={umbrales}
                  conectado={conectado}
                  onConfigurar={(datos) => emitir("configurar_umbrales", datos)}
                  onReiniciar={() => emitir("reiniciar")}
                  onDesbloquear={(usuario) => emitir("desbloquear", { usuario })}
                />
              )}
            </div>

            <footer className="flex h-14 shrink-0 items-center gap-3 overflow-hidden border-t border-white/10 bg-[#26222c] px-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#6442a4]">
                <Icono nombre="escudo" className="size-5" />
              </span>
              <p className="hidden truncate font-bold sm:block">Detección de spam en vivo</p>
              <ul className="flex min-w-0 gap-2 overflow-hidden">
                <Etiqueta icono="rayo" texto="Frecuencia" />
                <Etiqueta icono="copiar" texto="Similitud" />
                <Etiqueta icono="enlace" texto="Patrones" />
              </ul>
              <p className="ml-auto inline-flex shrink-0 items-center gap-2 text-lg font-bold text-[#ff8d8d] tabular">
                <Icono nombre="usuarios" className="size-5" />
                {comentarios.length}
              </p>
            </footer>
          </div>

          <aside className="flex h-[48dvh] min-h-0 shrink-0 flex-col border-white/10 xl:h-auto xl:w-[340px] xl:self-stretch xl:border-l">
            <PanelChat
              comentarios={visibles}
              bloqueados={stats.bloqueados || []}
              conectado={conectado}
              texto={texto}
              setTexto={setTexto}
              onEnviar={enviar}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Etiqueta({ icono, texto }) {
  return (
    <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#6442a4] px-3 text-sm font-semibold">
      <Icono nombre={icono} className="size-3.5" />
      {texto}
    </li>
  );
}


