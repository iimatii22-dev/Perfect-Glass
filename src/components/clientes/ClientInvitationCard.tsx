import React, { useState } from 'react';
import {
  Link2,
  Copy,
  Check,
  Share2,
  RefreshCw,
  QrCode,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { generarNuevoCodigoInvitacion } from '../../lib/negociosService';

export function ClientInvitationCard() {
  const { config, saveConfig } = useConfig();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const invitationCode = config.codigoInvitacion || config.id || 'pg-vip';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const invitationUrl = `${origin}/registro-cliente?ref=${invitationCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = invitationUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `¡Hola! Te invito a sumarte a nuestro portal exclusivo de clientes en *${config.nombreNegocio || 'Gestión de Servicios'}*. Podrás ver tu historial de visitas, solicitar turnos y sumar sellos de fidelidad para obtener limpiezas gratis: ${invitationUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleRegenerarCodigo = async () => {
    if (
      !confirm(
        '¿Deseas generar un nuevo código de invitación? El enlace anterior dejará de funcionar para nuevos registros.'
      )
    ) {
      return;
    }

    setRegenerating(true);
    try {
      const nuevoCodigo = generarNuevoCodigoInvitacion();
      await saveConfig({ codigoInvitacion: nuevoCodigo });
    } catch (e) {
      console.error('Error al regenerar código de invitación:', e);
    } finally {
      setRegenerating(false);
    }
  };

  const primaryColor = config.colorPrimario || '#0284c7';

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="p-2 rounded-2xl text-white shadow-xs"
            style={{ backgroundColor: primaryColor }}
          >
            <Link2 className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Link de Invitación Exclusivo para Clientes
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                Activo
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Comparte este enlace para que tus clientes se registren directamente en tu negocio sin
              acceso cruzado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-200"
            title="Ver código QR"
          >
            <QrCode className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">QR</span>
          </button>

          <button
            type="button"
            disabled={regenerating}
            onClick={handleRegenerarCodigo}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-200 disabled:opacity-50"
            title="Generar nuevo código único"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Regenerar</span>
          </button>
        </div>
      </div>

      {/* URL Display & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80">
        <div className="flex-1 font-mono text-xs text-slate-700 px-3 py-1.5 truncate select-all bg-white sm:bg-transparent rounded-xl border sm:border-0 border-slate-200">
          {invitationUrl}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            style={{ backgroundColor: primaryColor }}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Enlace</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <a
            href={invitationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
            title="Probar enlace en nueva pestaña"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* QR Code Modal / Drawer */}
      {showQr && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="text-sm font-bold text-white">Código QR para Mostrador o Camioneta</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Tus clientes pueden escanearlo con la cámara de su celular para solicitar el alta y
              acumular sellos de fidelidad.
            </p>
            <p className="text-[11px] font-mono text-sky-400 pt-1">
              Código Ref: {invitationCode}
            </p>
          </div>
          <div className="p-2 bg-white rounded-2xl shrink-0 shadow-lg">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                invitationUrl
              )}`}
              alt="QR Invitación"
              className="w-28 h-28"
            />
          </div>
        </div>
      )}
    </div>
  );
}
