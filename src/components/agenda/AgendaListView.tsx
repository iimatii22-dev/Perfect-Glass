import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CloudRain,
  Users,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Filter,
  Globe,
} from 'lucide-react';
import { Cliente, Turno } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import {
  getTodayISODate,
  getProximosDias,
  formatearFechaLarga,
  formatearFecha,
  getCategoriaFecha,
} from '../../utils/dateUtils';
import { AgendaClienteCard } from './AgendaClienteCard';
import { AgendaTurnoCard } from './AgendaTurnoCard';

interface AgendaListViewProps {
  clientes: Cliente[];
  turnos?: Turno[];
  onSelectCliente: (cliente: Cliente) => void;
  onMarcarVisita: (cliente: Cliente) => void;
  onOpenReprogramar: (fecha: string, clientes: Cliente[]) => void;
  onCompletarTurno?: (turnoId: string) => void;
  onCancelarTurno?: (turno: Turno) => void;
  onSelectTurno?: (turno: Turno) => void;
}

export function AgendaListView({
  clientes,
  turnos = [],
  onSelectCliente,
  onMarcarVisita,
  onOpenReprogramar,
  onCompletarTurno = () => {},
  onCancelarTurno = () => {},
  onSelectTurno,
}: AgendaListViewProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';
  const todayStr = getTodayISODate();

  const [diasRango, setDiasRango] = useState<7 | 14 | 30>(7);

  // Group clients & turnos
  const { clientesVencidos, groupedUpcoming } = useMemo(() => {
    const vencidos: Cliente[] = [];
    const upcomingMap = new Map<
      string,
      { clients: Cliente[]; turnosList: Turno[] }
    >();

    // Target days list for the selected range
    const targetDays = getProximosDias(diasRango);
    targetDays.forEach((d) =>
      upcomingMap.set(d, { clients: [], turnosList: [] })
    );

    // Group clients
    clientes.forEach((c) => {
      if (!c.activo || !c.fechaProximaVisita) return;

      if (c.fechaProximaVisita < todayStr) {
        vencidos.push(c);
      } else if (upcomingMap.has(c.fechaProximaVisita)) {
        upcomingMap.get(c.fechaProximaVisita)!.clients.push(c);
      }
    });

    // Group turnos
    turnos.forEach((t) => {
      if (upcomingMap.has(t.fecha)) {
        upcomingMap.get(t.fecha)!.turnosList.push(t);
      }
    });

    // Sort overdue clients by oldest first
    vencidos.sort((a, b) =>
      a.fechaProximaVisita.localeCompare(b.fechaProximaVisita)
    );

    const upcomingGroups = Array.from(upcomingMap.entries())
      .map(([dateStr, { clients, turnosList }]) => ({
        dateStr,
        clients,
        turnosList: [...turnosList].sort((a, b) =>
          a.horaInicio.localeCompare(b.horaInicio)
        ),
      }))
      .filter((group) => group.clients.length > 0 || group.turnosList.length > 0);

    return {
      clientesVencidos: vencidos,
      groupedUpcoming: upcomingGroups,
    };
  }, [clientes, turnos, todayStr, diasRango]);

  return (
    <div className="space-y-6">
      {/* Range Filter Selector */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            Visitas y Turnos Agrupados
          </h3>
          <p className="text-xs text-slate-500">
            Vista secuencial cronológica integrando turnos online y visitas periódicas
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDiasRango(7)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              diasRango === 7
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Próximos 7 días
          </button>
          <button
            type="button"
            onClick={() => setDiasRango(14)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              diasRango === 14
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            14 días
          </button>
          <button
            type="button"
            onClick={() => setDiasRango(30)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              diasRango === 30
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 días
          </button>
        </div>
      </div>

      {/* Overdue Section */}
      {clientesVencidos.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rose-200/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-rose-950 text-sm sm:text-base flex items-center gap-2">
                  <span>Visitas Vencidas Pendientes</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-xs font-bold">
                    {clientesVencidos.length}
                  </span>
                </h3>
                <p className="text-xs text-rose-700">
                  Clientes cuya fecha de visita periódica ya caducó
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clientesVencidos.map((cliente) => (
              <AgendaClienteCard
                key={cliente.id}
                cliente={cliente}
                onSelect={onSelectCliente}
                onMarcarVisita={onMarcarVisita}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Days Grouped List */}
      {groupedUpcoming.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-100 shadow-xs space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">
            No hay actividades programadas en los próximos {diasRango} días
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Puedes cambiar el rango a 14 o 30 días, o revisar la vista de calendario para planificar con anticipación.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedUpcoming.map((group) => {
            const isToday = group.dateStr === todayStr;
            const category = getCategoriaFecha(group.dateStr);

            let dayBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
            if (isToday) {
              dayBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
            } else if (category === 'proxima_3dias') {
              dayBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
            }

            return (
              <div
                key={group.dateStr}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-4"
              >
                {/* Day Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs border capitalize flex items-center gap-1.5 ${dayBadgeClass}`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatearFechaLarga(group.dateStr)}</span>
                      {isToday && <span>(¡Hoy!)</span>}
                    </span>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      {group.turnosList.length > 0 && (
                        <span className="text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          {group.turnosList.length} turno(s) web
                        </span>
                      )}
                      {group.clients.length > 0 && (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {group.clients.length} visita(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bad Weather Reschedule Button for this day */}
                  {group.clients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenReprogramar(group.dateStr, group.clients)}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 self-start sm:self-auto"
                      title="Mover visitas recurrentes de este día por mal tiempo"
                    >
                      <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                      <span>Reprogramar Mal Tiempo</span>
                    </button>
                  )}
                </div>

                {/* Online Turnos First */}
                {group.turnosList.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3 h-3" />
                      <span>Turnos Online Agendados</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.turnosList.map((turno) => (
                        <AgendaTurnoCard
                          key={turno.id}
                          turno={turno}
                          onCompletar={onCompletarTurno}
                          onCancelar={onCancelarTurno}
                          onSelect={onSelectTurno}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recurring Clients */}
                {group.clients.length > 0 && (
                  <div className="space-y-2">
                    {group.turnosList.length > 0 && (
                      <h5 className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 pt-2">
                        <Users className="w-3 h-3" />
                        <span>Visitas Periódicas</span>
                      </h5>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.clients.map((cliente) => (
                        <AgendaClienteCard
                          key={cliente.id}
                          cliente={cliente}
                          onSelect={onSelectCliente}
                          onMarcarVisita={onMarcarVisita}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
