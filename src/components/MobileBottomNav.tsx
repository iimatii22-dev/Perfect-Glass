import React from 'react';
import {
  Calendar,
  Users,
  Gift,
  BarChart3,
  Settings,
  Star,
} from 'lucide-react';
import { TabType } from '../types';
import { useConfig } from '../contexts/ConfigContext';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const { config } = useConfig();
  const primaryColor = config.colorPrimario || '#0284c7';

  const navTabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'resenas', label: 'Reseñas', icon: Star },
    { id: 'fidelidad', label: 'Fidelidad', icon: Gift },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'configuracion', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav
      aria-label="Navegación inferior móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg pb-safe"
    >
      <div className="grid grid-cols-6 h-14 max-w-lg mx-auto items-center px-0.5">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`mobile-nav-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full w-full py-1 transition-all rounded-xl relative ${
                isActive
                  ? 'text-slate-900 font-extrabold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {isActive && (
                <span
                  className="absolute top-1 w-6 h-1 rounded-full animate-in fade-in zoom-in-50 duration-200"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
                style={isActive ? { color: primaryColor } : undefined}
              />
              <span
                className="text-[10px] mt-0.5 tracking-tight truncate max-w-full px-0.5"
                style={isActive ? { color: primaryColor } : undefined}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
