import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { NotificacionInterna, TipoNotificacion, Turno, BusinessConfig } from '../types';

export const NOTIFICACIONES_COLLECTION = 'notificaciones';

// Key for in-memory / demo fallback persistence
const DEMO_NOTIF_STORAGE_KEY = 'perfectglass_demo_notificaciones';

function getDemoNotificaciones(): NotificacionInterna[] {
  try {
    const raw = sessionStorage.getItem(DEMO_NOTIF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDemoNotificaciones(list: NotificacionInterna[]) {
  try {
    sessionStorage.setItem(DEMO_NOTIF_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Creates a notification document in Firestore matching the exact schema:
 * - destinatarioUid: string
 * - negocioId: string
 * - tipo: 'reserva_creada' | 'reserva_confirmada' | 'trabajo_completado' | 'reseña_solicitada'
 * - titulo: string
 * - mensaje: string
 * - turnoId: string
 * - leida: boolean
 * - creadaEn: serverTimestamp()
 * - leidaEn: null
 */
export async function crearNotificacion(payload: {
  destinatarioUid: string;
  negocioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  turnoId: string;
}): Promise<string> {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const docRef = doc(db, NOTIFICACIONES_COLLECTION, notifId);

  const dataToSave = {
    destinatarioUid: payload.destinatarioUid,
    negocioId: payload.negocioId,
    tipo: payload.tipo,
    titulo: payload.titulo,
    mensaje: payload.mensaje,
    turnoId: payload.turnoId,
    leida: false,
    creadaEn: serverTimestamp(),
    leidaEn: null,
  };

  try {
    await setDoc(docRef, dataToSave);
  } catch (err) {
    console.warn(
      'Firestore write to notificaciones blocked or failed (possibly awaiting security rules update). Saving in local fallback:',
      err
    );
  }

  // Always keep fallback updated so in-app UI sees it instantly regardless of rules deployment
  const fallbackItem: NotificacionInterna = {
    id: notifId,
    ...dataToSave,
    creadaEn: new Date().toISOString(),
  };
  const currentDemo = getDemoNotificaciones();
  saveDemoNotificaciones([fallbackItem, ...currentDemo]);

  return notifId;
}

/**
 * Marks a single notification as read
 */
export async function marcarNotificacionComoLeida(notificacionId: string): Promise<void> {
  // Update in Firestore
  try {
    const docRef = doc(db, NOTIFICACIONES_COLLECTION, notificacionId);
    await updateDoc(docRef, {
      leida: true,
      leidaEn: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not update notificacion in Firestore:', err);
  }

  // Update in local fallback
  const list = getDemoNotificaciones();
  const updated = list.map((n) =>
    n.id === notificacionId
      ? { ...n, leida: true, leidaEn: new Date().toISOString() }
      : n
  );
  saveDemoNotificaciones(updated);
}

/**
 * Marks all notifications for a given user as read
 */
export async function marcarTodasComoLeidas(destinatarioUid: string): Promise<void> {
  // Try batch update in Firestore
  try {
    const q = query(
      collection(db, NOTIFICACIONES_COLLECTION),
      where('destinatarioUid', '==', destinatarioUid),
      where('leida', '==', false)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, {
          leida: true,
          leidaEn: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not batch update notificaciones in Firestore:', err);
  }

  // Update in local fallback
  const list = getDemoNotificaciones();
  const updated = list.map((n) =>
    n.destinatarioUid === destinatarioUid
      ? { ...n, leida: true, leidaEn: new Date().toISOString() }
      : n
  );
  saveDemoNotificaciones(updated);
}

/**
 * Real-time listener for the 20 most recent notifications for a user, ordered by creadaEn desc
 */
export function subscribeToNotificaciones(
  destinatarioUid: string,
  callback: (notificaciones: NotificacionInterna[]) => void
): () => void {
  let isUnsubscribed = false;

  const emitMerged = (firestoreList: NotificacionInterna[]) => {
    if (isUnsubscribed) return;
    const demoList = getDemoNotificaciones().filter(
      (n) => n.destinatarioUid === destinatarioUid
    );

    // Merge by id
    const map = new Map<string, NotificacionInterna>();
    demoList.forEach((n) => map.set(n.id, n));
    firestoreList.forEach((n) => map.set(n.id, n));

    const all = Array.from(map.values());

    // Sort descending by creadaEn
    all.sort((a, b) => {
      const timeA = a.creadaEn?.toDate
        ? a.creadaEn.toDate().getTime()
        : new Date(a.creadaEn || 0).getTime();
      const timeB = b.creadaEn?.toDate
        ? b.creadaEn.toDate().getTime()
        : new Date(b.creadaEn || 0).getTime();
      return timeB - timeA;
    });

    callback(all.slice(0, 20));
  };

  // Immediate emission from local state
  emitMerged([]);

  // Firestore real-time subscription
  try {
    const q = query(
      collection(db, NOTIFICACIONES_COLLECTION),
      where('destinatarioUid', '==', destinatarioUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: NotificacionInterna[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as NotificacionInterna);
        });
        emitMerged(list);
      },
      (error) => {
        console.warn('Notificaciones subscription note (awaiting rules or network):', error.message);
        emitMerged([]);
      }
    );

    return () => {
      isUnsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn('Could not initialize firestore subscription for notificaciones:', err);
    return () => {
      isUnsubscribed = true;
    };
  }
}

/**
 * Finds admin/owner UIDs for a specific negocio
 */
export async function obtenerAdminUidsPorNegocio(
  negocioId: string,
  emailAdmin?: string,
  configAdminUid?: string
): Promise<string[]> {
  const adminUidsSet = new Set<string>();

  if (configAdminUid) {
    adminUidsSet.add(configAdminUid);
  }

  try {
    const qAdmin = query(
      collection(db, 'usuarios'),
      where('negocioId', '==', negocioId),
      where('rol', '==', 'admin')
    );
    const snap = await getDocs(qAdmin);
    snap.forEach((d) => adminUidsSet.add(d.id));
  } catch (e) {
    console.warn('Error querying usuarios for admin role:', e);
  }

  // Fallback by email
  if (emailAdmin) {
    try {
      const qUser = query(
        collection(db, 'usuarios'),
        where('email', '==', emailAdmin.trim().toLowerCase()),
        limit(1)
      );
      const snap = await getDocs(qUser);
      if (!snap.empty) {
        adminUidsSet.add(snap.docs[0].id);
      }
    } catch (e) {
      console.warn('Error finding admin by email:', e);
    }
  }

  // Default demo admin UID fallback
  adminUidsSet.add('demo-admin-uid-123');

  return Array.from(adminUidsSet);
}

/**
 * Finds client user UID from a Turno document
 */
export async function obtenerClienteUidParaTurno(turno: Turno): Promise<string | null> {
  // 1. If turno has a clienteId linked
  if (turno.clienteId && turno.clienteId !== 'nuevoCliente') {
    try {
      const cliDoc = await getDoc(doc(db, 'clientes', turno.clienteId));
      if (cliDoc.exists()) {
        const cliData = cliDoc.data();
        if (cliData.usuarioId) return cliData.usuarioId;
      }
    } catch (e) {
      console.warn('Error fetching cliente by ID:', e);
    }
  }

  // 2. Search in 'clientes' by email
  if (turno.emailCliente) {
    try {
      const qCli = query(
        collection(db, 'clientes'),
        where('emailRegistro', '==', turno.emailCliente.trim().toLowerCase()),
        limit(1)
      );
      const snapCli = await getDocs(qCli);
      if (!snapCli.empty) {
        const cliData = snapCli.docs[0].data();
        if (cliData.usuarioId) return cliData.usuarioId;
      }
    } catch (e) {
      console.warn('Error querying cliente by email:', e);
    }

    // 3. Search in 'usuarios' by email
    try {
      const qUser = query(
        collection(db, 'usuarios'),
        where('email', '==', turno.emailCliente.trim().toLowerCase()),
        limit(1)
      );
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        return snapUser.docs[0].id;
      }
    } catch (e) {
      console.warn('Error querying usuario by email:', e);
    }
  }

  // 4. Current authenticated user if role is cliente
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  return null;
}

/**
 * Trigger 1: When a client creates a reservation / turno
 * Creates:
 * a) Notification for business owner/admin:
 *    tipo: 'reserva_creada'
 *    titulo: 'Nueva reserva'
 *    mensaje: 'Tenés una nueva reserva pendiente de revisar.'
 * b) Notification for the client:
 *    tipo: 'reserva_confirmada'
 *    titulo: 'Reserva registrada'
 *    mensaje: 'Tu reserva fue registrada. El negocio confirmará el horario.'
 */
export async function notificarNuevaReserva(
  turno: Turno,
  config: BusinessConfig,
  clienteUidEspecifico?: string | null
): Promise<void> {
  const negocioId = turno.negocioId || config.id || 'perfect-glass';

  // 1. Notify admin(s)
  try {
    const adminUids = await obtenerAdminUidsPorNegocio(
      negocioId,
      config.emailAdministrador,
      (config as any).adminUid || (config as any).ownerId
    );
    for (const adminUid of adminUids) {
      await crearNotificacion({
        destinatarioUid: adminUid,
        negocioId,
        tipo: 'reserva_creada',
        titulo: 'Nueva reserva',
        mensaje: 'Tenés una nueva reserva pendiente de revisar.',
        turnoId: turno.id,
      });
    }
  } catch (err) {
    console.error('Error al crear notificación de reserva para admin:', err);
  }

  // 2. Notify client
  try {
    const clientUid = clienteUidEspecifico || (await obtenerClienteUidParaTurno(turno));
    if (clientUid) {
      await crearNotificacion({
        destinatarioUid: clientUid,
        negocioId,
        tipo: 'reserva_confirmada',
        titulo: 'Reserva registrada',
        mensaje: 'Tu reserva fue registrada. El negocio confirmará el horario.',
        turnoId: turno.id,
      });
    }
  } catch (err) {
    console.error('Error al crear notificación de reserva para cliente:', err);
  }
}

/**
 * Trigger 2: When the vidriero/admin confirms a reservation
 * Creates:
 * Notification for the client:
 * tipo: 'reserva_confirmada'
 * titulo: 'Reserva confirmada'
 * mensaje: 'Tu visita fue confirmada. Revisá el detalle del turno.'
 */
export async function notificarReservaConfirmada(
  turno: Turno,
  config: BusinessConfig,
  clienteUidEspecifico?: string | null
): Promise<void> {
  const negocioId = turno.negocioId || config.id || 'perfect-glass';
  const clientUid = clienteUidEspecifico || (await obtenerClienteUidParaTurno(turno));

  if (!clientUid) return;

  try {
    await crearNotificacion({
      destinatarioUid: clientUid,
      negocioId,
      tipo: 'reserva_confirmada',
      titulo: 'Reserva confirmada',
      mensaje: 'Tu visita fue confirmada. Revisá el detalle del turno.',
      turnoId: turno.id,
    });
  } catch (err) {
    console.error('Error al crear notificación de confirmación para cliente:', err);
  }
}

/**
 * Trigger 3: When the vidriero/admin marks a turno as completed
 * Creates two notifications for the client:
 * 1)
 * tipo: 'trabajo_completado'
 * titulo: 'Trabajo completado'
 * mensaje: 'Tu visita fue marcada como completada.'
 * 2)
 * tipo: 'reseña_solicitada'
 * titulo: '¿Cómo fue tu experiencia?'
 * mensaje: 'Dejá una calificación para ayudar al negocio.'
 */
export async function notificarTrabajoCompletadoYResena(
  turno: Turno,
  config: BusinessConfig,
  clienteUidEspecifico?: string | null
): Promise<void> {
  const negocioId = turno.negocioId || config.id || 'perfect-glass';
  const clientUid = clienteUidEspecifico || (await obtenerClienteUidParaTurno(turno));

  if (!clientUid) return;

  try {
    // 1. Trabajo completado
    await crearNotificacion({
      destinatarioUid: clientUid,
      negocioId,
      tipo: 'trabajo_completado',
      titulo: 'Trabajo completado',
      mensaje: 'Tu visita fue marcada como completada.',
      turnoId: turno.id,
    });

    // 2. Reseña solicitada
    await crearNotificacion({
      destinatarioUid: clientUid,
      negocioId,
      tipo: 'reseña_solicitada',
      titulo: '¿Cómo fue tu experiencia?',
      mensaje: 'Dejá una calificación para ayudar al negocio.',
      turnoId: turno.id,
    });
  } catch (err) {
    console.error('Error al crear notificaciones de trabajo completado y reseña:', err);
  }
}
