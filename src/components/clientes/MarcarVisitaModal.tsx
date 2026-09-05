import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  FileText,
  Camera,
  Sparkles,
  AlertCircle,
  Clock,
  Check,
  Star,
  Gift,
} from 'lucide-react';
import { Cliente } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { calcularProximaVisita, formatearFecha, getTodayISODate } from '../../utils/dateUtils';
import { uploadClienteFoto } from '../../lib/clientesService';
import {
  verificarElegibilidadResena,
  enviarEmailSolicitudResena,
} from '../../lib/emailNotificationService';
import { ResenaPromptModal } from './ResenaPromptModal';

interface MarcarVisitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onConfirmVisita: (
    clienteId: string,
    visitaData: {
      fecha: string;
      notas: string;
      fotoAntes?: string;
      fotoDespues?: string;
    },
    frecuenciaDias: number
  ) => Promise<void>;
}

const QUICK_NOTES = [
  'Limpieza general exterior e interior sin novedades.',
  'Vidrios y mamparas descalcificadas con producto especial.',
  'Trabajo completado, se cobró en efectivo al cliente.',
  'Cliente muy conforme, solicitó mantener mismo horario.',
];

export function MarcarVisitaModal({
  isOpen,
  onClose,
  cliente,
  onConfirmVisita,
}: MarcarVisitaModalProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [fecha, setFecha] = useState(getTodayISODate());
  const [notas, setNotas] = useState('Limpieza periódica completada con éxito.');
  const [fotoAntes, setFotoAntes] = useState<string | undefined>(undefined);
  const [fotoDespues, setFotoDespues] = useState<string | undefined>(undefined);
  const [uploadingAntes, setUploadingAntes] = useState(false);
  const [uploadingDespues, setUploadingDespues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showResenaPrompt, setShowResenaPrompt] = useState(false);

  if (!isOpen || !cliente) return null;

  const elegibilidadResena = verificarElegibilidadResena(cliente, config);
  const sellosActuales = cliente.sellosAcumulados ?? 0;
  const sellosNecesarios = cliente.sellosNecesarios || config.sellosNecesarios || 5;
  const recompensa = cliente.recompensaDescripcion || config.recompensaDescripcion || 'Limpieza de vidrios gratis';
  const alcanzaraRecompensa = (sellosActuales + 1) >= sellosNecesarios;

  const proximaCalculada = calcularProximaVisita(
    fecha,
    cliente.frecuenciaVisitaDias || 30
  );

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'antes' | 'despues'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'antes') setUploadingAntes(true);
    else setUploadingDespues(true);

    try {
      const url = await uploadClienteFoto(file, cliente.id, tipo);
      if (tipo === 'antes') setFotoAntes(url);
      else setFotoDespues(url);
    } catch (err: any) {
      setErrorMsg(`Error al subir foto ${tipo}: ` + (err.message || 'Error'));
    } finally {
      if (tipo === 'antes') setUploadingAntes(false);
      else setUploadingDespues(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);
    try {
      await onConfirmVisita(
        cliente.id,
        {
          fecha,
          notas: notas.trim() || 'Visita completada.',
          fotoAntes,
          fotoDespues,
        },
        cliente.frecuenciaVisitaDias || 30
      );

      // Automated review request trigger
      if (elegibilidadResena.eligible) {
        if (cliente.emailRegistro) {
          try {
            await enviarEmailSolicitudResena(cliente, config);
          } catch (err) {
            console.warn('Could not auto-send review email:', err);
          }
        }
        setShowResenaPrompt(true);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar visita completada.');
    } finally {
      setSaving(false);
    }
  };

  if (showResenaPrompt) {
    return (
      <ResenaPromptModal
        isOpen={showResenaPrompt}
        onClose={onClose}
        cliente={cliente}
        config={config}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Marcar Visita Completada</h2>
              <p className="text-xs text-slate-300 truncate max-w-[240px]">
                {cliente.nombre}
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
        <form onSubmit={handleConfirm} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date of the visit */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Fecha de la visita realizada:
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="date"
                required
                id="input-visita-fecha"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 font-semibold"
              />
            </div>
          </div>

          {/* Automation explanation banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Próxima visita reprogramada automáticamente:
            </div>
            <p className="text-emerald-800 font-extrabold text-sm pl-5">
              {formatearFecha(proximaCalculada)}{' '}
              <span className="text-xs font-semibold text-emerald-700">
                (en {cliente.frecuenciaVisitaDias || 30} días)
              </span>
            </p>
          </div>

          {/* Loyalty Stamp Reward Preview */}
          <div
            className={`p-3.5 rounded-2xl border space-y-1.5 text-xs transition-all ${
              alcanzaraRecompensa
                ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                {alcanzaraRecompensa ? (
                  <>
                    <Gift className="w-4 h-4 text-amber-600 animate-bounce" />
                    <span className="text-amber-900 font-extrabold">¡Desbloqueará Recompensa!</span>
                  </>
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span className="font-bold text-slate-800">Programa de Fidelidad</span>
                  </>
                )}
              </span>
              <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-white border border-slate-200">
                {sellosActuales} ➔ {alcanzaraRecompensa ? 0 : sellosActuales + 1} / {sellosNecesarios} sellos
              </span>
            </div>

            <p className="text-[11px] leading-relaxed">
              {alcanzaraRecompensa ? (
                <span className="text-amber-900 font-semibold">
                  🎉 Al registrar esta visita se completará la meta de {sellosNecesarios} sellos y se activará: <strong>{recompensa}</strong>.
                </span>
              ) : (
                <span className="text-slate-600">
                  Esta visita sumará <strong>+1 sello</strong> automáticamente a la ficha del cliente.
                </span>
              )}
            </p>
          </div>

          {/* Google Review Trigger Status */}
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⭐</span>
              <div>
                <p className="font-bold text-slate-800 text-[11px]">
                  Solicitud de Reseña de Google Maps
                </p>
                <p className="text-[10px] text-slate-500">
                  {elegibilidadResena.eligible
                    ? 'Se abrirá el mensaje de agradecimiento listo para enviar por WhatsApp / Email.'
                    : `No requerida ahora: ${elegibilidadResena.razon || 'Límite de frecuencia activo'}`}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                elegibilidadResena.eligible
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {elegibilidadResena.eligible ? 'Lista para enviar' : 'Pausada'}
            </span>
          </div>

          {/* Visit Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Notas y detalle del trabajo:
            </label>
            <textarea
              rows={3}
              id="textarea-visita-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalla cómo quedó el trabajo o cobros realizados..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 resize-none text-xs"
            />

            {/* Quick Notes helper chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((qn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNotas(qn)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] text-left transition-colors truncate max-w-full"
                >
                  {qn}
                </button>
              ))}
            </div>
          </div>

          {/* Photos of this visit */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-slate-700 font-semibold">
              Fotos de esta visita (Opcional):
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Foto Antes */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="font-semibold text-slate-600 text-[11px] mb-1.5">Foto Antes</p>
                {fotoAntes ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                    <img src={fotoAntes} alt="Antes" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoAntes(undefined)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white cursor-pointer transition-colors">
                    {uploadingAntes ? (
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-slate-400 mb-0.5" />
                        <span className="text-[10px] font-semibold text-slate-500">Tomar / Subir</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'antes')}
                    />
                  </label>
                )}
              </div>

              {/* Foto Después */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="font-semibold text-slate-600 text-[11px] mb-1.5">Foto Después</p>
                {fotoDespues ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                    <img src={fotoDespues} alt="Después" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoDespues(undefined)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white cursor-pointer transition-colors">
                    {uploadingDespues ? (
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-slate-400 mb-0.5" />
                        <span className="text-[10px] font-semibold text-slate-500">Tomar / Subir</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'despues')}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              id="btn-cancel-visita-modal"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-visita"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Registrar y Reprogramar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
