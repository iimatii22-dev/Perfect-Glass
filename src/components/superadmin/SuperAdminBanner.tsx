import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, ChevronDown, Building2, ExternalLink, LogOut, FlaskConical } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToNegocios } from '../../lib/negociosService';
import { subscribeModoSandbox } from '../../lib/sandboxService';
import { BusinessConfig, ModoSandboxConfig } from '../../types';

interface SuperAdminBannerProps {
  onGoToSuperAdmin: () => void;
  isViewingSuperAdminDashboard: boolean;
  onOpenDemo?: () => void;
}

export function SuperAdminBanner({
  onGoToSuperAdmin,
  isViewingSuperAdminDashboard,
  onOpenDemo,
}: SuperAdminBannerProps) {
  const { config, currentNegocioId, setCurrentNegocioId } = useConfig();
  const { isSuperAdmin, logout } = useAuth();
  const [negocios, setNegocios] = useState<BusinessConfig[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sandboxConfig, setSandboxConfig] = useState<ModoSandboxConfig>({ activo: false });

  useEffect(() => {
    if (!isSuperAdmin) return;
    const unsub = subscribeToNegocios(setNegocios);
    const unsubSandbox = subscribeModoSandbox(setSandboxConfig);
    return () => {
      unsub();
      unsubSandbox();
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  const currentNegocio = negocios.find((n) => n.id === currentNegocioId) || config;

  return (
    <div className="bg-slate-950 border-b border-indigo-500/40 text-slate-100 text-xs py-2 px-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Status */}
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold tracking-wider uppercase text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            SuperAdmin
          </span>

          {sandboxConfig.activo && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black uppercase text-[10px] shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MODO SANDBOX ACTIVO
            </span>
          )}

          {!isViewingSuperAdminDashboard ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 hidden sm:inline">Visualizando negocio:</span>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 font-bold text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentNegocio.colorPrimario || '#0284c7' }}
                  />
                  <span>{currentNegocio.nombreNegocio || currentNegocioId}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({currentNegocioId})</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 max-h-72 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                      Cambiar de Negocio
                    </div>
                    {negocios.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (n.id) setCurrentNegocioId(n.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          n.id === currentNegocioId ? 'bg-indigo-600/20 text-indigo-300 font-bold' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: n.colorPrimario || '#0284c7' }}
                          />
                          <span className="truncate">{n.nombreNegocio}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{n.plan}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-slate-300 font-medium">
              Panel Maestro de Control Multi-Tenant ({negocios.length} negocios)
            </span>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {onOpenDemo && (
            <button
              id="btn-banner-open-demo"
              onClick={onOpenDemo}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 font-bold rounded-md transition-colors"
              title="Abrir Laboratorio de Pruebas y Simulación (/superadmin/demo)"
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
              <span>Consola Demo (/superadmin/demo)</span>
            </button>
          )}

          {!isViewingSuperAdminDashboard ? (
            <button
              onClick={onGoToSuperAdmin}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-md shadow-sm transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al Panel SuperAdmin
            </button>
          ) : (
            <button
              onClick={() => {
                if (currentNegocioId) {
                  // Switch to current negocio admin view
                  window.dispatchEvent(new CustomEvent('switch-to-business-admin', { detail: { negocioId: currentNegocioId } }));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-md border border-slate-700 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              Ver Negocio Activo ({currentNegocio.nombreNegocio})
            </button>
          )}

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
