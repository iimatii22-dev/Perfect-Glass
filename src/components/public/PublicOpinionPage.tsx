import React, { useState, useEffect } from 'react';
import {
  Star,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Send,
  Heart,
  ChevronRight,
  Smile,
  Meh,
  Frown,
} from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import {
  guardarFeedbackInterno,
  fetchFeedbackTargetInfo,
} from '../../lib/feedbackService';
import { getTodayISODate } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

interface PublicOpinionPageProps {
  initialIdentifier?: string | null;
  onBackToApp?: () => void;
}

const RATING_LEVELS = [
  {
    value: 1,
    label: 'Muy insatisfecho',
    shortLabel: '1',
    emoji: '😡',
    colorClass: 'hover:border-rose-400 hover:bg-rose-50/50 text-rose-600',
    activeClass: 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200',
  },
  {
    value: 2,
    label: 'Poco satisfecho',
    shortLabel: '2',
    emoji: '🙁',
    colorClass: 'hover:border-orange-400 hover:bg-orange-50/50 text-orange-600',
    activeClass: 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-200',
  },
  {
    value: 3,
    label: 'Aceptable / Regular',
    shortLabel: '3',
    emoji: '😐',
    colorClass: 'hover:border-amber-400 hover:bg-amber-50/50 text-amber-600',
    activeClass: 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200',
  },
  {
    value: 4,
    label: 'Muy bueno / Conforme',
    shortLabel: '4',
    emoji: '😊',
    colorClass: 'hover:border-emerald-400 hover:bg-emerald-50/50 text-emerald-600',
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200',
  },
  {
    value: 5,
    label: 'Excelente / Impecable',
    shortLabel: '5',
    emoji: '🤩',
    colorClass: 'hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600',
    activeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300',
  },
];

