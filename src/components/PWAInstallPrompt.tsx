import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

export function PWAInstallPrompt() {
  const { config } = useConfig();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running on iOS standalone
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      // Only show after a slight delay
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  const primaryColor = config.colorPrimario || '#0284c7';

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-xs"
          style={{ backgroundColor: primaryColor }}
        >
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white">Instalar {config.nombreNegocio || 'Perfect Glass'}</h4>
            <button
              onClick={() => setShowPrompt(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {isIOS
              ? 'Toca el botón Compartir y selecciona "Agregar a inicio"'
              : 'Accede rápidamente desde tu pantalla de inicio como una app nativa.'}
          </p>

          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-transform active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              <Download className="w-3.5 h-3.5" />
              Instalar App
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
