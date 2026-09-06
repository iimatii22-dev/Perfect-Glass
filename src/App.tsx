import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { AgendaTab } from './components/tabs/AgendaTab';
import { ClientesTab } from './components/tabs/ClientesTab';
import { ResenasTab } from './components/tabs/ResenasTab';
import { FidelidadTab } from './components/tabs/FidelidadTab';
import { ReportesTab } from './components/tabs/ReportesTab';
import { ConfiguracionTab } from './components/tabs/ConfiguracionTab';
import { ClientDashboard } from './components/client/ClientDashboard';
import { PublicBookingPage } from './components/public/PublicBookingPage';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { SuperAdminBanner } from './components/superadmin/SuperAdminBanner';
import { SuperAdminDemoPage } from './components/superadmin/SuperAdminDemoPage';
import { PublicClienteRegisterPage } from './components/public/PublicClienteRegisterPage';
import { AccountStatusScreen } from './components/AccountStatusScreen';
import { TabType } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { PublicOpinionPage } from './components/public/PublicOpinionPage';
import { PublicCancelacionPage } from './components/public/PublicCancelacionPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PushNotificationModal } from './components/PushNotificationModal';
import {
  verificarTokenPushUsuario,
  verificarYEnviarRecordatorios24h,
} from './lib/pushNotificationService';

