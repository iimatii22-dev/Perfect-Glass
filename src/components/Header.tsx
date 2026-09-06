import { useState, useEffect, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, 
  X, 
  Calendar, 
  Users, 
  Gift, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  ChevronRight,
  Check,
  BarChart3,
  TrendingUp,
  Star,
} from 'lucide-react';
import { TabType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { NotificacionesBell } from './notificaciones/NotificacionesBell';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab?: (tab: TabType) => void;
  onOpenBooking?: () => void;
  onOpenSuperAdmin?: () => void;
}

export function Header({ activeTab, setActiveTab, onOpenBooking, onOpenSuperAdmin }: HeaderProps) {
  const { config } = useConfig();
  const { user, logout, isSuperAdmin } = useAuth();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setShowConfirmLogout(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    {
      id: 'agenda' as TabType,
      label: 'Agenda de Visitas',
      shortLabel: 'Agenda',
      description: 'Citas, turnos y rutas del día',
      icon: Calendar,
    },
    {
      id: 'clientes' as TabType,
      label: 'Directorio de Clientes',
      shortLabel: 'Clientes',
      description: 'Fichas técnicas, frecuencias y registros',
      icon: Users,
    },
    {
      id: 'resenas' as TabType,
      label: 'Reseñas y Calificaciones',
      shortLabel: 'Reseñas',
      description: 'Filtros 1-3 vs 4-5 y derivación a Google Maps',
      icon: Star,
    },
    {
      id: 'fidelidad' as TabType,
      label: 'Programa de Fidelidad',
      shortLabel: 'Fidelidad',
      description: 'Cartilla de sellos y recompensas',
      icon: Gift,
    },
    {
      id: 'reportes' as TabType,
      label: 'Reportes de Ingresos',
      shortLabel: 'Reportes',
      description: 'Métricas financieras, balance y clientes top',
      icon: BarChart3,
    },
    {
      id: 'configuracion' as TabType,
      label: 'Configuración del Negocio',
      shortLabel: 'Configuración',
      description: 'Personalización, branding y tarifas',
      icon: Settings,
    },
  ];

  const getTabTitle = (tab: TabType) => {
    const item = navItems.find((n) => n.id === tab);
    return item ? item.label : 'Panel Principal';
  };

  const handleSelectTab = (tab: TabType) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* ALWAYS FIXED TOP NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all select-none">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Left: Logo & Business Branding */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-xs border border-slate-200/60 bg-slate-50 shrink-0 flex items-center justify-center relative"
              style={{ borderColor: `${config.colorPrimario || '#0284c7'}30` }}
            >
              {config.logoUrl && !imgError ? (
                <img
                  src={config.logoUrl}
                  alt={config.nombreNegocio}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-white"
                  style={{ backgroundColor: config.colorPrimario || '#0284c7' }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 
                  id="header-business-name" 
                  className="font-extrabold text-slate-900 text-sm sm:text-lg truncate tracking-tight"
                >
                  {config.nombreNegocio || 'Perfect Glass'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate font-medium flex items-center gap-1">
                <span className="text-slate-700 font-semibold">{getTabTitle(activeTab)}</span>
                {config.telefono && <span className="hidden md:inline text-slate-400">• {config.telefono}</span>}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Shortcut Tabs (Middle on wide screens) */}
          {setActiveTab && (
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`desktop-tab-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                    style={isActive ? { color: config.colorPrimario || '#0284c7' } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right: TOP-RIGHT HAMBURGER DROPDOWN TRIGGER & QUICK ACTIONS */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative" ref={menuRef}>
            {/* Campana de Notificaciones Internas */}
            <NotificacionesBell
              usuarioUid={user?.uid || (user?.isDemo ? 'demo-admin-uid-123' : null)}
              onNavegarATurno={(_turnoId) => {
                if (setActiveTab) {
                  setActiveTab('agenda');
                }
              }}
            />

            {/* Quick Public Booking Preview Button (Desktop) */}
            {onOpenBooking && (
              <button
                type="button"
                id="btn-header-public-booking"
                onClick={onOpenBooking}
                title="Ver página pública de auto-agendamiento"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 rounded-xl border border-slate-200/80 hover:border-sky-200 transition-all"
              >
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                <span>Web Turnos</span>
              </button>
            )}

            {/* TOP-RIGHT HAMBURGER MENU BUTTON */}
            <button
              type="button"
              id="btn-hamburger-menu"
              aria-label="Menú principal de navegación"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`p-2 sm:px-3 sm:py-2 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border shadow-xs active:scale-95 ${
                isMenuOpen
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                  : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900'
              }`}
              style={
                !isMenuOpen && config.colorPrimario
                  ? { backgroundColor: config.colorPrimario, borderColor: config.colorPrimario }
                  : undefined
              }
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 transition-transform duration-200 rotate-90" />
              ) : (
                <Menu className="w-5 h-5 transition-transform duration-200" />
              )}
              <span className="hidden sm:inline font-bold">Menú</span>
            </button>

            {/* DROPDOWN MENU POPOVER */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 divide-y divide-slate-100"
                >
                  {/* Menu User Header */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/60 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-900">
                          {config.nombreNegocio || 'Vidriería'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {user?.email || 'admin@perfectglass.com'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 shrink-0">
                      Vidriero
                    </span>
                  </div>

                  {/* Main Navigation Items */}
                  <div className="p-2 space-y-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Navegación Rápida
                    </p>
                    {navItems.map((item) => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          id={`dropdown-item-${item.id}`}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                            isActive
                              ? 'bg-sky-50/90 text-sky-950 font-bold border border-sky-100'
                              : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                isActive
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                              }`}
                              style={isActive && config.colorPrimario ? { backgroundColor: config.colorPrimario } : undefined}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs ${isActive ? 'font-extrabold' : 'font-semibold'}`}>
                                {item.label}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {isActive ? (
                            <Check className="w-4 h-4 text-sky-600 shrink-0 ml-2" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Secondary Actions */}
                  <div className="p-2 space-y-1 bg-slate-50/50">
                    {onOpenSuperAdmin && isSuperAdmin && (
                      <button
                        type="button"
                        id="dropdown-item-superadmin"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenSuperAdmin();
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-900 text-xs font-semibold transition-all border border-indigo-200/60"
                      >
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-bold text-indigo-950">Panel SuperAdmin Master</p>
                          <p className="text-[10px] text-indigo-600">Gestión global de negocios</p>
                        </div>
                      </button>
                    )}

                    {onOpenBooking && (
                      <button
                        type="button"
                        id="dropdown-item-booking"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenBooking();
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white text-slate-700 hover:text-sky-700 text-xs font-semibold transition-all border border-transparent hover:border-slate-200/60"
                      >
                        <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-bold">Portal Público de Turnos</p>
                          <p className="text-[10px] text-slate-400">Ver vista de clientes sin login</p>
                        </div>
                      </button>
                    )}

                    <button
                      type="button"
                      id="dropdown-item-logout"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowConfirmLogout(true);
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold transition-all border border-transparent hover:border-rose-100"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-bold text-rose-600">Cerrar Sesión</p>
                        <p className="text-[10px] text-slate-400">Salir del panel de administración</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Modal Backdrop when Dropdown is Open */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 top-16 sm:top-20 bg-slate-900/20 backdrop-blur-2xs z-30 transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </header>

      {/* Logout Confirmation Modal */}
      {showConfirmLogout && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">¿Cerrar sesión?</h3>
            <p className="text-xs text-slate-500 mb-6">
              Tendrás que ingresar tu correo y contraseña para volver al panel de {config.nombreNegocio}.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-cancel-logout"
                onClick={() => setShowConfirmLogout(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-logout"
                onClick={async () => {
                  setShowConfirmLogout(false);
                  await logout();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors shadow-xs shadow-rose-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

