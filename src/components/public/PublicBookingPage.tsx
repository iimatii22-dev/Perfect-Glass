import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CalendarPlus,
  Share2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Building2,
  MessageCircle,
} from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { Turno, BusinessConfig, TurnoEstado } from '../../types';
import {
  getTodayISODate,
  getProximosDias,
  formatearFechaLarga,
  formatearFecha,
} from '../../utils/dateUtils';
import {
  createTurno,
  cancelTurno,
  getTurnoById,
  calcularHorariosDisponibles,
  HorarioDisponibleInfo,
  subscribeToTurnos,
} from '../../lib/turnosService';
import {
  generateGoogleCalendarUrl,
  downloadIcsFile,
  generateWhatsAppConfirmationMessage,
  getTurnoPublicUrl,
} from '../../lib/emailNotificationService';

interface PublicBookingPageProps {
  onBackToApp?: () => void;
  initialTurnoId?: string | null;
  initialCancelToken?: string | null;
}

export function PublicBookingPage({
  onBackToApp,
  initialTurnoId,
  initialCancelToken,
}: PublicBookingPageProps) {
  const { config } = useConfig();
  const { user, clienteData } = useAuth();
  const primaryColor = config.colorPrimario || '#0284c7';
  const todayStr = getTodayISODate();

  // Wizard steps: 1 = Fecha, 2 = Horario, 3 = Datos, 4 = Éxito/Detalle
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form selections
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<HorarioDisponibleInfo | null>(null);

  // Client info form
  const [nombreCliente, setNombreCliente] = useState(clienteData?.nombre || '');
  const [telefonoCliente, setTelefonoCliente] = useState(clienteData?.telefono || '');
  const [emailCliente, setEmailCliente] = useState(clienteData?.emailRegistro || user?.email || '');
  const [direccion, setDireccion] = useState(clienteData?.direccion || '');
  const [notas, setNotas] = useState('');

  // Turnos real-time sync for slot collision checking
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState(true);

  // Submitting / Created turno state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedTurno, setConfirmedTurno] = useState<Turno | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manage / Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Next 14 days list for Step 1
  const availableDays = useMemo(() => {
    const rawDays = getProximosDias(14);
    const diasLaborables = config.diasLaborables || [1, 2, 3, 4, 5, 6]; // Default Lun-Sáb

    return rawDays.filter((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      return diasLaborables.includes(dayOfWeek);
    });
  }, [config.diasLaborables]);

  // Subscribe to turnos in Firestore
  useEffect(() => {
    const unsubscribe = subscribeToTurnos((list) => {
      setTurnos(list);
      setLoadingTurnos(false);
    });
    return () => unsubscribe();
  }, []);

  // Check if initialTurnoId was passed in URL query
  useEffect(() => {
    if (initialTurnoId) {
      getTurnoById(initialTurnoId).then((found) => {
        if (found) {
          setConfirmedTurno(found);
          setCurrentStep(4);
        }
      });
    }
  }, [initialTurnoId]);

  // Auto-set selectedDate to first available day if today is not in working days
  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDate)) {
      setSelectedDate(availableDays[0]);
    }
  }, [availableDays, selectedDate]);

  // Calculate available time slots for the currently selected date
  const availableSlots = useMemo(() => {
    const turnosOnDate = turnos.filter((t) => t.fecha === selectedDate);
    const duracion = config.duracionServicioDefaultMinutos || 30;
    return calcularHorariosDisponibles(selectedDate, duracion, config, turnosOnDate);
  }, [selectedDate, turnos, config]);

  const totalAvailableCount = useMemo(() => {
    return availableSlots.filter((s) => s.disponible).length;
  }, [availableSlots]);

  // Handle Form Submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedSlot) {
      setErrorMessage('Por favor selecciona un horario de atención.');
      return;
    }

    if (!nombreCliente.trim() || !telefonoCliente.trim() || !emailCliente.trim() || !direccion.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevo = await createTurno(
        {
          clienteId: clienteData?.id || 'nuevoCliente',
          clienteUid: user?.uid,
          nombreCliente: nombreCliente.trim(),
          telefonoCliente: telefonoCliente.trim(),
          emailCliente: emailCliente.trim(),
          direccion: direccion.trim(),
          fecha: selectedDate,
          horaInicio: selectedSlot.horaInicio,
          duracionMinutos: config.duracionServicioDefaultMinutos || 30,
          notas: notas.trim(),
          estado: 'pendiente',
        },
        config
      );

      setConfirmedTurno(nuevo);
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al agendar tu turno. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Turno Cancellation
  const handleCancelTurno = async () => {
    if (!confirmedTurno) return;
    setIsCancelling(true);
    try {
      const updated = await cancelTurno(
        confirmedTurno.id,
        config,
        motivoCancelacion.trim() || 'Cancelado por el cliente desde la web',
        initialCancelToken || confirmedTurno.cancelToken
      );
      setConfirmedTurno(updated);
      setShowCancelModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al cancelar el turno');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSendWhatsApp = () => {
    if (!confirmedTurno) return;
    const msg = generateWhatsAppConfirmationMessage(confirmedTurno, config);
    const cleanNumber = confirmedTurno.telefonoCliente.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-sky-100">
      {/* Public Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white overflow-hidden shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.nombreNegocio}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                {config.nombreNegocio || 'Perfect Glass'}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Reserva de Turno Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.whatsapp && (
              <a
                href={`https://wa.me/${config.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Volver al Panel
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl w-full mx-auto px-4 py-6 sm:py-10 space-y-6 flex-1">
        {/* Step Indicator (Only during creation steps 1, 2, 3) */}
        {currentStep < 4 && (
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-slate-400">Paso {currentStep} de 3</span>
              <span className="text-slate-900">
                {currentStep === 1 && '1. Elige la Fecha'}
                {currentStep === 2 && '2. Elige el Horario'}
                {currentStep === 3 && '3. Tus Datos de Contacto'}
              </span>
            </div>

            {/* Progress bar line */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${(currentStep / 3) * 100}%`,
                  backgroundColor: primaryColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 1: SELECCIÓN DE FECHA                                */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="p-2 rounded-xl text-white shadow-2xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  <CalendarIcon className="w-4 h-4" />
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Selecciona el día de tu servicio
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Disponibilidad en tiempo real para los próximos 14 días.
              </p>
            </div>

            {/* Dates Grid Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {availableDays.map((dateStr) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;

                const dayName = dateObj.toLocaleDateString('es-ES', {
                  weekday: 'short',
                });
                const monthName = dateObj.toLocaleDateString('es-ES', {
                  month: 'short',
                });

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                      isSelected
                        ? 'ring-2 ring-sky-600 border-sky-600 bg-sky-50/70 shadow-xs scale-[1.02]'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-extrabold text-slate-400">
                        {dayName}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[9px] uppercase tracking-wider">
                          Hoy
                        </span>
                      )}
                    </div>

                    <div className="my-1">
                      <span className="text-2xl font-black text-slate-900 leading-none">
                        {d}
                      </span>
                      <span className="text-xs text-slate-500 ml-1 font-semibold capitalize">
                        {monthName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Habilitado</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Next Step Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                id="btn-public-step1-next"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Ver Horarios Disponibles</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 2: SELECCIÓN DE HORARIO                              */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="p-2 rounded-xl text-white shadow-2xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Clock className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Selecciona tu horario
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Para el día <strong className="text-slate-800 capitalize">{formatearFechaLarga(selectedDate)}</strong> ({config.duracionServicioDefaultMinutos || 30} min estimados).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Cambiar fecha</span>
              </button>
            </div>

            {/* Slots Grid */}
            {availableSlots.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-xs">No hay horarios configurados para este día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.horaInicio === slot.horaInicio;

                  return (
                    <button
                      key={slot.horaInicio}
                      type="button"
                      disabled={!slot.disponible}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                        !slot.disponible
                          ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'border-sky-600 bg-sky-50 text-sky-950 font-black shadow-xs ring-2 ring-sky-500'
                          : 'border-slate-200 bg-white hover:border-sky-400 hover:bg-slate-50/80 text-slate-800 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-sm font-extrabold">
                        <span>{slot.horaInicio}</span>
                        <span className="text-[10px] text-slate-400 font-normal">a</span>
                        <span className="text-xs text-slate-500 font-semibold">{slot.horaFin}</span>
                      </div>

                      <div className="text-[10px] mt-1">
                        {slot.disponible ? (
                          <span className="text-emerald-600 font-extrabold">Disponible</span>
                        ) : (
                          <span className="text-slate-400 font-medium truncate max-w-full">
                            {slot.motivoOcupado || 'Ocupado'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Atrás
              </button>

              <button
                type="button"
                id="btn-public-step2-next"
                disabled={!selectedSlot}
                onClick={() => setCurrentStep(3)}
                className="px-7 py-3.5 rounded-2xl text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Continuar con mis datos</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASO 3: DATOS DEL CLIENTE Y CONFIRMACIÓN                   */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <form onSubmit={handleConfirmBooking} className="space-y-6">
            {/* Selected Appointment Summary Banner */}
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-5 rounded-3xl border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                  Turno Seleccionado
                </span>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base capitalize mt-1">
                  {formatearFechaLarga(selectedDate)}
                </h3>
                <p className="text-xs text-slate-600">
                  Horario: <strong>{selectedSlot?.horaInicio} a {selectedSlot?.horaFin} hs</strong> ({config.duracionServicioDefaultMinutos || 30} min)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="self-start sm:self-auto text-xs font-bold text-sky-700 bg-white px-3 py-1.5 rounded-xl border border-sky-200 hover:bg-sky-50 transition-colors shadow-2xs"
              >
                Modificar Horario
              </button>
            </div>

            {/* Contact Form Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Ingresa tus datos de contacto
              </h2>
              <p className="text-xs text-slate-500">
                Te enviaremos la confirmación oficial a tu correo electrónico y por WhatsApp.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tu Nombre y Apellido <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      id="input-public-nombre"
                      required
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                      placeholder="Ej. Juan Pérez / Dra. Elena Gómez"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Teléfono / WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      id="input-public-telefono"
                      required
                      value={telefonoCliente}
                      onChange={(e) => setTelefonoCliente(e.target.value)}
                      placeholder="Ej. +54 9 11 4522-8910"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      id="input-public-email"
                      required
                      value={emailCliente}
                      onChange={(e) => setEmailCliente(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección del Servicio <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      id="input-public-direccion"
                      required
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Calle, número, piso/depto o timbre"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones o tipo de vidrios (Opcional)
                </label>
                <textarea
                  rows={2}
                  id="textarea-public-notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej. Vidriera a la calle y puerta de vidrio. Acceso por pasillo lateral."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs resize-none font-medium"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Atrás
                </button>

                <button
                  type="submit"
                  id="btn-public-submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Confirmando turno...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Turno Ahora</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* PASO 4: PANTALLA DE ÉXITO Y GESTIÓN DE TURNO               */}
        {/* ========================================================= */}
        {currentStep === 4 && confirmedTurno && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Status Card Banner */}
            <div
              className={`rounded-3xl p-6 sm:p-8 text-center border shadow-xs space-y-3 ${
                confirmedTurno.estado === 'cancelado'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : confirmedTurno.estado === 'completado'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-white border-slate-100 text-slate-900'
              }`}
            >
              <div className="w-14 h-14 rounded-3xl mx-auto flex items-center justify-center text-white shadow-md"
                style={{
                  backgroundColor:
                    confirmedTurno.estado === 'cancelado'
                      ? '#e11d48'
                      : confirmedTurno.estado === 'completado'
                      ? '#059669'
                      : primaryColor,
                }}
              >
                {confirmedTurno.estado === 'cancelado' ? (
                  <XCircle className="w-7 h-7" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    confirmedTurno.estado === 'cancelado'
                      ? 'bg-rose-200 text-rose-900'
                      : confirmedTurno.estado === 'completado'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-sky-100 text-sky-900'
                  }`}
                >
                  Turno {confirmedTurno.estado.toUpperCase()}
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-2 text-slate-900">
                  {confirmedTurno.estado === 'cancelado'
                    ? 'Este turno ha sido cancelado'
                    : confirmedTurno.estado === 'completado'
                    ? '¡Servicio de limpieza completado!'
                    : '¡Tu turno ha sido confirmado con éxito!'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                  {confirmedTurno.estado === 'confirmado'
                    ? `Hemos enviado los detalles completos de tu reserva al correo ${confirmedTurno.emailCliente}.`
                    : 'Puedes volver a reservar un nuevo turno cuando lo desees.'}
                </p>
              </div>
            </div>

            {/* Turno Details Receipt Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
                Resumen de la Reserva
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Fecha del Servicio</p>
                  <p className="font-extrabold text-slate-900 text-sm capitalize flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-sky-600" />
                    <span>{formatearFechaLarga(confirmedTurno.fecha)}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Horario de Llegada</p>
                  <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-600" />
                    <span>{confirmedTurno.horaInicio} a {confirmedTurno.horaFin} hs ({confirmedTurno.duracionMinutos} min)</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Cliente / Titular</p>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{confirmedTurno.nombreCliente}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Teléfono de Contacto</p>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{confirmedTurno.telefonoCliente}</span>
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Dirección</p>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{confirmedTurno.direccion || 'Domicilio acordado'}</span>
                  </p>
                </div>

                {confirmedTurno.notas && (
                  <div className="sm:col-span-2 space-y-1">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Observaciones</p>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-medium">
                      {confirmedTurno.notas}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Calendar and WhatsApp */}
              {confirmedTurno.estado === 'confirmado' && (
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  {/* Google Calendar */}
                  <a
                    href={generateGoogleCalendarUrl(confirmedTurno, config)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Google Calendar</span>
                  </a>

                  {/* iCal / Outlook file */}
                  <button
                    type="button"
                    onClick={() => downloadIcsFile(confirmedTurno, config)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <CalendarIcon className="w-4 h-4 text-slate-600" />
                    <span>Apple / Outlook (.ics)</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar a mi WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            {/* Management & Cancellation Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Enlace de Gestión del Turno
              </h4>
              <p className="text-xs text-slate-500">
                Guarda este enlace para consultar tu turno en cualquier momento o cancelarlo si surge algún imprevisto:
              </p>

              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={getTurnoPublicUrl(confirmedTurno.id, confirmedTurno.cancelToken)}
                  className="bg-transparent text-xs text-slate-700 w-full focus:outline-none font-mono truncate px-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopyLink(
                      getTurnoPublicUrl(confirmedTurno.id, confirmedTurno.cancelToken)
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              {confirmedTurno.estado === 'confirmado' && (
                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                  >
                    ¿Deseas cancelar este turno?
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedTurno(null);
                      setSelectedSlot(null);
                      setCurrentStep(1);
                    }}
                    className="text-xs font-bold text-sky-600 hover:underline"
                  >
                    Agendar otro turno
                  </button>
                </div>
              )}
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2.5 text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="font-extrabold text-base text-slate-900">
                      Confirmar Cancelación
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600">
                    ¿Estás seguro de que deseas cancelar tu turno para el{' '}
                    <strong>{formatearFechaLarga(confirmedTurno.fecha)}</strong> a las{' '}
                    <strong>{confirmedTurno.horaInicio} hs</strong>?
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Motivo de cancelación (opcional)
                    </label>
                    <input
                      type="text"
                      value={motivoCancelacion}
                      onChange={(e) => setMotivoCancelacion(e.target.value)}
                      placeholder="Ej. Cambio de planes, viaje imprevisto..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => setShowCancelModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCancelTurno}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                    >
                      {isCancelling ? 'Cancelando...' : 'Sí, Cancelar Turno'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 px-4 text-center text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-600">
          {config.nombreNegocio || 'Perfect Glass'} • Servicio Profesional de Limpieza de Vidrios
        </p>
        <p className="text-[11px]">
          {config.direccion} {config.telefono && `• Tel: ${config.telefono}`}
        </p>
      </footer>
    </div>
  );
}
