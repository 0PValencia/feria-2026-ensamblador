import { nivelRiesgo } from "../datos/motor.js";
import { haceCuanto, NIVELES, numero } from "../formato.js";
import { Icono } from "../iconos.jsx";
import { miniatura } from "../youtube.js";

export function Tendencia({ actual, previo, sufijo = "%", invertir = true, className = "" }) {
  if (previo == null) return null;
  const diferencia = actual - previo;
  if (diferencia === 0) return <span className={`text-[#adadb8] ${className}`}>= sin cambios</span>;
  const empeora = invertir ? diferencia > 0 : diferencia < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular ${empeora ? "text-[#ff8280]" : "text-[#5cffb0]"} ${className}`}>
      <Icono nombre={diferencia > 0 ? "subir" : "bajar"} className="size-3.5" />
      {diferencia > 0 ? "+" : ""}
      {diferencia}
      {sufijo}
    </span>
  );
}

export default function TarjetaVideo({ video }) {
  const nivel = NIVELES[nivelRiesgo(video.ultimo.porcentaje_bots)];
  return (
    <article className="group min-w-0">
      <a href={`#/video/${video.id}`} className="block rounded-sm focus-visible:outline-offset-4">
        <div className="relative transition-colors duration-150 group-hover:bg-[#9147ff] group-focus-within:bg-[#9147ff]">
          <div className="relative aspect-video overflow-hidden bg-[#1f1f23] transition-transform duration-150 group-hover:-translate-y-1.5 group-hover:translate-x-1.5 group-focus-within:-translate-y-1.5 group-focus-within:translate-x-1.5">
            <img
              src={miniatura(video.id)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
            <span className={`absolute left-2 top-2 rounded px-1.5 py-px text-[12px] font-extrabold tracking-wide ${nivel.fondo}`}>
              {nivel.corto}
            </span>
            <span className="absolute bottom-2 left-2 rounded bg-black/75 px-1.5 py-px text-[13px] tabular">
              {numero(video.ultimo.comentarios)} comentarios
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-px text-[13px] font-bold tabular">
              {video.ultimo.porcentaje_bots}% bots
            </span>
          </div>
        </div>
      </a>
      <div className="mt-2.5 flex gap-2.5">
        <img src={miniatura(video.id, "default")} alt="" className="mt-0.5 size-10 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            <a href={`#/video/${video.id}`} className="hover:text-[#bf94ff]" title={video.titulo}>
              {video.titulo}
            </a>
          </h3>
          <p className="truncate text-[13px] text-[#adadb8]">{video.canal}</p>
          <p className="truncate text-[13px] text-[#adadb8]">Analizado {haceCuanto(video.ultimo.fecha)}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1">
            <li className="rounded-full bg-[#2f2f35] px-2 py-0.5 text-xs font-semibold text-[#adadb8]">
              {video.ultimo.cuentas_bot} bots · {video.ultimo.cuentas_sospechosas} sospechosas
            </li>
            <li className="inline-flex items-center gap-1 rounded-full bg-[#2f2f35] px-2 py-0.5 text-xs font-semibold text-[#adadb8]">
              <Icono nombre="historial" className="size-3" />
              {video.total_analisis} análisis
            </li>
            {video.previo && (
              <li className="rounded-full bg-[#2f2f35] px-2 py-0.5 text-xs">
                <Tendencia actual={video.ultimo.porcentaje_bots} previo={video.previo.porcentaje_bots} />
              </li>
            )}
          </ul>
        </div>
      </div>
    </article>
  );
}
