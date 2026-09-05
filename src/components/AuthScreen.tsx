import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  KeyRound,
  UserPlus,
  User,
  Phone,
  Store,
  Award,
  Clock,
  CheckCircle
} from 'lucide-react';
import { UserRole } from '../types';

export function AuthScreen() {
  const { 
    login, 
    loginDemoSuperAdmin,
    loginDemoAdmin, 
    loginDemoCliente, 
    registerAdmin, 
    registerCliente, 
    resetPassword, 
    authError, 
    clearAuthError 
  } = useAuth();
  const { config } = useConfig();

  // Role tab selection: Admin (Vidriero) vs Cliente
  const [selectedRole, setSelectedRole] = useState<UserRole>('cliente');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Extra client registration fields
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [localComercial, setLocalComercial] = useState('');

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResetSuccessMsg(null);
    clearAuthError();

    if (!email || (!password && mode !== 'forgot')) {
      setLocalError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setLocalError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Las contraseñas no coinciden.');
        return;
      }

      if (selectedRole === 'cliente') {
        if (!nombre.trim() || !telefono.trim() || !localComercial.trim()) {
          setLocalError('Por favor completa el nombre de tu comercio/casa, nombre de contacto y teléfono.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (selectedRole === 'admin') {
          await registerAdmin(email, password);
        } else {
          await registerCliente({
            email,
            pass: password,
            nombre,
            telefono,
            localComercial,
          });
          setRegisteredSuccess(true);
        }
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setResetSuccessMsg('Hemos enviado un enlace de recuperación a tu correo electrónico.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Error en la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setSelectedRole('admin');
    setMode('login');
    setEmail('admin@perfectglass.com');
    setPassword('admin123456');
    setConfirmPassword('admin123456');
    setLocalError(null);
    clearAuthError();
  };

  const primaryColor = config.colorPrimario || '#0284c7';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/25 to-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        {/* Card Header & Branding */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1 bg-white shadow-lg border border-slate-100 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105"
              style={{ borderColor: `${primaryColor}30` }}
            >
              {config.logoUrl && !imgError ? (
                <img
                  src={config.logoUrl}
                  alt={config.nombreNegocio}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div
                  className="w-full h-full rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Sparkles className="w-10 h-10" />
                </div>
              )}
            </div>
          </div>

          <h1
            id="auth-business-title"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            {config.nombreNegocio || 'Perfect Glass'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            {selectedRole === 'cliente' 
              ? 'Portal de Clientes & Programa de Fidelidad' 
              : 'Portal de Gestión del Vidriero'}
          </p>
        </div>

        {/* ROLE SELECTOR TOP PILL */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1.5 rounded-2xl mb-4 shadow-inner">
          <button
            type="button"
            id="auth-role-cliente"
            onClick={() => {
              setSelectedRole('cliente');
              setLocalError(null);
              clearAuthError();
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              selectedRole === 'cliente'
                ? 'bg-white text-sky-700 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Soy Cliente</span>
          </button>

          <button
            type="button"
            id="auth-role-admin"
            onClick={() => {
              setSelectedRole('admin');
              setLocalError(null);
              clearAuthError();
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              selectedRole === 'admin'
                ? 'bg-white text-slate-900 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Soy Vidriero</span>
          </button>
        </div>

        {/* Main Auth Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8 backdrop-blur-sm">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 border border-slate-200/60">
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setMode('login');
                setLocalError(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              style={mode === 'login' ? { color: primaryColor } : undefined}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setMode('register');
                setLocalError(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              style={mode === 'register' ? { color: primaryColor } : undefined}
            >
              {selectedRole === 'cliente' ? 'Registrar mi Comercio' : 'Crear Cuenta'}
            </button>
          </div>

          {/* Alert / Error Messages */}
          {(localError || authError) && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{localError || authError}</div>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{resetSuccessMsg}</div>
            </div>
          )}

          {registeredSuccess && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                ¡Solicitud de registro enviada con éxito!
              </p>
              <p className="text-slate-600 leading-relaxed">
                Tu comercio está registrado con estado <strong>Pendiente de Aprobación</strong>. El vidriero validará tus datos para activar tu cuenta de fidelidad y visitas.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* CLIENT REGISTER SPECIFIC FIELDS */}
            {mode === 'register' && selectedRole === 'cliente' && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Comercio o Domicilio
                  </label>
                  <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Store className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-input-local-comercial"
                      type="text"
                      required
                      placeholder="Ej: Cafetería Dulce Grano / Casa San Isidro"
                      value={localComercial}
                      onChange={(e) => setLocalComercial(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nombre del Titular o Contacto
                  </label>
                  <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-input-nombre"
                      type="text"
                      required
                      placeholder="Ej: María González"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-input-telefono"
                      type="tel"
                      required
                      placeholder="Ej: +54 9 11 4522-8910"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-input-email"
                  type="email"
                  required
                  placeholder={selectedRole === 'cliente' ? 'cliente@mitienda.com' : 'admin@perfectglass.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-xl focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Contraseña
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      id="auth-btn-forgot"
                      onClick={() => {
                        setMode('forgot');
                        setLocalError(null);
                        clearAuthError();
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-input-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Register Mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative rounded-xl border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-input-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="auth-submit-btn"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 mt-2"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <span>Ingresar como {selectedRole === 'cliente' ? 'Cliente' : 'Vidriero'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {selectedRole === 'cliente' 
                      ? 'Enviar Solicitud de Registro' 
                      : 'Registrar Cuenta de Vidriero'}
                  </span>
                </>
              ) : (
                <>
                  <span>Enviar Correo de Recuperación</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Volver a Iniciar Sesión
              </button>
            )}
          </form>

          {/* Quick Demo Switcher Section */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Acceso de Prueba / Demostración Rápida</span>
            </p>
            <p className="text-[11px] text-slate-500 mb-3">
              Prueba al instante las dos experiencias independientes:
            </p>

            <div className="space-y-2">
              {/* Demo SuperAdmin Master Button */}
              <button
                type="button"
                id="btn-demo-superadmin"
                disabled={loading || demoLoading}
                onClick={loginDemoSuperAdmin}
                className="w-full py-2 px-3 bg-gradient-to-r from-indigo-900 to-slate-900 hover:from-indigo-800 hover:to-slate-800 border border-indigo-500/40 active:scale-[0.99] text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Entrar como SuperAdmin (Master Multi-Tenant)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
              </button>

              {/* Demo Admin Button */}
              <button
                type="button"
                id="btn-demo-vidriero"
                disabled={loading || demoLoading}
                onClick={loginDemoAdmin}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Entrar como Vidriero (Admin de Negocio)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Demo Client 4/5 stamps */}
              <button
                type="button"
                id="btn-demo-cliente-progreso"
                disabled={loading || demoLoading}
                onClick={() => loginDemoCliente('aprobado')}
                className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 active:scale-[0.99] text-sky-900 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-sky-600" />
                  <span>Entrar como Cliente (4/5 Sellos acumulados)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
              </button>

              {/* Demo Client Reward ready */}
              <button
                type="button"
                id="btn-demo-cliente-recompensa"
                disabled={loading || demoLoading}
                onClick={() => loginDemoCliente('con-recompensa')}
                className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-[0.99] text-emerald-900 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Entrar como Cliente (¡Premio listo para canjear!)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              </button>

              {/* Demo Client Pending */}
              <button
                type="button"
                id="btn-demo-cliente-pendiente"
                disabled={loading || demoLoading}
                onClick={() => loginDemoCliente('pendiente')}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 active:scale-[0.99] text-amber-900 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Entrar como Cliente (Solicitud Pendiente)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center text-xs text-slate-400">
          <p>{config.nombreNegocio || 'Perfect Glass'} • Gestión de Limpieza & Fidelidad</p>
        </div>
      </div>
    </div>
  );
}

