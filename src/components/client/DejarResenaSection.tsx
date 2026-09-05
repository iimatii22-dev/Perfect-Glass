import React, { useState } from 'react';
import {
  Star,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Heart,
  Send,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Cliente, BusinessConfig, SelloHistorial } from '../../types';
import { guardarResena, actualizarDerivadoAGoogle } from '../../lib/resenasService';

interface DejarResenaSectionProps {
  cliente: Cliente;
  sellosHistorial?: SelloHistorial[];
  config: BusinessConfig;
  onResenaEnviada?: () => void;
}

export function DejarResenaSection({
  cliente,
  sellosHistorial = [],
  config,
  onResenaEnviada,
}: DejarResenaSectionProps) {
  const [calificacion, setCalificacion] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [errorComentario, setErrorComentario] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resenaIdCreada, setResenaIdCreada] = useState<string | null>(null);
  const [estadoFinal, setEstadoFinal] = useState<'ninguno' | 'enviado_mejora' | 'derivado_google'>('ninguno');

  const primaryColor = config.colorPrimario || '#0284c7';

  // 1. REGLA DE VISIBILIDAD:
  // - El cliente tiene al menos una visita con estado "completado" en su historial.
  // - Y su ultimaResenaEnviada es null o fue hace más de 90 días.
  const tieneVisitaCompletada = Boolean(
    cliente.fechaUltimaVisita ||
    (cliente.historialVisitas && cliente.historialVisitas.length > 0) ||
    sellosHistorial.length > 0 ||
    (cliente.sellosAcumulados && cliente.sellosAcumulados > 0)
  );

  if (!tieneVisitaCompletada) {
    return null;
  }

  const fechaUltimaResenaStr = cliente.ultimaResenaEnviada || cliente.ultimoPedidoResena;
  if (fechaUltimaResenaStr) {
    const fechaUltima = new Date(fechaUltimaResenaStr).getTime();
    const hoy = new Date().getTime();
    const diffDias = Math.floor((hoy - fechaUltima) / (1000 * 60 * 60 * 24));
    if (diffDias < 90) {
      // Menos de 90 días -> Sección no visible
      return null;
    }
  }

  // Si ya completó la interacción en esta sesión
  if (estadoFinal === 'enviado_mejora') {
    return (
      <div
        id="seccion-resena-completada"
        className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-sm space-y-3 text-center animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-lg">
          Gracias, tu opinión nos ayuda a mejorar
        </h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Hemos recibido tus comentarios y los tendremos muy en cuenta para brindarte una mejor atención en cada servicio.
        </p>
      </div>
    );
  }

  if (estadoFinal === 'derivado_google') {
    return (
      <div
        id="seccion-resena-google-completada"
        className="bg-white rounded-3xl p-6 sm:p-7 border border-sky-100 shadow-sm space-y-3 text-center animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mx-auto">
          <Heart className="w-6 h-6 fill-amber-400" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-lg">
          ¡Muchísimas gracias por tu apoyo!
        </h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Tu recomendación en Google Maps es invaluable para nuestro equipo de vidrieros. ¡Te esperamos en tu próxima visita!
        </p>
      </div>
    );
  }

  // Manejar selección de estrellas
  const handleSelectCalificacion = async (rating: number) => {
    setCalificacion(rating);
    setErrorComentario(null);

    // Si seleccionó 4 o 5, guardamos inmediatamente en Firestore para tener el ID listo
    if (rating >= 4) {
      try {
        const id = await guardarResena({
          clienteId: cliente.id,
          clienteNombre: cliente.nombre || cliente.localComercial || 'Cliente',
          clienteTelefono: cliente.telefono,
          clienteEmail: cliente.emailRegistro,
          negocioId: config.id || 'perfect-glass',
          calificacion: rating,
          comentario: '',
          derivadoAGoogle: false,
        });
        setResenaIdCreada(id);
      } catch (err) {
        console.warn('Error al guardar reseña inicial 4-5 estrellas:', err);
      }
    }
  };

  // Enviar opinión si calificación <= 3 (comentario obligatorio)
  const handleSubmitMejora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calificacion) return;

    if (!comentario.trim()) {
      setErrorComentario('Por favor cuéntanos qué podemos mejorar para enviarnos tu opinión.');
      return;
    }

    setIsSubmitting(true);
    try {
      await guardarResena({
        clienteId: cliente.id,
        clienteNombre: cliente.nombre || cliente.localComercial || 'Cliente',
        clienteTelefono: cliente.telefono,
        clienteEmail: cliente.emailRegistro,
        negocioId: config.id || 'perfect-glass',
        calificacion,
        comentario: comentario.trim(),
        derivadoAGoogle: false,
      });

      setEstadoFinal('enviado_mejora');
      if (onResenaEnviada) onResenaEnviada();
    } catch (err: any) {
      setErrorComentario(err?.message || 'Ocurrió un error al enviar tu opinión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clic en botón "Dejar reseña en Google Maps" (para 4 o 5 estrellas)
  const handleClickGoogleMaps = async () => {
    const link = config.linkGoogleReviews?.trim() || 'https://maps.google.com';

    // Abrir enlace a Google Maps
    window.open(link, '_blank', 'noopener,noreferrer');

    // Actualizar derivadoAGoogle en Firestore
    if (resenaIdCreada) {
      await actualizarDerivadoAGoogle(resenaIdCreada, cliente.id);
    } else {
      // Fallback si aún no se había creado el doc
      try {
        await guardarResena({
          clienteId: cliente.id,
          clienteNombre: cliente.nombre || cliente.localComercial || 'Cliente',
          clienteTelefono: cliente.telefono,
          clienteEmail: cliente.emailRegistro,
          negocioId: config.id || 'perfect-glass',
          calificacion: calificacion || 5,
          comentario: '',
          derivadoAGoogle: true,
        });
      } catch (e) {
        console.warn('Error al guardar derivación:', e);
      }
    }

    setEstadoFinal('derivado_google');
    if (onResenaEnviada) onResenaEnviada();
  };

  return (
    <div
      id="seccion-dejar-resena"
      className="bg-white rounded-3xl p-6 sm:p-7 border border-sky-100 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="p-1.5 rounded-xl text-white flex items-center justify-center shadow-xs"
            style={{ backgroundColor: primaryColor }}
          >
            <Star className="w-4 h-4 fill-white" />
          </span>
          <h3 className="font-extrabold text-slate-900 text-base">
            Dejar reseña
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          Tu opinión en 15 segundos
        </span>
      </div>

      {/* Pregunta inicial */}
      <div className="text-center pt-1 space-y-2">
        <p className="text-sm sm:text-base font-bold text-slate-800">
          ¿Qué tan conforme quedaste con el servicio?
        </p>
        <p className="text-xs text-slate-500">
          Selecciona una calificación del 1 al 5
        </p>

        {/* 5 Opciones (Estrellas interactivas con botones grandes mobile-friendly) */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 py-3">
          {[1, 2, 3, 4, 5].map((num) => {
            const isHovered = hoverRating !== null && hoverRating >= num;
            const isSelected = calificacion !== null && calificacion >= num;
            const isCurrentActive = calificacion === num;

            return (
              <button
                key={num}
                type="button"
                id={`btn-rating-${num}`}
                onClick={() => handleSelectCalificacion(num)}
                onMouseEnter={() => setHoverRating(num)}
                onMouseLeave={() => setHoverRating(null)}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all transform active:scale-95 border ${
                  isCurrentActive
                    ? 'border-amber-400 bg-amber-50 text-amber-600 ring-2 ring-amber-300/40 shadow-xs'
                    : isSelected || isHovered
                    ? 'border-amber-300 bg-amber-50/50 text-amber-500'
                    : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100'
                }`}
                title={`Calificar con ${num} estrella${num > 1 ? 's' : ''}`}
              >
                <Star
                  className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
                    isSelected || isHovered ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-300'
                  }`}
                />
                <span className="text-[10px] font-extrabold">{num}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FLUJO SEGÚN RESPUESTA */}
      {calificacion !== null && (
        <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* CASO 1, 2 o 3: Campo de texto obligatorio. NO mostrar Google Maps */}
          {calificacion <= 3 && (
            <form onSubmit={handleSubmitMejora} className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
              <label
                htmlFor="input-comentario-mejora"
                className="block text-xs font-extrabold text-slate-800"
              >
                Gracias por tu sinceridad, ¿nos contás qué podemos mejorar? <span className="text-rose-500">*</span>
              </label>

              <textarea
                id="input-comentario-mejora"
                rows={3}
                value={comentario}
                onChange={(e) => {
                  setComentario(e.target.value);
                  if (errorComentario) setErrorComentario(null);
                }}
                placeholder="Escribe aquí tu observación o sugerencia..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs text-slate-800 placeholder:text-slate-400 bg-white"
                required
              />

              {errorComentario && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorComentario}
                </p>
              )}

              <button
                type="submit"
                id="btn-enviar-opinion-mejora"
                disabled={isSubmitting || !comentario.trim()}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Enviando opinión...' : 'Enviar opinión'}</span>
              </button>
            </form>
          )}

          {/* CASO 4 o 5: Agradecimiento y botón destacado a Google Maps */}
          {calificacion >= 4 && (
            <div className="space-y-4 bg-emerald-50/60 p-5 sm:p-6 rounded-2xl border border-emerald-100 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                {[...Array(calificacion)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400" />
                ))}
              </div>

              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                  ¡Nos alegra mucho que hayas quedado conforme!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  ¿Nos ayudarías recomendándonos públicamente en Google Maps? Solo te tomará 1 clic y significa el mundo para nuestro negocio local.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  id="btn-dejar-resena-google-maps"
                  onClick={handleClickGoogleMaps}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full sm:w-auto mx-auto py-3.5 px-6 rounded-2xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-98 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Dejar reseña en Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
