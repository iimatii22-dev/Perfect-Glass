import React, { useState, useEffect, useMemo } from 'react';
import {
  Gift,
  Award,
  Sparkles,
  Star,
  Search,
  CheckCircle2,
  Phone,
  MessageCircle,
  ChevronRight,
  TrendingUp,
  Users,
  Check,
  Plus,
  Minus,
  AlertCircle,
  Flame,
  Clock,
  Settings,
  ArrowUpRight,
} from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { Cliente } from '../../types';
import {
  subscribeToClientes,
  canjearRecompensa,
  ajustarSellosCliente,
  marcarVisitaCompletada,
  deleteCliente,
  updateCliente,
} from '../../lib/clientesService';
import { ClienteDetailModal } from '../clientes/ClienteDetailModal';
import { ClienteFormModal } from '../clientes/ClienteFormModal';
import { MarcarVisitaModal } from '../clientes/MarcarVisitaModal';
import { formatearFecha } from '../../utils/dateUtils';

type FilterType = 'todos' | 'listos' | 'cerca' | 'en_progreso';

export function FidelidadTab() {
  const { config, currentNegocioId } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');

  // Modals state
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
  const [isMarcarVisitaOpen, setIsMarcarVisitaOpen] = useState(false);
  const [clienteToMarcar, setClienteToMarcar] = useState<Cliente | null>(null);

  // Quick Action feedback
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{ message: string; type: 'canje' | 'sello' } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToClientes((data) => {
      setClientes(data);
      setLoading(false);

      // Keep selected client in sync if open
      if (selectedCliente) {
        const updated = data.find((c) => c.id === selectedCliente.id);
        if (updated) setSelectedCliente(updated);
      }
    }, currentNegocioId);

    return () => unsubscribe();
  }, [selectedCliente?.id, currentNegocioId]);

  const globalSellosNecesarios = config.sellosNecesarios || 5;
  const globalRecompensa = config.recompensaDescripcion || 'Limpieza de vidrios gratis';

  // Metrics
  const stats = useMemo(() => {
    const listos = clientes.filter((c) => Boolean(c.recompensaDisponible));
    const totalSellos = clientes.reduce((acc, c) => acc + (c.sellosAcumulados || 0), 0);
    const totalCanjeados = clientes.reduce((acc, c) => acc + (c.totalRecompensasCanjeadas || 0), 0);
    const activosEnPrograma = clientes.filter((c) => (c.sellosAcumulados || 0) > 0 || c.recompensaDisponible).length;

    return {
      listosCount: listos.length,
      totalSellos,
      totalCanjeados,
      activosEnPrograma,
    };
  }, [clientes]);

  // Filtered & Sorted Clients
  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter((cliente) => {
        // Text Search
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          cliente.nombre.toLowerCase().includes(query) ||
          cliente.direccion.toLowerCase().includes(query) ||
          (cliente.zona && cliente.zona.toLowerCase().includes(query)) ||
          cliente.telefono.includes(query);

        if (!matchesQuery) return false;

        const sellos = cliente.sellosAcumulados || 0;
        const meta = cliente.sellosNecesarios || globalSellosNecesarios;
        const tieneRecompensa = Boolean(cliente.recompensaDisponible);

        if (activeFilter === 'listos') return tieneRecompensa;
        if (activeFilter === 'cerca') return !tieneRecompensa && sellos >= meta - 2 && sellos > 0;
        if (activeFilter === 'en_progreso') return !tieneRecompensa && sellos > 0;

        return true;
      })
      .sort((a, b) => {
        // Prioritize clients with available rewards first!
        if (a.recompensaDisponible && !b.recompensaDisponible) return -1;
        if (!a.recompensaDisponible && b.recompensaDisponible) return 1;

        // Then sort by stamps descending
        const stampsA = a.sellosAcumulados || 0;
        const stampsB = b.sellosAcumulados || 0;
        if (stampsA !== stampsB) return stampsB - stampsA;

        return a.nombre.localeCompare(b.nombre);
      });
  }, [clientes, searchQuery, activeFilter, globalSellosNecesarios]);

  const clientesListos = useMemo(() => {
    return clientes.filter((c) => Boolean(c.recompensaDisponible));
  }, [clientes]);

  // Handlers
  const handleOpenDetail = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDetailOpen(true);
  };

  const handleCanjearDirecto = async (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cliente.recompensaDisponible) return;

    setProcessingId(cliente.id);
    try {
      await canjearRecompensa(cliente.id);
      setSuccessToast({
        message: `¡Recompensa canjeada con éxito para ${cliente.nombre}!`,
        type: 'canje',
      });
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Error al canjear recompensa:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAjustarSello = async (cliente: Cliente, incremento: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const actual = cliente.sellosAcumulados || 0;
    const nuevo = Math.max(0, actual + incremento);
    if (nuevo === actual) return;

    setProcessingId(cliente.id);
    try {
      const res = await ajustarSellosCliente(cliente.id, nuevo);
      if (res.rewardUnlocked) {
        setSuccessToast({
          message: `🎉 ¡${cliente.nombre} completó todos los sellos y desbloqueó su recompensa!`,
          type: 'canje',
        });
      } else {
        setSuccessToast({
          message: `${incremento > 0 ? '+1 Sello' : '-1 Sello'} actualizado para ${cliente.nombre}`,
          type: 'sello',
        });
      }
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Error al ajustar sellos:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const getWhatsAppMessage = (cliente: Cliente) => {
    const cleanPhone = cliente.telefono.replace(/[^0-9+]/g, '').replace('+', '');
    const meta = cliente.sellosNecesarios || globalSellosNecesarios;
    const premio = cliente.recompensaDescripcion || globalRecompensa;
    const sellos = cliente.sellosAcumulados || 0;

    let mensaje = '';
    if (cliente.recompensaDisponible) {
      mensaje = `¡Hola ${cliente.nombre}! 👋 Te contactamos de ${config.nombreNegocio || 'Perfect Glass'}. ¡Felicitaciones! Has completado tus ${meta} visitas con nosotros y tienes disponible tu recompensa: 🎁 *${premio}*. ¡Escríbenos para agendar tu próximo servicio y aplicarla!`;
    } else {
      const faltan = Math.max(0, meta - sellos);
      mensaje = `¡Hola ${cliente.nombre}! 👋 Te contactamos de ${config.nombreNegocio || 'Perfect Glass'}. Queríamos recordarte que ya tienes *${sellos}/${meta} sellos* en tu tarjeta de fidelidad. ¡Te faltan solo ${faltan} ${faltan === 1 ? 'visita' : 'visitas'} para tu recompensa (*${premio}*)!`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 pb-28">
      {/* Toast Notification */}
      {successToast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-60 px-5 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300 ${
            successToast.type === 'canje'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/20'
              : 'bg-slate-900 text-white border-slate-700 shadow-slate-950/30'
          }`}
        >
          {successToast.type === 'canje' ? (
            <Gift className="w-5 h-5 text-slate-950 animate-bounce shrink-0" />
          ) : (
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
          )}
          <span>{successToast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span
              className="p-2.5 rounded-2xl text-white shadow-sm flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Gift className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Programa de Fidelidad
              </h2>
              <p className="text-xs text-slate-500">
                Premio activo:{' '}
                <strong className="text-slate-800 font-bold">
                  {globalRecompensa} ({globalSellosNecesarios} sellos)
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Program Rule Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 flex items-center justify-center font-bold">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div className="text-xs pr-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Regla automática
            </span>
            <span className="font-extrabold text-slate-800">
              1 visita = +1 sello digital
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-400 text-slate-950 p-4 sm:p-5 rounded-3xl shadow-sm border border-amber-300 relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900/80 block">
              Premios Listos
            </span>
            <p className="text-2xl sm:text-3xl font-black">{stats.listosCount}</p>
            <span className="text-[10px] font-bold text-slate-950 bg-white/40 px-2 py-0.5 rounded-md inline-block">
              Para canjear hoy
            </span>
          </div>
          <Gift className="w-16 h-16 absolute -right-3 -bottom-3 text-slate-950/10 pointer-events-none" />
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            Sellos Acumulados
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalSellos}</p>
          <span className="text-[10px] font-bold text-sky-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            En circulación
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            Canjes Históricos
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {stats.totalCanjeados}
          </p>
          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-500" />
            Premios otorgados
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            Clientes Activos
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.activosEnPrograma}
          </p>
          <span className="text-[10px] font-semibold text-slate-500">
            De {clientes.length} registrados
          </span>
        </div>
      </div>

      {/* HIGHLIGHTED SECTION: REWARDS AVAILABLE */}
      {clientesListos.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-5 sm:p-6 shadow-md border border-amber-300 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2 text-slate-950">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
                <Gift className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg">
                  ¡Clientes con Recompensa Lista ({clientesListos.length})!
                </h3>
                <p className="text-xs font-semibold text-slate-900">
                  Completaron todos los sellos requeridos y están listos para canjear su premio.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-extrabold px-3 py-1 bg-slate-950 text-amber-400 rounded-full">
              Atención Prioritaria
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clientesListos.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => handleOpenDetail(cliente)}
                className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3 cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      Recompensa Ganada
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base mt-1 group-hover:text-amber-600 transition-colors">
                      {cliente.nombre}
                    </h4>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{cliente.direccion}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                    {cliente.recompensaDescripcion || globalRecompensa}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <a
                    href={getWhatsAppMessage(cliente)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Avisar por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    disabled={processingId === cliente.id}
                    onClick={(e) => handleCanjearDirecto(cliente, e)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  >
                    {processingId === cliente.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Canjear Premio</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nombre, dirección o teléfono..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({clientes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('listos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'listos'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Gift className="w-3 h-3" />
              Premios Listos ({stats.listosCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('cerca')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'cerca'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400" />
              Cerca de la meta
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('en_progreso')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'en_progreso'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              En progreso
            </button>
          </div>
        </div>
      </div>

      {/* Clients List with Stamp Progress Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-2">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Cargando tarjetas de fidelidad...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-6 space-y-3">
            <Gift className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-sm">
              No se encontraron clientes para este filtro
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Prueba cambiando el término de búsqueda o seleccionando "Todos" para ver todas las tarjetas de fidelidad.
            </p>
            {activeFilter !== 'todos' && (
              <button
                type="button"
                onClick={() => setActiveFilter('todos')}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Ver todos los clientes
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {clientesFiltrados.map((cliente) => {
              const sellos = cliente.sellosAcumulados || 0;
              const meta = cliente.sellosNecesarios || globalSellosNecesarios;
              const premio = cliente.recompensaDescripcion || globalRecompensa;
              const tienePremio = Boolean(cliente.recompensaDisponible);
              const porcentaje = Math.min(100, Math.round((sellos / meta) * 100));

              return (
                <div
                  key={cliente.id}
                  onClick={() => handleOpenDetail(cliente)}
                  className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer hover:shadow-md relative overflow-hidden group ${
                    tienePremio
                      ? 'border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-r from-amber-50/40 via-white to-white'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Client Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {tienePremio ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs animate-pulse">
                            <Gift className="w-3 h-3" />
                            ¡Recompensa Lista!
                          </span>
                        ) : sellos >= meta - 1 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-600" />
                            ¡A 1 solo sello de la meta!
                          </span>
                        ) : null}

                        {cliente.zona && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {cliente.zona}
                          </span>
                        )}

                        {(cliente.totalRecompensasCanjeadas ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {cliente.totalRecompensasCanjeadas} canjeados
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight group-hover:text-sky-600 transition-colors">
                        {cliente.nombre}
                      </h3>

                      <p className="text-xs text-slate-500 truncate max-w-md">
                        {cliente.direccion} • Tel: {cliente.telefono}
                      </p>
                    </div>

                    {/* Middle: Stamp Visuals */}
                    <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2 shrink-0 md:w-72">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">
                          Progreso de sellos
                        </span>
                        <span className="text-xs font-black text-amber-400">
                          {sellos} / {meta} Sellos
                        </span>
                      </div>

                      {/* Stamp Grid Mini */}
                      <div className="grid grid-cols-5 gap-1.5">
                        {Array.from({ length: meta }).map((_, idx) => {
                          const isFilled = idx < sellos;
                          return (
                            <div
                              key={idx}
                              className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                                isFilled
                                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                                  : 'bg-slate-800/80 border border-slate-700 text-slate-600'
                              }`}
                              title={`Sello #${idx + 1}`}
                            >
                              {isFilled ? (
                                <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                              ) : (
                                <span className="text-[10px] opacity-40">{idx + 1}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>

                      <p className="text-[10px] text-slate-400 truncate">
                        Premio: <span className="text-amber-300 font-semibold">{premio}</span>
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                      {/* Manual adjust stamps button */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button
                          type="button"
                          title="Restar 1 sello"
                          disabled={sellos === 0 || processingId === cliente.id}
                          onClick={(e) => handleAjustarSello(cliente, -1, e)}
                          className="p-1 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{sellos}</span>
                        <button
                          type="button"
                          title="Sumar 1 sello manual"
                          disabled={processingId === cliente.id}
                          onClick={(e) => handleAjustarSello(cliente, 1, e)}
                          className="p-1 rounded-lg hover:bg-white text-slate-800 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* WhatsApp shortcut */}
                      <a
                        href={getWhatsAppMessage(cliente)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Enviar estado por WhatsApp"
                        className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all flex items-center justify-center"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                      {/* Direct Redeem button or Open Detail */}
                      {tienePremio ? (
                        <button
                          type="button"
                          disabled={processingId === cliente.id}
                          onClick={(e) => handleCanjearDirecto(cliente, e)}
                          className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-400 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5"
                        >
                          {processingId === cliente.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>Canjear</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(cliente)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                        >
                          <span>Ver Ficha</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Client Detail with Loyalty info & Canje action */}
      {isDetailOpen && selectedCliente && (
        <ClienteDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedCliente(null);
          }}
          cliente={selectedCliente}
          onEdit={(c) => {
            setIsDetailOpen(false);
            setClienteToEdit(c);
            setIsEditOpen(true);
          }}
          onDelete={async (id) => {
            await deleteCliente(id);
            setIsDetailOpen(false);
            setSelectedCliente(null);
          }}
          onMarcarVisita={(c) => {
            setIsDetailOpen(false);
            setClienteToMarcar(c);
            setIsMarcarVisitaOpen(true);
          }}
          onUpdatePhotos={async (id, fotos) => {
            await updateCliente(id, fotos);
          }}
        />
      )}

      {/* Modal: Edit Client */}
      {isEditOpen && clienteToEdit && (
        <ClienteFormModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setClienteToEdit(null);
          }}
          initialData={clienteToEdit}
          onSave={async (data) => {
            await updateCliente(clienteToEdit.id, data);
            setIsEditOpen(false);
            setClienteToEdit(null);
          }}
        />
      )}

      {/* Modal: Mark Visit Completed */}
      {isMarcarVisitaOpen && clienteToMarcar && (
        <MarcarVisitaModal
          isOpen={isMarcarVisitaOpen}
          onClose={() => {
            setIsMarcarVisitaOpen(false);
            setClienteToMarcar(null);
          }}
          cliente={clienteToMarcar}
          onConfirmVisita={async (clienteId, visitaData, frecuenciaDias) => {
            const nombreCliente = clienteToMarcar.nombre;
            const res = await marcarVisitaCompletada(clienteId, visitaData, frecuenciaDias);
            setIsMarcarVisitaOpen(false);
            setClienteToMarcar(null);

            if (res.rewardUnlocked) {
              setSuccessToast({
                message: `🎉 ¡${nombreCliente} ha completado sus sellos y desbloqueó su recompensa!`,
                type: 'canje',
              });
              setTimeout(() => setSuccessToast(null), 4500);
            }
          }}
        />
      )}
    </div>
  );
}
