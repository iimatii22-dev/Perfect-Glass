import React, { useState, useRef, useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { uploadLogoToStorage } from '../../lib/firebase';
import { BusinessConfig } from '../../types';
import { getEmailLogs, clearEmailLogs, EmailLog } from '../../lib/emailNotificationService';
import {
  solicitarPermisoPush,
  probarNotificacionPushLocal,
  getNotificationPermissionStatus,
  obtenerLogsNotificaciones,
} from '../../lib/pushNotificationService';
import {
  Building2,
  MapPin,
  Phone,
  Image as ImageIcon,
  Instagram,
  MessageCircle,
  Facebook,
  Palette,
  Upload,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Save,
  Check,
  Shield,
  Smartphone,
  Globe,
  AlertCircle,
  Database,
  Calendar,
  Clock,
  Mail,
  Copy,
  Share2,
  Trash2,
  Inbox,
  Send,
  Star,
  BarChart3,
  TrendingUp,
  Bell,
  VolumeX,
  Volume2,
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Azul Océano', hex: '#0284c7' },
  { name: 'Azul Real', hex: '#1d4ed8' },
  { name: 'Azul Marino', hex: '#0f172a' },
  { name: 'Turquesa', hex: '#0d9488' },
  { name: 'Índigo Moderno', hex: '#4f46e5' },
  { name: 'Verde Esmeralda', hex: '#059669' },
  { name: 'Cian Cristal', hex: '#0891b2' },
  { name: 'Gris Grafito', hex: '#334155' },
];

const DIAS_SEMANA = [
  { num: 1, nombre: 'Lun' },
  { num: 2, nombre: 'Mar' },
  { num: 3, nombre: 'Mié' },
  { num: 4, nombre: 'Jue' },
  { num: 5, nombre: 'Vie' },
  { num: 6, nombre: 'Sáb' },
  { num: 0, nombre: 'Dom' },
];

interface ConfiguracionTabProps {
  onNavigateToTab?: (tab: string) => void;
}

export function ConfiguracionTab({ onNavigateToTab }: ConfiguracionTabProps = {}) {
  const { config, saveConfig, isSaving, resetToDefaults } = useConfig();
  const { user } = useAuth();

  // Local state for the editable form
  const [formData, setFormData] = useState<BusinessConfig>(config);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [devicePermission, setDevicePermission] = useState<NotificationPermission>('default');
  const [testNotificationStatus, setTestNotificationStatus] = useState<string | null>(null);
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form data if remote config changes externally
  useEffect(() => {
    setFormData(config);
    setEmailLogs(getEmailLogs());
    setDevicePermission(getNotificationPermissionStatus());
  }, [config]);

  const handleEnableDevicePush = async () => {
    if (!user) return;
    setIsActivatingPush(true);
    setTestNotificationStatus(null);
    try {
      const res = await solicitarPermisoPush(
        user.uid,
        'admin',
        config.id || 'perfect-glass',
        user.email
      );
      setDevicePermission(getNotificationPermissionStatus());
      if (res.granted) {
        setTestNotificationStatus('¡Notificaciones activadas con éxito en este dispositivo!');
      } else {
        setTestNotificationStatus(res.error || 'Permiso denegado en el navegador.');
      }
    } catch (e: any) {
      setTestNotificationStatus(e.message || 'Error activando notificaciones.');
    } finally {
      setIsActivatingPush(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestNotificationStatus(null);
    const ok = await probarNotificacionPushLocal(
      'Turno de prueba • Perfect Glass',
      '¡Tu dispositivo está recibiendo alertas push instantáneas!',
      '/?tab=agenda'
    );
    if (ok) {
      setTestNotificationStatus('¡Notificación de prueba enviada a tu pantalla!');
    } else {
      setTestNotificationStatus(
        'No se pudo mostrar la notificación. Asegúrate de permitir avisos en este navegador.'
      );
    }
  };

  const handleChange = (field: keyof BusinessConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDiaLaborable = (diaNum: number) => {
    const currentDias = formData.diasLaborables || [1, 2, 3, 4, 5, 6];
    const exists = currentDias.includes(diaNum);
    let nextDias: number[];
    if (exists) {
      nextDias = currentDias.filter((d) => d !== diaNum);
    } else {
      nextDias = [...currentDias, diaNum].sort((a, b) => a - b);
    }
    setFormData((prev) => ({ ...prev, diasLaborables: nextDias }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen no debe superar los 5MB.');
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    try {
      const downloadUrl = await uploadLogoToStorage(file, (progress) => {
        setUploadProgress(progress);
      });
      setFormData((prev) => ({ ...prev, logoUrl: downloadUrl }));
      setUploadProgress(null);
    } catch (err: any) {
      setUploadError('No se pudo subir la imagen. Puedes pegar una URL directa.');
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    try {
      await saveConfig(formData);
      setSuccessMessage('¡Configuración guardada exitosamente! Los cambios ya se reflejan en toda la app.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error saving config:', err);
    }
  };

  const handleReset = async () => {
    if (window.confirm('¿Deseas restaurar la configuración inicial predeterminada?')) {
      await resetToDefaults();
      setSuccessMessage('Se ha restaurado la configuración por defecto.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleCopyLink = () => {
    const bookingUrl = `${window.location.origin}${window.location.pathname}?agendar=true`;
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleOpenPublicBooking = () => {
    const bookingUrl = `${window.location.origin}${window.location.pathname}?agendar=true`;
    window.open(bookingUrl, '_blank');
  };

  const handleRefreshEmailLogs = () => {
    setEmailLogs(getEmailLogs());
  };

  const handleClearEmailLogs = () => {
    if (window.confirm('¿Deseas vaciar el registro histórico de correos?')) {
      clearEmailLogs();
      setEmailLogs([]);
      setSelectedLog(null);
    }
  };

  const primaryColor = formData.colorPrimario || '#0284c7';
  const cleanPhone = formData.whatsapp?.replace(/[^0-9]/g, '') || '';
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';
  const bookingPublicUrl = `${window.location.origin}${window.location.pathname}?agendar=true`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6 pb-24">
      {/* Tab Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="p-2 rounded-xl text-white shadow-2xs"
              style={{ backgroundColor: primaryColor }}
            >
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Configuración del Negocio
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Gestiona la identidad de <strong>{formData.nombreNegocio || 'tu negocio'}</strong>, jornada laboral, links de auto-agendamiento y notificaciones.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="self-start sm:self-center px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Restaurar Valores
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex items-start gap-3 text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Cambios aplicados</p>
            <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* PUBLIC BOOKING LINK SPOTLIGHT BANNER */}
      <div className="bg-gradient-to-br from-sky-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-sky-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight text-white">
                  Tu Link Público de Auto-Agendamiento
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-black bg-emerald-500 text-slate-950">
                  Activo
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Compártelo por WhatsApp, Instagram Bio o folletos para que tus clientes reserven en 3 pasos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                copiedLink
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Copiado al portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenPublicBooking}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>Abrir Página Pública</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* URL Box */}
        <div className="p-3 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-between gap-3 text-xs font-mono text-sky-200 break-all select-all">
          <span className="truncate">{bookingPublicUrl}</span>
          <span className="text-[10px] text-slate-400 font-sans shrink-0 uppercase tracking-wider font-bold">
            Sin login requerido
          </span>
        </div>
      </div>

      {/* Main Grid: Form + Real-time Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-sm space-y-6">
            {/* Section 1: Business Identity */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                1. Identidad del Negocio
              </h3>

              {/* Nombre del Negocio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre del Negocio *
                </label>
                <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="input-config-nombre"
                    type="text"
                    required
                    value={formData.nombreNegocio}
                    onChange={(e) => handleChange('nombreNegocio', e.target.value)}
                    placeholder="Ej. Perfect Glass"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 bg-transparent rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Logo Upload / URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Logo del Negocio (Subir o URL)
                </label>

                {/* Dropzone area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-4 ${
                    isDragOver
                      ? 'border-sky-500 bg-sky-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                  }`}
                >
                  {/* Current Logo Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Vista previa logo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        id="btn-upload-logo"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                        Subir a Storage
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('logoUrl', '/icon-192.svg')}
                        className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
                      >
                        Usar Icono App
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PNG, JPG, SVG o WebP (máx. 5MB).
                    </p>
                  </div>
                </div>

                {/* Progress bar if uploading */}
                {uploadProgress !== null && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] font-semibold text-sky-700 mb-1">
                      <span>Subiendo imagen a Firebase Storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-sky-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {uploadError}
                  </p>
                )}

                {/* Manual URL input fallback */}
                <div className="mt-2">
                  <input
                    id="input-config-logourl"
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="O ingresa una URL directa de imagen (https://...)"
                    className="w-full px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-xl bg-slate-50/40 focus:outline-none focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Color Primario */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Color Primario del Tema
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {COLOR_PRESETS.map((color) => {
                    const isSelected = formData.colorPrimario.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => handleChange('colorPrimario', color.hex)}
                        title={color.name}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isSelected ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    id="input-config-color-picker"
                    type="color"
                    value={formData.colorPrimario || '#0284c7'}
                    onChange={(e) => handleChange('colorPrimario', e.target.value)}
                    className="w-10 h-10 p-0.5 rounded-xl border border-slate-200 cursor-pointer bg-white"
                  />
                  <div className="flex-1 relative rounded-xl border border-slate-200">
                    <input
                      id="input-config-color-hex"
                      type="text"
                      value={formData.colorPrimario}
                      onChange={(e) => handleChange('colorPrimario', e.target.value)}
                      placeholder="#0284c7"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-800 uppercase bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Horarios de Atención & Auto-Agendamiento */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  2. Jornada Laboral y Disponibilidad de Turnos
                </h3>
                <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                  {formData.horaInicioJornada || '08:00'} a {formData.horaFinJornada || '18:00'} hs
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Configura los horarios en los que tus clientes pueden reservar turnos en la página pública. El sistema dividirá la jornada en intervalos de tiempo libres automáticamente.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hora Inicio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Hora Inicio de Jornada:
                  </label>
                  <input
                    type="time"
                    id="input-config-hora-inicio"
                    value={formData.horaInicioJornada || '08:00'}
                    onChange={(e) => handleChange('horaInicioJornada', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                  />
                </div>

                {/* Hora Fin */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Hora Fin de Jornada:
                  </label>
                  <input
                    type="time"
                    id="input-config-hora-fin"
                    value={formData.horaFinJornada || '18:00'}
                    onChange={(e) => handleChange('horaFinJornada', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Duración por defecto para nuevos clientes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Duración Turno por Defecto (minutos):
                  </label>
                  <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-config-duracion-default"
                      type="number"
                      min="10"
                      max="240"
                      step="5"
                      value={formData.duracionServicioDefaultMinutos ?? 30}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          duracionServicioDefaultMinutos: Number(e.target.value) || 30,
                        }))
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email para Avisos de Nuevos Turnos:
                  </label>
                  <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-config-email-vidriero"
                      type="email"
                      value={formData.emailVidriero || ''}
                      onChange={(e) => handleChange('emailVidriero', e.target.value)}
                      placeholder="info@perfectglass.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Días Laborables Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Días Hábiles para Agendamiento:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {DIAS_SEMANA.map((dia) => {
                    const isSelected = (formData.diasLaborables || [1, 2, 3, 4, 5, 6]).includes(dia.num);
                    return (
                      <button
                        key={dia.num}
                        type="button"
                        onClick={() => handleToggleDiaLaborable(dia.num)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {dia.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 3: Programa de Fidelidad */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  3. Programa de Fidelidad & Sellos
                </h3>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  {formData.sellosNecesarios || 5} Sellos = 1 Recompensa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sellos Necesarios */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sellos necesarios para la recompensa:
                  </label>
                  <div className="relative rounded-xl border border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <input
                      id="input-config-sellos-necesarios"
                      type="number"
                      min="2"
                      max="30"
                      value={formData.sellosNecesarios ?? 5}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sellosNecesarios: Math.max(1, parseInt(e.target.value) || 5),
                        }))
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Opciones rápidas:</span>
                    {[3, 5, 8, 10].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, sellosNecesarios: s }))}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          formData.sellosNecesarios === s
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {s} sellos
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recompensa Descripción */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Descripción de la Recompensa:
                  </label>
                  <input
                    id="input-config-recompensa-descripcion"
                    type="text"
                    value={formData.recompensaDescripcion || ''}
                    onChange={(e) => handleChange('recompensaDescripcion', e.target.value)}
                    placeholder="Ej. Limpieza de vidrios gratis"
                    className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 border border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                  />

                  <div className="flex flex-wrap gap-1 mt-2">
                    {[
                      'Limpieza de vidrios gratis',
                      '50% OFF en próxima visita',
                      'Limpieza de mampara gratis',
                    ].map((rec) => (
                      <button
                        key={rec}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, recompensaDescripcion: rec }))
                        }
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 font-medium transition-colors"
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 4: Location and Social */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                4. Ubicación y Contacto
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dirección o Zona de Cobertura
                </label>
                <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="input-config-direccion"
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => handleChange('direccion', e.target.value)}
                    placeholder="Ej. Av. Principal 1234, Local 4, Ciudad"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 bg-transparent rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp (con código de país)
                </label>
                <div className="relative rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <input
                    id="input-config-whatsapp"
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    placeholder="Ej. +15554328765"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 bg-transparent rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 5: Solicitud Automática de Reseñas (Google Maps) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  5. Reseñas Automáticas en Google Maps
                </h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    formData.solicitarResenasAuto !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {formData.solicitarResenasAuto !== false ? 'Activado' : 'Desactivado'}
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Envía una invitación automática agradeciendo la visita y pidiendo una reseña de 5 estrellas en Google cada vez que completes un trabajo.
              </p>

              {/* Toggle Switch: Enviar solicitud de reseña automáticamente */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-xs sm:text-sm text-slate-900">
                    Enviar solicitud de reseña automáticamente
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dispara el mensaje de agradecimiento y enlace de reseña al marcar "Visita completada".
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    id="toggle-solicitar-resenas-auto"
                    checked={formData.solicitarResenasAuto !== false}
                    onChange={(e) => handleChange('solicitarResenasAuto', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Link a Google Reviews */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Link Directo para Reseñas en Google Maps:</span>
                  {formData.linkGoogleReviews && (
                    <a
                      href={formData.linkGoogleReviews}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 hover:text-sky-800 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>Probar link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <div className="relative rounded-xl border border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                  </div>
                  <input
                    id="input-config-link-google-reviews"
                    type="url"
                    value={formData.linkGoogleReviews || ''}
                    onChange={(e) => handleChange('linkGoogleReviews', e.target.value)}
                    placeholder="https://g.page/r/.../review o enlace de Google Perfil de Negocio"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-transparent rounded-xl focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Obtén tu link directo desde Google Perfil de Negocio &gt; Solicitar reseñas &gt; Copiar enlace.
                </p>
              </div>

              {/* Límite de Frecuencia (Días Mínimos) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Límite de Frecuencia Antispam (Días mínimos entre solicitudes):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-config-dias-minimos-resenas"
                      type="number"
                      min="7"
                      max="365"
                      value={formData.diasMinimosEntreResenas ?? 90}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          diasMinimosEntreResenas: Math.max(1, parseInt(e.target.value) || 90),
                        }))
                      }
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[30, 60, 90, 180].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, diasMinimosEntreResenas: d }))}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                          formData.diasMinimosEntreResenas === d
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d} días
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Protege al cliente para no saturarlo: no se le volverá a pedir reseña si ya recibió una solicitud dentro de este lapso.
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 6: Notificaciones Push Nativas y Alertas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-600" />
                  6. Notificaciones Push Nativas y Alertas
                </h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    formData.notificacionesPushActivas !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {formData.notificacionesPushActivas !== false ? 'Push Activo' : 'Push Inactivo'}
                </span>
              </div>

              {/* Toggles: Push & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Push Toggle */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-black text-slate-900">Notificaciones Push</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Alertas nativas en celular al agendar o cancelar turnos
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-toggle-push-global"
                    onClick={() =>
                      handleChange('notificacionesPushActivas', formData.notificacionesPushActivas === false)
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.notificacionesPushActivas !== false ? 'bg-sky-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formData.notificacionesPushActivas !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Email Toggle */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-black text-slate-900">Emails Automáticos</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Confirmación y recordatorios enviados por correo
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-toggle-email-global"
                    onClick={() =>
                      handleChange('emailsActivos', formData.emailsActivos === false)
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.emailsActivos !== false ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formData.emailsActivos !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Rango de Silencio Nocturno */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-black text-slate-900">
                    Horario de Silencio para Push (Descanso)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  No se emitirán alertas push a tu celular durante este rango para no molestar fuera de tu jornada laboral.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Silenciar desde:
                    </label>
                    <input
                      type="time"
                      id="input-push-silencio-inicio"
                      value={formData.pushSilencioInicio || '20:00'}
                      onChange={(e) => handleChange('pushSilencioInicio', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 bg-white rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Hasta las:
                    </label>
                    <input
                      type="time"
                      id="input-push-silencio-fin"
                      value={formData.pushSilencioFin || '08:00'}
                      onChange={(e) => handleChange('pushSilencioFin', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 bg-white rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Estado del Dispositivo Actual & Botón de Prueba */}
              <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Estado en este navegador / celular:
                    </span>
                    {devicePermission === 'granted' ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> Habilitado
                      </span>
                    ) : devicePermission === 'denied' ? (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Bloqueado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {devicePermission === 'granted'
                      ? 'Tu dispositivo está listo para recibir alertas sonoras y visuales.'
                      : devicePermission === 'denied'
                      ? 'Has bloqueado las notificaciones en el navegador. Haz clic en el candado de la URL para desbloquearlas.'
                      : 'Activa los permisos para recibir avisos directamente en la pantalla de bloqueo.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {devicePermission !== 'granted' ? (
                    <button
                      type="button"
                      id="btn-enable-push-device"
                      disabled={isActivatingPush || devicePermission === 'denied'}
                      onClick={handleEnableDevicePush}
                      className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{isActivatingPush ? 'Activando...' : 'Activar en este dispositivo'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-test-push-notification"
                      onClick={handleSendTestNotification}
                      className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5 text-sky-600" />
                      <span>Enviar Alerta de Prueba</span>
                    </button>
                  )}
                </div>
              </div>

              {testNotificationStatus && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>{testNotificationStatus}</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-save-config"
                disabled={isSaving}
                className="w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando en Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Real-time Visual Preview Card & Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Mobile App Header Preview */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-600" />
                Vista Previa de Marca
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Tiempo Real
              </span>
            </div>

            {/* Mock Header Display */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs bg-slate-50">
              <div className="bg-white p-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center border"
                    style={{ borderColor: `${primaryColor}40` }}
                  >
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Sparkles className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {formData.nombreNegocio || 'Nombre del Negocio'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formData.direccion || 'Dirección de atención'}
                    </p>
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  Admin
                </span>
              </div>

              {/* Mock Content inside preview */}
              <div className="p-4 space-y-2 text-xs bg-slate-50/70">
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">Auto-agendamiento</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-semibold rounded">
                      Disponible
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Horario: {formData.horaInicioJornada || '08:00'} - {formData.horaFinJornada || '18:00'} hs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access to Financial Reports */}
          {onNavigateToTab && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-sm space-y-4 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Reportes de Ingresos
                  </h3>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Admin
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Visualiza el balance del mes actual, el gráfico de barras de los últimos 6 meses y el ranking Top 10 de clientes.
              </p>

              <button
                type="button"
                id="btn-goto-reportes"
                onClick={() => onNavigateToTab('reportes')}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Abrir Panel de Reportes</span>
              </button>
            </div>
          )}

          {/* Google Reviews Live Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Reseñas de Google Maps
                </h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formData.solicitarResenasAuto !== false
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {formData.solicitarResenasAuto !== false ? 'Activo' : 'Pausado'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cada visita completada generará una solicitud con enlace directo a tu ficha de Google.
            </p>

            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/70 text-[11px] space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span>Frecuencia Antispam:</span>
                <span>Cada {formData.diasMinimosEntreResenas || 90} días</span>
              </div>
              <p className="text-[10px] text-amber-800 truncate font-mono">
                {formData.linkGoogleReviews || 'Sin link configurado'}
              </p>
            </div>
          </div>

          {/* Email Notification Simulator Logs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Notificaciones por Email
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleRefreshEmailLogs}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  title="Actualizar registro de correos"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {emailLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearEmailLogs}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50"
                    title="Vaciar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Registro en tiempo real de correos despachados al confirmar o cancelar turnos (al cliente y al vidriero).
            </p>

            {emailLogs.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
                <Inbox className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Aún no se han despachado correos
                </p>
                <p className="text-[10px] text-slate-400">
                  Haz una reserva de prueba en el link público para ver la notificación aquí
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {emailLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="p-3 rounded-2xl border border-slate-200/80 hover:border-sky-300 bg-slate-50 hover:bg-white transition-all cursor-pointer space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-slate-800 truncate max-w-[170px]">
                        Para: {log.to}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-700 font-bold truncate">
                      {log.subject}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Firebase Database & Cloud Info Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-500" />
                Base de Datos Firestore
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Conectado
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-1">
                <p className="text-[11px] text-slate-400 font-medium">Colecciones Sincronizadas</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700 text-[10px]">
                    clientes
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 font-bold text-sky-800 text-[10px]">
                    turnos (online)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700 text-[10px]">
                    configuracion
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: View Full Email Details */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-sky-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Detalle del Correo Enviado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>De:</strong> {selectedLog.from}</p>
              <p><strong>Para:</strong> {selectedLog.to}</p>
              <p><strong>Asunto:</strong> {selectedLog.subject}</p>
              <p><strong>Fecha:</strong> {new Date(selectedLog.sentAt).toLocaleString()}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs whitespace-pre-wrap font-sans text-slate-800 max-h-64 overflow-y-auto leading-relaxed">
              {selectedLog.body}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
