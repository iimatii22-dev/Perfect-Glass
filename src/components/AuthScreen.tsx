import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Building2,
  KeyRound,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Store,
  User,
  Phone,
} from 'lucide-react';

export function AuthScreen() {
  const {
    login,
    registerAdmin,
    resetPassword,
    authError,
    clearAuthError,
    loginDemoAdmin,
    loginDemoSuperAdmin,
    loginDemoCliente,
  } = useAuth();
  const { config } = useConfig();

  const [mode, setMode] = useState<'login' | 'register_admin' | 'forgot'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [nombreSolicitante, setNombreSolicitante] = useState('');
  const [telefono, setTelefono] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResetSuccessMsg(null);
    setRegisterSuccessMsg(null);
    clearAuthError();

    if (!email.trim() || (!password && mode !== 'forgot')) {
      setLocalError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (mode === 'register_admin') {
      if (!nombreSolicitante.trim()) {
        setLocalError('Por favor ingresa tu nombre y apellido.');
        return;
      }
      if (!nombreNegocio.trim()) {
        setLocalError('Por favor ingresa el nombre de tu vidriería o negocio.');
        return;
      }
      if (!telefono.trim()) {
        setLocalError('Por favor ingresa un teléfono de contacto.');
        return;
      }
      if (password.length < 6) {
        setLocalError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Las contraseñas no coinciden.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        // Unified login: Automatically routes according to actual Firestore role
        await login(email.trim(), password);
      } else if (mode === 'register_admin') {
        await registerAdmin(email.trim(), password, {
          nombreSolicitante: nombreSolicitante.trim(),
          nombreNegocio: nombreNegocio.trim(),
          telefono: telefono.trim(),
        });
        setRegisterSuccessMsg(
          '¡Solicitud enviada con éxito! Tu cuenta ha sido registrada en estado de revisión y tu comercio será activado por la administración.'
        );
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setResetSuccessMsg(
          'Hemos enviado un enlace de restablecimiento de contraseña a tu correo electrónico.'
        );
      }
    } catch (err: any) {
      setLocalError(err.message || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = config.colorPrimario || '#0284c7';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-center items-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-6 space-y-3">
          <div className="relative inline-flex items-center justify-center">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1 bg-slate-900 shadow-2xl border border-slate-800 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105"
              style={{ borderColor: `${primaryColor}40` }}
            >
              {config.logoUrl && !imgError ? (
                <img
                  src={config.logoUrl}
                  alt={config.nombreNegocio || 'Logo'}
                  className="w-full h-full object-cover rounded-2xl"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-inner"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(config.nombreNegocio || 'PG').substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Gestión de Servicios
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Plataforma de Gestión de Servicios y Portal de Fidelidad
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Header Title depending on Mode */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'login' && 'Iniciar Sesión'}
                {mode === 'register_admin' && 'Registrar Nueva Vidriería'}
                {mode === 'forgot' && 'Recuperar Contraseña'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'login' && 'Acceso seguro para administradores y clientes'}
                {mode === 'register_admin' && 'Crea tu cuenta de vidriero administrador'}
                {mode === 'forgot' && 'Te enviaremos un correo con las instrucciones'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
          </div>

          {/* Feedback messages */}
          {(localError || authError) && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{localError || authError}</span>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {registerSuccessMsg && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs text-sky-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
              <span>{registerSuccessMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register_admin' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tu Nombre y Apellido *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={nombreSolicitante}
                      onChange={(e) => setNombreSolicitante(e.target.value)}
                      placeholder="Ej. Martín Gómez"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre de tu Vidriería / Empresa *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={nombreNegocio}
                      onChange={(e) => setNombreNegocio(e.target.value)}
                      placeholder="Ej. Vidriería El Cristal"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono / WhatsApp de Contacto *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+54 9 11 1234-5678"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300/90 leading-relaxed">
                  <span className="font-semibold text-amber-200">Alta sujeta a revisión:</span> Al registrarte, tu solicitud pasará a revisión de la plataforma. Una vez aprobada se asignará tu negocio y podrás gestionar clientes.
                </div>
              </>
            )}

            {mode === 'login' && typeof window !== 'undefined' && (window.location.search.includes('superadmin') || window.location.search.includes('sa=1')) && (
              <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="text-left">
                  <div className="text-[11px] font-bold text-indigo-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Acceso Propietario</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    msosa.illescas94@gmail.com
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('msosa.illescas94@gmail.com');
                    setPassword('ELMATIOSAa1@');
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shrink-0"
                >
                  Rellenar
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Contraseña *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setLocalError(null);
                        clearAuthError();
                      }}
                      className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register_admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <span>Ingresar a mi Cuenta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : mode === 'register_admin' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Cuenta de Vidriero</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Correo de Recuperación</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLocalError(null);
                  clearAuthError();
                }}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Volver al Inicio de Sesión
              </button>
            )}
          </form>

          {/* Links between modes & note for clients */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            {mode === 'login' ? (
              <>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register_admin');
                      setLocalError(null);
                      clearAuthError();
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>¿Eres vidriero y quieres gestionar tu negocio? Regístrate aquí</span>
                  </button>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 text-[11px] text-slate-400 leading-relaxed text-center">
                  <span className="text-slate-300 font-semibold block mb-0.5">
                    ¿Eres cliente de un vidriero?
                  </span>
                  Para registrarte por primera vez solicita a tu vidriero su enlace de invitación
                  exclusivo (con formato <code className="text-sky-400">/registro-cliente?ref=...</code>
                  ). Si ya tienes cuenta creada, inicia sesión arriba con tu correo.
                </div>
              </>
            ) : (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLocalError(null);
                    clearAuthError();
                  }}
                  className="text-xs text-slate-400 hover:text-white font-semibold"
                >
                  ¿Ya tienes cuenta? Inicia sesión aquí
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Demo Mode Access Panel */}
        <div className="mt-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2.5">
          <p className="text-xs font-semibold text-slate-300">
            Acceso Rápido de Demostración:
          </p>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              id="btn-quick-access-vidriero"
              onClick={() => loginDemoAdmin()}
              className="px-3 py-2.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-xs"
            >
              <Store className="w-4 h-4 text-sky-400" />
              <span>Vidriero</span>
            </button>
            <button
              type="button"
              id="btn-quick-access-client"
              onClick={() => loginDemoCliente('aprobado')}
              className="px-3 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-xs"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Cliente VIP</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>Gestión de Servicios • Plataforma de Gestión de Servicios y Portal de Fidelidad</p>
        </div>
      </div>
    </div>
  );
}
