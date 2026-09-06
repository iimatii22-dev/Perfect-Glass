import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  Award,
  Clock,
  ArrowRight,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
} from 'lucide-react';

interface SuperAdminDemoPageProps {
  onBackToDashboard: () => void;
}

export function SuperAdminDemoPage({ onBackToDashboard }: SuperAdminDemoPageProps) {
  const {
    user,
    role,
    loginDemoSuperAdmin,
    loginDemoAdmin,
    loginDemoCliente,
  } = useAuth();
  const { config } = useConfig();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (actionKey: string, fn: () => Promise<void>) => {
    setLoadingAction(actionKey);
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back button */}
        <button
          type="button"
          onClick={onBackToDashboard}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard SuperAdmin</span>
        </button>

        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase font-bold tracking-wider">
            <FlaskConical className="w-4 h-4" />
            <span>Entorno Privado de Pruebas QA & Demostración</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Consola Demo SuperAdmin
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Esta herramienta interna está aislada en la ruta privada{' '}
            <code className="text-indigo-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
              /superadmin/demo
            </code>
            . Permite simular los diferentes estados de usuario y roles sin interferir con la
            pantalla de login público ni comprometer los datos de producción.
          </p>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>
              Usuario actual:{' '}
              <strong className="text-white">{user?.email || 'No autenticado'}</strong> (Rol:{' '}
              <span className="font-mono text-indigo-300">{role}</span>)
            </span>
          </div>
        </div>

        {/* Demo Actions Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">
            Cambiar Rol y Perfil Simulado
          </h2>

          {/* SuperAdmin */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">SuperAdmin Master</h3>
              </div>
              <p className="text-xs text-slate-400">
                Acceso global a todos los negocios, métricas del SaaS, logs y administración multi-tenant.
              </p>
            </div>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction('superadmin', loginDemoSuperAdmin)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Activar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Admin Vidriero */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Vidriero Administrador</h3>
              </div>
              <p className="text-xs text-slate-400">
                Panel operativo del negocio asignado: agenda de turnos, clientes, sellos y configuración de marca.
              </p>
            </div>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction('admin', loginDemoAdmin)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Activar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cliente Aprobado (4 sellos) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Cliente con 4/5 Sellos</h3>
              </div>
              <p className="text-xs text-slate-400">
                Portal de cliente en progreso de fidelidad, próximo turno programado y tarjeta digital.
              </p>
            </div>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction('cliente-aprobado', () => loginDemoCliente('aprobado'))}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Activar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cliente con Recompensa Lista */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Cliente con Recompensa Lista (5/5)</h3>
              </div>
              <p className="text-xs text-slate-400">
                Tarjeta de fidelidad completada al 100%, botón para canjear premio de limpieza gratis.
              </p>
            </div>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() =>
                handleAction('cliente-recompensa', () => loginDemoCliente('con-recompensa'))
              }
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Activar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cliente Pendiente */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Cliente Solicitud Pendiente</h3>
              </div>
              <p className="text-xs text-slate-400">
                Simula el estado post-registro web antes de que el vidriero apruebe la solicitud.
              </p>
            </div>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction('cliente-pendiente', () => loginDemoCliente('pendiente'))}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Activar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
