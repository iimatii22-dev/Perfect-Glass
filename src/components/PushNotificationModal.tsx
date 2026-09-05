import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, CheckCircle2, ShieldCheck, Clock, X, Smartphone } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { solicitarPermisoPush } from '../lib/pushNotificationService';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PushNotificationModal({
  isOpen,
  onClose,
  onSuccess,
}: PushNotificationModalProps) {
  const { config } = useConfig();
  const { user, role, clienteData } = useAuth();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isVidriero = role === 'admin' || role === 'superadmin';

  const handleAllow = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await solicitarPermisoPush(
        user.uid,
        role,
        config.id || 'perfect-glass',
        user.email
      );

      if (result.granted) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(
          result.error ||
            'No se pudo activar el permiso de notificaciones en este navegador.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error activando notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // "Ahora no" doesn't block the app, only suppresses prompt for this session/period
    localStorage.setItem('perfectglass_push_prompt_dismissed', 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon badge */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {config.nombreNegocio || 'Perfect Glass'} • Notificaciones Push
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {isVidriero
                  ? '¿Activar alertas en tu celular?'
                  : '¿Recibir avisos de tus turnos?'}
              </h3>
            </div>
          </div>

          {/* Main message */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            {isVidriero
              ? 'Te avisaremos cuando un cliente agenda o cancela un turno en tiempo real, para que estés siempre al día sin depender de revisar tu email.'
              : 'Te avisaremos recordatorios de tu turno próximo y confirmaciones para que tus vidrios estén siempre impecables.'}
          </p>

          {/* Benefit bullets */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2.5 mb-5 text-xs">
            {isVidriero ? (
              <>
                <div className="flex items-start gap-2.5 text-slate-700 font-medium">
                  <Smartphone className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Notificación instantánea en tu celular al agendarse un turno</span>
                </div>
                <div className="flex items-start gap-2.5 text-slate-700 font-medium">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Alerta inmediata si un cliente cancela, liberando el hueco en la agenda</span>
                </div>
                <div className="flex items-start gap-2.5 text-slate-700 font-medium">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Configura horario de descanso (no recibir push de noche)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2.5 text-slate-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Confirmación al instante tras reservar tu horario</span>
                </div>
                <div className="flex items-start gap-2.5 text-slate-700 font-medium">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>Recordatorio 24 horas antes de la visita del vidriero</span>
                </div>
                <div className="flex items-start gap-2.5 text-slate-700 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>Acceso directo a tu perfil para consultar sellos y fidelidad</span>
                </div>
              </>
            )}
          </div>

          {/* Error display if any */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-push-dismiss"
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Ahora no
            </button>
            <button
              type="button"
              id="btn-push-allow"
              disabled={loading}
              onClick={handleAllow}
              style={{ backgroundColor: primaryColor }}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Activando...</span>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Permitir</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-3">
            Puedes cambiar tus preferencias o desactivarlas en cualquier momento desde Configuración.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
