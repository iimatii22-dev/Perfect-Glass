import React, { useState } from 'react';
import {
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit3,
  ExternalLink,
  Power,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Award,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { BusinessConfig, Cliente, NegocioMetricas } from '../../types';

interface VidrierosYClientesTabProps {
  negocios: BusinessConfig[];
  allClientes: Cliente[];
  metricas: Record<string, NegocioMetricas>;
  currentNegocioId: string | null;
  onSelectAndInspect: (negocioId: string) => void;
  onEditNegocio: (negocio: BusinessConfig) => void;
  onToggleActivo: (negocio: BusinessConfig) => void;
  onEliminarNegocio?: (negocio: BusinessConfig) => void;
  onCrearNegocio: () => void;
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (clienteId: string) => void;
  onCrearClienteParaNegocio: (negocioId: string) => void;
}

export function VidrierosYClientesTab({
  negocios,
  allClientes,
  metricas,
  currentNegocioId,
  onSelectAndInspect,
  onEditNegocio,
  onToggleActivo,
  onEliminarNegocio,
  onCrearNegocio,
  onEditCliente,
  onDeleteCliente,
  onCrearClienteParaNegocio,
}: VidrierosYClientesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [expandedNegocios, setExpandedNegocios] = useState<Record<string, boolean>>({
    'perfect-glass': true, // Keep primary business open by default
  });

  const toggleExpand = (negocioId: string) => {
    setExpandedNegocios((prev) => ({
      ...prev,
      [negocioId]: !prev[negocioId],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    negocios.forEach((n) => {
      allExpanded[n.id] = true;
    });
    setExpandedNegocios(allExpanded);
  };

  const collapseAll = () => {
    setExpandedNegocios({});
  };

  // Group clients by negocioId
  const clientesPorNegocio = React.useMemo(() => {
    const map: Record<string, Cliente[]> = {};
    allClientes.forEach((cliente) => {
      const negId = cliente.negocioId || 'perfect-glass';
      if (!map[negId]) {
        map[negId] = [];
      }
      map[negId].push(cliente);
    });
    return map;
  }, [allClientes]);

  // Filter businesses
  const filteredNegocios = negocios.filter((n) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (n.nombreNegocio || '').toLowerCase().includes(term) ||
      (n.id || '').toLowerCase().includes(term) ||
      (n.emailAdministrador || '').toLowerCase().includes(term) ||
      (n.telefono || '').includes(term);

    // Also check if any client under this business matches the search term
    const clientsUnder = clientesPorNegocio[n.id] || [];
    const matchesClient = clientsUnder.some(
      (c) =>
        (c.nombre || '').toLowerCase().includes(term) ||
        (c.telefono || '').includes(term) ||
        (c.localComercial || '').toLowerCase().includes(term) ||
        (c.direccion || '').toLowerCase().includes(term)
    );

    const matchesPlan = filterPlan === 'todos' || n.plan === filterPlan;
    const matchesEstado =
      filterEstado === 'todos' ||
      (filterEstado === 'activos' && n.activo !== false) ||
      (filterEstado === 'inactivos' && n.activo === false);

    return (matchesSearch || matchesClient) && matchesPlan && matchesEstado;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por vidriero, email, cliente, teléfono, comercio o dirección..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Filter selects */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos los Planes</option>
              <option value="free">Plan Free</option>
              <option value="pro">Plan Pro</option>
              <option value="premium">Plan Premium</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos los Estados</option>
              <option value="activos">Solo Activos</option>
              <option value="inactivos">Solo Inactivos</option>
            </select>

            <button
              onClick={onCrearNegocio}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all hover:scale-[1.02] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Vidriero</span>
            </button>
          </div>
        </div>

        {/* Expand / Collapse Controls */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <div>
            Mostrando <span className="font-bold text-white">{filteredNegocios.length}</span> vidrieros y{' '}
            <span className="font-bold text-white">{allClientes.length}</span> clientes registrados
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Desplegar todos los clientes
            </button>
            <span>•</span>
            <button
              onClick={collapseAll}
              className="text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              Colapsar todos
            </button>
          </div>
        </div>
      </div>

      {/* Vidrieros Cards with expandable client trees */}
      <div className="space-y-4">
        {filteredNegocios.map((negocio) => {
          const clientes = clientesPorNegocio[negocio.id] || [];
          const isExpanded = !!expandedNegocios[negocio.id];
          const m = metricas[negocio.id];
          const isCurrentActive = currentNegocioId === negocio.id;

          const clientesAprobados = clientes.filter((c) => c.estadoRegistro !== 'pendiente').length;
          const clientesPendientes = clientes.filter((c) => c.estadoRegistro === 'pendiente').length;
          const totalSellos = clientes.reduce((acc, c) => acc + (c.sellosAcumulados || 0), 0);

          return (
            <div
              key={negocio.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
                isCurrentActive
                  ? 'border-indigo-500/80 shadow-xl shadow-indigo-950/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Vidriero Card Header */}
              <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90">
                {/* Left info */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0 border border-white/10"
                    style={{ backgroundColor: negocio.colorPrimario || '#4f46e5' }}
                  >
                    {negocio.nombreNegocio?.charAt(0).toUpperCase() || 'V'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white text-base sm:text-lg">
                        {negocio.nombreNegocio}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        ID: {negocio.id}
                      </span>
                      {isCurrentActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          Workspace Seleccionado
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          negocio.plan === 'premium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : negocio.plan === 'pro'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                        }`}
                      >
                        Plan {negocio.plan || 'pro'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleActivo(negocio)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          negocio.activo !== false
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                        }`}
                        title="Clic para cambiar estado"
                      >
                        <Power className="w-3 h-3" />
                        <span>{negocio.activo !== false ? 'Activo' : 'Suspendido'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      {negocio.emailAdministrador && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{negocio.emailAdministrador}</span>
                        </span>
                      )}
                      {negocio.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{negocio.telefono}</span>
                        </span>
                      )}
                      {negocio.direccion && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{negocio.direccion}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right metrics & action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                  {/* Clientes counter pill */}
                  <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
                    <div className="text-[10px] text-slate-400 font-medium">Clientes</div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <Users className="w-3 h-3 text-sky-400" />
                      <span>{clientes.length}</span>
                      {clientesPendientes > 0 && (
                        <span className="text-[10px] text-amber-400 font-normal">
                          ({clientesPendientes} pend)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sellos otorgados */}
                  <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
                    <div className="text-[10px] text-slate-400 font-medium">Sellos Totales</div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400" />
                      <span>{totalSellos}</span>
                    </div>
                  </div>

                  {/* Acceder al Workspace del vidriero */}
                  <button
                    type="button"
                    onClick={() => onSelectAndInspect(negocio.id)}
                    className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                    title="Ingresar a la vista de este vidriero con barra de retorno de SuperAdmin"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Entrar al Workspace</span>
                  </button>

                  {/* Editar Vidriero */}
                  <button
                    type="button"
                    onClick={() => onEditNegocio(negocio)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors"
                    title="Editar configuración del negocio, plan y colores"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Eliminar Vidriero (si no es matriz) */}
                  {onEliminarNegocio && negocio.id !== 'perfect-glass' && (
                    <button
                      type="button"
                      onClick={() => onEliminarNegocio(negocio)}
                      className="p-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/40 rounded-xl text-xs transition-colors"
                      title="Eliminar este negocio vidriero de la plataforma"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Botón rápido Añadir Cliente a este vidriero */}
                  <button
                    type="button"
                    onClick={() => onCrearClienteParaNegocio(negocio.id)}
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                    title="Añadir un nuevo cliente bajo este vidriero"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Cliente</span>
                  </button>

                  {/* Toggle Accordion */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(negocio.id)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors ml-1"
                  >
                    <span>Clientes ({clientes.length})</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-árbol: Clientes registrados debajo de este vidriero */}
              {isExpanded && (
                <div className="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>Clientes registrados en "{negocio.nombreNegocio}"</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCrearClienteParaNegocio(negocio.id)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir cliente a esta vidriería</span>
                    </button>
                  </div>

                  {clientes.length === 0 ? (
                    <div className="text-center py-6 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl space-y-2">
                      <p className="text-xs text-slate-400">
                        No hay clientes registrados bajo este vidriero aún.
                      </p>
                      <button
                        type="button"
                        onClick={() => onCrearClienteParaNegocio(negocio.id)}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Crear el primer cliente</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 px-3">Cliente / Comercio</th>
                            <th className="py-2.5 px-3">Contacto</th>
                            <th className="py-2.5 px-3">Ubicación</th>
                            <th className="py-2.5 px-3">Fidelidad / Sellos</th>
                            <th className="py-2.5 px-3">Estado</th>
                            <th className="py-2.5 px-3 text-right">Acciones Master</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {clientes.map((c) => {
                            const sellos = c.sellosAcumulados || 0;
                            const necesarios = c.sellosNecesarios || 5;
                            const recompensaLista = c.recompensaDisponible || sellos >= necesarios;

                            return (
                              <tr
                                key={c.id}
                                className="hover:bg-slate-900/50 transition-colors group"
                              >
                                {/* Nombre y Local */}
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-white text-xs">{c.nombre}</div>
                                  {c.localComercial && c.localComercial !== c.nombre && (
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                      <Store className="w-3 h-3 text-slate-500" />
                                      <span>{c.localComercial}</span>
                                    </div>
                                  )}
                                  <div className="text-[9px] font-mono text-slate-500">ID: {c.id}</div>
                                </td>

                                {/* Contacto */}
                                <td className="py-2.5 px-3">
                                  <div className="text-slate-300 font-medium">{c.telefono}</div>
                                  {(c.emailRegistro || c.email) && (
                                    <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                      {c.emailRegistro || c.email}
                                    </div>
                                  )}
                                </td>

                                {/* Ubicación */}
                                <td className="py-2.5 px-3">
                                  <div className="text-slate-300 truncate max-w-[160px]">
                                    {c.direccion || 'Sin dirección'}
                                  </div>
                                  {c.zona && (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                                      {c.zona}
                                    </span>
                                  )}
                                </td>

                                {/* Fidelidad & Sellos */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-amber-300">
                                      {sellos} / {necesarios}
                                    </span>
                                    <Award className="w-3.5 h-3.5 text-amber-400" />
                                    {recompensaLista && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                        ¡Premio Listo!
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                                    <div
                                      className="bg-amber-400 h-full rounded-full"
                                      style={{
                                        width: `${Math.min(100, (sellos / necesarios) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </td>

                                {/* Estado */}
                                <td className="py-2.5 px-3">
                                  {c.estadoRegistro === 'pendiente' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-max">
                                      <Clock className="w-3 h-3" />
                                      <span>Pendiente</span>
                                    </span>
                                  ) : c.estadoRegistro === 'rechazado' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                                      <XCircle className="w-3 h-3" />
                                      <span>Rechazado</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-max">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Aprobado</span>
                                    </span>
                                  )}
                                </td>

                                {/* Acciones */}
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onEditCliente(c)}
                                      className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                      title="Editar todos los datos y sellos de este cliente"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Editar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteCliente(c.id)}
                                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                                      title="Eliminar este cliente"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredNegocios.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">
              No se encontraron vidrieros con los filtros actuales
            </div>
            <p className="text-xs text-slate-500">
              Intenta cambiar el término de búsqueda o restablecer los filtros de plan y estado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
