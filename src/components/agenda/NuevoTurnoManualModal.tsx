import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Cliente, BusinessConfig } from '../../types';
import { createTurno } from '../../lib/turnosService';
import { getTodayISODate } from '../../utils/dateUtils';

interface NuevoTurnoManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BusinessConfig;
  clientes: Cliente[];
  onTurnoCreated?: () => void;
  initialDate?: string;
}

export const NuevoTurnoManualModal: React.FC<NuevoTurnoManualModalProps> = ({
  isOpen,
  onClose,
  config,
  clientes,
  onTurnoCreated,
  initialDate,
}) => {
  const [selectedClienteId, setSelectedClienteId] = useState<string>('nuevo');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState(initialDate || getTodayISODate());
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [duracionMinutos, setDuracionMinutos] = useState(
    config.duracionServicioDefaultMinutos || 30
  );
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // When picking an existing client, autofill details
  const handleSelectCliente = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    if (clienteId === 'nuevo') {
      setNombre('');
      setTelefono('');
      setEmail('');
      setDireccion('');
    } else {
      const found = clientes.find((c) => c.id === clienteId);
      if (found) {
        setNombre(found.nombre || '');
        setTelefono(found.telefono || '');
        setEmail(found.email || '');
        setDireccion(found.direccion || '');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('Por favor ingresá el nombre del cliente.');
      return;
    }

    if (!telefono.trim()) {
      setErrorMsg('Por favor ingresá el teléfono del cliente.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor ingresá un email válido para enviarle la confirmación con el botón de cancelación.');
      return;
    }

    if (!fecha) {
      setErrorMsg('Por favor seleccioná la fecha del turno.');
      return;
    }

    if (!horaInicio) {
      setErrorMsg('Por favor seleccioná el horario del turno.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createTurno(
        {
          clienteId: selectedClienteId === 'nuevo' ? 'nuevoCliente' : selectedClienteId,
          nombreCliente: nombre.trim(),
          telefonoCliente: telefono.trim(),
          emailCliente: email.trim(),
          direccion: direccion.trim(),
          fecha,
          horaInicio,
          duracionMinutos: Number(duracionMinutos),
          notas: notas.trim(),
        },
        config
      );

      if (onTurnoCreated) {
        onTurnoCreated();
      }
      onClose();
    } catch (err: any) {
      console.error('Error creating manual turno:', err);
      setErrorMsg(err.message || 'Ocurrió un error al agendar el turno.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base leading-tight">
                Agendar Turno Manualmente
              </h2>
              <p className="text-[11px] text-slate-400">
                Se enviará automáticamente el email de confirmación con el botón para cancelar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Cliente:
            </label>
            <select
              id="select-turno-manual-cliente"
              value={selectedClienteId}
              onChange={(e) => handleSelectCliente(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
            >
              <option value="nuevo">+ Ingresar nuevo cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.direccion ? `(${c.direccion})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nombre del Cliente:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-turno-manual-nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Marcos Gómez"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Teléfono:
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-turno-manual-telefono"
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 11 4455 6677"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Email & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email del Cliente (para confirmación):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-turno-manual-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Dirección del Servicio:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-turno-manual-direccion"
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Av. Santa Fe 2344, 4°B"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fecha:
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-turno-manual-fecha"
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hora de Inicio:
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-turno-manual-hora"
                  type="time"
                  required
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Duración:
              </label>
              <select
                id="select-turno-manual-duracion"
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Notas u observaciones (opcional):
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="input-turno-manual-notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Vidriera frente calle + claraboya"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Email dispatch notice */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5 text-sky-800 text-xs">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <p>
              Al agendar, el cliente recibirá inmediatamente un email con el asunto <strong>"Confirmación de turno - {config.nombreNegocio || 'Perfect Glass'}"</strong> y el botón para cancelar el turno si lo necesita.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-nuevo-turno-manual"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Agendando y enviando email...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Enviar Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
