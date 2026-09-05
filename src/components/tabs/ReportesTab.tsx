import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle2,
  Users,
  Award,
  BarChart3,
  Phone,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  FileSpreadsheet,
  Download,
  Info,
  Star,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  ExternalLink,
  Filter,
  Copy,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Presupuesto, Cliente, BusinessConfig, FeedbackInterno } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { subscribeToPresupuestos } from '../../lib/presupuestosService';
import { subscribeToClientes } from '../../lib/clientesService';
import {
  subscribeToFeedbackInterno,
  calcularEstadisticasFeedback,
} from '../../lib/feedbackService';
import { calcularReportes, formatCurrency } from '../../lib/reportesService';
import { generateOpinionUrl } from '../../lib/emailNotificationService';
import { formatearFecha } from '../../utils/dateUtils';

interface ReportesTabProps {
  onNavigateToTab?: (tab: string) => void;
  onSelectCliente?: (cliente: Cliente) => void;
}

export function ReportesTab({ onNavigateToTab }: ReportesTabProps) {
  const { config, currentNegocioId } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackInterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricView, setMetricView] = useState<'ingresos' | 'operaciones'>('ingresos');
  const [feedbackFilter, setFeedbackFilter] = useState<'criticos' | 'todos'>('criticos');
  const [copiedLink, setCopiedLink] = useState(false);

  // Subscriptions to live Firestore collections
  useEffect(() => {
    setLoading(true);
    const unsubPresupuestos = subscribeToPresupuestos((data) => {
      setPresupuestos(data);
      setLoading(false);
    }, currentNegocioId);

    const unsubClientes = subscribeToClientes((data) => {
      setClientes(data);
    }, currentNegocioId);

    const unsubFeedback = subscribeToFeedbackInterno((data) => {
      setFeedbackList(data);
    }, currentNegocioId);

    return () => {
      unsubPresupuestos();
      unsubClientes();
      unsubFeedback();
    };
  }, [currentNegocioId]);

  // Compute all report metrics dynamically
  const reportData = useMemo(() => {
    return calcularReportes(presupuestos, clientes);
  }, [presupuestos, clientes]);

  // Compute aggregated customer satisfaction & feedback metrics
  const feedbackStats = useMemo(() => {
    return calcularEstadisticasFeedback(feedbackList);
  }, [feedbackList]);

  const currencySymbol = '$';

  // Export report summary as text/CSV download
  const handleExportSummary = () => {
    const lines = [
      `REPORTE FINANCIERO Y DE INGRESOS - ${config.nombreNegocio || 'Perfect Glass'}`,
      `Fecha de Emisión: ${new Date().toLocaleDateString('es-UY')}`,
      `----------------------------------------------------`,
      `1. RESUMEN DEL MES ACTUAL (${reportData.ultimos6Meses[reportData.ultimos6Meses.length - 1]?.mesCompleto}):`,
      `• Ingresos Totales: ${formatCurrency(reportData.ingresosMesActual, currencySymbol)}`,
      `• Ingresos Mes Anterior: ${formatCurrency(reportData.ingresosMesAnterior, currencySymbol)}`,
      `• Variación Mensual: ${reportData.porcentajeCrecimiento !== null ? `${reportData.porcentajeCrecimiento > 0 ? '+' : ''}${reportData.porcentajeCrecimiento}%` : 'N/A'}`,
      `• Visitas Completadas: ${reportData.visitasMesActual}`,
      `• Presupuestos Aceptados: ${reportData.presupuestosAceptadosMesActual} de ${reportData.presupuestosTotalesMesActual} (${reportData.tasaConversionMesActual}%)`,
      `• Ticket Promedio: ${formatCurrency(reportData.ticketPromedioMesActual, currencySymbol)}`,
      ``,
      `2. HISTORIAL DE INGRESOS (ÚLTIMOS 6 MESES):`,
      ...reportData.ultimos6Meses.map(
        (m) => `• ${m.mesCompleto}: ${formatCurrency(m.ingresos, currencySymbol)} (${m.presupuestosAceptados} presupuestos, ${m.visitasCompletadas} visitas)`
      ),
      `• Total Acumulado 6 Meses: ${formatCurrency(reportData.totalIngresos6Meses, currencySymbol)}`,
      `• Promedio Mensual: ${formatCurrency(reportData.promedioMensualIngresos, currencySymbol)}`,
      ``,
      `3. TOP 10 CLIENTES POR FACTURACIÓN (ÚLTIMOS 6 MESES):`,
      ...reportData.topClientes6Meses.map(
        (c) => `#${c.posicion} ${c.nombre} | ${c.telefono} | ${c.cantidadPresupuestos} trabajos | Total: ${formatCurrency(c.totalIngresos, currencySymbol)}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_ingresos_perfectglass_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Reportes de Ingresos
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                Solo Administrador
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Análisis financiero, comparativas de crecimiento y ranking de clientes en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportSummary}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Descargar Resumen</span>
          </button>
        </div>
      </div>

      {/* TOP KPI NUMBERS (High Contrast, Large Bold Display) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingresos Mes Actual & Comparison */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ingresos Mes Actual
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(reportData.ingresosMesActual, currencySymbol)}
            </div>

            {/* Growth / Comparison Pill */}
            <div className="flex items-center gap-2 mt-2">
              {reportData.porcentajeCrecimiento !== null ? (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold ${
                    reportData.esCrecimientoPositivo
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {reportData.esCrecimientoPositivo ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {reportData.porcentajeCrecimiento > 0 ? '+' : ''}
                  {reportData.porcentajeCrecimiento}%
                </span>
              ) : null}
              <span className="text-[11px] text-slate-400">
                vs. {formatCurrency(reportData.ingresosMesAnterior, currencySymbol)} mes ant.
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total 6 Meses Facturado */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Últimos 6 Meses
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(reportData.totalIngresos6Meses, currencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Promedio: <strong className="text-slate-700">{formatCurrency(reportData.promedioMensualIngresos, currencySymbol)}</strong> / mes
            </p>
          </div>
        </div>

        {/* KPI 3: Visitas Completadas en el Mes */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Visitas Completadas
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
              <span>{reportData.visitasMesActual}</span>
              <span className="text-sm font-semibold text-slate-400">visitas</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {reportData.visitasMesAnterior} visitas en el mes anterior
            </p>
          </div>
        </div>

        {/* KPI 4: Presupuestos Aceptados & Ticket Promedio */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Presupuestos Aprobados
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
              <span>{reportData.presupuestosAceptadosMesActual}</span>
              <span className="text-xs font-semibold text-slate-400">
                / {reportData.presupuestosTotalesMesActual} totales ({reportData.tasaConversionMesActual}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Ticket Promedio: <strong className="text-slate-700">{formatCurrency(reportData.ticketPromedioMesActual, currencySymbol)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 6-MONTH BAR CHART SECTION */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600" />
              <span>Evolución de Ingresos (Últimos 6 Meses)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Gráfico mensual de ingresos generados por presupuestos aceptados
            </p>
          </div>

          {/* Toggle View: Ingresos ($) vs Visitas (Cant) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/70 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMetricView('ingresos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                metricView === 'ingresos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ingresos ($)
            </button>
            <button
              type="button"
              onClick={() => setMetricView('operaciones')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                metricView === 'operaciones'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visitas & Trabajos
            </button>
          </div>
        </div>

        {/* Chart Render Area */}
        <div className="w-full h-72 sm:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reportData.ultimos6Meses}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="mesCorto"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) =>
                  metricView === 'ingresos'
                    ? val >= 1000
                      ? `$${val / 1000}k`
                      : `$${val}`
                    : `${val}`
                }
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-800">
                        <p className="font-extrabold text-sm text-sky-300">
                          {data.mesCompleto}
                        </p>
                        <div className="pt-1 border-t border-slate-800 space-y-1">
                          <p className="flex justify-between gap-4">
                            <span className="text-slate-400">Ingresos Totales:</span>
                            <span className="font-bold text-white">
                              {formatCurrency(data.ingresos, currencySymbol)}
                            </span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-slate-400">Presupuestos Aceptados:</span>
                            <span className="font-semibold text-emerald-400">
                              {data.presupuestosAceptados}
                            </span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-slate-400">Visitas Realizadas:</span>
                            <span className="font-semibold text-indigo-300">
                              {data.visitasCompletadas}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey={metricView === 'ingresos' ? 'ingresos' : 'visitasCompletadas'}
                radius={[8, 8, 0, 0]}
              >
                {reportData.ultimos6Meses.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.esMesActual
                        ? primaryColor
                        : '#cbd5e1'
                    }
                    className="hover:opacity-90 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Stats Footer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Mes con Mayor Facturación</span>
            <strong className="text-slate-800 font-bold">
              {reportData.mesRecord ? reportData.mesRecord.mes : 'N/A'}{' '}
              {reportData.mesRecord && `(${formatCurrency(reportData.mesRecord.ingresos, currencySymbol)})`}
            </strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Promedio Mensual</span>
            <strong className="text-slate-800 font-bold">
              {formatCurrency(reportData.promedioMensualIngresos, currencySymbol)} / mes
            </strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[11px]">Mes en Curso</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              <strong className="text-slate-800 font-bold">
                {reportData.ultimos6Meses[reportData.ultimos6Meses.length - 1]?.mesCompleto}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 10 CLIENTS RANKING TABLE (Last 6 Months) */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Top 10 Clientes con Mayores Ingresos</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ranking de clientes que más facturación generaron en los últimos 6 meses (ordenados de mayor a menor)
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
            {reportData.topClientes6Meses.length} Clientes Destacados
          </span>
        </div>

        {reportData.topClientes6Meses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Aún no hay presupuestos aceptados</p>
            <p className="text-[11px] text-slate-400">
              A medida que marques presupuestos con estado "Aceptado", aparecerán en este ranking.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-4">Cliente / Local</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4 text-center">Trabajos Aceptados</th>
                  <th className="py-3 px-4 text-right">Total Facturado</th>
                  <th className="py-3 px-3 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.topClientes6Meses.map((item) => {
                  const isTop1 = item.posicion === 1;
                  const isTop2 = item.posicion === 2;
                  const isTop3 = item.posicion === 3;

                  return (
                    <tr
                      key={item.posicion}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Rank Position */}
                      <td className="py-3.5 px-3 text-center">
                        {isTop1 ? (
                          <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center mx-auto border border-amber-300 shadow-2xs">
                            🥇 1
                          </span>
                        ) : isTop2 ? (
                          <span className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center mx-auto border border-slate-300 shadow-2xs">
                            🥈 2
                          </span>
                        ) : isTop3 ? (
                          <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-800 font-black text-xs flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center mx-auto">
                            {item.posicion}
                          </span>
                        )}
                      </td>

                      {/* Client Name & Zone */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {item.nombre}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          {item.direccion ? (
                            <span className="truncate max-w-[200px]">{item.direccion}</span>
                          ) : item.zona ? (
                            <span>Zona: {item.zona}</span>
                          ) : (
                            <span>Cliente registrado</span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.telefono || 'Sin teléfono'}
                      </td>

                      {/* Jobs count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 text-xs">
                          {item.cantidadPresupuestos} {item.cantidadPresupuestos === 1 ? 'servicio' : 'servicios'}
                        </span>
                      </td>

                      {/* Total Invoiced */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-black text-sm sm:text-base ${
                            isTop1 ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {formatCurrency(item.totalIngresos, currencySymbol)}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Prom: {formatCurrency(item.promedioPorTrabajo, currencySymbol)} / trab.
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.telefono && (
                            <a
                              href={`https://wa.me/${item.telefono.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          {item.telefono && (
                            <a
                              href={`tel:${item.telefono}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Llamar"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
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

      {/* SUBSECTION: FEEDBACK DE CLIENTES & PRE-FILTRO DE SATISFACCIÓN */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Feedback de Clientes &amp; Filtro de Reseñas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                  {feedbackStats.totalRespuestas} respuestas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Métricas del pre-filtro de satisfacción: opiniones 4-5 dirigidas a Google Reviews vs. feedback 1-3 retenido internamente.
              </p>
            </div>
          </div>

          {/* Quick link tester */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-copiar-link-opinion"
              onClick={() => {
                navigator.clipboard.writeText(generateOpinionUrl());
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Link Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar Link Encuesta</span>
                </>
              )}
            </button>

            <a
              href={generateOpinionUrl()}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors"
              title="Abrir vista previa de la encuesta de opinión"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* FEEDBACK KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Promedio General */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Promedio General
              </span>
              <div className="flex items-center text-amber-500">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-950">
                {feedbackStats.promedioCalificacion > 0
                  ? feedbackStats.promedioCalificacion.toFixed(1)
                  : 'N/A'}
              </span>
              <span className="text-xs font-bold text-amber-700">/ 5.0</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Basado en {feedbackStats.totalRespuestas} respuestas registradas en feedback interno.
            </p>
          </div>

          {/* Card 2: Derivados a Google (4-5 estrellas) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Derivados a Google (4-5 ⭐)
              </span>
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                {feedbackStats.derivadosGoogle}
              </span>
              <span className="text-xs font-bold text-emerald-700">
                ({feedbackStats.porcentajeDerivadosGoogle}%)
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Clientes totalmente conformes invitados a dejar reseña pública 5 estrellas.
            </p>
          </div>

          {/* Card 3: Feedback Interno de Mejora (1-3 estrellas) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 border border-rose-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Feedback de Mejora (1-3 ⭐)
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-950">
                {feedbackStats.feedbackInternoMejora}
              </span>
              <span className="text-xs font-bold text-rose-700">
                ({feedbackStats.porcentajeFeedbackMejora}%)
              </span>
            </div>
            <p className="text-[11px] text-rose-800">
              Retenidos internamente para contactar al cliente antes de que publique una mala reseña.
            </p>
          </div>

          {/* Card 4: Distribución de Estrellas */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Desglose de Calificaciones
            </span>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = feedbackStats.distribucion[stars] || 0;
              const pct = feedbackStats.totalRespuestas > 0
                ? Math.round((count / feedbackStats.totalRespuestas) * 100)
                : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-[11px]">
                  <span className="w-5 font-bold text-slate-600">{stars}★</span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[10px] text-slate-500 font-semibold">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FEEDBACK LIST SECTION */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Registro de Respuestas de Clientes</span>
            </h3>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                id="btn-filtro-feedback-criticos"
                onClick={() => setFeedbackFilter('criticos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  feedbackFilter === 'criticos'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Atención Prioritaria (1-3 ⭐) [{feedbackStats.feedbackInternoMejora}]
              </button>
              <button
                type="button"
                id="btn-filtro-feedback-todos"
                onClick={() => setFeedbackFilter('todos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  feedbackFilter === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas las Respuestas [{feedbackList.length}]
              </button>
            </div>
          </div>

          {/* List Content */}
          {feedbackList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500">
                Aún no se han recibido respuestas en la encuesta de satisfacción.
              </p>
            </div>
          ) : feedbackFilter === 'criticos' && feedbackStats.criticos.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-200 text-emerald-800 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs sm:text-sm font-bold">
                ¡Excelente! No hay comentarios de calificación 1, 2 o 3 pendientes de revisión.
              </p>
              <p className="text-[11px] text-emerald-700">
                Todos tus clientes han calificado 4 o 5 estrellas y han sido derivados a Google Reviews.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(feedbackFilter === 'criticos' ? feedbackStats.criticos : feedbackList).map(
                (item) => {
                  const stars = item.calificacion || 5;
                  const isLow = stars <= 3;
                  const cleanPhone = (item.clienteTelefono || '').replace(/\D/g, '');
                  const waResolutionMessage = encodeURIComponent(
                    `Hola ${item.clienteNombre || 'estimado cliente'}, te escribo de ${config.nombreNegocio || 'Perfect Glass'}. Leímos tu opinión sobre la última visita y queremos contactarte para solucionar cualquier detalle pendiente y asegurarte un servicio 100% impecable. ¿Cómo podemos ayudarte?`
                  );

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isLow
                          ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Star Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                                stars >= 4
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : stars === 3
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              <Star className="w-3 h-3 fill-current" />
                              <span>{stars} / 5</span>
                            </span>

                            {/* Destination tag */}
                            {stars >= 4 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Derivado a Google Reviews
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                Feedback Interno de Mejora
                              </span>
                            )}

                            {/* Date */}
                            <span className="text-[11px] text-slate-400 font-medium">
                              {formatearFecha(item.fecha || item.createdAt?.split('T')[0] || '')}
                            </span>
                          </div>

                          {/* Client Name & details */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                              {item.clienteNombre || 'Cliente anónimo / Turno'}
                            </span>
                            {item.clienteTelefono && (
                              <span className="text-xs text-slate-500 font-mono">
                                • {item.clienteTelefono}
                              </span>
                            )}
                            {item.clienteEmail && (
                              <span className="text-xs text-slate-400">
                                • {item.clienteEmail}
                              </span>
                            )}
                          </div>

                          {/* Comment Content */}
                          {item.comentario ? (
                            <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-normal mt-1">
                              &ldquo;{item.comentario}&rdquo;
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              {stars >= 4
                                ? 'Sin comentario de texto (derivado directamente al botón de Google Reviews).'
                                : 'Sin comentario detallado de texto.'}
                            </p>
                          )}
                        </div>

                        {/* Contact Action for Low Rating */}
                        {item.clienteTelefono && (
                          <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-start">
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waResolutionMessage}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                              title="Contactar al cliente por WhatsApp para resolver su comentario"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-white" />
                              <span>Contactar WhatsApp</span>
                            </a>

                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs flex items-center justify-center transition-colors"
                              title="Llamar"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
