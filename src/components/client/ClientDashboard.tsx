import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Store, 
  User, 
  Phone, 
  MapPin, 
  LogOut, 
  PlusCircle, 
  ShieldCheck, 
  AlertCircle, 
  Edit3, 
  Save, 
  X,
  History,
  CalendarCheck,
  ChevronRight,
  Gift,
  Bell,
  Mail,
  Smartphone,
  Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { Cliente, SelloHistorial } from '../../types';
import { 
  subscribeToSellosHistorial, 
  updateClienteProfileByClient 
} from '../../lib/clientesService';
import { 
  solicitarPermisoPush, 
  probarNotificacionPushLocal, 
  getNotificationPermissionStatus,
  obtenerPreferenciaUsuario,
  guardarPreferenciaUsuario
} from '../../lib/pushNotificationService';
import { calcularDiasRestantes, formatearFecha } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { DejarResenaSection } from './DejarResenaSection';

interface ClientDashboardProps {
  onOpenBooking?: () => void;
}

export function ClientDashboard({ onOpenBooking }: ClientDashboardProps) {
  const { user, clienteData, logout } = useAuth();
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const [sellosHistorial, setSellosHistorial] = useState<SelloHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nombre, setNombre] = useState(clienteData?.nombre || '');
  const [telefono, setTelefono] = useState(clienteData?.telefono || '');
  const [direccion, setDireccion] = useState(clienteData?.direccion || '');
  const [localComercial, setLocalComercial] = useState(clienteData?.localComercial || '');
  const [notas, setNotas] = useState(clienteData?.notas || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Notification preferences state
  const [pushActivo, setPushActivo] = useState(true);
  const [emailActivo, setEmailActivo] = useState(true);
  const [devicePermission, setDevicePermission] = useState<NotificationPermission>('default');
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    setDevicePermission(getNotificationPermissionStatus());
    if (user?.uid) {
      obtenerPreferenciaUsuario(user.uid).then((pref) => {
        if (pref) {
          setPushActivo(pref.pushActivo ?? true);
          setEmailActivo(pref.emailActivo ?? true);
        }
      });
    }
  }, [user]);

  const handleTogglePush = async (nextVal: boolean) => {
    setPushActivo(nextVal);
    if (user?.uid) {
      await guardarPreferenciaUsuario(user.uid, {
        pushActivo: nextVal,
        rol: 'cliente',
        negocioId: config.id,
      });
    }
  };

  const handleToggleEmail = async (nextVal: boolean) => {
    setEmailActivo(nextVal);
    if (user?.uid) {
      await guardarPreferenciaUsuario(user.uid, {
        emailActivo: nextVal,
        rol: 'cliente',
        negocioId: config.id,
      });
    }
  };

  const handleEnableDevicePush = async () => {
    if (!user) return;
    setSavingNotif(true);
    setTestPushStatus(null);
    try {
      const res = await solicitarPermisoPush(
        user.uid,
        'cliente',
        config.id || 'perfect-glass',
        user.email
      );
      setDevicePermission(getNotificationPermissionStatus());
      if (res.granted) {
        setTestPushStatus('¡Notificaciones activadas en este dispositivo!');
        setPushActivo(true);
      } else {
        setTestPushStatus(res.error || 'Permiso no concedido.');
      }
    } catch (e: any) {
      setTestPushStatus(e.message || 'Error activando notificaciones.');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleTestClientPush = async () => {
    setTestPushStatus(null);
    const ok = await probarNotificacionPushLocal(
      'Recordatorio de turno • Perfect Glass',
      'Mañana pasamos a limpiar tus vidrios a las 10:00. ¡Tus vidrios relucientes!',
      '/?tab=cliente'
    );
    if (ok) {
      setTestPushStatus('¡Alerta de prueba enviada a tu dispositivo!');
    } else {
      setTestPushStatus('Permite primero las notificaciones en este navegador para ver la alerta.');
    }
  };

  useEffect(() => {
    if (clienteData) {
      setNombre(clienteData.nombre || '');
      setTelefono(clienteData.telefono || '');
      setDireccion(clienteData.direccion || '');
      setLocalComercial(clienteData.localComercial || '');
      setNotas(clienteData.notas || '');
    }
  }, [clienteData]);

  // Real-time listener for immutable stamp history
  useEffect(() => {
    if (!clienteData?.id) {
      setLoadingHistorial(false);
      return;
    }

    setLoadingHistorial(true);
    const unsubscribe = subscribeToSellosHistorial(clienteData.id, (list) => {
      setSellosHistorial(list);
      setLoadingHistorial(false);
    });

    return () => unsubscribe();
  }, [clienteData?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteData?.id) return;
    setSavingProfile(true);
    try {
      await updateClienteProfileByClient(clienteData.id, {
        nombre,
        telefono,
        direccion,
        localComercial,
        notas,
      });
      setIsEditingProfile(false);
      setProfileSuccessMsg(true);
      setTimeout(() => setProfileSuccessMsg(false), 3500);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const sellosAcumulados = clienteData?.sellosAcumulados || 0;
  const sellosNecesarios = clienteData?.sellosNecesarios || 5;
  const progresoPorcentaje = Math.min(100, Math.round((sellosAcumulados / sellosNecesarios) * 100));
  const estadoVisita = clienteData ? calcularDiasRestantes(clienteData.fechaProximaVisita) : null;
  const isPending = clienteData?.estadoRegistro === 'pendiente';
  const isRejected = clienteData?.estadoRegistro === 'rechazado';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/20 to-slate-100 pb-20">
      {/* Top Client Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs px-4 py-3.5 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                {clienteData?.localComercial || clienteData?.nombre || 'Mi Cuenta'}
              </h1>
              <p className="text-[11px] font-semibold text-slate-400">
                {config.nombreNegocio || 'Perfect Glass'} • Portal de Cliente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-client-logout"
              onClick={logout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Profile Success Toast */}
        {profileSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">¡Tus datos han sido actualizados y sincronizados con el vidriero!</span>
          </div>
        )}

        {/* PENDING APPROVAL BANNER */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0 mt-0.5">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200/80 text-amber-900">
                  Solicitud en Revisión
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  ¡Hola! Tu comercio está pendiente de aprobación
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  El vidriero ha recibido tu solicitud para <strong>{clienteData?.localComercial || clienteData?.nombre}</strong>. En breve validará la cuenta para habilitar tu programa de fidelidad, sellos por visita y fechas de limpieza.
                </p>
                <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Vidriero asignado: {config.nombreNegocio || 'Perfect Glass'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REJECTED BANNER */}
        {isRejected && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div className="space-y-1">
                <h3 className="font-bold text-rose-950 text-sm">Solicitud No Aprobada</h3>
                <p className="text-xs text-rose-800">
                  Comunícate con el vidriero al {config.telefono || 'teléfono de contacto'} para verificar los datos de tu comercio.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LOYALTY CARD SECTION */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
                  <Award className="w-5 h-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Tarjeta de Fidelidad Perfect Glass
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Gana 1 sello por cada visita de limpieza completada. ¡Al llegar a {sellosNecesarios} obtienes tu recompensa!
              </p>
            </div>

            <div className="text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
              <span className="text-xs font-semibold text-slate-400 block">Sellos Acumulados</span>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {sellosAcumulados} <span className="text-sm font-semibold text-slate-400">/ {sellosNecesarios}</span>
              </p>
            </div>
          </div>

          {/* REWARD READY ALERT */}
          {clienteData?.recompensaDisponible ? (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Gift className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                      ¡Recompensa Desbloqueada!
                    </span>
                    <h3 className="text-base font-extrabold mt-0.5">
                      {clienteData.recompensaDescripcion || 'Limpieza de vidrios gratis'}
                    </h3>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      Se aplicará automáticamente en tu próxima visita de limpieza.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* STAMP SLOTS VISUALIZER */}
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-2.5 sm:gap-4 max-w-lg mx-auto">
              {Array.from({ length: sellosNecesarios }).map((_, idx) => {
                const isEarned = idx < sellosAcumulados;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all p-2 text-center border-2 ${
                      isEarned
                        ? 'bg-amber-50/90 border-amber-400 text-amber-800 shadow-sm scale-102'
                        : 'bg-slate-50/70 border-dashed border-slate-200 text-slate-300'
                    }`}
                  >
                    {isEarned ? (
                      <Sparkles className="w-6 h-6 text-amber-500 fill-amber-400 animate-in zoom-in" />
                    ) : (
                      <span className="text-sm font-bold text-slate-300">{idx + 1}</span>
                    )}
                    <span className="text-[10px] font-bold mt-1 uppercase">
                      {isEarned ? 'Sello' : `Paso ${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-5 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Progreso hacia la próxima recompensa</span>
                <span className="font-bold text-slate-900">{progresoPorcentaje}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 to-amber-500"
                  style={{ width: `${progresoPorcentaje}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* NEXT VISIT & SCHEDULE SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Next Visit Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                Próxima Visita
              </span>
              {estadoVisita && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    estadoVisita.estado === 'vencida'
                      ? 'bg-rose-100 text-rose-800'
                      : estadoVisita.estado === 'hoy'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {estadoVisita.etiqueta}
                </span>
              )}
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">
                {clienteData?.fechaProximaVisita
                  ? formatearFecha(clienteData.fechaProximaVisita)
                  : 'Por programar'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Última visita registrada:{' '}
                <strong className="text-slate-700">
                  {clienteData?.fechaUltimaVisita
                    ? formatearFecha(clienteData.fechaUltimaVisita)
                    : 'Sin visitas previas'}
                </strong>
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="btn-client-agendar"
                onClick={onOpenBooking}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
              >
                <CalendarCheck className="w-4 h-4 text-sky-400" />
                <span>Solicitar o Agendar Turno</span>
              </button>
            </div>
          </div>

          {/* Service Specs & Surface Info */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Ficha de Limpieza
            </span>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Superficie a Limpiar:</span>
                <span className="font-bold text-slate-800">{clienteData?.tipoSuperficie || 'Vidrieras y marcos'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Frecuencia Habitual:</span>
                <span className="font-bold text-slate-800">Cada {clienteData?.frecuenciaVisitaDias || 30} días</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Duración Estimada:</span>
                <span className="font-bold text-slate-800">{clienteData?.duracionServicioMinutos || 30} minutos</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Recompensas Canjeadas:</span>
                <span className="font-bold text-slate-800">{clienteData?.totalRecompensasCanjeadas || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMER SATISFACTION & REVIEW SECTION (Visible only if completed visit exists and last review > 90 days) */}
        {clienteData && (
          <DejarResenaSection
            cliente={clienteData}
            sellosHistorial={sellosHistorial}
            config={config}
          />
        )}

        {/* IMMUTABLE STAMP AUDIT HISTORY */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
                <History className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-slate-900 text-base">
                Historial de Sellos y Visitas
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Registro inmutable en tiempo real
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Todo lo que ves aquí es exactamente lo que tiene registrado el vidriero en su sistema.
          </p>

          {loadingHistorial ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Cargando historial de sellos...
            </div>
          ) : sellosHistorial.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-1">
              <Award className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">Aún no hay sellos registrados</p>
              <p>Tu vidriero otorgará el primer sello al completar la próxima visita.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sellosHistorial.map((sello) => (
                <div key={sello.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {sello.tipo === 'canje' 
                          ? '🎉 Canje de Recompensa' 
                          : sello.tipo === 'correccion'
                          ? 'Nota de Ajuste'
                          : 'Sello Otorgado por Limpieza'}
                      </p>
                      {sello.notas && (
                        <p className="text-slate-500 text-[11px] mt-0.5">{sello.notas}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Otorgado por: <strong>{sello.otorgadoPor || 'vidriero'}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                    {formatearFecha(sello.fecha ? sello.fecha.split('T')[0] : undefined)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MY PROFILE & COMMERCIAL PREMISES EDIT FORM */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
                <Store className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-slate-900 text-base">
                Datos de mi Comercio / Residencia
              </h3>
            </div>
            {!isEditingProfile && (
              <button
                type="button"
                id="btn-edit-client-profile"
                onClick={() => setIsEditingProfile(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar</span>
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comercio o Domicilio
                  </label>
                  <input
                    type="text"
                    required
                    value={localComercial}
                    onChange={(e) => setLocalComercial(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Titular / Persona de Contacto
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas o Instrucciones para el Vidriero (Horarios preferidos, acceso)
                </label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs flex items-center gap-1.5"
                >
                  {savingProfile ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Comercio</span>
                <p className="font-bold text-slate-800 text-sm">{clienteData?.localComercial || 'No especificado'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contacto</span>
                <p className="font-bold text-slate-800 text-sm">{clienteData?.nombre || 'No especificado'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Teléfono</span>
                <p className="font-bold text-slate-800 text-sm">{clienteData?.telefono || 'No especificado'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Dirección</span>
                <p className="font-bold text-slate-800 text-sm">{clienteData?.direccion || 'No especificada'}</p>
              </div>
              {clienteData?.notas && (
                <div className="sm:col-span-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Notas de acceso</span>
                  <p className="text-slate-700 mt-0.5">{clienteData.notas}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* NOTIFICATION PREFERENCES CARD (PUSH & EMAIL) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-50 text-sky-600">
                <Bell className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-slate-900 text-base">
                Preferencias de Notificaciones
              </h3>
            </div>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Avisos y Recordatorios
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Controla cómo y cuándo deseas que te avisemos sobre la visita del vidriero y tus reservas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Push Notifications Toggle */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-black text-slate-900">Notificaciones Push</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Alertas en pantalla 24h antes de la limpieza y confirmaciones
                </p>
              </div>
              <button
                type="button"
                id="btn-client-toggle-push"
                onClick={() => handleTogglePush(!pushActivo)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pushActivo ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    pushActivo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Email Notifications Toggle */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-900">Emails Automáticos</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Comprobante detallado con link directo para cancelar o reprogramar
                </p>
              </div>
              <button
                type="button"
                id="btn-client-toggle-email"
                onClick={() => handleToggleEmail(!emailActivo)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  emailActivo ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    emailActivo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Device status and test alert */}
          <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Permiso en este celular/navegador:
                </span>
                {devicePermission === 'granted' ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3" /> Activado
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                    {devicePermission === 'denied' ? 'Bloqueado' : 'Pendiente'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {devicePermission === 'granted'
                  ? 'Recibirás las alertas directo en tu barra de notificaciones.'
                  : 'Habilita los permisos para que no se te pase la visita del vidriero.'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {devicePermission !== 'granted' ? (
                <button
                  type="button"
                  id="btn-client-enable-push"
                  disabled={savingNotif || devicePermission === 'denied'}
                  onClick={handleEnableDevicePush}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{savingNotif ? 'Activando...' : 'Activar en mi celular'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-client-test-push"
                  onClick={handleTestClientPush}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span>Probar notificación</span>
                </button>
              )}
            </div>
          </div>

          {testPushStatus && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{testPushStatus}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
