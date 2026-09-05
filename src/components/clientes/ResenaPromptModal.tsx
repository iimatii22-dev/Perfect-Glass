import React, { useState } from 'react';
import {
  X,
  Star,
  MessageCircle,
  Mail,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
  AlertCircle,
  ThumbsUp,
} from 'lucide-react';
import { Cliente, BusinessConfig } from '../../types';
import {
  generateWhatsAppReviewMessage,
  enviarEmailSolicitudResena,
  generateOpinionUrl,
} from '../../lib/emailNotificationService';
import { registrarPedidoResenaEnviado } from '../../lib/clientesService';

interface ResenaPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  config: BusinessConfig;
}

export function ResenaPromptModal({
  isOpen,
  onClose,
  cliente,
  config,
}: ResenaPromptModalProps) {
  const [copied, setCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !cliente) return null;

  const opinionUrl = generateOpinionUrl(cliente.id);
  const whatsappMsg = generateWhatsAppReviewMessage(cliente, config);
  const diasMinimos = config.diasMinimosEntreResenas || 90;

  // Clean phone number for WhatsApp URL
  const cleanPhone = (cliente.telefono || '').replace(/\D/g, '');

  const handleOpenWhatsApp = async () => {
    try {
      await registrarPedidoResenaEnviado(cliente.id);
    } catch (e) {
      console.warn('Error recording review request:', e);
    }

    const encodedMsg = encodeURIComponent(whatsappMsg);
    let waUrl = `https://wa.me/?text=${encodedMsg}`;
    if (cleanPhone) {
      waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    }
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleSendEmail = async () => {
    if (!cliente.emailRegistro) {
      setErrorMsg('El cliente no tiene un correo electrónico registrado en su ficha.');
      return;
    }

    setEmailSending(true);
    setErrorMsg(null);
    try {
      await enviarEmailSolicitudResena(cliente, config);
      await registrarPedidoResenaEnviado(cliente.id);
      setEmailSent(true);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al despachar correo de reseña.');
    } finally {
      setEmailSending(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(whatsappMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-xs">
              <Star className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Solicitar Calificación</h2>
              <p className="text-xs text-amber-100 truncate max-w-[230px]">
                {cliente.nombre}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-white/80 hover:text-white hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {emailSent && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡Correo de solicitud de opinión enviado con éxito!</span>
            </div>
          )}

          {/* Smart Filter note */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
              <ThumbsUp className="w-3.5 h-3.5 text-amber-600" />
              <span>Filtro previo de satisfacción activado</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              El enlace llevará al cliente a una encuesta de 15 segundos. Si califica <strong>4 o 5 estrellas</strong>, se le ofrecerá publicar en Google Maps. Si califica <strong>1 a 3</strong>, se guardará como feedback privado interno.
            </p>
          </div>

          {/* Link Preview */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-semibold text-xs">
              Enlace de encuesta pública:
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="truncate text-slate-600 font-mono text-[11px] flex-1">
                {opinionUrl}
              </span>
              <a
                href={opinionUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-200 transition-colors"
                title="Probar encuesta pública"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-semibold text-xs">
                Mensaje prellenado para el cliente:
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-700 whitespace-pre-line max-h-32 overflow-y-auto leading-relaxed font-sans">
              {whatsappMsg}
            </div>
          </div>

          {/* Anti-Spam frequency notice */}
          <div className="p-2.5 rounded-xl bg-slate-100/70 text-slate-500 text-[10px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Frecuencia configurada: no se volverá a solicitar reseña a este cliente por <strong>{diasMinimos} días</strong>.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              id="btn-enviar-resena-whatsapp"
              onClick={handleOpenWhatsApp}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Enviar por WhatsApp</span>
            </button>

            {cliente.emailRegistro && (
              <button
                type="button"
                id="btn-enviar-resena-email"
                onClick={handleSendEmail}
                disabled={emailSending}
                className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {emailSending ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-sky-600" />
                    <span>Enviar también por Email ({cliente.emailRegistro})</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              id="btn-cerrar-resena-modal"
              onClick={onClose}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
