import React from 'react';
import {
  Clock,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Globe,
  FileText,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Turno, BusinessConfig } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { formatearFechaLarga } from '../../utils/dateUtils';

interface AgendaTurnoCardProps {
  key?: React.Key;
  turno: Turno;
  onCompletar: (turnoId: string) => void;
  onCancelar: (turno: Turno) => void;
  onSelect?: (turno: Turno) => void;
}

export function AgendaTurnoCard({
  turno,
  onCompletar,
  onCancelar,
  onSelect,
}: AgendaTurnoCardProps) {
  const { config } = useConfig();

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = turno.telefonoCliente.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `¡Hola ${turno.nombreCliente}! Te escribo de ${config.nombreNegocio || 'Perfect Glass'} para coordinar tu turno de limpieza de vidrios programado para hoy (${turno.horaInicio} a ${turno.horaFin} hs). ¿Cómo estás?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const isCancelado = turno.estado === 'cancelado';
  const isCompletado = turno.estado === 'completado';

  return (
    <div
      onClick={() => onSelect && onSelect(turno)}
      className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
        isCancelado
          ? 'bg-rose-50/40 border-rose-200/80 opacity-75'
          : isCompletado
          ? 'bg-emerald-50/40 border-emerald-200/80'
          : 'bg-white border-sky-200 shadow-2xs hover:border-sky-400 hover:shadow-xs'
      }`}
    >
      <div>
        {/* Top Header: Badge & Time Range */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3 text-sky-600" />
              <span>Turno Online</span>
            </span>

            {turno.esSandbox && (
              <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                PRUEBA
              </span>
            )}

            {isCancelado ? (
              <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                Cancelado
              </span>
            ) : isCompletado ? (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Completado</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
                Confirmado
              </span>
            )}
          </div>

          {/* Time Slot Display */}
          <div className="flex items-center gap-1 text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {turno.horaInicio} - {turno.horaFin}
            </span>
          </div>
        </div>

        {/* Client Name & Phone */}
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
            {turno.nombreCliente}
          </h4>

          {turno.direccion && (
            <p className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{turno.direccion}</span>
            </p>
          )}

          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{turno.telefonoCliente}</span>
            {turno.emailCliente && (
              <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                • {turno.emailCliente}
              </span>
            )}
          </p>

          {turno.notas && (
            <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded-xl text-slate-600 border border-slate-100 flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="line-clamp-2">{turno.notas}</p>
            </div>
          )}

          {isCancelado && turno.motivoCancelacion && (
            <p className="text-[11px] text-rose-700 font-medium italic mt-1">
              Motivo: {turno.motivoCancelacion}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* WhatsApp Direct Action */}
        <button
          type="button"
          onClick={handleWhatsApp}
          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-200/60"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>

        {/* Status Actions */}
        {!isCancelado && !isCompletado && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelar(turno);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold transition-colors"
              title="Cancelar turno"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCompletar(turno.id);
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
