import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { BusinessConfig } from '../types';

const rawApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
// Firebase Auth requiere un string con formato válido de API key (ej. prefijo 'AIzaSy')
// para inicializarse sin lanzar auth/invalid-api-key en la carga del módulo si la variable aún no fue provista.
const apiKey = rawApiKey || 'AIzaSy_CONFIGURAR_VITE_FIREBASE_API_KEY';

export const firebaseConfig = {
  apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gestion-servicios-uy.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gestion-servicios-uy',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gestion-servicios-uy.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '405657363471',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:405657363471:web:41c81daad92c312340ef7a',
};

// Protección para evitar inicializar Firebase más de una vez usando getApps() y getApp()
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Authentication
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

// Messaging (notificaciones push inicializadas condicionalmente si el navegador lo soporta)
export let messaging: ReturnType<typeof getMessaging> | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        try {
          messaging = getMessaging(app);
        } catch (e) {
          console.warn('[Firebase Messaging] Error en inicialización:', e);
        }
      }
    })
    .catch((err) => {
      console.warn('[Firebase Messaging] Verificación de soporte falló:', err);
    });
}

export const DEFAULT_CONFIG: BusinessConfig = {
  id: 'perfect-glass',
  nombreNegocio: 'Perfect Glass',
  direccion: 'Av. Corrientes 1500, Local 4, Ciudad',
  telefono: '+1 (555) 432-8765',
  logoUrl: '/icon-192.svg',
  instagram: '@perfectglass.clean',
  whatsapp: '+15554328765',
  facebook: 'perfectglass.oficial',
  colorPrimario: '#0284c7',
  emailAdministrador: 'admin@perfectglass.com',
  fechaCreacion: '2026-01-15T09:00:00.000Z',
  activo: true,
  plan: 'premium',
  sellosNecesarios: 5,
  recompensaDescripcion: 'Limpieza de vidrios gratis',
  horaInicioJornada: '08:00',
  horaFinJornada: '18:00',
  duracionServicioDefaultMinutos: 30,
  emailVidriero: 'vidriero@perfectglass.com',
  mensajeEmailConfirmacion: '¡Hola! Tu turno de limpieza de vidrios en Perfect Glass ha sido confirmado. Te esperamos con los brazos abiertos.',
  diasLaborables: [1, 2, 3, 4, 5, 6],
  linkGoogleReviews: 'https://g.page/r/perfectglass-reviews',
  solicitarResenasAuto: true,
  diasMinimosEntreResenas: 90,
  notificacionesPushActivas: true,
  emailsActivos: true,
  pushSilencioInicio: '20:00',
  pushSilencioFin: '08:00',
};

const NEGOCIOS_COLLECTION = 'negocios';
const DEFAULT_NEGOCIO_ID = 'perfect-glass';

/**
 * Fetch business config once from Firestore (reading from negocios)
 */
export async function getBusinessConfig(negocioId: string = DEFAULT_NEGOCIO_ID): Promise<BusinessConfig> {
  try {
    const configDocRef = doc(db, NEGOCIOS_COLLECTION, negocioId);
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      return { ...DEFAULT_CONFIG, id: snap.id, ...snap.data() } as BusinessConfig;
    }
    // Try legacy fallback
    try {
      const legacyRef = doc(db, 'configuracion', 'negocio');
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        const migrated = { ...DEFAULT_CONFIG, id: negocioId, ...legacySnap.data() } as BusinessConfig;
        await setDoc(configDocRef, migrated, { merge: true });
        return migrated;
      }
    } catch (e) {
      // ignore
    }
    // Initialize default if not exists
    await setDoc(configDocRef, { ...DEFAULT_CONFIG, id: negocioId }, { merge: true });
    return { ...DEFAULT_CONFIG, id: negocioId };
  } catch (error) {
    console.warn('Firestore fetch config fallback to default:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Real-time listener for business config from 'negocios'
 */
export function subscribeToBusinessConfig(
  callback: (config: BusinessConfig) => void,
  negocioId: string = DEFAULT_NEGOCIO_ID
): () => void {
  // Invocar inmediatamente con la configuración base para no bloquear la interfaz
  callback(DEFAULT_CONFIG);

  try {
    const configDocRef = doc(db, NEGOCIOS_COLLECTION, negocioId);
    return onSnapshot(
      configDocRef,
      (snap) => {
        if (snap.exists()) {
          callback({ ...DEFAULT_CONFIG, id: snap.id, ...snap.data() } as BusinessConfig);
        } else {
          callback(DEFAULT_CONFIG);
        }
      },
      (error) => {
        // En caso de permisos insuficientes (usuarios no autenticados o clientes), fallback inmediato
        callback(DEFAULT_CONFIG);
      }
    );
  } catch (err) {
    callback(DEFAULT_CONFIG);
    return () => {};
  }
}

/**
 * Save updated business config to Firestore (in 'negocios')
 */
export async function saveBusinessConfig(
  config: Partial<BusinessConfig>,
  userId?: string,
  negocioId: string = DEFAULT_NEGOCIO_ID
): Promise<void> {
  const targetId = config.id || negocioId || DEFAULT_NEGOCIO_ID;
  const configDocRef = doc(db, NEGOCIOS_COLLECTION, targetId);
  const rawData: Record<string, any> = {
    ...config,
    actualizadoEn: new Date().toISOString(),
    updatedBy: userId || 'admin',
  };
  
  // Remove any undefined values
  const dataToSave: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (value !== undefined) {
      dataToSave[key] = value;
    }
  }

  await setDoc(configDocRef, dataToSave, { merge: true });

  // Sincronizar vista pública desinfectada en negociosPublicos
  try {
    const pubRef = doc(db, 'negociosPublicos', 'perfect-glass-vip');
    await setDoc(pubRef, {
      negocioId: targetId,
      nombreNegocio: dataToSave.nombreNegocio || DEFAULT_CONFIG.nombreNegocio,
      logoUrl: dataToSave.logoUrl || '/icon-192.svg',
      colorPrimario: dataToSave.colorPrimario || '#0284c7',
      activo: dataToSave.activo !== false,
      refCode: 'perfect-glass-vip',
      googleReviewsUrl: dataToSave.linkGoogleReviews || '',
    }, { merge: true });
  } catch (pubErr) {
    // non-blocking
  }

  // Also sync to legacy configuracion/negocio if it is perfect-glass to keep full backwards compatibility
  if (targetId === DEFAULT_NEGOCIO_ID) {
    try {
      const legacyRef = doc(db, 'configuracion', 'negocio');
      await setDoc(legacyRef, dataToSave, { merge: true });
    } catch (e) {
      // non-blocking
    }
  }
}

/**
 * Upload logo file to Firebase Storage with a fallback to base64 data url if needed
 */
export async function uploadLogoToStorage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    const filename = `logo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `configuracion/${filename}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        (error) => {
          console.warn('Firebase storage upload failed, falling back to FileReader:', error);
          // Fallback to reading as base64 data URL so the user never gets blocked
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => reject(error);
          reader.readAsDataURL(file);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (e) {
            // Fallback to data URL
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(e);
            reader.readAsDataURL(file);
          }
        }
      );
    });
  } catch (err) {
    // If anything throws, convert file to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }
}
