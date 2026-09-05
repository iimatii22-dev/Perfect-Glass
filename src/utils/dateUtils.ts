/**
 * Utility functions for date calculations, formatting, and visit countdowns
 */

export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates next visit date in YYYY-MM-DD format by adding days to the last visit date
 */
export function calcularProximaVisita(fechaUltima: string, frecuenciaDias: number): string {
  if (!fechaUltima) {
    fechaUltima = getTodayISODate();
  }
  
  const [year, month, day] = fechaUltima.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + (frecuenciaDias || 30));
  
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export interface EstadoVisita {
  dias: number;
  estado: 'vencida' | 'hoy' | 'manana' | 'esta_semana' | 'al_dia';
  etiqueta: string;
  badgeClass: string;
}

/**
 * Calculates remaining days and badge status based on target next visit date
 */
export function calcularDiasRestantes(fechaProximaStr: string): EstadoVisita {
  if (!fechaProximaStr) {
    return {
      dias: 0,
      estado: 'al_dia',
      etiqueta: 'Sin fecha',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  }

  const todayStr = getTodayISODate();
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  const today = new Date(tYear, tMonth - 1, tDay);

  const [pYear, pMonth, pDay] = fechaProximaStr.split('-').map(Number);
  const proxima = new Date(pYear, pMonth - 1, pDay);

  const diffTime = proxima.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      dias: diffDays,
      estado: 'vencida',
      etiqueta: absDays === 1 ? 'Vencida ayer' : `Vencida hace ${absDays}d`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    };
  }

  if (diffDays === 0) {
    return {
      dias: 0,
      estado: 'hoy',
      etiqueta: '¡Toca hoy!',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold animate-pulse',
    };
  }

  if (diffDays === 1) {
    return {
      dias: 1,
      estado: 'manana',
      etiqueta: 'Mañana',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    };
  }

  if (diffDays <= 7) {
    return {
      dias: diffDays,
      estado: 'esta_semana',
      etiqueta: `En ${diffDays} días (esta semana)`,
      badgeClass: 'bg-amber-50/80 text-amber-700 border-amber-200 font-semibold',
    };
  }

  return {
    dias: diffDays,
    estado: 'al_dia',
    etiqueta: `En ${diffDays} días`,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 font-medium',
  };
}

/**
 * Formats YYYY-MM-DD into readable Spanish format
 */
export function formatearFecha(fechaStr?: string): string {
  if (!fechaStr) return 'Sin fecha';
  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    if (!year || !month || !day) return fechaStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return fechaStr;
  }
}

/**
 * Formats YYYY-MM-DD into long Spanish format: "Lunes, 1 de Septiembre"
 */
export function formatearFechaLarga(fechaStr?: string): string {
  if (!fechaStr) return 'Sin fecha';
  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    if (!year || !month || !day) return fechaStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return fechaStr;
  }
}

export type CategoriaFecha = 'vencida' | 'proxima_3dias' | 'futura';

/**
 * Categorizes a date into:
 * - 'vencida': < 0 days (past due)
 * - 'proxima_3dias': 0 to 3 days (today, tomorrow, next 2-3 days)
 * - 'futura': > 3 days (future visits)
 */
export function getCategoriaFecha(fechaStr?: string): CategoriaFecha {
  if (!fechaStr) return 'futura';
  const todayStr = getTodayISODate();
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  const today = new Date(tYear, tMonth - 1, tDay);

  const [pYear, pMonth, pDay] = fechaStr.split('-').map(Number);
  const target = new Date(pYear, pMonth - 1, pDay);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'vencida';
  if (diffDays <= 3) return 'proxima_3dias';
  return 'futura';
}

export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generates days for a calendar month grid (Monday to Sunday)
 */
export function getCalendarGrid(year: number, monthIndex: number): CalendarDay[] {
  const todayStr = getTodayISODate();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  // Day of week for 1st of month: 0 (Sun) to 6 (Sat)
  // Convert to Monday=0, ..., Sunday=6
  let startingDayOfWeek = (firstDay.getDay() + 6) % 7;

  const days: CalendarDay[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
    const prevYear = monthIndex === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to complete the 35 or 42 grid cells
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
    const nextYear = monthIndex === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

/**
 * Returns array of date strings for the next N days starting from today
 */
export function getProximosDias(numDias: number = 7): string[] {
  const result: string[] = [];
  const todayStr = getTodayISODate();
  const [year, month, day] = todayStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);

  for (let i = 0; i < numDias; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${dayNum}`);
  }
  return result;
}
