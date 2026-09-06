import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Turno, Cliente, BusinessConfig, TurnoEstado } from '../types';
import {
  enviarEmailConfirmacionCliente,
  enviarAvisoVidrieroNuevoTurno,
  enviarAvisosCancelacionTurno,
} from './emailNotificationService';
import {
  enviarNotificacionNuevoTurnoAlVidriero,
  enviarNotificacionCancelacionAlVidriero,
  enviarNotificacionConfirmacionCliente,
} from './pushNotificationService';
import {
  notificarNuevaReserva,
  notificarReservaConfirmada,
  notificarTrabajoCompletadoYResena,
} from './notificacionesService';
import { getTodayISODate } from '../utils/dateUtils';
import { isModoSandboxActivo } from './sandboxService';

const COLLECTION_NAME = 'turnos';

export interface HorarioDisponibleInfo {
  horaInicio: string; // "09:00"
  horaFin: string; // "09:30"
  disponible: boolean;
  motivoOcupado?: string; // "Turno agendado", "Visita periódica", "Fuera de horario"
}

/**
 * Calculates end time by adding duration minutes to start time HH:mm
 */
export function calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
  const [h, m] = horaInicio.split(':').map(Number);
  const totalMin = h * 60 + m + duracionMinutos;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Generates a 32-character cryptographically secure or high-entropy random token
 */
export function generarTokenCancelacionSeguro(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback random generation to reach 32 characters
  const s1 = Math.random().toString(36).substring(2, 12);
  const s2 = Math.random().toString(36).substring(2, 12);
  const s3 = Math.random().toString(36).substring(2, 14);
  return `${s1}${s2}${s3}`.substring(0, 32);
}

/**
 * Calculates SHA-256 hash using the Web Crypto API.
 */
export async function calcularSha256(str: string): Promise<string> {
  if (!str) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Backwards compatibility alias for token generation
 */
export function generarCancelToken(): string {
  return generarTokenCancelacionSeguro();
}

/**
 * Converts HH:mm to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap
 */
export function haySuperposicionHorarios(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && eA > sB;
}

/**
 * Subscribe in real-time to all turnos
 */
export function subscribeToTurnos(
  callback: (turnos: Turno[]) => void,
  negocioId: string = 'perfect-glass'
): () => void {
  const turnosCol = collection(db, COLLECTION_NAME);
  return onSnapshot(
    turnosCol,
    (snapshot) => {
      const allList: Turno[] = [];
      snapshot.forEach((docSnap) => {
        allList.push({ id: docSnap.id, ...docSnap.data() } as Turno);
      });

      // Filter by negocioId (or fallback for perfect-glass legacy docs)
      const list = allList.filter(
        (t) =>
          !t.negocioId ||
          t.negocioId === negocioId ||
          (negocioId === 'perfect-glass' && !t.negocioId)
      );

      // Sort by date ascending, then start time ascending
      list.sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return a.horaInicio.localeCompare(b.horaInicio);
      });

      callback(list);
    },
    (error) => {
      console.warn('Error subscribing to turnos:', error);
      callback([]);
    }
  );
}

/**
 * Fetch a single Turno by ID
 */
export async function getTurnoById(turnoId: string): Promise<Turno | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, turnoId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Turno;
    }
    return null;
  } catch (error) {
    console.error('Error fetching turno by id:', error);
    return null;
  }
}

/**
 * Fetch turnos for a specific date
 */
export async function getTurnosPorFecha(fecha: string): Promise<Turno[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('fecha', '==', fecha)
    );
    const snap = await getDocs(q);
    const list: Turno[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Turno);
    });
    list.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    return list;
  } catch (error) {
    console.error('Error fetching turnos for date:', error);
    return [];
  }
}

/**
 * Calculate available slots for a given date based on work hours, existing confirmed turnos, and client visits
 */
