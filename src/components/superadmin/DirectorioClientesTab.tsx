import React, { useState } from 'react';
import {
  Users,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Award,
  Edit3,
  Trash2,
  Plus,
  Store,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { Cliente, BusinessConfig } from '../../types';

interface DirectorioClientesTabProps {
  clientes: Cliente[];
  negocios: BusinessConfig[];
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (clienteId: string) => void;
  onCrearCliente: () => void;
}

export function DirectorioClientesTab({
  clientes,
  negocios,
  onEditCliente,
  onDeleteCliente,
  onCrearCliente,
}: DirectorioClientesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNegocioId, setSelectedNegocioId] = useState<string>('todos');
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');

  const negociosMap = React.useMemo(() => {
    const map: Record<string, BusinessConfig> = {};
    negocios.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [negocios]);

  const filteredClientes = clientes.filter((c) => {
    const term = searchTerm.toLowerCase();
    const neg = negociosMap[c.negocioId || ''];
    const negocioNombre = (neg?.nombreNegocio || '').toLowerCase();

    const matchesSearch =
      (c.nombre || '').toLowerCase().includes(term) ||
      (c.telefono || '').includes(term) ||
      (c.emailRegistro || '').toLowerCase().includes(term) ||
      (c.localComercial || '').toLowerCase().includes(term) ||
      (c.direccion || '').toLowerCase().includes(term) ||
      (c.zona || '').toLowerCase().includes(term) ||
      negocioNombre.includes(term);

    const matchesNegocio =
      selectedNegocioId === 'todos' || c.negocioId === selectedNegocioId;

    const matchesEstado =
      selectedEstado === 'todos' ||
      (selectedEstado === 'pendiente' && c.estadoRegistro === 'pendiente') ||
      (selectedEstado === 'aprobado' && c.estadoRegistro !== 'pendiente' && c.estadoRegistro !== 'rechazado') ||
      (selectedEstado === 'rechazado' && c.estadoRegistro === 'rechazado');

    return matchesSearch && matchesNegocio && matchesEstado;
  });

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente globalmente por nombre, vidriero, teléfono, comercio o zona..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Filter by vidriero */}
            <select
              value={selectedNegocioId}
              onChange={(e) => setSelectedNegocioId(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos los Vidrieros</option>
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombreNegocio}
                </option>
              ))}
            </select>

            {/* Filter by status */}
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos los Estados</option>
              <option value="aprobado">Aprobados</option>
              <option value="pendiente">Pendientes</option>
              <option value="rechazado">Rechazados</option>
            </select>

            <button
              onClick={onCrearCliente}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Cliente</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          Mostrando <span className="font-bold text-white">{filteredClientes.length}</span> de{' '}
          <span className="font-bold text-white">{clientes.length}</span> clientes registrados en toda la plataforma
        </div>
      </div>

      {/* Clientes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Cliente / Local</th>
                <th className="py-3 px-4">Vidriero Asignado</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Ubicación</th>
                <th className="py-3 px-4">Sellos & Fidelidad</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClientes.map((c) => {
                const neg = negociosMap[c.negocioId || ''];
                const sellos = c.sellosAcumulados || 0;
                const necesarios = c.sellosNecesarios || 5;
                const recompensaLista = c.recompensaDisponible || sellos >= necesarios;

                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Cliente / Local */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{c.nombre}</div>
                      {c.localComercial && c.localComercial !== c.nombre && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-500" />
                          <span>{c.localComercial}</span>
                        </div>
                      )}
                      <div className="text-[9px] font-mono text-slate-500">ID: {c.id}</div>
                    </td>

                    {/* Vidriero Asignado */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: neg?.colorPrimario || '#6366f1' }}
                        >
                          {neg?.nombreNegocio?.charAt(0).toUpperCase() || 'V'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">
                            {neg?.nombreNegocio || 'Vidriería General'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">{c.negocioId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contacto */}
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{c.telefono}</span>
                      </div>
                      {c.emailRegistro && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[150px]">
                          <Mail className="w-3 h-3 text-slate-600" />
                          <span>{c.emailRegistro}</span>
                        </div>
                      )}
                    </td>

                    {/* Ubicación */}
                    <td className="py-3 px-4">
                      <div className="text-slate-300 truncate max-w-[170px]">
                        {c.direccion || 'Sin dirección'}
                      </div>
                      {c.zona && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 mt-0.5">
                          {c.zona}
                        </span>
                      )}
                    </td>

                    {/* Sellos & Fidelidad */}
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditCliente(c)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Editar cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCliente(c.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Eliminar cliente"
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

        {filteredClientes.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">
              No se encontraron clientes con los filtros aplicados
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
