import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./comun.jsx";
import { Icono, Marca } from "./iconos.jsx";
import PanelChat from "./PanelChat.jsx";
import PanelEstadisticas from "./PanelEstadisticas.jsx";
import PanelMuro, { alertasActivas } from "./PanelMuro.jsx";
import PanelSimulador from "./PanelSimulador.jsx";
import Reproductor from "./Reproductor.jsx";
import { crearSocket } from "./socket.js";

const HERRAMIENTAS = [
  ["ataque", "Simular ataque", "rayo"],
  ["stats", "Estadísticas", "grafica"],
  ["reglas", "Reglas de detección", "reglas"],
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

function cuentasDe(comentarios) {
  const mapa = new Map();
  for (const comentario of comentarios) {
    const previo = mapa.get(comentario.usuario);
    if (!previo) mapa.set(comentario.usuario, { ...comentario, cantidad: 1 });
    else previo.cantidad += 1;
  }
  return [...mapa.values()];
}

function coincide(valor, filtro) {
  return !filtro || valor.toLowerCase().includes(filtro.toLowerCase());
}

export default function App() {
  const socketRef = useRef(null);
  const anunciados = useRef(new Set());
  const colaRef = useRef(null);
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
  const [alertaVideo, setAlertaVideo] = useState(null);
  const [panel, setPanel] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [lateralAbierto, setLateralAbierto] = useState(true);

  useEffect(() => {
    localStorage.setItem("sbg-nombre", nombre);
  }, [nombre]);

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(""), 3500);
    return () => clearTimeout(id);
  }, [aviso]);

  useEffect(() => {
    if (!alertaVideo) return undefined;
    const id = setTimeout(() => setAlertaVideo(null), 4500);
    return () => clearTimeout(id);
  }, [alertaVideo]);

  useEffect(() => {
    if (!panel) return undefined;
    const cerrar = (evento) => evento.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [panel]);

  useEffect(() => {
    const ultimo = comentarios[0];
    if (!ultimo || ultimo.clasificacion !== "bot") return;
    if (anunciados.current.has(ultimo.usuario)) return;
    anunciados.current.add(ultimo.usuario);
    setAnuncio(`Bot detectado: ${ultimo.usuario}. ${(ultimo.razones || []).join(". ")}`);
    setAlertaVideo({
      clave: ultimo.id,
      usuario: ultimo.usuario,
      riesgo: ultimo.riesgo,
      razon: (ultimo.razones || [])[0] || "Comportamiento automatizado",
    });
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
    setPanel(null);
  }

  function alternarPanel(id) {
    setPanel((actual) => (actual === id ? null : id));
  }

  const bloqueados = stats.bloqueados || [];
  const ataqueActivo = Boolean(stats.ataque_activo);
  const paso = momentoActual(stats);
  const filtro = busqueda.trim();
  const cuentas = useMemo(() => cuentasDe(comentarios), [comentarios]);
  const alertas = useMemo(() => alertasActivas(comentarios, bloqueados), [comentarios, bloqueados]);
  const alertasVisibles = alertas.filter(
    (alerta) => coincide(alerta.usuario, filtro) || coincide(alerta.texto, filtro),
  );
  const cuentasVisibles = cuentas.filter((cuenta) => coincide(cuenta.usuario, filtro)).slice(0, 30);
  const titulos = { ataque: "Simular ataque", stats: "Estadísticas", reglas: "Reglas de detección" };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0e0e10] text-[#efeff1]">
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>

      <header className="relative z-30 flex h-[50px] shrink-0 items-center gap-2 bg-[#18181b] px-2 shadow-[0_1px_2px_rgba(0,0,0,.9)] sm:px-3">
        <a href="/" className="flex items-center rounded p-1 hover:bg-[#2f2f35]" aria-label="SocialBotGuard, inicio">
          <span className="sm:hidden">
            <Marca compacta />
          </span>
          <span className="hidden sm:block">
            <Marca />
          </span>
        </a>
        <span className="mx-2 hidden h-6 w-px bg-[#2f2f35] md:block" />
        <p className="hidden text-base font-bold text-[#efeff1] md:block">Directo</p>

        <div className="mx-auto flex min-w-0 max-w-[400px] flex-1 justify-center px-1">
          <label className="flex h-9 w-full items-center rounded-md border-2 border-transparent bg-[#2f2f35] pl-3 pr-1 focus-within:border-[#9147ff] focus-within:bg-[#0e0e10] hover:border-[#3a3a3d]">
            <span className="sr-only">Buscar cuenta o mensaje</span>
            <input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar cuenta o mensaje"
              className="w-full min-w-0 bg-transparent text-sm text-[#efeff1] outline-none placeholder:text-[#adadb8]"
            />
            {busqueda ? (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda("")} className="flex size-7 items-center justify-center rounded hover:bg-[#3a3a3d]">
                <Icono nombre="cerrar" className="size-4" />
              </button>
            ) : (
              <Icono nombre="buscar" className="mr-1 size-4 text-[#adadb8]" />
            )}
          </label>
        </div>

        <nav aria-label="Herramientas de análisis" className="flex items-center gap-0.5">
          {HERRAMIENTAS.map(([id, titulo, icono]) => (
            <BotonIcono
              key={id}
              etiqueta={titulo}
              activo={panel === id}
              onClick={() => alternarPanel(id)}
              destacado={id === "ataque" && ataqueActivo}
            >
              <Icono nombre={icono} />
            </BotonIcono>
          ))}
          <BotonIcono
            etiqueta={alertas.length ? `${alertas.length} alertas por revisar` : "Sin alertas"}
            onClick={() => {
              setPanel(null);
              colaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Icono nombre="campana" />
            {alertas.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#eb0400] px-1 text-[11px] font-bold text-white tabular">
                {alertas.length > 99 ? "99+" : alertas.length}
              </span>
            )}
          </BotonIcono>
        </nav>
        <span className="ml-1 hidden sm:block">
          <Avatar nombre={nombre || "Visitante"} tam="sm" />
        </span>
      </header>

      {aviso && (
        <p role="status" className="alerta-entrada fixed left-1/2 top-[62px] z-50 -translate-x-1/2 rounded-md bg-[#efeff1] px-4 py-2 text-sm font-semibold text-[#0e0e10] shadow-2xl">
          {aviso}
        </p>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside
          className={`hidden shrink-0 flex-col bg-[#1f1f23] transition-[width] lg:flex ${lateralAbierto ? "w-60" : "w-[50px]"}`}
          aria-label="Cuentas en el chat"
        >
          <div className={`flex h-12 shrink-0 items-center ${lateralAbierto ? "justify-between pl-3 pr-1.5" : "justify-center"}`}>
            {lateralAbierto && (
              <h2 className="text-xs font-bold uppercase tracking-wider">Cuentas en el chat</h2>
            )}
            <button
              type="button"
              onClick={() => setLateralAbierto((abierto) => !abierto)}
              aria-label={lateralAbierto ? "Contraer barra lateral" : "Expandir barra lateral"}
              className="flex size-8 items-center justify-center rounded hover:bg-[#2f2f35]"
            >
              <Icono nombre={lateralAbierto ? "colapsar" : "expandir"} className="size-4" />
            </button>
          </div>
          <ul className="scroll min-h-0 flex-1 overflow-y-auto pb-3">
            {cuentasVisibles.map((cuenta) => {
              const bloqueada = bloqueados.includes(cuenta.usuario);
              const estado = bloqueada
                ? ["Bloqueada", "text-[#7a7a85]", "bg-[#53535f]"]
                : cuenta.clasificacion === "bot"
                  ? [`Bot · ${cuenta.riesgo}%`, "text-[#ff8280]", "bg-[#eb0400]"]
                  : cuenta.clasificacion === "sospechoso"
                    ? [`Sospechoso · ${cuenta.riesgo}%`, "text-[#ffca5f]", "bg-[#ffb31a]"]
                    : ["Usuario real", "text-[#adadb8]", "bg-[#00c76f]"];
              const activo = busqueda === cuenta.usuario;
              return (
                <li key={cuenta.usuario}>
                  <button
                    type="button"
                    title={lateralAbierto ? undefined : `${cuenta.usuario} · ${estado[0]}`}
                    aria-pressed={activo}
                    onClick={() => setBusqueda((actual) => (actual === cuenta.usuario ? "" : cuenta.usuario))}
                    className={`flex w-full items-center gap-2.5 py-1.5 text-left hover:bg-[#26262c] ${
                      lateralAbierto ? "px-2.5" : "justify-center px-0"
                    } ${activo ? "bg-[#2f2f35]" : ""}`}
                  >
                    <span className={`relative ${bloqueada ? "opacity-40 grayscale" : ""}`}>
                      <Avatar nombre={cuenta.usuario} tam="sm" />
                      {!lateralAbierto && (
                        <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#1f1f23] ${estado[2]}`} />
                      )}
                    </span>
                    {lateralAbierto && (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-semibold ${bloqueada ? "text-[#7a7a85] line-through" : ""}`}>
                            {cuenta.usuario}
                          </span>
                          <span className={`block truncate text-xs ${estado[1]}`}>{estado[0]}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-[#efeff1] tabular">
                          <span className={`size-2 rounded-full ${estado[2]}`} />
                          {cuenta.cantidad}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
            {cuentasVisibles.length === 0 && lateralAbierto && (
              <li className="px-3 py-2 text-sm text-[#adadb8]">{filtro ? "Sin coincidencias." : "Aún no hay cuentas."}</li>
            )}
          </ul>
        </aside>

        <main className="scroll min-w-0 flex-1 lg:overflow-y-auto">
          <Reproductor
            conectado={conectado}
            stats={stats}
            paso={paso}
            espectadores={cuentas.length}
            alerta={alertaVideo}
          />

          <section className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:px-6" aria-label="Información del directo">
            <div className="relative shrink-0 self-start">
              <span className={`block rounded-full p-[3px] ${conectado ? "bg-[#eb0400]" : "bg-[#53535f]"}`}>
                <span className="block rounded-full border-[3px] border-[#0e0e10]">
                  <span className="flex size-14 items-center justify-center rounded-full bg-[#9147ff]">
                    <Icono nombre="escudo" className="size-7 text-white" />
                  </span>
                </span>
              </span>
              <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded px-1 text-[11px] font-extrabold uppercase text-white ${conectado ? "bg-[#eb0400]" : "bg-[#53535f]"}`}>
                {conectado ? "Vivo" : "Off"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-1.5 text-lg font-bold leading-tight">
                SocialBotGuard
                <Icono nombre="check" className="size-4 rounded-full bg-[#9147ff] p-0.5 text-white" />
              </h1>
              <p className="mt-1 text-sm font-semibold text-[#efeff1]">
                Moderación en vivo: detectamos spam repetitivo con tres reglas explicables
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#bf94ff]">Ciencia y tecnología</p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Etiquetas">
                {["Español", "Frecuencia +40%", "Similitud +50%", "Patrones +20%", "Tráfico sintético"].map((etiqueta) => (
                  <li key={etiqueta} className="rounded-full bg-[#2f2f35] px-2.5 py-0.5 text-xs font-semibold text-[#adadb8]">
                    {etiqueta}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {ataqueActivo ? (
                <button
                  type="button"
                  onClick={() => emitir("detener_ataque")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#eb0400] px-4 text-sm font-bold text-white hover:bg-[#c90300]"
                >
                  <Icono nombre="ban" className="size-4" />
                  Detener ataque
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => alternarPanel("ataque")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#9147ff] px-4 text-sm font-bold text-white hover:bg-[#772ce8]"
                >
                  <Icono nombre="rayo" className="size-4" />
                  Simular ataque
                </button>
              )}
              <p className="flex items-center gap-3 text-sm tabular">
                <span className="inline-flex items-center gap-1 font-semibold text-[#ff8280]">
                  <Icono nombre="usuario" className="size-4" />
                  {cuentas.length}
                </span>
                <span className="text-[#adadb8]">{stats.comentarios_procesados || 0} analizados</span>
              </p>
            </div>
          </section>

          <div ref={colaRef} className="scroll-mt-2 border-t border-[#2f2f35] pt-3">
            <PanelMuro
              alertas={alertasVisibles}
              filtro={filtro}
              onLimpiarFiltro={() => setBusqueda("")}
              onBloquear={(usuario) => emitir("bloquear", { usuario })}
            />
          </div>
        </main>

        <aside className="flex h-[75dvh] shrink-0 flex-col border-[#2f2f35] lg:h-auto lg:w-[340px] lg:border-l">
          <PanelChat
            comentarios={comentarios}
            bloqueados={bloqueados}
            conectado={conectado}
            nombre={nombre}
            setNombre={setNombre}
            texto={texto}
            setTexto={setTexto}
            onEnviar={enviar}
            onBloquear={(usuario) => emitir("bloquear", { usuario })}
          />
        </aside>

        {panel && (
          <>
            <button
              type="button"
              aria-label="Cerrar panel"
              tabIndex={-1}
              onClick={() => setPanel(null)}
              className="fixed inset-0 top-[50px] z-20 cursor-default bg-black/50"
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-panel"
              className="panel-entrada fixed bottom-0 right-0 top-[50px] z-20 flex w-full flex-col border-l border-[#2f2f35] bg-[#18181b] shadow-[-12px_0_32px_rgba(0,0,0,.6)] sm:w-[440px]"
            >
              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#2f2f35] px-4">
                <Icono nombre={HERRAMIENTAS.find(([id]) => id === panel)[2]} className="size-4 text-[#bf94ff]" />
                <h2 id="titulo-panel" className="text-sm font-bold">
                  {titulos[panel]}
                </h2>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setPanel(null)}
                  aria-label="Cerrar"
                  className="ml-auto flex size-8 items-center justify-center rounded hover:bg-[#2f2f35]"
                >
                  <Icono nombre="cerrar" className="size-4" />
                </button>
              </header>
              <div className="scroll min-h-0 flex-1 overflow-y-auto">
                {panel === "ataque" ? (
                  <div className="p-5">
                    <PanelSimulador
                      conectado={conectado}
                      cantidad={cantidad}
                      setCantidad={setCantidad}
                      intensidad={intensidad}
                      setIntensidad={setIntensidad}
                      ritmos={ritmos}
                      ataqueActivo={ataqueActivo}
                      onAtacar={atacar}
                      onDetener={() => emitir("detener_ataque")}
                    />
                  </div>
                ) : (
                  <PanelEstadisticas
                    seccion={panel === "reglas" ? "reglas" : "graficos"}
                    stats={stats}
                    umbrales={umbrales}
                    conectado={conectado}
                    onConfigurar={(datos) => emitir("configurar_umbrales", datos)}
                    onReiniciar={() => emitir("reiniciar")}
                    onDesbloquear={(usuario) => emitir("desbloquear", { usuario })}
                  />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function BotonIcono({ etiqueta, activo = false, destacado = false, onClick, children }) {
  return (
    <span className="group relative">
      <button
        type="button"
        aria-label={etiqueta}
        aria-pressed={activo}
        onClick={onClick}
        className={`relative flex size-9 items-center justify-center rounded-md transition-colors ${
          activo ? "bg-[#9147ff]/25 text-[#bf94ff]" : destacado ? "text-[#ff8280] hover:bg-[#2f2f35]" : "text-[#efeff1] hover:bg-[#2f2f35]"
        }`}
      >
        {children}
        {destacado && <span className="absolute bottom-1 size-1.5 rounded-full bg-[#eb0400]" />}
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-1/2 top-full z-40 mt-2 translate-x-1/2 whitespace-nowrap rounded bg-[#efeff1] px-2 py-1 text-xs font-bold text-[#0e0e10] opacity-0 transition-opacity delay-150 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      >
        {etiqueta}
      </span>
    </span>
  );
}