function AppContent() {
  const { user, isCliente, isAdmin, isSuperAdmin, estadoUsuario, loading: authLoading } = useAuth();
  const { config, loading: configLoading, currentNegocioId, setCurrentNegocioId } = useConfig();
  const [activeTab, setActiveTab] = useState<TabType>('agenda');
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [publicTurnoId, setPublicTurnoId] = useState<string | null>(null);
  const [publicCancelToken, setPublicCancelToken] = useState<string | null>(null);
  const [isOpinionMode, setIsOpinionMode] = useState(false);
  const [opinionIdentifier, setOpinionIdentifier] = useState<string | null>(null);
  const [isCancellationMode, setIsCancellationMode] = useState(false);
  const [cancellationCurrentToken, setCancellationCurrentToken] = useState<string | null>(null);
  const [cancellationCurrentTurnoId, setCancellationCurrentTurnoId] = useState<string | null>(null);
  const [isRegisterClientMode, setIsRegisterClientMode] = useState(false);
  const [registerClientRef, setRegisterClientRef] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [viewingSuperAdminDashboard, setViewingSuperAdminDashboard] = useState(true);
  const [showPushModal, setShowPushModal] = useState(false);
  const [splashDismissed, setSplashDismissed] = useState(false);

  // Garantizar que la pantalla de bienvenida no quede bloqueada indefinidamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDismissed(true);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // Sync SuperAdmin state if login changes
  useEffect(() => {
    if (isSuperAdmin) {
      setViewingSuperAdminDashboard(true);
    }
  }, [isSuperAdmin]);

  // Push notification permission check on login
  useEffect(() => {
    if (!user || isPublicMode || isOpinionMode || isCancellationMode || isDemoMode) return;

    let timer: any;
    verificarTokenPushUsuario(user.uid).then((res) => {
      if (res.necesitaPermiso) {
        timer = setTimeout(() => {
          setShowPushModal(true);
        }, 2200);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, isPublicMode, isOpinionMode, isCancellationMode, isDemoMode]);

  // Background 24h reminders check for Admin / SuperAdmin
  useEffect(() => {
    if (!user || (!isAdmin && !isSuperAdmin)) return;
    const negocioId = config.id || 'perfect-glass';
    verificarYEnviarRecordatorios24h(negocioId).catch(console.error);

    const interval = setInterval(() => {
      verificarYEnviarRecordatorios24h(negocioId).catch(console.error);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, isAdmin, isSuperAdmin, config.id]);

  // Service Worker notificationclick message listener
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED' && event.data.url) {
        try {
          const url = new URL(event.data.url, window.location.origin);
          const tab = url.searchParams.get('tab');
          if (tab && ['agenda', 'clientes', 'resenas', 'fidelidad', 'reportes', 'configuracion'].includes(tab)) {
            setActiveTab(tab as TabType);
          }
        } catch {
          // ignore
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, []);

  // Listener for switching to business admin
  useEffect(() => {
    const handleSwitchToAdmin = (e: any) => {
      if (e.detail?.negocioId) {
        setCurrentNegocioId(e.detail.negocioId);
      }
      setViewingSuperAdminDashboard(false);
    };
    window.addEventListener('switch-to-business-admin', handleSwitchToAdmin);
    return () => window.removeEventListener('switch-to-business-admin', handleSwitchToAdmin);
  }, [setCurrentNegocioId]);

  // Check URL query parameters and pathname for public modes (agendar or opinion/feedback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;
    const agendar = params.get('agendar');
    const turnoId = params.get('turnoId') || params.get('turno');
    const token = params.get('cancelToken') || params.get('token');
    const tabParam = params.get('tab');

    if (tabParam && ['agenda', 'clientes', 'resenas', 'fidelidad', 'reportes', 'configuracion'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
    
    // Check for client public registration (/registro-cliente, /registro, #/registro-cliente, ?registro-cliente=true, or ?ref=...)
    const hash = window.location.hash || '';
    const isRegisterClientPath =
      pathname === '/registro-cliente' ||
      pathname.startsWith('/registro-cliente') ||
      pathname === '/registro' ||
      pathname.startsWith('/registro') ||
      pathname === '/invitacion' ||
      pathname.startsWith('/invitacion') ||
      hash.includes('registro-cliente') ||
      hash.includes('registro');

    const hashParams = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
    const refParam =
      params.get('ref') ||
      params.get('codigo') ||
      params.get('negocio') ||
      hashParams?.get('ref') ||
      hashParams?.get('codigo') ||
      hashParams?.get('negocio');

    const isExplicitRegister =
      isRegisterClientPath ||
      params.has('registro-cliente') ||
      params.has('registro') ||
      params.has('invitacion');

    // Si tiene refParam y no está intentando navegar el panel admin ni demo
    const isRefParamInvitation = Boolean(
      refParam &&
      !params.has('tab') &&
      !params.has('superadmin') &&
      !params.has('demo') &&
      !params.has('agendar') &&
      !params.has('opinion') &&
      !params.has('cancelar')
    );

    if (isExplicitRegister || isRefParamInvitation) {
      setIsRegisterClientMode(true);
      if (refParam) {
        setRegisterClientRef(refParam);
      }
      return;
    }

    // Check for demo console (/superadmin/demo or /demo or ?demo=true)
    const isDemoPath = pathname === '/superadmin/demo' || pathname === '/demo' || pathname.startsWith('/superadmin/demo');
    const demoParam = params.get('demo');
    if (isDemoPath || demoParam === 'true') {
      setIsDemoMode(true);
      return;
    }

    // Check for cancellation URL (/cancelar/[token] or ?cancelar=[token])
    const isCancelarPath = pathname.startsWith('/cancelar');
    const cancelarParam = params.get('cancelar');

    if (isCancelarPath || cancelarParam) {
      setIsCancellationMode(true);
      let tok = cancelarParam;
      if (!tok && isCancelarPath) {
        const parts = pathname.split('/cancelar/').filter(Boolean);
        if (parts.length > 0) {
          tok = parts[parts.length - 1];
        }
      }
      if (!tok) {
        tok = params.get('token') || params.get('cancelToken') || params.get('tokenCancelacion') || '';
      }
      if (tok && tok !== 'true') {
        setCancellationCurrentToken(tok);
      }
      const tId = params.get('turno') || params.get('turnoId') || '';
      if (tId) {
        setCancellationCurrentTurnoId(tId);
      }
      return;
    }

    // Check for opinion / feedback survey params
    const opinionParam = params.get('opinion') || params.get('feedback') || params.get('resena');
    const isOpinionPath = pathname.startsWith('/opinion');

    if (opinionParam || isOpinionPath) {
      setIsOpinionMode(true);
      let id = opinionParam;
      if (!id && isOpinionPath) {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length > 1) {
          id = parts[1];
        }
      }
      if (id && id !== 'true') {
        setOpinionIdentifier(id);
      }
      return;
    }

    if (agendar === 'true' || turnoId || token) {
      setIsPublicMode(true);
      if (turnoId) setPublicTurnoId(turnoId);
      if (token) setPublicCancelToken(token);
    }
  }, []);

  // PUBLIC OPINION / SATISFACTION SURVEY VIEW (Accessible without login)
  if (isOpinionMode) {
    return (
      <PublicOpinionPage
        initialIdentifier={opinionIdentifier}
        onBackToApp={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setIsOpinionMode(false);
        }}
      />
    );
  }

  // PUBLIC CANCELLATION VIEW (Accessible without login via email cancel link)
  if (isCancellationMode) {
    return (
      <PublicCancelacionPage
        token={cancellationCurrentToken || ''}
        turnoId={cancellationCurrentTurnoId || undefined}
        config={config}
        onBackToApp={() => {
          window.history.replaceState({}, '', '/');
          setIsCancellationMode(false);
        }}
        onGoToBooking={() => {
          window.history.replaceState({}, '', '/?agendar=true');
          setIsCancellationMode(false);
          setIsPublicMode(true);
        }}
      />
    );
  }

  // PUBLIC CLIENT REGISTRATION VIEW (/registro-cliente?ref=...)
  if (isRegisterClientMode) {
    return (
      <PublicClienteRegisterPage
        initialRef={registerClientRef || undefined}
        onBackToLogin={() => {
          window.history.replaceState({}, '', '/');
          setIsRegisterClientMode(false);
        }}
      />
    );
  }

  // Splash Loading Screen
  if (!splashDismissed && (configLoading || (authLoading && !isPublicMode))) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-sky-500/20"
            style={{ backgroundColor: config.colorPrimario || '#0284c7' }}
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Sparkles className="w-8 h-8" />
            )}
          </div>
          <h2 className="text-white font-bold text-lg tracking-tight">
            {config.nombreNegocio || 'Perfect Glass'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <button
            type="button"
            onClick={() => setSplashDismissed(true)}
            className="mt-2 text-xs text-sky-400/80 hover:text-sky-300 underline transition-colors"
          >
            Ingresar a la aplicación
          </button>
        </div>
      </div>
    );
  }

  // PUBLIC BOOKING VIEW (Accessible without login or from Client portal)
  if (isPublicMode) {
    return (
      <PublicBookingPage
        onBackToApp={() => {
          // Clean URL params and return to app
          window.history.replaceState({}, '', window.location.pathname);
          setIsPublicMode(false);
        }}
        initialTurnoId={publicTurnoId}
        initialCancelToken={publicCancelToken}
      />
    );
  }

  // DEMO CONSOLE (/demo) - STRICTLY RESTRICTED TO SUPERADMIN
  if (isDemoMode) {
    if (!user || !isSuperAdmin) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Acceso Restringido (/demo)</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              La consola de demostración y simulación Sandbox está restringida exclusivamente a usuarios SuperAdmin autenticados.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  window.history.replaceState({}, '', '/');
                  setIsDemoMode(false);
                }}
                className="w-full px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                Volver a la Aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <SuperAdminBanner
          onGoToSuperAdmin={() => {
            window.history.replaceState({}, '', '/');
            setIsDemoMode(false);
            setViewingSuperAdminDashboard(true);
          }}
          isViewingSuperAdminDashboard={false}
          onOpenDemo={() => setIsDemoMode(true)}
        />
        <SuperAdminDemoPage
          onBackToDashboard={() => {
            window.history.replaceState({}, '', '/');
            setIsDemoMode(false);
            setViewingSuperAdminDashboard(true);
          }}
        />
      </div>
    );
  }

  // Not authenticated -> Show Login/Register Screen
  if (!user) {
    return (
      <div className="relative">
        <AuthScreen />
        {/* Floating switch to public booking */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setIsPublicMode(true)}
            className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-950 text-white rounded-2xl text-xs font-bold shadow-lg border border-slate-700 flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Ver Auto-Agendamiento Público</span>
          </button>
        </div>
      </div>
    );
  }

  // USER STATUS RESTRICTION (Pendiente or Suspendido)
  // SuperAdmins are exempt from status restrictions
  if (!isSuperAdmin && (estadoUsuario === 'suspendido' || estadoUsuario === 'pendiente')) {
    return <AccountStatusScreen status={estadoUsuario} />;
  }

  // CLIENT PORTAL (When logged in as Cliente)
  if (isCliente) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <ClientDashboard
          onOpenBooking={() => setIsPublicMode(true)}
        />
        <PWAInstallPrompt />
        <PushNotificationModal
          isOpen={showPushModal}
          onClose={() => setShowPushModal(false)}
        />
      </div>
    );
  }

  // SUPERADMIN MASTER VIEW (When logged in as SuperAdmin and viewing master panel)
  if (isSuperAdmin && viewingSuperAdminDashboard) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <SuperAdminBanner
          onGoToSuperAdmin={() => setViewingSuperAdminDashboard(true)}
          isViewingSuperAdminDashboard={true}
          onOpenDemo={() => {
            window.history.pushState({}, '', '/superadmin/demo');
            setIsDemoMode(true);
          }}
        />
        <SuperAdminDashboard
          onSelectNegocio={(negocioId) => {
            setCurrentNegocioId(negocioId);
            setViewingSuperAdminDashboard(false);
          }}
          onOpenDemo={() => {
            window.history.pushState({}, '', '/superadmin/demo');
            setIsDemoMode(true);
          }}
        />
      </div>
    );
  }

  // ADMIN / VIDRIERO PORTAL (or SuperAdmin inspecting a specific business) -> Full-feature Admin Shell
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* SuperAdmin Master Banner when inspecting a business */}
      {isSuperAdmin && (
        <SuperAdminBanner
          onGoToSuperAdmin={() => setViewingSuperAdminDashboard(true)}
          isViewingSuperAdminDashboard={false}
          onOpenDemo={() => {
            window.history.pushState({}, '', '/superadmin/demo');
            setIsDemoMode(true);
          }}
        />
      )}

      {/* Dynamic Fixed Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBooking={() => setIsPublicMode(true)}
        onOpenSuperAdmin={isSuperAdmin ? () => setViewingSuperAdminDashboard(true) : undefined}
      />

      {/* Main Content Area with Animated Transition & Fixed Header Spacing */}
      <main className={`flex-1 w-full max-w-6xl mx-auto pb-24 lg:pb-12 px-3 sm:px-6 overflow-y-auto ${isSuperAdmin ? 'pt-28 sm:pt-32' : 'pt-20 sm:pt-24'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {activeTab === 'agenda' && <AgendaTab />}
            {activeTab === 'clientes' && <ClientesTab />}
            {activeTab === 'resenas' && <ResenasTab />}
            {activeTab === 'fidelidad' && <FidelidadTab />}
            {activeTab === 'reportes' && <ReportesTab />}
            {activeTab === 'configuracion' && (
              <ConfiguracionTab onNavigateToTab={(tab) => setActiveTab(tab as TabType)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly for smartphone & PWA installs) */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Push Notification Permission Modal */}
      <PushNotificationModal
        isOpen={showPushModal}
        onClose={() => setShowPushModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <AppContent />
      </ConfigProvider>
    </AuthProvider>
  );
}

