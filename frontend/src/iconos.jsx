export function Icono({ nombre, className = "size-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRAZOS[nombre] || TRAZOS.muro}
    </svg>
  );
}

const punto = (cx, cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" fill="currentColor" stroke="none" />;

const TRAZOS = {
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  campana: <path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 7H4s2 0 2-7M10 20a2 2 0 0 0 4 0" />,
  vivo: (
    <>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  muro: <path d="M5 6.5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 2.8V7.5a1 1 0 0 1 1-1z" />,
  grafica: <path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3" />,
  reglas: (
    <>
      <path d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.8 18.5c.8-2.8 2.6-4.2 5.2-4.2s4.4 1.4 5.2 4.2" />
      <circle cx="17" cy="9.2" r="2.2" />
      <path d="M16 14.4c1.5.4 2.6 1.4 3.3 3.6" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.3-3.2 3.4-4.6 7-4.6s5.7 1.4 7 4.6" />
    </>
  ),
  escudo: <path d="M12 3 5 6v6c0 4.4 2.9 7.2 7 8.6 4.1-1.4 7-4.2 7-8.6V6l-7-3z" />,
  ban: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8 16 8-8" />
    </>
  ),
  enviar: <path d="m4 12 16-8-6 16-2.4-6.2L4 12z" />,
  rayo: <path d="M13 2.8 5.5 13H12l-1 8.2L18.5 11H12l1-8.2z" />,
  copiar: (
    <>
      <rect x="8" y="8" width="11" height="12" rx="2" />
      <path d="M6 16H5a1 1 0 0 1-1-1V4h10" />
    </>
  ),
  enlace: (
    <>
      <path d="M10 13.2a3.8 3.8 0 0 0 5.6.2l2.1-2.1a3.8 3.8 0 0 0-5.4-5.4L11 7.2" />
      <path d="M14 10.8a3.8 3.8 0 0 0-5.6-.2l-2.1 2.1a3.8 3.8 0 0 0 5.4 5.4L13 16.8" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5L15 15" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  senal: <path d="M6 16v3M10 12v7M14 8v11M18 4v15" />,
  bot: (
    <>
      <rect x="4.5" y="8" width="15" height="10" rx="3" />
      <path d="M12 8V4.5M9 4.5h6" />
      {punto(9, 13)}
      {punto(15, 13)}
    </>
  ),
  alerta: (
    <>
      <path d="M12 3.5 3.2 19h17.6L12 3.5z" />
      <path d="M12 10v4" />
      {punto(12, 16.5)}
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7.5" />,
  candado: (
    <>
      <rect x="5.5" y="11" width="13" height="9" rx="2" />
      <path d="M8 11V8.2a4 4 0 0 1 8 0V11" />
    </>
  ),
  refrescar: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4.5V10h-5.5" />
    </>
  ),
  cerrar: <path d="m7 7 10 10M17 7 7 17" />,
  engranaje: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.4 7.4 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.4 7.4 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.4 7.4 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.4 7.4 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5z" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5z" fill="currentColor" />,
  pausa: <path d="M8 5.5v13M16 5.5v13" strokeWidth="3" />,
  volumen: <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />,
  pantalla: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  ojo: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  colapsar: <path d="M15 6l-6 6 6 6M5 5v14" />,
  expandir: <path d="M9 6l6 6-6 6M19 5v14" />,
  flechaAbajo: <path d="M12 5v14M6 13l6 6 6-6" />,
};

export function Marca({ compacta = false }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <path fill="#9147ff" d="M6 3h22v15.5L21.5 25H16l-4 4h-3v-4H4V8z" />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m11 14.5 3 3 6-6"
        />
      </svg>
      {!compacta && (
        <span className="text-lg font-extrabold leading-none tracking-tight text-[#efeff1]">
          SocialBot<span className="text-[#bf94ff]">Guard</span>
        </span>
      )}
    </span>
  );
}
