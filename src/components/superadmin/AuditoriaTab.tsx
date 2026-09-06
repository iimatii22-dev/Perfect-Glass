import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  User,
  Building2,
  RefreshCw,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { RegistroAuditoria } from '../../types';
import { obtenerHistorialAuditoria } from '../../lib/auditoriaService';

export function AuditoriaTab() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const cargarRegistros = async () => {
    setLoading(true);
    try {
      const data = await obtenerHistorialAuditoria(50);
      setRegistros(data);
    } catch (err) {
      console.warn('Error al cargar auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, []);

  const filteredRegistros = registros.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.accion.toLowerCase().includes(term) ||
      (r.negocioId && r.negocioId.toLowerCase().includes(term)) ||
      (r.superAdminEmail && r.superAdminEmail.toLowerCase().includes(term))
    );
  });

  const getBadgeStyle = (accion: string) => {
    if (accion.includes('suspender')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    if (accion.includes('activar') || accion.includes('crear')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
    if (accion.includes('impersonar') || accion.includes('soporte')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <span>Registro de Auditoría de Acciones SuperAdmin</span>
          </h3>
          <p className="text-xs text-slate-400">
            Historial inmutable de cambios de estado, planes, creación de negocios y sesiones de soporte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarRegistros}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Search filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar por acción, email o negocioId..."
          className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
          Cargando registros de auditoría...
        </div>
      ) : filteredRegistros.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          No hay registros de auditoría que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRegistros.map((reg) => (
            <div
              key={reg.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border ${getBadgeStyle(
                      reg.accion
                    )}`}
                  >
                    {reg.accion}
                  </span>
                  {reg.negocioId && (
                    <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                      Negocio: {reg.negocioId}
                    </span>
                  )}
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(reg.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Por:</span>
                  <strong className="text-slate-200">{reg.superAdminEmail}</strong>
                </div>

                {reg.detalles && Object.keys(reg.detalles).length > 0 && (
                  <div className="bg-slate-950 p-2 rounded-xl font-mono text-[11px] text-slate-400 overflow-x-auto border border-slate-800/80">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(reg.detalles, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
