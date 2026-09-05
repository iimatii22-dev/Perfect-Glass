import React from 'react';
import { Calendar, Users, Gift, Settings } from 'lucide-react';
import { TabType } from '../types';
import { useConfig } from '../contexts/ConfigContext';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const { config } = useConfig();

  const navItems: NavItem[] = [
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'fidelidad', label: 'Fidelidad', icon: Gift },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe transition-all"
    >
      <div className="max-w-md md:max-w-lg mx-auto px-3 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center justify-center py-1 px-3 min-w-[64px] rounded-xl transition-all group select-none active:scale-95"
            >
              {/* Active Indicator Background pill */}
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    backgroundColor: `${config.colorPrimario || '#0284c7'}15`,
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}

              {/* Icon */}
              <div className="relative z-10 my-0.5">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105 text-slate-400'
                  }`}
                  style={isActive ? { color: config.colorPrimario || '#0284c7' } : undefined}
                />
              </div>

              {/* Label */}
              <span
                className={`relative z-10 text-[11px] font-semibold tracking-tight transition-colors ${
                  isActive ? 'font-bold' : 'text-slate-500 font-medium'
                }`}
                style={isActive ? { color: config.colorPrimario || '#0284c7' } : undefined}
              >
                {item.label}
              </span>

              {/* Top Accent Dot */}
              {isActive && (
                <motion.span
                  layoutId="activeDot"
                  className="absolute -top-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: config.colorPrimario || '#0284c7' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