export function calcularHorariosDisponibles(
  fecha: string,
  duracionMinutos: number,
  config: BusinessConfig,
  turnosConfirmadosEnFecha: Turno[],
  clientesEnFecha: Cliente[] = []
): HorarioDisponibleInfo[] {
  const horaInicioJornada = config.horaInicioJornada || '08:00';
  const horaFinJornada = config.horaFinJornada || '18:00';

  const [jornadaStartH, jornadaStartM] = horaInicioJornada.split(':').map(Number);
  const [jornadaEndH, jornadaEndM] = horaFinJornada.split(':').map(Number);

  const startTotalMinutes = jornadaStartH * 60 + jornadaStartM;
  const endTotalMinutes = jornadaEndH * 60 + jornadaEndM;

  const slotStepMinutes = Math.min(30, duracionMinutos);
  const slots: HorarioDisponibleInfo[] = [];

  const todayStr = getTodayISODate();
  const isToday = fecha === todayStr;
  const now = new Date();
  const currentMinutesToday = now.getHours() * 60 + now.getMinutes() + 15; // 15 min buffer

  for (
    let currentMin = startTotalMinutes;
    currentMin + duracionMinutos <= endTotalMinutes;
    currentMin += slotStepMinutes
  ) {
    const startH = Math.floor(currentMin / 60);
    const startM = currentMin % 60;
    const endMin = currentMin + duracionMinutos;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;

    const horaInicio = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const horaFin = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    let disponible = true;
    let motivoOcupado: string | undefined = undefined;

    // Check if slot has already passed today
    if (isToday && currentMin < currentMinutesToday) {
      disponible = false;
      motivoOcupado = 'Horario ya pasado';
    }

    // Check collision with confirmed turnos
    if (disponible) {
      const colisionTurno = turnosConfirmadosEnFecha.find(
        (t) =>
          t.estado === 'confirmado' &&
          haySuperposicionHorarios(horaInicio, horaFin, t.horaInicio, t.horaFin)
      );
      if (colisionTurno) {
        disponible = false;
        motivoOcupado = `Turno reservado (${colisionTurno.horaInicio} - ${colisionTurno.horaFin})`;
      }
    }

    slots.push({
      horaInicio,
      horaFin,
      disponible,
      motivoOcupado,
    });
  }

  return slots;
}

/**
 * Creates a new Turno, saves it in Firestore, and sends notification emails
 */