export function PublicOpinionPage({
  initialIdentifier,
  onBackToApp,
}: PublicOpinionPageProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';
  const businessName = config.nombreNegocio || 'Perfect Glass';
  const googleReviewLink =
    config.linkGoogleReviews || 'https://g.page/r/perfectglass-reviews';

  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [clientInfo, setClientInfo] = useState<{
    clienteId?: string;
    turnoId?: string;
    nombre?: string;
    telefono?: string;
    email?: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackSavedId, setFeedbackSavedId] = useState<string | null>(null);

  // Fetch client or turno info if identifier exists in URL
  useEffect(() => {
    if (initialIdentifier) {
      fetchFeedbackTargetInfo(initialIdentifier).then((info) => {
        if (info) setClientInfo(info);
      });
    }
  }, [initialIdentifier]);

  // Handle rating selection
  const handleSelectRating = async (rating: number) => {
    setSelectedRating(rating);

    // If rating is 4 or 5: Immediately record positive feedback internally so data is never lost
    if (rating >= 4) {
      setSaving(true);
      try {
        const id = await guardarFeedbackInterno({
          clienteId: clientInfo?.clienteId,
          turnoId: clientInfo?.turnoId || initialIdentifier || undefined,
          clienteNombre: clientInfo?.nombre,
          clienteTelefono: clientInfo?.telefono,
          clienteEmail: clientInfo?.email,
          calificacion: rating,
          comentario: '',
          derivadoAGoogle: true,
          fecha: getTodayISODate(),
        });
        setFeedbackSavedId(id);
      } catch (err) {
        console.warn('Error saving positive rating internally:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle submit for ratings 1, 2, 3
  const handleSubmitCriticalFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating) return;

    setSaving(true);
    try {
      const id = await guardarFeedbackInterno({
        clienteId: clientInfo?.clienteId,
        turnoId: clientInfo?.turnoId || initialIdentifier || undefined,
        clienteNombre: clientInfo?.nombre,
        clienteTelefono: clientInfo?.telefono,
        clienteEmail: clientInfo?.email,
        calificacion: selectedRating,
        comentario: comentario.trim(),
        derivadoAGoogle: false,
        fecha: getTodayISODate(),
      });
      setFeedbackSavedId(id);
      setSubmitted(true);
    } catch (err) {
      console.error('Error saving critical feedback:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeLevelInfo = selectedRating
    ? RATING_LEVELS.find((l) => l.value === selectedRating)
    : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Top Bar / Branding */}
      <header className="w-full max-w-md pt-4 pb-2 flex flex-col items-center text-center">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform hover:scale-105"
            style={{ backgroundColor: primaryColor }}
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={businessName}
                className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Sparkles className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="text-left">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              {businessName}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Encuesta de Calidad &amp; Satisfacción
            </p>
          </div>
        </div>

        {clientInfo?.nombre && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/70 text-slate-700 text-xs font-semibold">
            <span>¡Hola, {clientInfo.nombre}!</span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md my-auto">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: INITIAL QUESTION & 5 OPTIONS */}
            {!selectedRating && (
              <motion.div
                key="step-question"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center"
              >
                <div className="space-y-2">
                  <div className="inline-flex p-2.5 rounded-2xl bg-amber-50 text-amber-500 mb-1 border border-amber-200/60">
                    <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                    ¿Qué tan conforme quedaste con el servicio?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Tu opinión nos toma menos de 15 segundos y nos ayuda a mantener vidrios impecables.
                  </p>
                </div>

                {/* 5 Levels Selection */}
                <div className="grid grid-cols-5 gap-2 sm:gap-3 pt-2">
                  {RATING_LEVELS.map((level) => {
                    const isHovered = hoveredRating !== null && hoveredRating >= level.value;
                    return (
                      <button
                        key={level.value}
                        type="button"
                        id={`btn-rating-${level.value}`}
                        onMouseEnter={() => setHoveredRating(level.value)}
                        onMouseLeave={() => setHoveredRating(null)}
                        onClick={() => handleSelectRating(level.value)}
                        className={`group flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${
                          isHovered
                            ? 'border-amber-400 bg-amber-50/70 -translate-y-1 shadow-sm'
                            : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl filter transition-transform group-hover:scale-110">
                          {level.emoji}
                        </span>
                        <div className="flex items-center gap-0.5 mt-2 text-amber-500">
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isHovered ? 'fill-amber-400 text-amber-400' : 'fill-slate-300 text-slate-300'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-700 mt-1">
                          {level.value}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-semibold">
                  <span>1: Muy insatisfecho</span>
                  <span>5: Excelente</span>
                </div>
              </motion.div>
            )}

            {/* STEP 2A: RATING 1, 2, 3 -> FEEDBACK DE MEJORA */}
            {selectedRating && selectedRating <= 3 && !submitted && (
              <motion.div
                key="step-low-rating"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Header of low rating */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    <span>{activeLevelInfo?.emoji}</span>
                    <span>Calificación seleccionada: {selectedRating} de 5</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Gracias por tu sinceridad, ¿nos contás qué podemos mejorar?
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Lamentamos no haber alcanzado la excelencia en esta visita. Tu comentario nos ayuda a solucionar cualquier inconveniente de inmediato.
                  </p>
                </div>

                {/* Feedback Form */}
                <form onSubmit={handleSubmitCriticalFeedback} className="space-y-4">
                  <div>
                    <label
                      htmlFor="textarea-feedback"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Tu sugerencia o comentario:
                    </label>
                    <textarea
                      id="textarea-feedback"
                      rows={4}
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Escribe aquí tu opinión, qué detalle faltó o qué podemos hacer mejor..."
                      className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all resize-none bg-slate-50/50"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="submit"
                      id="btn-enviar-feedback-critico"
                      disabled={saving || !comentario.trim()}
                      className="w-full py-3.5 px-5 rounded-2xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 transition-all disabled:opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar mi opinión</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRating(null)}
                      className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
                    >
                      Cambiar calificación
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 2A FINAL: THANK YOU FOR RATINGS 1, 2, 3 (WITHOUT GOOGLE LINK) */}
            {selectedRating && selectedRating <= 3 && submitted && (
              <motion.div
                key="step-thank-you-low"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="text-center space-y-4 py-4"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Gracias, tu opinión nos ayuda a mejorar
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Hemos recibido tus observaciones. Nuestro equipo revisará el detalle para asegurar un servicio impecable en la próxima ocasión.
                  </p>
                </div>

                <div className="pt-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                    <span>{businessName} valora enormemente tu tiempo. ¡Que tengas un excelente día!</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2B: RATING 4 OR 5 -> GRATITUDE & PROMINENT GOOGLE REVIEWS BUTTON */}
            {selectedRating && selectedRating >= 4 && (
              <motion.div
                key="step-high-rating"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-center space-y-6 py-2"
              >
                <div className="space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-500 border border-amber-200/80 shadow-xs animate-bounce">
                    <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    ¡Nos alegra mucho que hayas quedado conforme!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Las reseñas de 5 estrellas en Google nos ayudan a que más vecinos y comercios confíen en nosotros.
                  </p>
                </div>

                {/* Google Reviews Box & Action Button */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/50 border-2 border-amber-300/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-slate-700">
                    ¿Nos regalas 30 segundos para dejar tu reseña en Google?
                  </p>

                  <a
                    href={googleReviewLink}
                    target="_blank"
                    rel="noreferrer"
                    id="btn-dejar-resena-google"
                    className="w-full py-4 px-6 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>Dejar reseña en Google</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-[11px] text-slate-400">
                  ¡Muchísimas gracias por apoyar nuestro trabajo!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md text-center py-4 space-y-2">
        <p className="text-[11px] text-slate-400 font-medium">
          {businessName} • Sistema de Calidad Garantizada
        </p>

        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold transition-colors"
          >
            Volver a la aplicación
          </button>
        )}
      </footer>
    </div>
  );
}
