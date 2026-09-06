import { Presupuesto, Cliente } from '../types';

export interface ReporteMes {
  mesKey: string; // "2026-09"
  mesNombre: string; // "Sep 2026"
  mesCorto: string; // "Sep"
  mesCompleto: string; // "Septiembre 2026"
  ingresos: number;
  presupuestosAceptados: number;
  presupuestosTotales: number;
  visitasCompletadas: number;
  ticketPromedio: number;
  esMesActual: boolean;
}

export interface ClienteRankingItem {
  posicion: number;
  clienteId?: string | null;
  nombre: string;
  telefono: string;
  direccion: string;
  zona: string;
  totalIngresos: number;
  cantidadPresupuestos: number;
  ultimaFechaTrabajo: string;
  promedioPorTrabajo: number;
}

export interface ReportesData {
  // Principales KPIs del Mes Actual
  ingresosMesActual: number;
  ingresosMesAnterior: number;
  porcentajeCrecimiento: number | null; // null if mes anterior was 0 and mes actual 0
  diferenciaIngresos: number;
  esCrecimientoPositivo: boolean;
  
  // Visitas y Presupuestos Mes Actual
  visitasMesActual: number;
  visitasMesAnterior: number;
  presupuestosAceptadosMesActual: number;
  presupuestosTotalesMesActual: number;
  tasaConversionMesActual: number; // Porcentaje de presupuestos aceptados
  ticketPromedioMesActual: number;

  // Timeline de 6 meses
  ultimos6Meses: ReporteMes[];
  totalIngresos6Meses: number;
  promedioMensualIngresos: number;
  mesRecord: { mes: string; ingresos: number } | null;

  // Top 10 Clientes (Últimos 6 meses)
  topClientes6Meses: ClienteRankingItem[];
}

const MESES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const MESES_COMPLETOS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Returns an array of the last N month keys (YYYY-MM) ending in reference date
 */
export function getLastNMonths(count = 6, refDate = new Date()): { year: number; month: number; key: string }[] {
  const result: { year: number; month: number; key: string }[] = [];
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 0-11

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1-12
    const key = `${y}-${String(m).padStart(2, '0')}`;
    result.push({ year: y, month: m, key });
  }

  return result;
}

/**
 * Extracts the YYYY-MM prefix from a date string (YYYY-MM-DD or ISO string)
 */
function getMonthKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  // Handle ISO string or YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return null;
}

/**
 * Computes all revenue and operational metrics from budgets and clients
 */
