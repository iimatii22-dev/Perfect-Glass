import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  ExternalLink,
  MessageCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  TrendingUp,
  Share2,
  Copy,
  Check,
  Sparkles,
  Phone,
  User,
  HelpCircle,
} from 'lucide-react';
import { Resena } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { subscribeToResenas, calcularEstadisticasResenas } from '../../lib/resenasService';
import { formatearFecha } from '../../utils/dateUtils';
import { generateOpinionUrl } from '../../lib/emailNotificationService';

type FilterType = 'todas' | '1-3' | '4-5' | 'sin-derivar';

export function ResenasTab() {
  const { config } = useConfig();
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FilterType>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const primaryColor = config.colorPrimario || '#0284c7';
  const currentNegocioId = config.id || 'perfect-glass';

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToResenas((list) => {
      setResenas(list);
      setLoading(false);
    }, currentNegocioId);

    return () => unsubscribe();
  }, [currentNegocioId]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    return calcularEstadisticasResenas(resenas);
  }, [resenas]);

  // Filtrado de lista
  const filteredResenas = useMemo(() => {
    return resenas.filter((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.calificacion || 5)));

      // Filtro de categoría
      if (filtro === '1-3' && star > 3) return false;
      if (filtro === '4-5' && star < 4) return false;
      if (filtro === 'sin-derivar' && (star < 4 || r.derivadoAGoogle)) return false;

      // Filtro de texto de búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNombre = (r.clienteNombre || '').toLowerCase().includes(query);
        const matchesComentario = (r.comentario || '').toLowerCase().includes(query);
        const matchesTelefono = (r.clienteTelefono || '').includes(query);
        return matchesNombre || matchesComentario || matchesTelefono;
      }

      return true;
    });
  }, [resenas, filtro, searchTerm]);

  // Generar link público general
  const publicReviewUrl = useMemo(() => {
    return generateOpinionUrl();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicReviewUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // WhatsApp para 1-3 estrellas (resolver insatisfacción)
  const handleContactarResolucion = (resena: Resena) => {
    const rawTel = (resena.clienteTelefono || '').replace(/[^0-9]/g, '');
    if (!rawTel) return;

    const nombre = resena.clienteNombre || 'Cliente';
    const negocio = config.nombreNegocio || 'Perfect Glass';
    const mensaje =
      `Hola *${nombre}*, te escribo de *${negocio}*. ` +
      `Leí con mucha atención tu comentario sobre el último servicio: _"${resena.comentario || 'servicio recibido'}"_. ` +
      `Queremos disculparnos por cualquier molestia y ponernos a tu entera disposición para resolverlo de inmediato y dejar tus vidrios impecables como mereces. ` +
      `¿A qué hora podríamos llamarte o pasar a revisarlo?`;

    const url = `https://wa.me/${rawTel}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // WhatsApp para 4-5 estrellas sin derivar (pedir que dejen la reseña en Google Maps)
  const handlePedirGoogleReviewWhatsApp = (resena: Resena) => {
    const rawTel = (resena.clienteTelefono || '').replace(/[^0-9]/g, '');
    if (!rawTel) return;

    const nombre = resena.clienteNombre || 'Cliente';
    const negocio = config.nombreNegocio || 'Perfect Glass';
    const googleLink = config.linkGoogleReviews?.trim() || 'https://maps.google.com';

    const mensaje =
      `¡Hola *${nombre}*! En *${negocio}* nos alegró muchísimo saber que quedaste conforme con la limpieza de vidrios de tu local/domicilio ⭐. ` +
      `¿Nos regalarías 1 minuto para dejarnos tu reseña pública en Google Maps? Para nosotros como emprendimiento local significa un mundo 👇\n\n` +
      `🔗 ${googleLink}\n\n` +
      `¡Muchísimas gracias por tu apoyo!`;

    const url = `https://wa.me/${rawTel}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header & Public Link Share Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span
              className="p-2 rounded-2xl text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <Star className="w-5 h-5 fill-white" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Reseñas y Satisfacción
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Gestiona la reputación de tu negocio, filtra clientes satisfechos para impulsar Google Maps y atiende rápidamente sugerencias de mejora.
          </p>
        </div>

        {/* Action Button: Share / Copy Direct Review Link */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>¡Link copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Copiar link de reseña</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Promedio General */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            Calificación Promedio
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats.promedio > 0 ? stats.promedio.toFixed(1) : '—'}
            </span>
            <span className="text-amber-500 text-sm font-bold flex items-center">
              {'★'.repeat(Math.round(stats.promedio || 0))}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Sobre <strong>{stats.total}</strong> {stats.total === 1 ? 'reseña' : 'reseñas'} totales
          </p>
        </div>

        {/* Reseñas Positivas 4-5 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Satisfechos (4-5 ★)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">
              {stats.total4a5}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {stats.total > 0 ? `${Math.round((stats.total4a5 / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Clientes listos para recomendar
          </p>
        </div>

        {/* Derivación a Google Maps */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            Derivados a Google Maps
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-700">
              {stats.derivadosGoogle}
            </span>
            <span className="text-xs font-bold text-sky-600">
              {stats.total4a5 > 0 ? `${stats.porcentajeDerivadosGoogle}% de 4-5★` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.sinDerivarGoogle.length} pendientes de derivar
          </p>
        </div>

        {/* Reseñas Críticas 1-3 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Por Mejorar (1-3 ★)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">
              {stats.total1a3}
            </span>
            <span className="text-xs font-bold text-amber-600">
              {stats.total > 0 ? `${Math.round((stats.total1a3 / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Oportunidades de resolución privada
          </p>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              id="filter-resenas-todas"
              onClick={() => setFiltro('todas')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                filtro === 'todas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Todas</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20">
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              id="filter-resenas-1-3"
              onClick={() => setFiltro('1-3')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                filtro === '1-3'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span>1-3 estrellas</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/60 text-amber-900">
                {stats.total1a3}
              </span>
            </button>

            <button
              type="button"
              id="filter-resenas-4-5"
              onClick={() => setFiltro('4-5')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                filtro === '4-5'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span>4-5 estrellas</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200/60 text-emerald-900">
                {stats.total4a5}
              </span>
            </button>

            <button
              type="button"
              id="filter-resenas-sin-derivar"
              onClick={() => setFiltro('sin-derivar')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                filtro === 'sin-derivar'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              <span>Sin derivar a Google</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-200/60 text-sky-900">
                {stats.sinDerivarGoogle.length}
              </span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-buscar-resena"
              placeholder="Buscar por cliente o texto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-100 p-8">
            Cargando reseñas...
          </div>
        ) : filteredResenas.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white border border-slate-100 shadow-xs space-y-2">
            <Star className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="font-bold text-slate-700 text-sm">No hay reseñas para este filtro</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filtro === 'sin-derivar'
                ? '¡Excelente! Todos los clientes que calificaron con 4 o 5 estrellas ya fueron derivados a Google Maps.'
                : 'No se encontraron registros de reseñas con los criterios seleccionados.'}
            </p>
          </div>
        ) : (
          filteredResenas.map((resena) => {
            const isCritical = resena.calificacion <= 3;
            const isHighRating = resena.calificacion >= 4;

            return (
              <div
                key={resena.id}
                id={`resena-card-${resena.id}`}
                className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-xs transition-all ${
                  isCritical
                    ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/20 to-white'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Client Info & Stars */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {resena.clienteNombre || 'Cliente'}
                      </h3>
                      {resena.clienteTelefono && (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {resena.clienteTelefono}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= resena.calificacion ? 'fill-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black text-slate-700">
                        {resena.calificacion}.0
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">
                        {formatearFecha(resena.fecha ? resena.fecha.split('T')[0] : undefined)}
                      </span>
                    </div>
                  </div>

                  {/* Badges / Status */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {resena.esSandbox && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                        PRUEBA
                      </span>
                    )}
                    {isHighRating ? (
                      resena.derivadoAGoogle ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ✓ En Google Maps
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          <Clock className="w-3.5 h-3.5 text-sky-600" />
                          ⏳ Sin derivar a Google
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Privado (1-3 ★)
                      </span>
                    )}
                  </div>
                </div>

                {/* 1-3 STARS: Highlighted Comment Box & WhatsApp action to resolve */}
                {isCritical && (
                  <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 space-y-3">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1 mb-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Observación del Cliente (Obligatorio para mejorar):
                      </span>
                      <p className="text-xs sm:text-sm text-slate-800 font-medium whitespace-pre-wrap">
                        "{resena.comentario || 'Sin comentario detallado'}"
                      </p>
                    </div>

                    {resena.clienteTelefono && (
                      <div className="pt-1 flex items-center justify-between gap-3 border-t border-amber-200/50">
                        <p className="text-[11px] text-amber-700">
                          Contacta al cliente para resolver su insatisfacción antes de su próxima visita:
                        </p>
                        <button
                          type="button"
                          onClick={() => handleContactarResolucion(resena)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all shrink-0 active:scale-95"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Contactar por WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4-5 STARS: If NOT yet derived, WhatsApp button to send Google Maps link */}
                {isHighRating && !resena.derivadoAGoogle && resena.clienteTelefono && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Este cliente dio {resena.calificacion} estrellas pero no completó el clic en Google Maps.
                    </p>
                    <button
                      type="button"
                      onClick={() => handlePedirGoogleReviewWhatsApp(resena)}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pedir reseña en Google por WhatsApp</span>
                    </button>
                  </div>
                )}

                {/* Optional comment for 4-5 stars */}
                {isHighRating && resena.comentario && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600 italic">
                      "{resena.comentario}"
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
