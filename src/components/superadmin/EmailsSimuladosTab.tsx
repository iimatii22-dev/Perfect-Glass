import React, { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  Trash2,
  Eye,
  X,
  Filter,
  RefreshCw,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  subscribeEmailsSimulados,
  eliminarEmailSimulado,
  limpiarEmailsSimulados,
} from '../../lib/sandboxService';
import { EmailSimulado } from '../../types';
import { formatearFecha } from '../../utils/dateUtils';

interface EmailsSimuladosTabProps {
  onGoToDemo?: () => void;
}

export function EmailsSimuladosTab({ onGoToDemo }: EmailsSimuladosTabProps) {
  const [emails, setEmails] = useState<EmailSimulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('todos');
  const [selectedEmail, setSelectedEmail] = useState<EmailSimulado | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeEmailsSimulados((list) => {
      setEmails(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleEliminar = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('¿Eliminar este email simulado?')) return;
    try {
      setIsDeleting(id);
      await eliminarEmailSimulado(id);
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.warn('Error al eliminar email:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLimpiarTodo = async () => {
    if (emails.length === 0) return;
    if (!window.confirm(`¿Estás seguro de vaciar los ${emails.length} emails simulados?`)) return;
    try {
      setIsClearingAll(true);
      await limpiarEmailsSimulados();
      setSelectedEmail(null);
    } catch (err) {
      console.warn('Error al vaciar emails simulados:', err);
    } finally {
      setIsClearingAll(false);
    }
  };

  const filteredEmails = emails.filter((item) => {
    const matchesTipo = selectedTipo === 'todos' || item.tipoDeEmail === selectedTipo;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesTipo;

    const matchesSearch =
      (item.destinatario || '').toLowerCase().includes(term) ||
      (item.asunto || '').toLowerCase().includes(term) ||
      (item.cuerpo || '').toLowerCase().includes(term) ||
      (item.tipoDeEmail || '').toLowerCase().includes(term);

    return matchesTipo && matchesSearch;
  });

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'confirmacion_cliente':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
            Confirmación Turno (Cliente)
          </span>
        );
      case 'aviso_vidriero':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
            Aviso Nuevo Turno (Vidriero)
          </span>
        );
      case 'cancelacion_cliente':
      case 'cancelacion_vidriero':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
            Cancelación Turno
          </span>
        );
      case 'solicitud_resena':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
            Solicitud Reseña
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
            {tipo || 'Simulado'}
          </span>
        );
    }
  };

  return (
    <div id="section-emails-simulados" className="space-y-6">
      {/* Top Header info */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              AUDITORÍA DE COMUNICACIONES
            </span>
            <span className="text-xs font-bold text-slate-500">
              {emails.length} capturados
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Bandeja de Emails Simulados
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
            Inspecciona el asunto, texto y diseño exacto de los correos automáticos generados en Modo Sandbox antes de activar los envíos reales a los clientes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onGoToDemo && (
            <button
              id="btn-open-demo-from-emails"
              onClick={onGoToDemo}
              className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
              <span>Consola Demo (/demo)</span>
            </button>
          )}

          <button
            id="btn-limpiar-todos-emails"
            onClick={handleLimpiarTodo}
            disabled={emails.length === 0 || isClearingAll}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 border ${
              emails.length === 0
                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
            }`}
          >
            {isClearingAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Vaciar Bandeja</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-emails"
            type="text"
            placeholder="Buscar por destinatario, asunto o palabras del cuerpo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            id="select-tipo-email"
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            <option value="todos">Todos los tipos ({emails.length})</option>
            <option value="confirmacion_cliente">Confirmación de Turno (Cliente)</option>
            <option value="aviso_vidriero">Aviso Nuevo Turno (Vidriero)</option>
            <option value="cancelacion_cliente">Cancelación (Cliente)</option>
            <option value="cancelacion_vidriero">Cancelación (Vidriero)</option>
            <option value="solicitud_resena">Solicitud de Reseña</option>
          </select>
        </div>
      </div>

      {/* Emails List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
          <p className="text-sm font-bold">Cargando emails simulados...</p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">
            {emails.length === 0
              ? 'No hay ningún email simulado registrado aún'
              : 'No se encontraron emails con los filtros aplicados'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {emails.length === 0
              ? 'Activa el Modo Sandbox y genera un turno o visita de prueba desde la Consola Demo (/demo) para ver aquí la simulación de correos sin spamear clientes reales.'
              : 'Prueba cambiar los términos de búsqueda o limpiar el filtro de tipo de email.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEmails.map((mail) => (
            <div
              key={mail.id}
              onClick={() => setSelectedEmail(mail)}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTipoBadge(mail.tipoDeEmail)}
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatearFecha(mail.fecha ? mail.fecha.split('T')[0] : undefined)} a las{' '}
                    {mail.fecha ? new Date(mail.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base line-clamp-1">
                    {mail.asunto}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                    <span className="font-bold text-slate-400">Para:</span>
                    <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-semibold truncate max-w-xs">
                      {mail.destinatario}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  {mail.cuerpo}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  id={`btn-view-mail-${mail.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmail(mail);
                  }}
                  className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ver Mensaje</span>
                </button>

                <button
                  id={`btn-delete-mail-${mail.id}`}
                  onClick={(e) => mail.id && handleEliminar(mail.id, e)}
                  disabled={isDeleting === mail.id}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors"
                  title="Eliminar registro simulado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Full Email Inspector */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Vista Detallada del Email Simulado
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Capturado en Modo Sandbox para validación previa
                  </div>
                </div>
              </div>

              <button
                id="btn-close-email-modal"
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-800">
              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="font-bold text-slate-400 block mb-0.5">Destinatario:</span>
                  <span className="font-mono font-semibold text-slate-900 break-all">
                    {selectedEmail.destinatario}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 block mb-0.5">Tipo de Evento:</span>
                  <div>{getTipoBadge(selectedEmail.tipoDeEmail)}</div>
                </div>

                <div className="sm:col-span-2">
                  <span className="font-bold text-slate-400 block mb-0.5">Asunto:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedEmail.asunto}
                  </span>
                </div>

                <div className="sm:col-span-2 text-slate-500 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Simulado el {selectedEmail.fecha ? new Date(selectedEmail.fecha).toLocaleString() : 'Recientemente'}
                  </span>
                </div>
              </div>

              {/* Message Content View */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Cuerpo del Mensaje:
                </h4>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 font-sans text-sm leading-relaxed whitespace-pre-line text-slate-800 shadow-inner">
                  {selectedEmail.cuerpo}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                id="btn-modal-delete-mail"
                onClick={() => selectedEmail.id && handleEliminar(selectedEmail.id)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Email</span>
              </button>

              <button
                id="btn-modal-close-button"
                onClick={() => setSelectedEmail(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
