import React from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
} from 'lucide-react';
import { Cliente } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import {
  getCategoriaFecha,
  calcularDiasRestantes,
  formatearFecha,
} from '../../utils/dateUtils';

interface AgendaClienteCardProps {
  key?: React.Key;
  cliente: Cliente;
  onSelect: (cliente: Cliente) => void;
  onMarcarVisita: (cliente: Cliente) => void;
}

export function AgendaClienteCard({
  cliente,
  onSelect,
  onMarcarVisita,
}: AgendaClienteCardProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const categoria = getCategoriaFecha(cliente.fechaProximaVisita);
  const estadoVisita = calcularDiasRestantes(cliente.fechaProximaVisita);

  const cleanPhone = cliente.telefono.replace(/[^0-9+]/g, '');
  const fechaTexto = formatearFecha(cliente.fechaProximaVisita);
  
  // Pre-formatted message required by Requirement 5
  const whatsappMsg = `Hola ${cliente.nombre}, te confirmamos que pasamos a limpiar tus vidrios el día ${fechaTexto}. ${config.nombreNegocio || 'Perfect Glass'}`;
  const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(whatsappMsg)}`;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${cliente.direccion}, ${cliente.zona || ''}`
  )}`;

  // Visual color accents based on category (Requirement 6)
  // Vencidas: Rojo, Próximas 3 días: Amarillo/Ámbar, Futuras: Verde
  let borderAccent = 'border-l-emerald-500';
  let badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let statusIcon = <Clock className="w-3 h-3 text-emerald-600" />;

  if (categoria === 'vencida') {
    borderAccent = 'border-l-rose-500';
    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    statusIcon = <AlertTriangle className="w-3 h-3 text-rose-600" />;
  } else if (categoria === 'proxima_3dias') {
    borderAccent = 'border-l-amber-500';
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
    statusIcon = <Clock className="w-3 h-3 text-amber-600" />;
  }

  return (
    <div
      onClick={() => onSelect(cliente)}
      className={`bg-white rounded-2xl border border-slate-200/80 border-l-4 ${borderAccent} p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-3`}
    >
      {/* Top Row: Name, Zone & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs border flex items-center gap-1 ${badgeStyle}`}
            >
              {statusIcon}
              <span>{estadoVisita.etiqueta}</span>
            </span>

            {cliente.zona && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200/60 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                {cliente.zona}
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate group-hover:text-sky-600 transition-colors">
            {cliente.nombre}
          </h3>

          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{cliente.direccion}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(cliente);
          }}
          className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          title="Ver ficha"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Surface Details & Next Date */}
      <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 truncate">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-medium">
            {cliente.tipoSuperficie || 'Limpieza de vidrios'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 shrink-0">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{fechaTexto}</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div
        className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Contact links: WhatsApp & Call */}
        <div className="flex items-center gap-1.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            title="Confirmar visita por WhatsApp con mensaje predefinido"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>

          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Llamar al cliente"
            >
              <Phone className="w-3.5 h-3.5 text-slate-600" />
            </a>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Abrir ubicación en Google Maps"
          >
            <MapPin className="w-3.5 h-3.5 text-slate-600" />
          </a>
        </div>

        {/* Complete visit button */}
        <button
          type="button"
          onClick={() => onMarcarVisita(cliente)}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Completada</span>
        </button>
      </div>
    </div>
  );
}
