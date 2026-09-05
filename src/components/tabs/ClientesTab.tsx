import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Layers,
  MapPin,
  CheckCircle,
  XCircle,
  Store,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';
import { Cliente } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToClientes,
  addCliente,
  updateCliente,
  deleteCliente,
  marcarVisitaCompletada,
  aprobarSolicitudCliente,
  rechazarSolicitudCliente
} from '../../lib/clientesService';
import { ClienteCard } from '../clientes/ClienteCard';
import { ClienteFormModal } from '../clientes/ClienteFormModal';
import { ClienteDetailModal } from '../clientes/ClienteDetailModal';
import { MarcarVisitaModal } from '../clientes/MarcarVisitaModal';
import { calcularDiasRestantes } from '../../utils/dateUtils';

type FilterOption = 'todos' | 'vencidos_semana' | '30' | '60' | '90' | 'solicitudes';

export function ClientesTab() {
  const { config, currentNegocioId } = useConfig();
  const { user } = useAuth();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('todos');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [visitaModalCliente, setVisitaModalCliente] = useState<Cliente | null>(null);

  // Subscribe to real-time clients in Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToClientes((list) => {
      setClientes(list);
      setLoading(false);

      // Keep selected client updated if currently open in detail modal
      if (selectedCliente) {
        const updated = list.find((c) => c.id === selectedCliente.id);
        if (updated) setSelectedCliente(updated);
      }
    }, currentNegocioId);

    return () => unsubscribe();
  }, [selectedCliente?.id, currentNegocioId]);

  // Pending client registration requests
  const solicitudesPendientes = useMemo(() => {
    return clientes.filter((c) => c.estadoRegistro === 'pendiente');
  }, [clientes]);

  // Statistics
  const stats = useMemo(() => {
    let vencidos = 0;
    let estaSemana = 0;
    let alDia = 0;

    clientes.forEach((c) => {
      if (!c.activo || c.estadoRegistro === 'pendiente') return;
      const estado = calcularDiasRestantes(c.fechaProximaVisita);
      if (estado.estado === 'vencida') vencidos++;
      else if (estado.estado === 'hoy' || estado.estado === 'manana' || estado.estado === 'esta_semana') {
        estaSemana++;
      } else {
        alDia++;
      }
    });

    return {
      total: clientes.filter(c => c.estadoRegistro !== 'pendiente').length,
      solicitudes: solicitudesPendientes.length,
      vencidos,
      estaSemana,
      alDia,
    };
  }, [clientes, solicitudesPendientes]);

  // Filter and search logic
  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      // If showing solicitudes, only show pending
      if (activeFilter === 'solicitudes') {
        return c.estadoRegistro === 'pendiente';
      }

      // Hide pending registration requests from main list unless filter is explicitly set
      if (c.estadoRegistro === 'pendiente') return false;

      // Search by name, zone, address or surface
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        c.nombre.toLowerCase().includes(term) ||
        (c.localComercial && c.localComercial.toLowerCase().includes(term)) ||
        (c.zona && c.zona.toLowerCase().includes(term)) ||
        (c.direccion && c.direccion.toLowerCase().includes(term)) ||
        (c.tipoSuperficie && c.tipoSuperficie.toLowerCase().includes(term));

      if (!matchSearch) return false;

      // Filter by status or frequency
      if (activeFilter === 'vencidos_semana') {
        const est = calcularDiasRestantes(c.fechaProximaVisita);
        return est.estado === 'vencida' || est.estado === 'hoy' || est.estado === 'manana' || est.estado === 'esta_semana';
      }
      if (activeFilter === '30') return c.frecuenciaVisitaDias === 30;
      if (activeFilter === '60') return c.frecuenciaVisitaDias === 60;
      if (activeFilter === '90') return c.frecuenciaVisitaDias === 90;

      return true;
    });
  }, [clientes, searchTerm, activeFilter]);

  const handleAprobarSolicitud = async (cliente: Cliente) => {
    setActionLoadingId(cliente.id);
    try {
      await aprobarSolicitudCliente(cliente.id, user?.email || 'vidriero');
    } catch (e) {
      console.error('Error approving client:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRechazarSolicitud = async (cliente: Cliente) => {
    setActionLoadingId(cliente.id);
    try {
      await rechazarSolicitudCliente(cliente.id);
    } catch (e) {
      console.error('Error rejecting client:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveCliente = async (data: Omit<Cliente, 'id'>) => {
    if (editingCliente) {
      await updateCliente(editingCliente.id, { ...data, negocioId: editingCliente.negocioId || currentNegocioId }, user?.email || 'admin');
    } else {
      await addCliente({ ...data, negocioId: currentNegocioId }, user?.email || 'admin', currentNegocioId);
    }
  };

  const handleDeleteCliente = async (id: string) => {
    await deleteCliente(id);
    if (selectedCliente?.id === id) setSelectedCliente(null);
  };

  const handleConfirmVisita = async (
    clienteId: string,
    visitaData: {
      fecha: string;
      notas: string;
      fotoAntes?: string;
      fotoDespues?: string;
    },
    frecuenciaDias: number
  ) => {
    await marcarVisitaCompletada(
      clienteId,
      visitaData,
      frecuenciaDias,
      user?.email || 'admin'
    );
  };

  const handleUpdatePhotos = async (
    clienteId: string,
    fotos: { fotoAntes?: string; fotoDespues?: string }
  ) => {
    await updateCliente(clienteId, fotos, user?.email || 'admin');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6 pb-28 relative">
      {/* Header Summary & KPI Cards */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="p-2 rounded-xl text-white shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Cartera de Clientes
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg">
              Control de frecuencias de limpieza, validación de registros y programa de sellos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-add-cliente-header"
              onClick={() => {
                setEditingCliente(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Nuevo Cliente</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 block">Clientes Activos</span>
            <p className="text-lg font-extrabold text-slate-900">{stats.total}</p>
          </div>

          {stats.solicitudes > 0 ? (
            <button
              type="button"
              onClick={() => setActiveFilter('solicitudes')}
              className="p-3 rounded-2xl border text-left bg-sky-50 border-sky-300 hover:bg-sky-100/80 transition-all text-sky-950"
            >
              <span className="text-[11px] font-bold text-sky-700 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-600 animate-pulse" />
                Solicitudes Web
              </span>
              <p className="text-lg font-extrabold text-sky-950">{stats.solicitudes}</p>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveFilter('vencidos_semana')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                stats.vencidos > 0
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900 hover:bg-rose-100/70'
                  : 'bg-slate-50 border-slate-200/70 text-slate-700'
              }`}
            >
              <span className="text-[11px] font-bold text-rose-600 block flex items-center gap-1">
                {stats.vencidos > 0 && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                Vencidos
              </span>
              <p className="text-lg font-extrabold text-rose-950">{stats.vencidos}</p>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveFilter('vencidos_semana')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              stats.estaSemana > 0
                ? 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/70'
                : 'bg-slate-50 border-slate-200/70 text-slate-700'
            }`}
          >
            <span className="text-[11px] font-bold text-amber-700 block flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Esta Semana
            </span>
            <p className="text-lg font-extrabold text-amber-950">{stats.estaSemana}</p>
          </button>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <span className="text-[11px] font-semibold text-slate-400 block">Al día / Futuros</span>
            <p className="text-lg font-extrabold text-slate-900">{stats.alDia}</p>
          </div>
        </div>
      </div>

      {/* PENDING CLIENT REQUESTS NOTIFICATION CARD */}
      {solicitudesPendientes.length > 0 && (
        <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-600 text-white shadow-xs">
                <UserCheck className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Solicitudes de Registro Web Pendientes ({solicitudesPendientes.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nuevos clientes que se registraron desde la app y esperan tu aprobación
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {solicitudesPendientes.map((solicitud) => (
              <div
                key={solicitud.id}
                className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="font-extrabold text-slate-900 text-sm">
                      {solicitud.localComercial || solicitud.nombre}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Pendiente
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {solicitud.nombre}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {solicitud.telefono}
                    </span>
                    {solicitud.emailRegistro && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {solicitud.emailRegistro}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id={`btn-aprobar-cliente-${solicitud.id}`}
                    disabled={actionLoadingId === solicitud.id}
                    onClick={() => handleAprobarSolicitud(solicitud)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Aprobar Cliente</span>
                  </button>

                  <button
                    type="button"
                    id={`btn-rechazar-cliente-${solicitud.id}`}
                    disabled={actionLoadingId === solicitud.id}
                    onClick={() => handleRechazarSolicitud(solicitud)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 active:scale-95 text-slate-600 font-bold text-xs border border-slate-200 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            id="input-search-clientes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, local, barrio/zona o dirección..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs sm:text-sm text-slate-800 shadow-2xs font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded-lg bg-slate-100"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filter Chips Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            id="filter-chip-todos"
            onClick={() => setActiveFilter('todos')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === 'todos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({clientes.filter(c => c.estadoRegistro !== 'pendiente').length})
          </button>

          {solicitudesPendientes.length > 0 && (
            <button
              type="button"
              id="filter-chip-solicitudes"
              onClick={() => setActiveFilter('solicitudes')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'solicitudes'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Solicitudes Web ({solicitudesPendientes.length})</span>
            </button>
          )}

          <button
            type="button"
            id="filter-chip-vencidos"
            onClick={() => setActiveFilter('vencidos_semana')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'vencidos_semana'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Vencidos o Esta Semana ({stats.vencidos + stats.estaSemana})</span>
          </button>

          <button
            type="button"
            id="filter-chip-30d"
            onClick={() => setActiveFilter('30')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === '30'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            30 Días (Mensual)
          </button>

          <button
            type="button"
            id="filter-chip-60d"
            onClick={() => setActiveFilter('60')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === '60'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            60 Días (Bimestral)
          </button>

          <button
            type="button"
            id="filter-chip-90d"
            onClick={() => setActiveFilter('90')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === '90'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            90 Días (Trimestral)
          </button>
        </div>
      </div>

      {/* Clients List Section */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              Cargando cartera de clientes desde Firebase...
            </p>
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                {searchTerm
                  ? 'No se encontraron clientes para la búsqueda'
                  : activeFilter !== 'todos'
                  ? 'No hay clientes con este filtro'
                  : 'No tienes clientes registrados todavía'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm
                  ? 'Intenta con otro término o revisa que el barrio o nombre esté bien escrito.'
                  : 'Agrega tu primer cliente para comenzar a programar limpiezas con cálculo automático de visitas.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveFilter('todos');
                if (clientes.length === 0) {
                  setEditingCliente(null);
                  setIsFormOpen(true);
                }
              }}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{clientes.length === 0 ? 'Crear Primer Cliente' : 'Restablecer Filtros'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClientes.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                onSelect={(c) => setSelectedCliente(c)}
                onMarcarVisita={(c) => setVisitaModalCliente(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) "+" for fast Mobile Add */}
      <button
        type="button"
        id="fab-add-cliente"
        onClick={() => {
          setEditingCliente(null);
          setIsFormOpen(true);
        }}
        aria-label="Agregar nuevo cliente"
        className="fixed bottom-24 right-5 sm:bottom-10 sm:right-10 z-40 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-white transition-transform active:scale-95 hover:scale-105"
        style={{ backgroundColor: primaryColor }}
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Form Modal (Add / Edit) */}
      <ClienteFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCliente(null);
        }}
        onSave={handleSaveCliente}
        initialData={editingCliente}
      />

      {/* Client Detail Drawer / Modal */}
      <ClienteDetailModal
        isOpen={!!selectedCliente}
        onClose={() => setSelectedCliente(null)}
        cliente={selectedCliente}
        onEdit={(c) => {
          setSelectedCliente(null);
          setEditingCliente(c);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteCliente}
        onMarcarVisita={(c) => {
          setSelectedCliente(null);
          setVisitaModalCliente(c);
        }}
        onUpdatePhotos={handleUpdatePhotos}
      />

      {/* Marcar Visita Modal */}
      <MarcarVisitaModal
        isOpen={!!visitaModalCliente}
        onClose={() => setVisitaModalCliente(null)}
        cliente={visitaModalCliente}
        onConfirmVisita={handleConfirmVisita}
      />
    </div>
  );
}

