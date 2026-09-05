import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import firebaseConfigData from '../../firebase-applet-config.json';
import { BusinessConfig } from '../types';

export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
  measurementId: firebaseConfigData.measurementId,
};

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Authentication
export const auth = getAuth(app);

// Firestore (with specific databaseId if provided)
export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Storage
export const storage = getStorage(app);

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
  const configDocRef = doc(db, NEGOCIOS_COLLECTION, negocioId);
  return onSnapshot(
    configDocRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_CONFIG, id: snap.id, ...snap.data() } as BusinessConfig);
      } else {
        // Auto-seed
        getBusinessConfig(negocioId).then(callback).catch(() => callback(DEFAULT_CONFIG));
      }
    },
    (error) => {
      console.warn('Firestore config subscription error:', error);
      callback(DEFAULT_CONFIG);
    }
  );
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
    updatedAt: new Date().toISOString(),
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
