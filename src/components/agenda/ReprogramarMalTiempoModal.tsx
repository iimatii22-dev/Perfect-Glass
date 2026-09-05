import React, { useState } from 'react';
import {
  X,
  CloudRain,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Check,
  MessageCircle,
  Users,
  Info,
} from 'lucide-react';
import { Cliente } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import {
  formatearFecha,
  formatearFechaLarga,
  getTodayISODate,
} from '../../utils/dateUtils';

interface ReprogramarMalTiempoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaOrigen: string;
  clientesAfectados: Cliente[];
  onConfirmReprogramacion: (
    clienteIds: string[],
    nuevaFecha: string
  ) => Promise<void>;
}

export function ReprogramarMalTiempoModal({
  isOpen,
  onClose,
  fechaOrigen,
  clientesAfectados,
  onConfirmReprogramacion,
}: ReprogramarMalTiempoModalProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  // Calculate default next day
  const getTomorrowDate = (baseStr: string) => {
    try {
      const [y, m, d] = (baseStr || getTodayISODate()).split('-').map(Number);
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() + 1);
      const nextY = date.getFullYear();
      const nextM = String(date.getMonth() + 1).padStart(2, '0');
      const nextD = String(date.getDate()).padStart(2, '0');
      return `${nextY}-${nextM}-${nextD}`;
    } catch {
      return getTodayISODate();
    }
  };

  const [nuevaFecha, setNuevaFecha] = useState<string>(() =>
    getTomorrowDate(fechaOrigen)
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    clientesAfectados.map((c) => c.id)
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showWhatsappPreview, setShowWhatsappPreview] = useState(false);

  // Update selected IDs if modal re-opens
  React.useEffect(() => {
    if (isOpen) {
      setNuevaFecha(getTomorrowDate(fechaOrigen));
      setSelectedIds(clientesAfectados.map((c) => c.id));
      setErrorMsg(null);
      setShowWhatsappPreview(false);
    }
  }, [isOpen, fechaOrigen, clientesAfectados]);

  if (!isOpen || clientesAfectados.length === 0) return null;

  const toggleSelectCliente = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === clientesAfectados.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clientesAfectados.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setErrorMsg('Debes seleccionar al menos un cliente para reprogramar.');
      return;
    }
    if (!nuevaFecha) {
      setErrorMsg('Selecciona la nueva fecha de visita.');
      return;
    }
    if (nuevaFecha === fechaOrigen) {
      setErrorMsg('La nueva fecha debe ser distinta a la fecha original.');
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    try {
      await onConfirmReprogramacion(selectedIds, nuevaFecha);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al reprogramar las visitas.');
    } finally {
      setSaving(false);
    }
  };

  const getClientWhatsappUrl = (cliente: Cliente) => {
    const cleanPhone = cliente.telefono.replace(/[^0-9+]/g, '');
    const msg = `Hola ${cliente.nombre}, debido a las condiciones climáticas (lluvia/viento), reprogramamos la limpieza de tus vidrios para el día ${formatearFecha(nuevaFecha)}. ¡Muchas gracias por tu comprensión! ${config.nombreNegocio || 'Perfect Glass'}`;
    return `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Reprogramar por Mal Tiempo
              </h2>
              <p className="text-xs text-slate-300">
                Lluvia o condiciones climáticas adversas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm"
        >
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Source and Target Dates Overview */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                  Fecha Afectada (Lluvia)
                </span>
                <p className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatearFecha(fechaOrigen)}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-sky-700 block mb-1">
                  Mover visitas a nueva fecha:
                </label>
                <input
                  type="date"
                  required
                  id="input-reprogramar-nueva-fecha"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold text-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Nueva fecha:{' '}
                <strong className="text-slate-800">
                  {formatearFecha(nuevaFecha)}
                </strong>
              </span>
              <span className="text-slate-400 font-medium">
                (Se actualizará automáticamente)
              </span>
            </div>
          </div>

          {/* List of Affected Clients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Clientes a Reprogramar ({selectedIds.length}/
                  {clientesAfectados.length})
                </span>
              </label>

              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
              >
                {selectedIds.length === clientesAfectados.length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-200">
              {clientesAfectados.map((cliente) => {
                const isChecked = selectedIds.includes(cliente.id);
                return (
                  <div
                    key={cliente.id}
                    onClick={() => toggleSelectCliente(cliente.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-white border-sky-300 shadow-2xs'
                        : 'bg-slate-100/50 border-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                          isChecked
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="truncate">
                        <p className="font-bold text-slate-800 text-xs truncate">
                          {cliente.nombre}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {cliente.direccion}
                          {cliente.zona ? ` • ${cliente.zona}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Direct link to notify via WhatsApp */}
                    {isChecked && (
                      <a
                        href={getClientWhatsappUrl(cliente)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 border border-emerald-200/80 transition-colors"
                        title="Enviar aviso por WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Avisar WA</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Helper Accordion */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white space-y-2">
            <button
              type="button"
              onClick={() => setShowWhatsappPreview(!showWhatsappPreview)}
              className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700"
            >
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                Mensaje de aviso sugerido por WhatsApp
              </span>
              <span className="text-[10px] text-slate-400">
                {showWhatsappPreview ? 'Ocultar' : 'Ver mensaje'}
              </span>
            </button>

            {showWhatsappPreview && (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-950 font-medium leading-relaxed animate-in fade-in">
                &ldquo;Hola [Nombre], debido a las condiciones climáticas (lluvia/viento), reprogramamos la limpieza de tus vidrios para el día {formatearFecha(nuevaFecha)}. ¡Muchas gracias por tu comprensión! {config.nombreNegocio || 'Perfect Glass'}&rdquo;
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-reprogramacion-mal-tiempo"
              disabled={saving || selectedIds.length === 0}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CloudRain className="w-4 h-4" />
                  <span>
                    Mover {selectedIds.length} Visita
                    {selectedIds.length !== 1 ? 's' : ''} a {formatearFecha(nuevaFecha)}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
