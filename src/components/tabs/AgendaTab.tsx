import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  CloudRain,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Sparkles,
  MapPin,
  RefreshCw,
  Search,
  Globe,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { Cliente, Turno } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToClientes,
  reprogramarClientesFechaBatch,
  marcarVisitaCompletada,
  updateCliente,
  deleteCliente,
} from '../../lib/clientesService';
import {
  subscribeToTurnos,
  confirmarTurno,
  completarTurno,
  cancelTurno,
} from '../../lib/turnosService';
import { getTodayISODate, calcularDiasRestantes, getCategoriaFecha } from '../../utils/dateUtils';
import { AgendaCalendarView } from '../agenda/AgendaCalendarView';
import { AgendaListView } from '../agenda/AgendaListView';
import { ReprogramarMalTiempoModal } from '../agenda/ReprogramarMalTiempoModal';
import { ClienteDetailModal } from '../clientes/ClienteDetailModal';
import { MarcarVisitaModal } from '../clientes/MarcarVisitaModal';
import { ClienteFormModal } from '../clientes/ClienteFormModal';
import { NuevoTurnoManualModal } from '../agenda/NuevoTurnoManualModal';

export function AgendaTab() {
  const { config, currentNegocioId } = useConfig();
  const { user } = useAuth();
  const primaryColor = config.colorPrimario || '#0284c7';
  const todayStr = getTodayISODate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendario' | 'lista'>('calendario');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modals state
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [visitaModalCliente, setVisitaModalCliente] = useState<Cliente | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isNuevoTurnoModalOpen, setIsNuevoTurnoModalOpen] = useState(false);

  // Weather reschedule modal state
  const [reprogramarModal, setReprogramarModal] = useState<{
    isOpen: boolean;
    fechaOrigen: string;
    clientes: Cliente[];
  }>({
    isOpen: false,
    fechaOrigen: todayStr,
    clientes: [],
  });

  // Cancel Turno Confirmation Modal
  const [cancelarTurnoModal, setCancelarTurnoModal] = useState<{
    isOpen: boolean;
    turno: Turno | null;
    motivo: string;
    isCancelling: boolean;
  }>({
    isOpen: false,
    turno: null,
    motivo: '',
    isCancelling: false,
  });

  // Feedback notification
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Subscribe to real-time clients collection in Firestore
  useEffect(() => {
    const unsubClientes = subscribeToClientes((list) => {
      setClientes(list);
      setLoading(false);

      if (selectedCliente) {
        const updated = list.find((c) => c.id === selectedCliente.id);
        if (updated) setSelectedCliente(updated);
      }
    }, currentNegocioId);

    const unsubTurnos = subscribeToTurnos((list) => {
      setTurnos(list);
    }, currentNegocioId);

    return () => {
      unsubClientes();
      unsubTurnos();
    };
  }, [selectedCliente?.id, currentNegocioId]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // KPIs / Statistics combining recurring clients and online turnos
  const stats = useMemo(() => {
    let hoyVisitas = 0;
    let hoyTurnos = 0;
    let proximos3dias = 0;
    let estaSemana = 0;
    let vencidos = 0;

    clientes.forEach((c) => {
      if (!c.activo || !c.fechaProximaVisita) return;
      const estado = calcularDiasRestantes(c.fechaProximaVisita);

      if (estado.dias < 0) vencidos++;
      if (c.fechaProximaVisita === todayStr) hoyVisitas++;
      if (estado.dias >= 0 && estado.dias <= 3) proximos3dias++;
      if (estado.dias >= 0 && estado.dias <= 7) estaSemana++;
    });

    turnos.forEach((t) => {
      if (t.estado === 'cancelado') return;
      const estado = calcularDiasRestantes(t.fecha);
      if (t.fecha === todayStr) hoyTurnos++;
      if (estado.dias >= 0 && estado.dias <= 3) proximos3dias++;
      if (estado.dias >= 0 && estado.dias <= 7) estaSemana++;
    });

    return {
      hoy: hoyVisitas + hoyTurnos,
      hoyVisitas,
      hoyTurnos,
      proximos3dias,
      estaSemana,
      vencidos,
      totalClientes: clientes.length,
      totalTurnos: turnos.filter((t) => t.estado === 'confirmado').length,
    };
  }, [clientes, turnos, todayStr]);

  // Handle batch rescheduling for bad weather
  const handleOpenReprogramar = (fecha: string, clientesAfectados: Cliente[]) => {
    setReprogramarModal({
      isOpen: true,
      fechaOrigen: fecha,
      clientes: clientesAfectados,
    });
  };

  const handleConfirmReprogramacion = async (
    clienteIds: string[],
    nuevaFecha: string
  ) => {
    try {
      await reprogramarClientesFechaBatch(
        clienteIds,
        nuevaFecha,
        'Reprogramación por mal tiempo (lluvia/viento)',
        user?.uid
      );
      setSelectedDate(nuevaFecha);
      showNotification(
        'success',
        `Se reprogramaron ${clienteIds.length} visita(s) para el ${nuevaFecha} con éxito.`
      );
    } catch (error: any) {
      showNotification('error', `Error al reprogramar: ${error.message}`);
      throw error;
    }
  };

  // Handle completing a recurring visit
  const handleConfirmMarcarVisita = async (
    clienteId: string,
    visitaData: {
      fecha: string;
      notas: string;
      fotoAntes?: string;
      fotoDespues?: string;
    },
    frecuenciaDias: number
  ) => {
    try {
      await marcarVisitaCompletada(
        clienteId,
        visitaData,
        frecuenciaDias,
        user?.uid
      );
      showNotification(
        'success',
        `¡Visita completada y registrada con éxito! Próxima visita programada.`
      );
    } catch (error: any) {
      showNotification('error', `Error al registrar visita: ${error.message}`);
      throw error;
    }
  };

  // Handle confirming an online Turno
  const handleConfirmarTurno = async (turnoId: string) => {
    try {
      await confirmarTurno(turnoId, config);
      showNotification('success', 'Turno confirmado y notificación enviada al cliente.');
    } catch (error: any) {
      showNotification('error', `Error al confirmar turno: ${error.message}`);
    }
  };

  // Handle completing an online Turno
  const handleCompletarTurno = async (turnoId: string) => {
    try {
      await completarTurno(turnoId, config);
      showNotification('success', 'Turno marcado como completado y notificaciones enviadas.');
    } catch (error: any) {
      showNotification('error', `Error al completar turno: ${error.message}`);
    }
  };

  // Handle cancelling an online Turno
  const handleOpenCancelarTurno = (turno: Turno) => {
    setCancelarTurnoModal({
      isOpen: true,
      turno,
      motivo: '',
      isCancelling: false,
    });
  };

  const handleConfirmCancelarTurno = async () => {
    if (!cancelarTurnoModal.turno) return;
    setCancelarTurnoModal((prev) => ({ ...prev, isCancelling: true }));

    try {
      await cancelTurno(
        cancelarTurnoModal.turno.id,
        config,
        cancelarTurnoModal.motivo.trim() || 'Cancelado por el vidriero desde la agenda'
      );
      showNotification('success', 'Turno cancelado y correos de aviso despachados.');
      setCancelarTurnoModal({
        isOpen: false,
        turno: null,
        motivo: '',
        isCancelling: false,
      });
    } catch (error: any) {
      showNotification('error', `Error al cancelar turno: ${error.message}`);
      setCancelarTurnoModal((prev) => ({ ...prev, isCancelling: false }));
    }
  };

  // Handle client deletion
  const handleDeleteCliente = async (clienteId: string) => {
    try {
      await deleteCliente(clienteId);
      setSelectedCliente(null);
      showNotification('success', 'Cliente eliminado correctamente.');
    } catch (error: any) {
      showNotification('error', `Error al eliminar: ${error.message}`);
      throw error;
    }
  };

  // Handle photo updates
  const handleUpdatePhotos = async (
    clienteId: string,
    fotos: { fotoAntes?: string; fotoDespues?: string }
  ) => {
    try {
      await updateCliente(clienteId, fotos, user?.uid);
      showNotification('success', 'Fotos del cliente actualizadas.');
    } catch (error: any) {
      showNotification('error', `Error al actualizar fotos: ${error.message}`);
      throw error;
    }
  };

  const handleOpenPublicBooking = () => {
    const origin = window.location.origin + window.location.pathname;
    window.open(`${origin}?agendar=true`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 sm:px-6 space-y-6 pb-28">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 text-xs sm:text-sm font-bold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header & View Switcher */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="p-2 rounded-xl text-white shadow-2xs"
              style={{ backgroundColor: primaryColor }}
            >
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Agenda de Limpiezas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Visitas periódicas pactadas y turnos agendados en tiempo real desde tu link público.
          </p>
        </div>

        {/* View Mode Switcher Pills & Quick Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            id="btn-agendar-turno-manual"
            onClick={() => setIsNuevoTurnoModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
            title="Agendar turno y enviar email automático al cliente con botón de cancelación"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Agendar Turno</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPublicBooking}
            className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Abrir página pública de auto-agendamiento"
          >
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>Link Público</span>
            <ExternalLink className="w-3 h-3 text-sky-500" />
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              id="btn-vista-calendario"
              onClick={() => setViewMode('calendario')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'calendario'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Calendario</span>
            </button>

            <button
              type="button"
              id="btn-vista-lista"
              onClick={() => setViewMode('lista')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'lista'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>Lista 7 Días</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Toca Hoy */}
        <div
          onClick={() => {
            setSelectedDate(todayStr);
            setViewMode('calendario');
          }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:border-amber-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Para Hoy
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 group-hover:text-amber-700 transition-colors">
              {stats.hoy}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {stats.hoyTurnos > 0 ? `(${stats.hoyTurnos} web + ${stats.hoyVisitas} vis)` : 'servicios'}
            </span>
          </div>
        </div>

        {/* Próximos 3 Días */}
        <div
          onClick={() => setViewMode('lista')}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:border-amber-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              En 3 Días
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 group-hover:text-amber-700 transition-colors">
              {stats.proximos3dias}
            </span>
            <span className="text-xs text-slate-400 font-medium">programadas</span>
          </div>
        </div>

        {/* Esta Semana (7 Días) */}
        <div
          onClick={() => setViewMode('lista')}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:border-sky-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Esta Semana
            </span>
            <CalendarIcon className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors">
              {stats.estaSemana}
            </span>
            <span className="text-xs text-slate-400 font-medium">servicios</span>
          </div>
        </div>

        {/* Vencidas */}
        <div
          onClick={() => setViewMode('lista')}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:border-rose-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Vencidas
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black transition-colors ${
                stats.vencidos > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {stats.vencidos}
            </span>
            <span className="text-xs text-slate-400 font-medium">pendientes</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-xs space-y-3">
          <div
            className="w-10 h-10 border-3 rounded-full animate-spin mx-auto"
            style={{
              borderColor: `${primaryColor}30`,
              borderTopColor: primaryColor,
            }}
          />
          <p className="text-xs font-bold text-slate-500">
            Cargando agenda y turnos online...
          </p>
        </div>
      ) : viewMode === 'calendario' ? (
        <AgendaCalendarView
          clientes={clientes}
          turnos={turnos}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onSelectCliente={setSelectedCliente}
          onMarcarVisita={setVisitaModalCliente}
          onOpenReprogramar={handleOpenReprogramar}
          onCompletarTurno={handleCompletarTurno}
          onConfirmarTurno={handleConfirmarTurno}
          onCancelarTurno={handleOpenCancelarTurno}
        />
      ) : (
        <AgendaListView
          clientes={clientes}
          turnos={turnos}
          onSelectCliente={setSelectedCliente}
          onMarcarVisita={setVisitaModalCliente}
          onOpenReprogramar={handleOpenReprogramar}
          onCompletarTurno={handleCompletarTurno}
          onConfirmarTurno={handleConfirmarTurno}
          onCancelarTurno={handleOpenCancelarTurno}
        />
      )}

      {/* Modal: Cancelar Turno Confirmation */}
      {cancelarTurnoModal.isOpen && cancelarTurnoModal.turno && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-slate-900">
                Cancelar Turno Online
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              ¿Deseas cancelar el turno de{' '}
              <strong>{cancelarTurnoModal.turno.nombreCliente}</strong> previsto para el{' '}
              <strong>{cancelarTurnoModal.turno.fecha}</strong> ({cancelarTurnoModal.turno.horaInicio} hs)?
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo de cancelación (se notificará al cliente)
              </label>
              <input
                type="text"
                value={cancelarTurnoModal.motivo}
                onChange={(e) =>
                  setCancelarTurnoModal((prev) => ({
                    ...prev,
                    motivo: e.target.value,
                  }))
                }
                placeholder="Ej. Imprevisto técnico / Horario fuera de ruta..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={cancelarTurnoModal.isCancelling}
                onClick={() =>
                  setCancelarTurnoModal({
                    isOpen: false,
                    turno: null,
                    motivo: '',
                    isCancelling: false,
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelarTurnoModal.isCancelling}
                onClick={handleConfirmCancelarTurno}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                {cancelarTurnoModal.isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reprogramar por Mal Tiempo */}
      <ReprogramarMalTiempoModal
        isOpen={reprogramarModal.isOpen}
        fechaOrigen={reprogramarModal.fechaOrigen}
        clientesAfectados={reprogramarModal.clientes}
        onClose={() =>
          setReprogramarModal({
            isOpen: false,
            fechaOrigen: todayStr,
            clientes: [],
          })
        }
        onConfirmReprogramacion={handleConfirmReprogramacion}
      />

      {/* Modal: Ficha Detallada del Cliente */}
      {selectedCliente && (
        <ClienteDetailModal
          cliente={selectedCliente}
          isOpen={Boolean(selectedCliente)}
          onClose={() => setSelectedCliente(null)}
          onEdit={(cliente) => {
            setSelectedCliente(null);
            setEditingCliente(cliente);
            setIsEditModalOpen(true);
          }}
          onDelete={handleDeleteCliente}
          onMarcarVisita={(cliente) => {
            setSelectedCliente(null);
            setVisitaModalCliente(cliente);
          }}
          onUpdatePhotos={handleUpdatePhotos}
        />
      )}

      {/* Modal: Registrar Visita Completada */}
      {visitaModalCliente && (
        <MarcarVisitaModal
          cliente={visitaModalCliente}
          isOpen={Boolean(visitaModalCliente)}
          onClose={() => setVisitaModalCliente(null)}
          onConfirmVisita={handleConfirmMarcarVisita}
        />
      )}

      {/* Modal: Editar Cliente */}
      {isEditModalOpen && editingCliente && (
        <ClienteFormModal
          isOpen={isEditModalOpen}
          initialData={editingCliente}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCliente(null);
          }}
          onSave={async (data) => {
            await updateCliente(editingCliente.id, data, user?.uid);
            setIsEditModalOpen(false);
            setEditingCliente(null);
            showNotification('success', 'Cliente actualizado correctamente.');
          }}
        />
      )}

      {/* Modal: Agendar Turno Manual con Notificación por Email */}
      {isNuevoTurnoModalOpen && (
        <NuevoTurnoManualModal
          isOpen={isNuevoTurnoModalOpen}
          onClose={() => setIsNuevoTurnoModalOpen(false)}
          config={config}
          clientes={clientes}
          initialDate={selectedDate}
          onTurnoCreated={() => {
            showNotification(
              'success',
              'Turno agendado con éxito. Se envió el email de confirmación con el botón de cancelación al cliente.'
            );
          }}
        />
      )}
    </div>
  );
}
