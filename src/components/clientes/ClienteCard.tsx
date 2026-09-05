import React from 'react';
import {
  MapPin,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Layers,
  Clock,
} from 'lucide-react';
import { Cliente } from '../../types';
import { calcularDiasRestantes, formatearFecha } from '../../utils/dateUtils';
import { useConfig } from '../../contexts/ConfigContext';

interface ClienteCardProps {
  key?: React.Key;
  cliente: Cliente;
  onSelect: (cliente: Cliente) => void;
  onMarcarVisita: (cliente: Cliente) => void;
}

export function ClienteCard({ cliente, onSelect, onMarcarVisita }: ClienteCardProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';
  
  const estadoVisita = calcularDiasRestantes(cliente.fechaProximaVisita);
  const isVencida = estadoVisita.estado === 'vencida';
  const isHoy = estadoVisita.estado === 'hoy';

  const cleanPhone = cliente.telefono.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
    `Hola ${cliente.nombre}, te contactamos de ${config.nombreNegocio || 'Perfect Glass'} para coordinar la limpieza de tus vidrios.`
  )}`;

  return (
    <div
      id={`cliente-card-${cliente.id}`}
      onClick={() => onSelect(cliente)}
      className={`group relative bg-white rounded-3xl p-5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99] ${
        isVencida
          ? 'border-rose-300 ring-1 ring-rose-200/70 bg-gradient-to-b from-rose-50/20 to-white'
          : isHoy
          ? 'border-amber-300 ring-1 ring-amber-200/70 bg-gradient-to-b from-amber-50/20 to-white'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header Row: Name & Next Visit Status Badge */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 truncate leading-snug">
              {cliente.nombre}
            </h3>
            {!cliente.activo && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                Inactivo
              </span>
            )}
          </div>

          {/* Location & Neighborhood */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{cliente.direccion}</span>
            {cliente.zona && (
              <span className="shrink-0 px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-700">
                {cliente.zona}
              </span>
            )}
          </div>
        </div>

        {/* Days remaining badge */}
        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${estadoVisita.badgeClass}`}
          >
            {isVencida ? (
              <AlertTriangle className="w-3 h-3 text-rose-600" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span>{estadoVisita.etiqueta}</span>
          </span>
        </div>
      </div>

      {/* Surface Type & Frequency Pill */}
      <div className="flex items-center gap-2 flex-wrap mb-3.5 pt-1">
        {cliente.tipoSuperficie && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80">
            <Layers className="w-3 h-3 text-slate-500" />
            <span className="truncate max-w-[200px]">{cliente.tipoSuperficie}</span>
          </span>
        )}

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-100">
          <Calendar className="w-3 h-3 text-sky-600" />
          <span>Cada {cliente.frecuenciaVisitaDias || 30} días</span>
        </span>
      </div>

      {/* Bottom Row: Visit Dates Info & Quick Street Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-3 text-[11px]">
          <div>
            <span className="text-slate-400">Última: </span>
            <span className="font-semibold text-slate-700">
              {formatearFecha(cliente.fechaUltimaVisita)}
            </span>
          </div>
          <span className="text-slate-200">•</span>
          <div>
            <span className="text-slate-400">Próxima: </span>
            <span
              className={`font-semibold ${
                isVencida ? 'text-rose-600' : isHoy ? 'text-amber-700' : 'text-slate-700'
              }`}
            >
              {formatearFecha(cliente.fechaProximaVisita)}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div
          className="flex items-center gap-1.5 self-end sm:self-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {cliente.telefono && (
            <>
              <a
                href={`tel:${cleanPhone}`}
                id={`btn-call-${cliente.id}`}
                title="Llamar"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id={`btn-whatsapp-${cliente.id}`}
                title="WhatsApp"
                className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 active:scale-95 flex items-center justify-center transition-colors border border-emerald-200 shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            </>
          )}

          <button
            type="button"
            id={`btn-marcar-visita-${cliente.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onMarcarVisita(cliente);
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Visita Lista</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect(cliente)}
            className="w-7 h-7 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
