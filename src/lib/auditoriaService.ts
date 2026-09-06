import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { RegistroAuditoria } from '../types';

export const AUDITORIA_COLLECTION = 'auditoriaSuperAdmin';

/**
 * Registra una acción sensible en el historial de auditoría de SuperAdmin
 */
export async function registrarAccionAuditoria(
  registroOrAccion: Omit<RegistroAuditoria, 'fecha'> | RegistroAuditoria['accion'],
  negocioId?: string,
  userEmail?: string,
  detalles?: Record<string, any>,
  userUid?: string
): Promise<string | null> {
  try {
    let payload: Omit<RegistroAuditoria, 'fecha'>;
    if (typeof registroOrAccion === 'string') {
      payload = {
        accion: registroOrAccion,
        negocioId: negocioId || undefined,
        superAdminEmail: userEmail || 'superadmin@vidrieria.com',
        superAdminUid: userUid || 'superadmin',
        detalles: detalles || {},
      };
    } else {
      payload = registroOrAccion;
    }

    const colRef = collection(db, AUDITORIA_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...payload,
      fecha: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.warn('Error registrando auditoría de superadmin:', error);
    return null;
  }
}

export const registrarAuditoria = registrarAccionAuditoria;

/**
 * Obtiene los registros históricos de auditoría una sola vez
 */
export async function obtenerHistorialAuditoria(maxRegistros = 50): Promise<RegistroAuditoria[]> {
  try {
    const colRef = collection(db, AUDITORIA_COLLECTION);
    const q = query(colRef, orderBy('fecha', 'desc'), limit(maxRegistros));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as RegistroAuditoria[];
  } catch (error) {
    console.warn('Error al obtener historial de auditoría:', error);
    return [];
  }
}

/**
 * Suscripción en tiempo real a los últimos registros de auditoría
 */
export function subscribeToAuditoria(
  callback: (registros: RegistroAuditoria[]) => void,
  maxRegistros = 50
): () => void {
  const colRef = collection(db, AUDITORIA_COLLECTION);
  const q = query(colRef, orderBy('fecha', 'desc'), limit(maxRegistros));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as RegistroAuditoria[];
      callback(list);
    },
    (error) => {
      console.warn('Error en suscripción de auditoría:', error);
      callback([]);
    }
  );
}
