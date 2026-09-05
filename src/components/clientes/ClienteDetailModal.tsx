import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Layers,
  FileText,
  Camera,
  CheckCircle2,
  Edit2,
  Trash2,
  History,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Upload,
  Sparkles,
  ArrowRight,
  Gift,
  Star,
  Award,
  Check,
} from 'lucide-react';
import { Cliente, VisitaRegistro, Resena } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { calcularDiasRestantes, formatearFecha } from '../../utils/dateUtils';
import { uploadClienteFoto, canjearRecompensa } from '../../lib/clientesService';
import { obtenerUltimaResenaCliente } from '../../lib/resenasService';
import { ResenaPromptModal } from './ResenaPromptModal';

interface ClienteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onEdit: (cliente: Cliente) => void;
  onDelete: (clienteId: string) => Promise<void>;
  onMarcarVisita: (cliente: Cliente) => void;
  onUpdatePhotos: (clienteId: string, fotos: { fotoAntes?: string; fotoDespues?: string }) => Promise<void>;
}

export function ClienteDetailModal({
  isOpen,
  onClose,
  cliente,
  onEdit,
  onDelete,
  onMarcarVisita,
  onUpdatePhotos,
}: ClienteDetailModalProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [activeTab, setActiveTab] = useState<'ficha' | 'historial'>('ficha');
  const [uploadingAntes, setUploadingAntes] = useState(false);
  const [uploadingDespues, setUploadingDespues] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [canjeando, setCanjeando] = useState(false);
  const [canjeExitoso, setCanjeExitoso] = useState(false);
  const [showResenaModal, setShowResenaModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [resenaCliente, setResenaCliente] = useState<Resena | null>(null);
  const [loadingResena, setLoadingResena] = useState(false);

  React.useEffect(() => {
    if (!cliente?.id || !isOpen) {
      setResenaCliente(null);
      return;
    }
    let isMounted = true;
    setLoadingResena(true);
    obtenerUltimaResenaCliente(cliente.id)
      .then((res) => {
        if (isMounted) setResenaCliente(res);
      })
      .catch((e) => console.warn('Error fetching client review:', e))
      .finally(() => {
        if (isMounted) setLoadingResena(false);
      });
    return () => {
      isMounted = false;
    };
  }, [cliente?.id, cliente?.ultimaResenaEnviada, isOpen]);

  if (!isOpen || !cliente) return null;

  const estadoVisita = calcularDiasRestantes(cliente.fechaProximaVisita);
  const isVencida = estadoVisita.estado === 'vencida';
  const isHoy = estadoVisita.estado === 'hoy';

  const sellosAcumulados = cliente.sellosAcumulados ?? 0;
  const sellosNecesarios = cliente.sellosNecesarios || config.sellosNecesarios || 5;
  const recompensaDescripcion = cliente.recompensaDescripcion || config.recompensaDescripcion || 'Limpieza de vidrios gratis';
  const recompensaDisponible = Boolean(cliente.recompensaDisponible);
  const porcentajeProgreso = Math.min(100, Math.round((sellosAcumulados / sellosNecesarios) * 100));

  const cleanPhone = cliente.telefono.replace(/[^0-9+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
    `Hola ${cliente.nombre}, te contactamos de ${config.nombreNegocio || 'Perfect Glass'} para coordinar la limpieza de tus vidrios.`
  )}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${cliente.direccion}, ${cliente.zona || ''}`
  )}`;

  const handleCanjear = async () => {
    if (!cliente.recompensaDisponible) return;
    setCanjeando(true);
    try {
      await canjearRecompensa(cliente.id);
      setCanjeExitoso(true);
      setTimeout(() => setCanjeExitoso(false), 4000);
    } catch (err) {
      console.error('Error al canjear recompensa:', err);
    } finally {
      setCanjeando(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'antes' | 'despues'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'antes') setUploadingAntes(true);
    else setUploadingDespues(true);

    try {
      const url = await uploadClienteFoto(file, cliente.id, tipo);
      if (tipo === 'antes') {
        await onUpdatePhotos(cliente.id, { fotoAntes: url });
      } else {
        await onUpdatePhotos(cliente.id, { fotoDespues: url });
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      if (tipo === 'antes') setUploadingAntes(false);
      else setUploadingDespues(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(cliente.id);
      onClose();
    } catch (err) {
      console.error('Error deleting client:', err);
    } finally {
      setDeleting(false);
    }
  };

  const historial = cliente.historialVisitas || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-slate-900 text-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs border font-bold ${
                  isVencida
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isHoy
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {estadoVisita.etiqueta}
              </span>

              {recompensaDisponible && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs animate-pulse">
                  <Gift className="w-3.5 h-3.5" />
                  ¡Recompensa Lista!
                </span>
              )}

              {!cliente.activo && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Inactivo
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold truncate text-white">
              {cliente.nombre}
            </h2>

            <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{cliente.direccion}</span>
              {cliente.zona && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-800 font-semibold text-[10px] text-slate-300">
                  {cliente.zona}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              id="btn-edit-cliente-from-detail"
              onClick={() => onEdit(cliente)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              title="Editar ficha"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </button>

            <button
              type="button"
              id="btn-close-cliente-detail"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Mobile Action Bar (Call, WhatsApp, Maps & Complete Visit) */}
        <div className="bg-slate-800/90 border-b border-slate-700/60 p-3 sm:px-6 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${cleanPhone}`}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>Llamar</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>GPS / Mapa</span>
            </a>

            <button
              type="button"
              id="btn-pedir-resena-detail"
              onClick={() => setShowResenaModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Enviar solicitud de reseña de Google"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Pedir Reseña</span>
            </button>
          </div>

          <button
            type="button"
            id="btn-marcar-visita-from-detail"
            onClick={() => onMarcarVisita(cliente)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>Marcar Visita Completada</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ficha')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ficha'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ficha & Detalles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'historial'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial de Visitas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {historial.length}
            </span>
          </button>
        </div>

        {/* Content Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm">
          {activeTab === 'ficha' ? (
            <>
              {/* REWARD AVAILABLE PROMINENT NOTIFICATION BANNER */}
              {recompensaDisponible && (
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 shadow-lg border border-amber-300 space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/90 text-amber-600 flex items-center justify-center shadow-md shrink-0">
                        <Gift className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 bg-slate-950 text-amber-400 rounded-full">
                            ¡Meta Alcanzada!
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-950 mt-0.5">
                          ¡Recompensa disponible!
                        </h3>
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          {recompensaDescripcion}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-950/10 flex-wrap">
                    <p className="text-[11px] font-medium text-slate-900">
                      El cliente completó los <strong>{sellosNecesarios} sellos</strong> requeridos.
                    </p>
                    <button
                      type="button"
                      id="btn-canjear-recompensa"
                      onClick={handleCanjear}
                      disabled={canjeando}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-400 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 ml-auto"
                    >
                      {canjeando ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                          <span>Canjeando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-amber-400" />
                          <span>Canjear Recompensa</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Redemption success alert */}
              {canjeExitoso && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">¡Recompensa canjeada con éxito!</p>
                    <p className="text-[11px] text-emerald-700">
                      Se ha registrado el canje en el historial y el cliente puede comenzar a sumar sellos para su próxima meta.
                    </p>
                  </div>
                </div>
              )}

              {/* FIDELITY STAMP CARD COMPONENT */}
              <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Tarjeta de Sellos de Fidelidad</h4>
                      <p className="text-[11px] text-slate-400">
                        {recompensaDisponible
                          ? 'Recompensa lista para aplicar'
                          : `Suma 1 sello por cada visita completada`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-800 text-amber-400 border border-amber-400/20">
                      {sellosAcumulados} / {sellosNecesarios} Sellos
                    </span>
                    {(cliente.totalRecompensasCanjeadas ?? 0) > 0 && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {cliente.totalRecompensasCanjeadas} canjeados
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Stamp Row */}
                <div className="grid grid-cols-5 gap-2 sm:gap-3 py-1">
                  {Array.from({ length: sellosNecesarios }).map((_, idx) => {
                    const isCompleted = idx < sellosAcumulados;
                    const isNext = idx === sellosAcumulados;

                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative ${
                          isCompleted
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                            : isNext
                            ? 'bg-slate-800/90 border-2 border-dashed border-amber-400/60 text-amber-300/80 animate-pulse'
                            : 'bg-slate-800/40 border border-slate-700 text-slate-600'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 text-slate-950" />
                            <span className="text-[10px] font-black uppercase tracking-tight">
                              #{idx + 1}
                            </span>
                          </>
                        ) : isNext ? (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-[9px] font-bold text-amber-300">Próximo</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-bold opacity-40">#{idx + 1}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar & Reward Explanation */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeProgreso}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {recompensaDisponible
                        ? '¡Recompensa desbloqueada!'
                        : `Faltan ${Math.max(0, sellosNecesarios - sellosAcumulados)} sellos para la recompensa`}
                    </span>
                    <span className="text-amber-400 font-semibold truncate max-w-[200px]">
                      Premio: {recompensaDescripcion}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Frecuencia
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Cada {cliente.frecuenciaVisitaDias || 30} días
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Duración: {cliente.duracionServicioMinutos || 30} min
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Última Visita
                  </span>
                  <p className="font-bold text-slate-800 text-sm">
                    {formatearFecha(cliente.fechaUltimaVisita)}
                  </p>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border space-y-1 col-span-2 sm:col-span-1 ${
                    isVencida
                      ? 'bg-rose-50 border-rose-200'
                      : isHoy
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-sky-50 border-sky-100'
                  }`}
                >
                  <span
                    className={`text-[11px] font-semibold block ${
                      isVencida ? 'text-rose-600' : isHoy ? 'text-amber-700' : 'text-sky-700'
                    }`}
                  >
                    Próxima Visita
                  </span>
                  <p
                    className={`font-extrabold text-sm ${
                      isVencida ? 'text-rose-900' : isHoy ? 'text-amber-950' : 'text-sky-950'
                    }`}
                  >
                    {formatearFecha(cliente.fechaProximaVisita)}
                  </p>
                </div>
              </div>

              {/* Surface & Location Details */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Tipo de Superficie
                    </span>
                    <p className="font-bold text-slate-800 text-sm">
                      {cliente.tipoSuperficie || 'No especificada'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700">
                    {cliente.zona || 'Sin zona'}
                  </span>
                </div>

                {cliente.notas && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                      <FileText className="w-3 h-3" />
                      Notas Operativas & Instrucciones
                    </span>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                      {cliente.notas}
                    </p>
                  </div>
                )}
              </div>

              {/* REPUTATION & REVIEW HISTORY CARD */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    Estado de Reseña & Satisfacción
                  </span>
                  {resenaCliente && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {formatearFecha(resenaCliente.fecha ? resenaCliente.fecha.split('T')[0] : undefined)}
                    </span>
                  )}
                </div>

                {loadingResena ? (
                  <p className="text-xs text-slate-400 py-1">Cargando estado de reseña...</p>
                ) : resenaCliente ? (
                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= resenaCliente.calificacion ? 'fill-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-extrabold text-slate-900 text-xs">
                          {resenaCliente.calificacion} de 5 estrellas
                        </span>
                      </div>

                      {resenaCliente.calificacion >= 4 ? (
                        resenaCliente.derivadoAGoogle ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ✓ En Google Maps
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 self-start sm:self-auto">
                            <Clock className="w-3 h-3 text-sky-600" />
                            ⏳ Sin derivar a Google
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 self-start sm:self-auto">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Feedback interno (1-3 ★)
                        </span>
                      )}
                    </div>

                    {/* Comentario de mejora o satisfacción */}
                    {resenaCliente.comentario && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
                        <span className="font-bold text-slate-900 block mb-0.5 text-[11px]">
                          Comentario del cliente:
                        </span>
                        "{resenaCliente.comentario}"
                      </div>
                    )}

                    {/* Acciones contextuales */}
                    {resenaCliente.calificacion <= 3 && cliente.telefono && (
                      <button
                        type="button"
                        onClick={() => {
                          const rawTel = cliente.telefono.replace(/[^0-9]/g, '');
                          const url = `https://wa.me/${rawTel}?text=${encodeURIComponent(
                            `Hola ${cliente.nombre}, vimos tu observación sobre el servicio. Queremos conversar contigo para resolverlo inmediatamente.`
                          )}`;
                          window.open(url, '_blank');
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Contactar por WhatsApp para solucionar</span>
                      </button>
                    )}

                    {resenaCliente.calificacion >= 4 && !resenaCliente.derivadoAGoogle && cliente.telefono && (
                      <button
                        type="button"
                        onClick={() => {
                          const rawTel = cliente.telefono.replace(/[^0-9]/g, '');
                          const gLink = config.linkGoogleReviews?.trim() || 'https://maps.google.com';
                          const url = `https://wa.me/${rawTel}?text=${encodeURIComponent(
                            `¡Hola ${cliente.nombre}! Muchas gracias por tu calificación de ${resenaCliente.calificacion} estrellas ⭐. ¿Nos regalas 1 minuto para dejarnos tu reseña en Google Maps? ${gLink}`
                          )}`;
                          window.open(url, '_blank');
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Enviar link de Google Maps por WhatsApp</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Aún no ha dejado reseña</p>
                      <p className="text-[11px] text-slate-400">
                        {cliente.ultimaResenaEnviada
                          ? `Último registro: ${formatearFecha(cliente.ultimaResenaEnviada)}`
                          : 'Este cliente no tiene calificaciones registradas.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowResenaModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>Pedir Reseña</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Photos Antes & Después Gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-600" />
                    Fotos Antes y Después del Servicio
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Toca una foto para ampliarla
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Foto Antes */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
                    <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Foto Antes</span>
                      <label className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-1">
                        {uploadingAntes ? (
                          <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            <span>{cliente.fotoAntes ? 'Cambiar' : 'Subir'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'antes')}
                        />
                      </label>
                    </div>

                    <div className="aspect-video relative bg-slate-900 flex items-center justify-center overflow-hidden">
                      {cliente.fotoAntes ? (
                        <img
                          src={cliente.fotoAntes}
                          alt="Antes"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            setPreviewImage({ url: cliente.fotoAntes!, title: 'Foto Antes' })
                          }
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-400">
                          <Camera className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <p className="text-[11px]">Sin foto registrada</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Foto Después */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
                    <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Foto Después</span>
                      <label className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-1">
                        {uploadingDespues ? (
                          <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            <span>{cliente.fotoDespues ? 'Cambiar' : 'Subir'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'despues')}
                        />
                      </label>
                    </div>

                    <div className="aspect-video relative bg-slate-900 flex items-center justify-center overflow-hidden">
                      {cliente.fotoDespues ? (
                        <img
                          src={cliente.fotoDespues}
                          alt="Después"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            setPreviewImage({ url: cliente.fotoDespues!, title: 'Foto Después' })
                          }
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-400">
                          <Camera className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <p className="text-[11px]">Sin foto registrada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone: Delete Client */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar cliente de la base</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-rose-700">
                      ¿Seguro que deseas eliminar?
                    </span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                    >
                      {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Historial Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Registro Histórico de Visitas ({historial.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onMarcarVisita(cliente)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>+ Agregar Visita</span>
                </button>
              </div>

              {historial.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <History className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-700 text-xs">
                    Sin visitas registradas todavía
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Cuando marques una visita como completada, se guardará aquí la fecha, notas y fotos tomadas.
                  </p>
                  <button
                    type="button"
                    onClick={() => onMarcarVisita(cliente)}
                    className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Marcar Primera Visita</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((visita: VisitaRegistro, idx: number) => (
                    <div
                      key={visita.id || idx}
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 transition-all hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            ✓
                          </span>
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">
                            {formatearFecha(visita.fecha)}
                          </span>
                        </div>
                        {visita.completadoPor && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Por: {visita.completadoPor}
                          </span>
                        )}
                      </div>

                      {visita.notas && (
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60">
                          {visita.notas}
                        </p>
                      )}

                      {/* Attached photos in this visit */}
                      {(visita.fotoAntes || visita.fotoDespues) && (
                        <div className="flex gap-2 pt-1">
                          {visita.fotoAntes && (
                            <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer">
                              <img
                                src={visita.fotoAntes}
                                alt="Antes"
                                className="w-full h-full object-cover"
                                onClick={() =>
                                  setPreviewImage({
                                    url: visita.fotoAntes!,
                                    title: `Visita ${formatearFecha(visita.fecha)} - Antes`,
                                  })
                                }
                              />
                            </div>
                          )}
                          {visita.fotoDespues && (
                            <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer">
                              <img
                                src={visita.fotoDespues}
                                alt="Después"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-white pb-3">
              <span className="font-bold text-sm">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Manual Review Request Modal */}
      {showResenaModal && (
        <ResenaPromptModal
          isOpen={showResenaModal}
          onClose={() => setShowResenaModal(false)}
          cliente={cliente}
          config={config}
        />
      )}
    </div>
  );
}