export async function createTurno(
  turnoData: {
    clienteId?: string;
    clienteUid?: string;
    nombreCliente: string;
    telefonoCliente: string;
    emailCliente: string;
    direccion?: string;
    fecha: string;
    horaInicio: string;
    duracionMinutos?: number;
    notas?: string;
    esSandbox?: boolean;
    estado?: TurnoEstado;
  },
  config: BusinessConfig,
  forzarEsSandbox?: boolean
): Promise<Turno> {
  const duracionMinutos =
    turnoData.duracionMinutos || config.duracionServicioDefaultMinutos || 30;
  const horaFin = calcularHoraFin(turnoData.horaInicio, duracionMinutos);
  const tokenCancelacion = generarTokenCancelacionSeguro();
  const tokenCancelacionHash = await calcularSha256(tokenCancelacion);

  // Check if Sandbox mode is active
  const sandboxActivo = await isModoSandboxActivo();
  const esSandbox = forzarEsSandbox !== undefined ? forzarEsSandbox : (turnoData.esSandbox ?? sandboxActivo);

  const id = `turno_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  // Security: No se almacena el token original en texto plano en Firestore.
  // Se guarda únicamente el hash criptográfico SHA-256 en tokenCancelacionHash.
  const firestorePayload = {
    id,
    negocioId: config.id || 'perfect-glass',
    clienteId: turnoData.clienteId || 'nuevoCliente',
    nombreCliente: turnoData.nombreCliente.trim(),
    telefonoCliente: turnoData.telefonoCliente.trim(),
    emailCliente: turnoData.emailCliente.trim(),
    direccionServicio: turnoData.direccion?.trim() || '',
    direccion: turnoData.direccion?.trim() || '',
    fecha: turnoData.fecha,
    horaInicio: turnoData.horaInicio,
    horaFin,
    duracionMinutos,
    estado: (turnoData.estado || 'confirmado') as TurnoEstado,
    tokenCancelacionHash,
    fechaCancelacion: null,
    emailConfirmacionEnviado: false,
    emailCancelacionEnviado: false,
    creadoEn: new Date().toISOString(),
    notas: turnoData.notas?.trim() || '',
    esSandbox,
    notificacionEnviada: false,
    recordatorioEnviado: false,
  };

  const docRef = doc(db, COLLECTION_NAME, id);
  await setDoc(docRef, firestorePayload);

  // Return the in-memory object containing plaintext token for immediate user view
  const nuevoTurno: Turno = {
    ...firestorePayload,
    tokenCancelacion,
    cancelToken: tokenCancelacion,
    emailEnviado: false,
  };

  // Despachar notificaciones internas de Perfect Glass (sólo tras guardado exitoso)
  try {
    await notificarNuevaReserva(nuevoTurno, config, turnoData.clienteUid);
  } catch (notifErr) {
    console.warn('Notice: Internal notification dispatch for nueva reserva:', notifErr);
  }

  // Send asynchronous push notifications and client logging
  try {
    const [clientEmailResult] = await Promise.allSettled([
      enviarEmailConfirmacionCliente(nuevoTurno, config),
      enviarAvisoVidrieroNuevoTurno(nuevoTurno, config),
      enviarNotificacionNuevoTurnoAlVidriero(nuevoTurno, config),
      enviarNotificacionConfirmacionCliente(nuevoTurno, config),
    ]);

    // Mark emailEnviado = true once the confirmation email was processed
    if (clientEmailResult.status === 'fulfilled') {
      await updateDoc(docRef, { emailEnviado: true, notificacionEnviada: true });
      nuevoTurno.emailEnviado = true;
      nuevoTurno.notificacionEnviada = true;
    }
  } catch (err) {
    console.warn('Notice: Non-blocking notification dispatch status for turno:', err);
  }

  return nuevoTurno;
}

/**
 * Retrieves a Turno by its unique cancellation token (by computing SHA-256 hash)
 */
export async function getTurnoByCancelToken(token: string, turnoId?: string): Promise<Turno | null> {
  if (!token || !token.trim()) return null;
  const cleanToken = token.trim();
  const tokenHash = await calcularSha256(cleanToken);

  // 1. If turnoId is provided, fetch directly and compare hash
  if (turnoId && turnoId.trim()) {
    const directDoc = await getTurnoById(turnoId.trim());
    if (directDoc) {
      if (
        directDoc.tokenCancelacionHash === tokenHash ||
        directDoc.tokenCancelacion === cleanToken ||
        directDoc.cancelToken === cleanToken
      ) {
        return directDoc;
      }
    }
  }

  const colRef = collection(db, COLLECTION_NAME);

  // 2. Search by tokenCancelacionHash
  const qHash = query(colRef, where('tokenCancelacionHash', '==', tokenHash));
  const snapHash = await getDocs(qHash);
  if (!snapHash.empty) {
    const docSnap = snapHash.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Turno;
  }

  // 3. Fallback search by tokenCancelacion (legacy)
  const q1 = query(colRef, where('tokenCancelacion', '==', cleanToken));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) {
    const docSnap = snap1.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Turno;
  }

  // 4. Fallback search by cancelToken (legacy)
  const q2 = query(colRef, where('cancelToken', '==', cleanToken));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) {
    const docSnap = snap2.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Turno;
  }

  return null;
}

/**
 * Cancels a Turno using its cancellation token (for public links without login)
 */
export async function cancelarTurnoPorToken(
  token: string,
  config: BusinessConfig,
  motivo?: string
): Promise<Turno> {
  const turno = await getTurnoByCancelToken(token);
  if (!turno) {
    throw new Error('Este link de cancelación no es válido o el turno ya fue cancelado.');
  }

  if (turno.estado === 'cancelado' || turno.fechaCancelacion) {
    throw new Error('Este link de cancelación no es válido o el turno ya fue cancelado.');
  }

  const nowIso = new Date().toISOString();
  const docRef = doc(db, COLLECTION_NAME, turno.id);
  const updatedData: Partial<Turno> = {
    estado: 'cancelado',
    fechaCancelacion: nowIso,
    canceladoEn: nowIso,
    motivoCancelacion: motivo || 'Cancelado por el cliente desde el email',
  };

  await updateDoc(docRef, updatedData);
  const updatedTurno: Turno = { ...turno, ...updatedData };

  // Dispatch cancellation notifications (email & push)
  try {
    await Promise.allSettled([
      enviarAvisosCancelacionTurno(updatedTurno, config, motivo),
      enviarNotificacionCancelacionAlVidriero(updatedTurno, config),
    ]);
  } catch (err) {
    console.warn('Notice: Error dispatching cancellation notifications:', err);
  }

  return updatedTurno;
}

/**
 * Cancel a Turno by ID (with optional token verification for public links)
 */
export async function cancelTurno(
  turnoId: string,
  config: BusinessConfig,
  motivo?: string,
  token?: string
): Promise<Turno> {
  const docRef = doc(db, COLLECTION_NAME, turnoId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error('El turno no existe o ya fue eliminado.');
  }

  const data = snap.data() as Turno;

  if (token && data.tokenCancelacion && data.tokenCancelacion !== token && data.cancelToken !== token) {
    throw new Error('Token de cancelación inválido o expirado.');
  }

  const nowIso = new Date().toISOString();
  const updatedData: Partial<Turno> = {
    estado: 'cancelado',
    fechaCancelacion: nowIso,
    canceladoEn: nowIso,
    motivoCancelacion: motivo || 'Cancelado por el vidriero desde la agenda',
  };

  await updateDoc(docRef, updatedData);

  const updatedTurno: Turno = { ...data, ...updatedData };

  // Dispatch cancellation notifications (email & push)
  try {
    await Promise.allSettled([
      enviarAvisosCancelacionTurno(updatedTurno, config, motivo),
      enviarNotificacionCancelacionAlVidriero(updatedTurno, config),
    ]);
  } catch (err) {
    console.warn('Error sending cancellation notifications:', err);
  }

  return updatedTurno;
}

/**
 * Confirm a Turno by ID
 */
export async function confirmarTurno(turnoId: string, config?: BusinessConfig): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, turnoId);
  const snap = await getDoc(docRef);

  await updateDoc(docRef, {
    estado: 'confirmado',
    confirmadoEn: new Date().toISOString(),
  });

  if (snap.exists()) {
    const turno = { id: snap.id, ...snap.data(), estado: 'confirmado' } as Turno;
    try {
      await notificarReservaConfirmada(
        turno,
        config || ({ id: turno.negocioId || 'perfect-glass' } as BusinessConfig)
      );
    } catch (err) {
      console.warn('Error sending internal notification for reserva confirmada:', err);
    }
  }
}

/**
 * Complete a Turno by ID
 */
export async function completarTurno(turnoId: string, config?: BusinessConfig): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, turnoId);
  const snap = await getDoc(docRef);

  await updateDoc(docRef, {
    estado: 'completado',
    completadoEn: new Date().toISOString(),
  });

  if (snap.exists()) {
    const turno = { id: snap.id, ...snap.data(), estado: 'completado' } as Turno;
    try {
      await notificarTrabajoCompletadoYResena(
        turno,
        config || ({ id: turno.negocioId || 'perfect-glass' } as BusinessConfig)
      );
    } catch (err) {
      console.warn('Error sending internal notifications for completed job and review request:', err);
    }
  }
}

/**
 * Delete a Turno document
 */
export async function deleteTurno(turnoId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, turnoId);
  await deleteDoc(docRef);
}
