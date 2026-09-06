import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckCircle2,
  Sparkles,
  Star,
  ExternalLink,
  Clock,
  X,
} from 'lucide-react';
import {
  NotificacionInterna,
  TipoNotificacion,
} from '../../types';
import {
  subscribeToNotificaciones,
  marcarNotificacionComoLeida,
  marcarTodasComoLeidas,
} from '../../lib/notificacionesService';

interface NotificacionesBellProps {
  usuarioUid?: string | null;
  onNavegarATurno?: (turnoId: string, notif: NotificacionInterna) => void;
  className?: string;
}

export function formatearFechaRelativa(creadaEn: any): string {
  if (!creadaEn) return 'Hace unos instantes';
  let date: Date;

  if (creadaEn && typeof creadaEn.toDate === 'function') {
    date = creadaEn.toDate();
  } else if (creadaEn instanceof Date) {
    date = creadaEn;
  } else {
    date = new Date(creadaEn);
  }

  if (isNaN(date.getTime())) return 'Hace unos instantes';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Hace unos instantes';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function getTipoIcon(tipo: TipoNotificacion) {
  switch (tipo) {
    case 'reserva_creada':
      return (
        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
      );
    case 'reserva_confirmada':
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    case 'trabajo_completado':
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
      );
    case 'reseña_solicitada':
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Star className="w-4 h-4" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" />
        </div>
      );
  }
}

export function NotificacionesBell({
  usuarioUid,
  onNavegarATurno,
  className = '',
}: NotificacionesBellProps) {
  const [notificaciones, setNotificaciones] = useState<NotificacionInterna[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to internal notifications in real time
  useEffect(() => {
    if (!usuarioUid) {
      setNotificaciones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToNotificaciones(usuarioUid, (list) => {
      setNotificaciones(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [usuarioUid]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const noLeidasCount = notificaciones.filter((n) => !n.leida).length;

  const handleMarcarTodas = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!usuarioUid) return;
    await marcarTodasComoLeidas(usuarioUid);
  };

  const handleItemClick = async (notif: NotificacionInterna) => {
    if (!notif.leida) {
      await marcarNotificacionComoLeida(notif.id);
    }
    setIsOpen(false);

    if (notif.turnoId && onNavegarATurno) {
      onNavegarATurno(notif.turnoId, notif);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="btn-campana-notificaciones"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {noLeidasCount > 0 && (
          <span
            id="badge-notificaciones-contador"
            className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-600 rounded-full ring-2 ring-white shadow-xs animate-in zoom-in-75 duration-150"
          >
            {noLeidasCount > 99 ? '99+' : noLeidasCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="panel-notificaciones-listado"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                Notificaciones
              </span>
              {noLeidasCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  {noLeidasCount} nuevas
                </span>
              )}
            </div>

            {noLeidasCount > 0 && (
              <button
                type="button"
                id="btn-marcar-todas-leidas"
                onClick={handleMarcarTodas}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar todas como leídas</span>
              </button>
            )}
          </div>

          {/* Body: Notifications List */}
          <div className="overflow-y-auto divide-y divide-slate-100 max-h-[380px]">
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Cargando notificaciones...
              </div>
            ) : notificaciones.length === 0 ? (
              <div
                id="empty-notificaciones"
                className="py-12 px-4 text-center space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  No tenés notificaciones todavía
                </p>
                <p className="text-[11px] text-slate-400">
                  Acá vas a ver las confirmaciones de turnos, recordatorios y actualizaciones del servicio.
                </p>
              </div>
            ) : (
              notificaciones.map((notif) => {
                const icon = getTipoIcon(notif.tipo);
                const fechaRelativa = formatearFechaRelativa(notif.creadaEn);

                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleItemClick(notif)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors hover:bg-slate-50 focus:outline-none focus:bg-slate-50 ${
                      !notif.leida ? 'bg-sky-50/40' : 'bg-white'
                    }`}
                  >
                    {icon}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs truncate ${
                            !notif.leida
                              ? 'font-extrabold text-slate-900'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.titulo}
                        </p>
                        {!notif.leida && (
                          <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                        {notif.mensaje}
                      </p>

                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{fechaRelativa}</span>
                        </span>

                        {notif.turnoId && (
                          <span className="text-sky-600 font-bold flex items-center gap-0.5">
                            <span>Ver turno</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer (if > 0) */}
          {notificaciones.length > 0 && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
              <span className="text-[10px] text-slate-400 font-medium">
                Mostrando las {notificaciones.length} notificaciones más recientes
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
