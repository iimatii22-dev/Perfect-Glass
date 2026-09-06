import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CloudRain,
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Globe,
} from 'lucide-react';
import { Cliente, Turno } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import {
  getCalendarGrid,
  getTodayISODate,
  formatearFecha,
  formatearFechaLarga,
  getCategoriaFecha,
  CalendarDay,
} from '../../utils/dateUtils';
import { AgendaClienteCard } from './AgendaClienteCard';
import { AgendaTurnoCard } from './AgendaTurnoCard';

interface AgendaCalendarViewProps {
  clientes: Cliente[];
  turnos?: Turno[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onSelectCliente: (cliente: Cliente) => void;
  onMarcarVisita: (cliente: Cliente) => void;
  onOpenReprogramar: (fecha: string, clientes: Cliente[]) => void;
  onCompletarTurno?: (turnoId: string) => void;
  onConfirmarTurno?: (turnoId: string) => void;
  onCancelarTurno?: (turno: Turno) => void;
  onSelectTurno?: (turno: Turno) => void;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function AgendaCalendarView({
  clientes,
  turnos = [],
  selectedDate,
  onSelectDate,
  onSelectCliente,
  onMarcarVisita,
  onOpenReprogramar,
  onCompletarTurno = () => {},
  onConfirmarTurno,
  onCancelarTurno = () => {},
  onSelectTurno,
}: AgendaCalendarViewProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  // Current viewed month and year
  const initialDate = selectedDate || getTodayISODate();
  const [initYear, initMonth] = initialDate.split('-').map(Number);
  const [currentYear, setCurrentYear] = useState<number>(initYear);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(
    initMonth - 1
  );

  // Group clients by their fechaProximaVisita
  const clientsByDate = useMemo(() => {
    const map = new Map<string, Cliente[]>();
    clientes.forEach((c) => {
      if (!c.activo || !c.fechaProximaVisita) return;
      const list = map.get(c.fechaProximaVisita) || [];
      list.push(c);
      map.set(c.fechaProximaVisita, list);
    });
    return map;
  }, [clientes]);

  // Group turnos by their fecha
  const turnosByDate = useMemo(() => {
    const map = new Map<string, Turno[]>();
    turnos.forEach((t) => {
      const list = map.get(t.fecha) || [];
      list.push(t);
      map.set(t.fecha, list);
    });
    return map;
  }, [turnos]);

  // Calendar grid days
  const calendarGrid = useMemo(() => {
    return getCalendarGrid(currentYear, currentMonthIndex);
  }, [currentYear, currentMonthIndex]);

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const today = getTodayISODate();
    const [y, m] = today.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonthIndex(m - 1);
    onSelectDate(today);
  };

  // Items for the currently selected date
  const selectedDayClients = useMemo(() => {
    return clientsByDate.get(selectedDate) || [];
  }, [clientsByDate, selectedDate]);

  const selectedDayTurnos = useMemo(() => {
    const list = turnosByDate.get(selectedDate) || [];
    return [...list].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [turnosByDate, selectedDate]);

  return (
    <div className="space-y-5">
      {/* Calendar Card Container */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-xs space-y-4">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 capitalize">
              {MONTH_NAMES[currentMonthIndex]} {currentYear}
            </h2>
            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Color Legend */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200" />
              <span className="font-semibold text-sky-700">Turnos Web</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              <span className="font-semibold text-emerald-700">Visitas Recurrentes</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              <span className="font-semibold text-amber-700">Próximos 3 días</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
              <span className="font-semibold text-rose-700">Vencidas</span>
            </span>
          </div>

          <span className="text-slate-400 text-[10px]">
            Toca un día para ver su cronograma
          </span>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-xs py-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarGrid.map((day: CalendarDay) => {
            const dayClients = clientsByDate.get(day.dateStr) || [];
            const dayTurnos = turnosByDate.get(day.dateStr) || [];
            const clientsCount = dayClients.length;
            const turnosCount = dayTurnos.length;
            const totalCount = clientsCount + turnosCount;

            const isSelected = day.dateStr === selectedDate;
            const category = getCategoriaFecha(day.dateStr);

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => onSelectDate(day.dateStr)}
                className={`min-h-[62px] sm:min-h-[72px] p-1.5 rounded-2xl flex flex-col items-center justify-between text-left transition-all relative ${
                  isSelected
                    ? 'ring-2 ring-sky-500 bg-sky-50/70 shadow-xs z-10'
                    : day.isToday
                    ? 'bg-slate-100/90 font-bold'
                    : day.isCurrentMonth
                    ? 'bg-slate-50/60 hover:bg-slate-100/70'
                    : 'bg-slate-50/20 text-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {/* Day number & Today pill */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs font-bold leading-none ${
                      day.isToday
                        ? 'w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]'
                        : isSelected
                        ? 'text-sky-700'
                        : day.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {day.isToday && !totalCount && (
                    <span className="hidden sm:inline-block text-[9px] font-bold text-slate-500">
                      Hoy
                    </span>
                  )}
                </div>

                {/* Markers Strip */}
                {totalCount > 0 && (
                  <div className="w-full flex flex-col gap-0.5 mt-1">
                    {turnosCount > 0 && (
                      <span className="px-1 py-0.5 rounded bg-sky-500 text-white text-[9px] font-extrabold truncate text-center leading-none shadow-2xs">
                        {turnosCount} {turnosCount === 1 ? 'turno web' : 'turnos web'}
                      </span>
                    )}
                    {clientsCount > 0 && (
                      <span
                        className={`px-1 py-0.5 rounded text-[9px] font-extrabold truncate text-center leading-none shadow-2xs ${
                          category === 'vencida'
                            ? 'bg-rose-600 text-white'
                            : category === 'proxima_3dias'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {clientsCount} {clientsCount === 1 ? 'visita' : 'visitas'}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 capitalize">
                {formatearFechaLarga(selectedDate)}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedDayClients.length + selectedDayTurnos.length === 0
                ? 'No hay visitas ni turnos programados para este día'
                : `${selectedDayTurnos.length} turno(s) online y ${selectedDayClients.length} visita(s) recurrente(s)`}
            </p>
          </div>

          {/* Reprogramar por mal tiempo button (only affects recurring clients) */}
          {selectedDayClients.length > 0 && (
            <button
              type="button"
              id="btn-reprogramar-mal-tiempo"
              onClick={() => onOpenReprogramar(selectedDate, selectedDayClients)}
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center gap-2 transition-all shrink-0 active:scale-95"
              title="Mover todas las visitas periódicas de este día a otra fecha por lluvia o clima"
            >
              <CloudRain className="w-4 h-4 text-sky-600" />
              <span>Reprogramar Visitas por Mal Tiempo</span>
            </button>
          )}
        </div>

        {/* Turnos Online Section */}
        {selectedDayTurnos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Globe className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Turnos Agendados Online ({selectedDayTurnos.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDayTurnos.map((turno) => (
                <AgendaTurnoCard
                  key={turno.id}
                  turno={turno}
                  onCompletar={onCompletarTurno}
                  onConfirmar={onConfirmarTurno}
                  onCancelar={onCancelarTurno}
                  onSelect={onSelectTurno}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recurring Clients Section */}
        <div className="space-y-3">
          {selectedDayTurnos.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Users className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Visitas Periódicas de Clientes ({selectedDayClients.length})
              </h4>
            </div>
          )}

          {selectedDayClients.length === 0 && selectedDayTurnos.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto opacity-70" />
              <p className="font-bold text-slate-700 text-xs">
                Día libre de visitas y turnos
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Puedes seleccionar otro día con marcador en el calendario para consultar o gestionar sus servicios.
              </p>
            </div>
          ) : selectedDayClients.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No hay visitas periódicas adicionales para este día.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDayClients.map((cliente) => (
                <AgendaClienteCard
                  key={cliente.id}
                  cliente={cliente}
                  onSelect={onSelectCliente}
                  onMarcarVisita={onMarcarVisita}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
