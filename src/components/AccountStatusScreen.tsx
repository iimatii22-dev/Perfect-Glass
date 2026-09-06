import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import {
  Clock,
  ShieldAlert,
  LogOut,
  Mail,
  RefreshCw,
  Building2,
  ShieldCheck,
} from 'lucide-react';

interface AccountStatusScreenProps {
  status: 'pendiente' | 'suspendido';
}

export function AccountStatusScreen({ status }: AccountStatusScreenProps) {
  const { user, usuarioDoc, clienteData, logout } = useAuth();
  const { config } = useConfig();

  const isPending = status === 'pendiente';
  const primaryColor = config.colorPrimario || '#0284c7';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          {isPending ? (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Heading */}
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isPending ? 'Solicitud en Revisión' : 'Cuenta Suspendida'}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {isPending
              ? 'Tu cuenta ha sido creada y se encuentra pendiente de aprobación.'
              : 'El acceso a esta cuenta ha sido temporalmente inhabilitado.'}
          </p>
        </div>

        {/* Details card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-400">Usuario:</span>
            <strong className="text-white truncate">{user?.email || 'Desconocido'}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-400">Negocio:</span>
            <strong className="text-white">{config.nombreNegocio || 'Vidriería'}</strong>
          </div>

          {isPending ? (
            <div className="pt-2 border-t border-slate-800 text-slate-400 space-y-1">
              <p>
                Por razones de control y calidad en el servicio, el vidriero administrador debe validar tu
                local o domicilio antes de habilitar tu agenda y tarjeta de sellos.
              </p>
              <p className="text-amber-400 font-semibold pt-1">
                Te notificaremos en cuanto tu cuenta esté activa.
              </p>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-800 text-slate-400 space-y-1">
              <p>
                Si consideras que esto es un error o necesitas reactivar tu suscripción, ponte en contacto
                con el soporte de la plataforma o con tu administrador.
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5 pt-2">
          {isPending && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verificar Aprobación Nuevamente</span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
