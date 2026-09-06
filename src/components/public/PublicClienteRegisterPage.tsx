import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Store,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Negocio } from '../../types';
import { obtenerNegocioPorRef } from '../../lib/negociosService';

interface PublicClienteRegisterPageProps {
  refCode?: string | null;
  initialRef?: string | null;
  onNavigateToLogin?: () => void;
  onBackToLogin?: () => void;
}

export function PublicClienteRegisterPage({
  refCode,
  initialRef,
  onNavigateToLogin,
  onBackToLogin,
}: PublicClienteRegisterPageProps) {
  const effectiveRefCode = refCode || initialRef || null;
  const handleNavigateToLogin = onBackToLogin || onNavigateToLogin || (() => {});
  const { registerCliente } = useAuth();

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loadingNegocio, setLoadingNegocio] = useState(true);
  const [negocioError, setNegocioError] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [localComercial, setLocalComercial] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registroExitoso, setRegistroExitoso] = useState(false);

  useEffect(() => {
    async function loadNegocio() {
      if (!effectiveRefCode || !effectiveRefCode.trim()) {
        setNegocioError('Enlace de invitación inválido o negocio inactivo');
        setLoadingNegocio(false);
        return;
      }

      setLoadingNegocio(true);
      setNegocioError(null);

      try {
        const found = await obtenerNegocioPorRef(effectiveRefCode);
        if (!found) {
          setNegocioError('Enlace de invitación inválido o negocio inactivo');
        } else {
          setNegocio(found);
        }
      } catch (err: any) {
        setNegocioError('Enlace de invitación inválido o negocio inactivo');
      } finally {
        setLoadingNegocio(false);
      }
    }

    loadNegocio();
  }, [effectiveRefCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negocio || !effectiveRefCode) return;

    setFormError(null);

    if (!nombre.trim() || !localComercial.trim() || !telefono.trim() || !email.trim() || !password) {
      setFormError('Por favor completa todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);

    try {
      await registerCliente({
        email: email.trim(),
        pass: password,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        localComercial: localComercial.trim(),
        refCode: effectiveRefCode.trim(),
        direccion: direccion.trim() || undefined,
      });

      setRegistroExitoso(true);
    } catch (err: any) {
      setFormError(err.message || 'Ocurrió un error al registrar tu cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = negocio?.colorPrimario || '#0284c7';

  // State: Loading Business Info
  if (loadingNegocio) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <Building2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-300">Verificando invitación de negocio...</p>
      </div>
    );
  }

  // State: Invalid Ref / Negocio Inactivo
  if (negocioError || !negocio) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Invitación no válida</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {negocioError || 'No pudimos encontrar el negocio asociado a este enlace.'}
          </p>
          <div className="bg-slate-900/60 rounded-xl p-3 text-xs text-slate-400 border border-slate-700/50 text-left">
            <span className="font-semibold text-slate-300 block mb-1">¿Qué puedes hacer?</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Pide a tu vidriero que te envíe su link de invitación actualizado.</li>
              <li>Si ya tienes una cuenta registrada, inicia sesión directamente.</li>
            </ul>
          </div>
          <div className="pt-2">
            <button
              onClick={handleNavigateToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>Ir al Inicio de Sesión</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State: Registration Success Screen
  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            style={{ backgroundColor: `${primaryColor}25`, color: primaryColor }}
          >
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-white">¡Solicitud Enviada!</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Tu registro para el portal de fidelidad de{' '}
            <strong className="text-white font-semibold">{negocio.nombreNegocio}</strong> ha sido
            recibido correctamente.
          </p>
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Estado: Pendiente de aprobación</span>
            </div>
            <p className="text-slate-400">
              Por motivos de seguridad y atención personalizada, el administrador activará tu
              cuenta en las próximas horas.
            </p>
            <p className="text-slate-400">
              Podrás acceder a tus turnos, sellos acumulados y recompensas exclusivas desde cualquier
              dispositivo.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleNavigateToLogin}
              className="w-full py-3 px-4 rounded-xl text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Ir a Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State: Active Registration Form with Business Branding
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Business Branding Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center text-white font-bold text-xl shadow-xl mx-auto"
            style={{ backgroundColor: primaryColor }}
          >
            {negocio.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombreNegocio}
                className="w-16 h-16 rounded-2xl object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              (negocio.nombreNegocio || 'PG').substring(0, 2).toUpperCase()
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {negocio.nombreNegocio}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Registro exclusivo para clientes. Acumula visitas, gana sellos y gestiona tus turnos de
            limpieza de vidrios.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Invitación autorizada</span>
          </div>
        </div>

        {/* Registration Card */}
        <div className="mt-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre y Apellido *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Sofía Benítez"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Local Comercial / Domicilio *
              </label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={localComercial}
                  onChange={(e) => setLocalComercial(e.target.value)}
                  placeholder="Ej. Cafetería Dulce Grano"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dirección (opcional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle 1234"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 car."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Repetir Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetir..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl text-white text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <span>Registrando solicitud...</span>
                ) : (
                  <>
                    <span>Solicitar Registro de Cliente</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              ¿Ya tienes una cuenta de cliente?{' '}
              <button
                type="button"
                onClick={handleNavigateToLogin}
                className="text-sky-400 hover:text-sky-300 font-semibold underline"
              >
                Iniciar Sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
