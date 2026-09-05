import React, { createContext, useContext, useEffect, useState } from 'react';
import { BusinessConfig } from '../types';
import { DEFAULT_CONFIG, subscribeToBusinessConfig, saveBusinessConfig } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface ConfigContextType {
  config: BusinessConfig;
  currentNegocioId: string;
  setCurrentNegocioId: (negocioId: string) => void;
  loading: boolean;
  isSaving: boolean;
  saveConfig: (newConfig: Partial<BusinessConfig>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [currentNegocioId, setCurrentNegocioId] = useState<string>(() => {
    // Check URL param ?negocio= or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const paramNegocio = urlParams.get('negocio') || urlParams.get('negocioId');
    if (paramNegocio) return paramNegocio;
    const stored = sessionStorage.getItem('perfectglass_current_negocio_id');
    return stored || 'perfect-glass';
  });

  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const handleSetCurrentNegocioId = (id: string) => {
    setCurrentNegocioId(id);
    sessionStorage.setItem('perfectglass_current_negocio_id', id);
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToBusinessConfig((updatedConfig) => {
      setConfig(updatedConfig);
      setLoading(false);

      const brandColor = updatedConfig.colorPrimario || '#0284c7';
      const businessName = updatedConfig.nombreNegocio || 'Perfect Glass';

      // 1. Set dynamic CSS variables for global use
      document.documentElement.style.setProperty('--primary-color', brandColor);
      
      const hoverColor = adjustBrightness(brandColor, -18);
      document.documentElement.style.setProperty('--primary-hover', hoverColor);

      const darkColor = adjustBrightness(brandColor, -35);
      document.documentElement.style.setProperty('--primary-dark', darkColor);

      const lightColor = hexToRgba(brandColor, 0.1);
      document.documentElement.style.setProperty('--primary-light', lightColor);

      const borderColor = hexToRgba(brandColor, 0.25);
      document.documentElement.style.setProperty('--primary-border', borderColor);

      // 2. Update PWA theme-color meta tag
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute('content', brandColor);
      }

      // 3. Update Document Title & OpenGraph Titles
      document.title = `${businessName} - Gestión de Vidriería`;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', businessName);

      const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appTitle) appTitle.setAttribute('content', businessName);

      // 4. Dynamically generate and update PWA Web App Manifest
      updateDynamicManifest(businessName, brandColor, updatedConfig.logoUrl);

      // 5. Update Dynamic Favicon & Apple Touch Icon
      updateDynamicFavicon(brandColor, updatedConfig.logoUrl, businessName);
    }, currentNegocioId);

    return () => unsubscribe();
  }, [currentNegocioId]);

  const saveConfig = async (newConfig: Partial<BusinessConfig>) => {
    setIsSaving(true);
    try {
      await saveBusinessConfig({ ...newConfig, id: currentNegocioId }, user?.uid, currentNegocioId);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setIsSaving(true);
    try {
      await saveBusinessConfig({ ...DEFAULT_CONFIG, id: currentNegocioId }, user?.uid, currentNegocioId);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        currentNegocioId,
        setCurrentNegocioId: handleSetCurrentNegocioId,
        loading,
        isSaving,
        saveConfig,
        resetToDefaults,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// Utility to calculate dark/light hover shade
function adjustBrightness(hex: string, percent: number): string {
  let num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  let amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = ((num >> 8) & 0x00ff) + amt;
  let B = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(2, 132, 199, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Generates dynamic PWA manifest Blob so installed app uses current business name and branding
function updateDynamicManifest(name: string, themeColor: string, logoUrl?: string) {
  try {
    const icon192 = logoUrl || '/icon-192.svg';
    const icon512 = logoUrl || '/icon-512.svg';

    const dynamicManifest = {
      name: `${name} - Gestión`,
      short_name: name.length > 15 ? name.substring(0, 15) : name,
      description: `PWA oficial de ${name} para gestión de limpiezas de vidrios y turnos`,
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: themeColor,
      orientation: 'portrait',
      icons: [
        {
          src: icon192,
          sizes: '192x192',
          type: logoUrl ? 'image/png' : 'image/svg+xml',
          purpose: 'any maskable',
        },
        {
          src: icon512,
          sizes: '512x512',
          type: logoUrl ? 'image/png' : 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    };

    const stringManifest = JSON.stringify(dynamicManifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);

    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }
    manifestLink.setAttribute('href', manifestURL);
  } catch (err) {
    // Non-critical error on environments without Blob/URL support
    console.warn('Manifest dynamic update error:', err);
  }
}

// Updates favicon and apple-touch-icon with logo or brand initial
function updateDynamicFavicon(color: string, logoUrl?: string, name: string = 'PG') {
  try {
    const favicon = document.querySelector('link[rel="icon"]');
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');

    if (logoUrl) {
      if (favicon) favicon.setAttribute('href', logoUrl);
      if (appleIcon) appleIcon.setAttribute('href', logoUrl);
    } else {
      const initial = (name.trim()[0] || 'P').toUpperCase();
      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="28" fill="${color}"/>
        <path d="M50 18 L76 34 L76 66 L50 82 L24 66 L24 34 Z" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.4"/>
        <text x="50%" y="58%" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
      </svg>`;
      const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgIcon)}`;

      if (favicon) favicon.setAttribute('href', svgDataUrl);
      if (appleIcon) appleIcon.setAttribute('href', svgDataUrl);
    }
  } catch (err) {
    console.warn('Favicon update error:', err);
  }
}