export function calcularReportes(
  presupuestos: Presupuesto[],
  clientes: Cliente[],
  refDate: Date = new Date()
): ReportesData {
  const monthsInfo = getLastNMonths(6, refDate);
  const currentMonthKey = monthsInfo[monthsInfo.length - 1].key;
  const prevMonthKey = monthsInfo[monthsInfo.length - 2]?.key || '';

  // 1. Initialize 6-month buckets
  const monthBuckets: Record<string, {
    ingresos: number;
    aceptados: number;
    totales: number;
    visitas: number;
  }> = {};

  monthsInfo.forEach((m) => {
    monthBuckets[m.key] = {
      ingresos: 0,
      aceptados: 0,
      totales: 0,
      visitas: 0,
    };
  });

  // 2. Process Presupuestos
  const clientRevenueMap: Record<string, {
    nombre: string;
    telefono: string;
    direccion: string;
    zona: string;
    clienteId?: string | null;
    total: number;
    count: number;
    ultimaFecha: string;
  }> = {};

  // Build client lookup map for enrichment
  const clientDetailsLookup = new Map<string, Cliente>();
  const clientNameLookup = new Map<string, Cliente>();
  clientes.forEach((c) => {
    clientDetailsLookup.set(c.id, c);
    clientNameLookup.set(c.nombre.trim().toLowerCase(), c);
  });

  presupuestos.forEach((p) => {
    const pDateKey = getMonthKey(p.fecha) || getMonthKey(p.creadoEn);
    const isAccepted = p.estado === 'aceptado';
    const amount = Number(p.totalFinal) || 0;

    // Add to 6-month bucket if in range
    if (pDateKey && monthBuckets[pDateKey]) {
      monthBuckets[pDateKey].totales += 1;
      if (isAccepted) {
        monthBuckets[pDateKey].aceptados += 1;
        monthBuckets[pDateKey].ingresos += amount;
      }
    }

    // Accumulate for 6-month Top Clients ranking if accepted and in 6-month window
    if (isAccepted && pDateKey && monthBuckets[pDateKey]) {
      const matchClient =
        (p.clienteId ? clientDetailsLookup.get(p.clienteId) : null) ||
        clientNameLookup.get(p.clienteNombre.trim().toLowerCase());

      const clientKey = p.clienteId || matchClient?.id || p.clienteNombre.trim().toLowerCase();
      const clientName = matchClient?.nombre || p.clienteNombre;
      const clientTel = matchClient?.telefono || p.clienteTelefono || '';
      const clientDir = matchClient?.direccion || '';
      const clientZona = matchClient?.zona || '';

      if (!clientRevenueMap[clientKey]) {
        clientRevenueMap[clientKey] = {
          nombre: clientName,
          telefono: clientTel,
          direccion: clientDir,
          zona: clientZona,
          clienteId: p.clienteId || matchClient?.id || null,
          total: 0,
          count: 0,
          ultimaFecha: p.fecha || p.creadoEn || '',
        };
      }

      clientRevenueMap[clientKey].total += amount;
      clientRevenueMap[clientKey].count += 1;
      if (p.fecha && p.fecha > clientRevenueMap[clientKey].ultimaFecha) {
        clientRevenueMap[clientKey].ultimaFecha = p.fecha;
      }
    }
  });

  // 3. Process Completed Visits from Clients history
  clientes.forEach((c) => {
    if (c.historialVisitas && c.historialVisitas.length > 0) {
      c.historialVisitas.forEach((v) => {
        const vDateKey = getMonthKey(v.fecha) || getMonthKey(v.creadoEn);
        if (vDateKey && monthBuckets[vDateKey]) {
          monthBuckets[vDateKey].visitas += 1;
        }
      });
    } else if (c.fechaUltimaVisita) {
      const vDateKey = getMonthKey(c.fechaUltimaVisita);
      if (vDateKey && monthBuckets[vDateKey]) {
        monthBuckets[vDateKey].visitas += 1;
      }
    }
  });

  // 4. Build 6-Month Timeline
  const ultimos6Meses: ReporteMes[] = monthsInfo.map((m) => {
    const bucket = monthBuckets[m.key] || { ingresos: 0, aceptados: 0, totales: 0, visitas: 0 };
    const monthIndex = m.month - 1;
    const ticketPromedio = bucket.aceptados > 0 ? Math.round(bucket.ingresos / bucket.aceptados) : 0;

    return {
      mesKey: m.key,
      mesNombre: `${MESES_ES[monthIndex]} ${m.year}`,
      mesCorto: MESES_ES[monthIndex],
      mesCompleto: `${MESES_COMPLETOS_ES[monthIndex]} ${m.year}`,
      ingresos: bucket.ingresos,
      presupuestosAceptados: bucket.aceptados,
      presupuestosTotales: bucket.totales,
      visitasCompletadas: bucket.visitas,
      ticketPromedio,
      esMesActual: m.key === currentMonthKey,
    };
  });

  // 5. KPIs Current vs Previous Month
  const currentBucket = monthBuckets[currentMonthKey] || { ingresos: 0, aceptados: 0, totales: 0, visitas: 0 };
  const prevBucket = monthBuckets[prevMonthKey] || { ingresos: 0, aceptados: 0, totales: 0, visitas: 0 };

  const ingresosMesActual = currentBucket.ingresos;
  const ingresosMesAnterior = prevBucket.ingresos;
  const diferenciaIngresos = ingresosMesActual - ingresosMesAnterior;
  const esCrecimientoPositivo = diferenciaIngresos >= 0;

  let porcentajeCrecimiento: number | null = null;
  if (ingresosMesAnterior > 0) {
    porcentajeCrecimiento = Number(
      (((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100).toFixed(1)
    );
  } else if (ingresosMesActual > 0) {
    porcentajeCrecimiento = 100;
  } else {
    porcentajeCrecimiento = 0;
  }

  const visitasMesActual = currentBucket.visitas;
  const visitasMesAnterior = prevBucket.visitas;
  const presupuestosAceptadosMesActual = currentBucket.aceptados;
  const presupuestosTotalesMesActual = currentBucket.totales;
  const tasaConversionMesActual =
    presupuestosTotalesMesActual > 0
      ? Math.round((presupuestosAceptadosMesActual / presupuestosTotalesMesActual) * 100)
      : 0;
  const ticketPromedioMesActual =
    presupuestosAceptadosMesActual > 0
      ? Math.round(ingresosMesActual / presupuestosAceptadosMesActual)
      : 0;

  // 6. Aggregate 6-month summary & Record Month
  let totalIngresos6Meses = 0;
  let maxIngresos = -1;
  let mesRecord: { mes: string; ingresos: number } | null = null;

  ultimos6Meses.forEach((m) => {
    totalIngresos6Meses += m.ingresos;
    if (m.ingresos > maxIngresos && m.ingresos > 0) {
      maxIngresos = m.ingresos;
      mesRecord = { mes: m.mesCompleto, ingresos: m.ingresos };
    }
  });

  const promedioMensualIngresos = Math.round(totalIngresos6Meses / ultimos6Meses.length);

  // 7. Sort and build Top 10 Clients Ranking
  const rankingList = Object.values(clientRevenueMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const topClientes6Meses: ClienteRankingItem[] = rankingList.map((item, index) => ({
    posicion: index + 1,
    clienteId: item.clienteId,
    nombre: item.nombre,
    telefono: item.telefono,
    direccion: item.direccion,
    zona: item.zona,
    totalIngresos: item.total,
    cantidadPresupuestos: item.count,
    ultimaFechaTrabajo: item.ultimaFecha,
    promedioPorTrabajo: item.count > 0 ? Math.round(item.total / item.count) : 0,
  }));

  return {
    ingresosMesActual,
    ingresosMesAnterior,
    porcentajeCrecimiento,
    diferenciaIngresos,
    esCrecimientoPositivo,
    visitasMesActual,
    visitasMesAnterior,
    presupuestosAceptadosMesActual,
    presupuestosTotalesMesActual,
    tasaConversionMesActual,
    ticketPromedioMesActual,
    ultimos6Meses,
    totalIngresos6Meses,
    promedioMensualIngresos,
    mesRecord,
    topClientes6Meses,
  };
}

/**
 * Format currency with locale string (e.g., "$ 45.000")
 */
export function formatCurrency(amount: number, symbol = '$'): string {
  return `${symbol} ${Math.round(amount).toLocaleString('es-UY')}`;
}
