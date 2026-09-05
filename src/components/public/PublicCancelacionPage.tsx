import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  CalendarPlus,
  Loader2,
  Sparkles,
  Phone,
} from 'lucide-react';
import { BusinessConfig, Turno } from '../../types';
import { getTurnoByCancelToken, cancelarTurnoPorToken } from '../../lib/turnosService';
import { formatearFechaLarga } from '../../utils/dateUtils';

interface PublicCancelacionPageProps {
  token: string;
  config: BusinessConfig;
  onBackToApp?: () => void;
  onGoToBooking?: () => void;
}

export const PublicCancelacionPage: React.FC<PublicCancelacionPageProps> = ({
  token,
  config,
  onBackToApp,
  onGoToBooking,
}) => {
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCancelledSuccess, setIsCancelledSuccess] = useState(false);
  const [motivo, setMotivo] = useState('');

  const businessName = config.nombreNegocio || 'Perfect Glass';
  const primaryColor = config.colorPrimario || '#0284c7';

  // Load Turno details by cancellation token
  useEffect(() => {
    let isMounted = true;

    async function loadTurno() {
      if (!token || !token.trim()) {
        if (isMounted) {
          setErrorMsg('Este link de cancelación no es válido o el turno ya fue cancelado.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const fetched = await getTurnoByCancelToken(token);
        if (!isMounted) return;

        if (!fetched) {
          setErrorMsg('Este link de cancelación no es válido o el turno ya fue cancelado.');
          setTurno(null);
        } else if (fetched.estado === 'cancelado' || fetched.fechaCancelacion) {
          setErrorMsg('Este link de cancelación no es válido o el turno ya fue cancelado.');
          setTurno(null);
        } else {
          setTurno(fetched);
          setErrorMsg(null);
        }
      } catch (err) {
        console.error('Error fetching turno by cancel token:', err);
        if (isMounted) {
          setErrorMsg('Este link de cancelación no es válido o el turno ya fue cancelado.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTurno();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle cancellation execution
  const handleConfirmarCancelacion = async () => {
    if (!token || isCancelling) return;
    setIsCancelling(true);

    try {
      const updated = await cancelarTurnoPorToken(
        token,
        config,
        motivo.trim() || 'Cancelado por el cliente desde el email'
      );
      setTurno(updated);
      setIsCancelledSuccess(true);
    } catch (err: any) {
      console.error('Error cancelling turno:', err);
      setErrorMsg(err.message || 'Este link de cancelación no es válido o el turno ya fue cancelado.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleIrAgendamiento = () => {
    if (onGoToBooking) {
      onGoToBooking();
    } else {
      const origin = window.location.origin;
      window.location.href = `${origin}?agendar=true`;
    }
  };

  const handleVolverAtras = () => {
    if (onBackToApp) {
      onBackToApp();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = window.location.origin;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-rose-100">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={businessName}
                className="w-9 h-9 rounded-xl object-contain border border-slate-200/80 p-0.5 shadow-2xs bg-white"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {businessName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900 leading-tight text-sm sm:text-base">
                {businessName}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Gestión de Turnos Online
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-cancelacion-contacto"
            onClick={handleIrAgendamiento}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Nuevo turno</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl w-full mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* State 1: Loading */}
        {loading && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-slate-800">
              Verificando información del turno...
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Por favor aguardá un instante.
            </p>
          </div>
        )}

        {/* State 2: Error / Token Invalido */}
        {!loading && errorMsg && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900 mb-2">
              Link no disponible
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
              {errorMsg}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                id="btn-error-agendar-nuevo"
                onClick={handleIrAgendamiento}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-xs transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Agendar un turno nuevo</span>
              </button>

              <button
                type="button"
                id="btn-error-volver"
                onClick={handleVolverAtras}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver atrás</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: Cancelled Successfully */}
        {!loading && !errorMsg && isCancelledSuccess && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              Tu turno fue cancelado correctamente
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
              El horario quedó disponible nuevamente. Si querés agendar otro horario, podés hacerlo desde nuestro agendamiento público en cualquier momento.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 text-left text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-800 text-sm mb-1">Turno cancelado:</div>
              <div><strong>Cliente:</strong> {turno?.nombreCliente}</div>
              <div><strong>Fecha:</strong> {turno ? formatearFechaLarga(turno.fecha) : ''}</div>
              <div><strong>Horario liberado:</strong> {turno?.horaInicio} a {turno?.horaFin} hs</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                id="btn-success-agendar-nuevo"
                onClick={handleIrAgendamiento}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-xs transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Agendar otro horario</span>
              </button>

              <button
                type="button"
                id="btn-success-volver"
                onClick={handleVolverAtras}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al inicio</span>
              </button>
            </div>
          </div>
        )}

        {/* State 4: Active Confirmation Prompt */}
        {!loading && !errorMsg && !isCancelledSuccess && turno && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Top red warning stripe */}
            <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-rose-950">
                  Cancelación de Turno
                </h2>
                <p className="text-xs text-rose-700">
                  Verificá los detalles de tu turno antes de continuar
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* Turno Details Card */}
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 mb-6 space-y-3">
                <div className="flex items-center gap-3 text-slate-800">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-medium">Cliente:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {turno.nombreCliente}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-medium">Fecha:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatearFechaLarga(turno.fecha)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-800">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-medium">Horario:</span>
                  <span className="text-sm font-bold text-slate-900">
                    {turno.horaInicio} a {turno.horaFin} hs
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-800">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-medium">Dirección:</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {turno.direccion || 'A coordinar'}
                  </span>
                </div>
              </div>

              {/* Confirmation Question */}
              <div className="text-center mb-6">
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1.5">
                  ¿Estás seguro que querés cancelar este turno?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                  Al confirmar, el turno quedará anulado y el horario se liberará inmediatamente para otros clientes.
                </p>
              </div>

              {/* Optional reason */}
              <div className="mb-6">
                <label
                  htmlFor="input-motivo-cancelacion"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Motivo o comentario (opcional)
                </label>
                <textarea
                  id="input-motivo-cancelacion"
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Me surgió un viaje, prefiero reprogramar para la semana que viene..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 resize-none"
                />
              </div>

              {/* Action Buttons: "Sí, cancelar" y "Volver atrás" */}
              <div className="space-y-3">
                <button
                  type="button"
                  id="btn-confirmar-cancelacion-publica"
                  disabled={isCancelling}
                  onClick={handleConfirmarCancelacion}
                  className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelando turno...</span>
                    </>
                  ) : (
                    <span>Sí, cancelar</span>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-volver-atras-publica"
                  disabled={isCancelling}
                  onClick={handleVolverAtras}
                  className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <span>Volver atrás</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/60">
        <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-1">
          <p className="font-semibold text-slate-600">
            {businessName}
          </p>
          {config.telefono && (
            <p className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>{config.telefono}</span>
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Plataforma de turnos y servicios profesionales
          </p>
        </div>
      </footer>
    </div>
  );
};
