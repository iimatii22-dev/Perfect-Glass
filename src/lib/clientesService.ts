import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Cliente, VisitaRegistro, SelloHistorial } from '../types';
import { calcularProximaVisita, getTodayISODate } from '../utils/dateUtils';

const CLIENTES_COLLECTION = 'clientes';
const SELLOS_SUBCOLLECTION = 'sellosHistorial';

// Realistic starter clients for a window cleaning company with loyalty data
const SAMPLE_CLIENTES: Omit<Cliente, 'id'>[] = [
  {
    nombre: 'Cafetería & Panadería Dulce Grano',
    telefono: '+54 9 11 4522-8910',
    direccion: 'Av. Santa Fe 2840',
    zona: 'Palermo',
    tipoSuperficie: 'Vidrieras comerciales y marquesina',
    frecuenciaVisitaDias: 30,
    duracionServicioMinutos: 45,
    fechaUltimaVisita: '2026-07-28',
    fechaProximaVisita: '2026-08-27', // Vencida para probar el filtro
    notas: 'Horario preferente: antes de las 9:00 AM antes de que abran. Limpieza de frente y laterales.',
    fotoAntes: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80',
    fotoDespues: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&auto=format&fit=crop&q=80',
    activo: true,
    localComercial: 'Cafetería Dulce Grano',
    estadoRegistro: 'aprobado',
    sellosAcumulados: 0,
    sellosNecesarios: 5,
    recompensaDescripcion: 'Limpieza de vidrios gratis',
    recompensaDisponible: true, // ¡Lista para canjear!
    totalRecompensasCanjeadas: 1,
    fechaUltimoCanje: '2026-04-10',
    historialVisitas: [
      {
        id: 'v-sample-1',
        fecha: '2026-07-28',
        notas: 'Limpieza profunda de vidrieras exteriores e interiores. Se completó el 5° sello.',
        selloOtorgado: true,
        completadoPor: 'vidriero',
        createdAt: '2026-07-28T10:30:00Z',
      },
      {
        id: 'v-sample-2',
        fecha: '2026-06-28',
        notas: 'Visita mensual. Impecable terminación sin marcas.',
        selloOtorgado: true,
        completadoPor: 'vidriero',
        createdAt: '2026-06-28T09:45:00Z',
      },
    ],
  },
  {
    nombre: 'Residencia Familia Martínez',
    telefono: '+54 9 11 5831-4492',
    direccion: 'Calle Olleros 1450, Piso 6',
    zona: 'Belgrano',
    tipoSuperficie: 'Ventanas y canceles de baño',
    frecuenciaVisitaDias: 60,
    duracionServicioMinutos: 30,
    fechaUltimaVisita: '2026-07-03',
    fechaProximaVisita: '2026-09-01', // Toca hoy
    notas: 'Timbre 6B. Hay un perro pequeño pero tranquilo en el patio de invierno. Incluye mamparas de vidrio de ambos baños.',
    fotoAntes: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    fotoDespues: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
    activo: true,
    localComercial: 'Casa Belgrano - Familia Martínez',
    estadoRegistro: 'aprobado',
    sellosAcumulados: 4, // A 1 solo sello de su recompensa
    sellosNecesarios: 5,
    recompensaDescripcion: 'Limpieza de mampara de baño gratis',
    recompensaDisponible: false,
    totalRecompensasCanjeadas: 0,
    historialVisitas: [
      {
        id: 'v-sample-3',
        fecha: '2026-07-03',
        notas: 'Limpieza de ventanales doble hoja y pulido de mampara del baño principal.',
        selloOtorgado: true,
        completadoPor: 'vidriero',
        createdAt: '2026-07-03T14:15:00Z',
      },
    ],
  },
  {
    nombre: 'Estudio Jurídico Alvear & Asoc.',
    telefono: '+54 9 11 3901-7722',
    direccion: 'Av. Alvear 1920, Oficina 302',
    zona: 'Recoleta',
    tipoSuperficie: 'Ventanas de oficina y mamparas divisoras',
    frecuenciaVisitaDias: 30,
    duracionServicioMinutos: 40,
    fechaUltimaVisita: '2026-08-08',
    fechaProximaVisita: '2026-09-07', // Esta semana (en 6 días)
    notas: 'Anunciarse en recepción. No hacer ruido durante reuniones en sala de juntas.',
    fotoAntes: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    fotoDespues: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
    activo: true,
    localComercial: 'Oficinas Estudio Alvear',
    estadoRegistro: 'aprobado',
    sellosAcumulados: 2,
    sellosNecesarios: 5,
    recompensaDescripcion: 'Limpieza de vidrios gratis',
    recompensaDisponible: false,
    totalRecompensasCanjeadas: 0,
    historialVisitas: [
      {
        id: 'v-sample-4',
        fecha: '2026-08-08',
        notas: 'Limpieza general de 12 paneles vidriados interiores y ventanales externos.',
        selloOtorgado: true,
        completadoPor: 'vidriero',
        createdAt: '2026-08-08T11:00:00Z',
      },
    ],
  },
  {
    nombre: 'Casa Quinta Los Robles - Ing. Carlos Rossi',
    telefono: '+54 9 11 6744-1290',
    direccion: 'Camino de las Tropas 450',
    zona: 'Zona Norte / San Isidro',
    tipoSuperficie: 'Fachada completa y ventanales en doble altura',
    frecuenciaVisitaDias: 90,
    duracionServicioMinutos: 60,
    fechaUltimaVisita: '2026-07-15',
    fechaProximaVisita: '2026-10-13',
    notas: 'Traer escalera extensible de 6 metros y pértiga hidrófila para el techo vidriado.',
    fotoAntes: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80',
    fotoDespues: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&auto=format&fit=crop&q=80',
    activo: true,
    localComercial: 'Casa Quinta Los Robles',
    estadoRegistro: 'aprobado',
    sellosAcumulados: 3,
    sellosNecesarios: 5,
    recompensaDescripcion: '50% de descuento en limpieza integral',
    recompensaDisponible: false,
    totalRecompensasCanjeadas: 0,
    historialVisitas: [
      {
        id: 'v-sample-5',
        fecha: '2026-07-15',
        notas: 'Servicio trimestral completo con hidrolavado suave de marcos de aluminio.',
        selloOtorgado: true,
        completadoPor: 'vidriero',
        createdAt: '2026-07-15T15:30:00Z',
      },
    ],
  },
];

/**
 * Real-time subscription to clients list (Admin View)
 */
export function subscribeToClientes(
  callback: (clientes: Cliente[]) => void,
  onError?: (err: any) => void,
  negocioId: string = 'perfect-glass'
): () => void {
  try {
    const clientesRef = collection(db, CLIENTES_COLLECTION);
    const q = query(clientesRef, orderBy('fechaProximaVisita', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // If no clients in Firestore yet, automatically populate with initial starter clients
          seedInitialClientes(negocioId).catch(console.error);
          return;
        }

        const allDocs: Cliente[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Cliente[];

        // Filter by negocioId (matching target business or legacy docs for perfect-glass)
        const list = allDocs.filter(
          (c) =>
            !c.negocioId ||
            c.negocioId === negocioId ||
            (negocioId === 'perfect-glass' && !c.negocioId)
        );

        // Sort by next visit date ascending
        list.sort((a, b) => {
          if (!a.fechaProximaVisita) return 1;
          if (!b.fechaProximaVisita) return -1;
          return a.fechaProximaVisita.localeCompare(b.fechaProximaVisita);
        });

        callback(list);
      },
      (error) => {
        console.warn('Firestore clientes subscription error:', error);
        if (onError) onError(error);
        const fallbackList: Cliente[] = SAMPLE_CLIENTES.map((c, i) => ({
          id: `sample-${i + 1}`,
          negocioId,
          ...c,
        }));
        callback(fallbackList);
      }
    );
  } catch (err) {
    console.error('Error starting clientes subscription:', err);
    if (onError) onError(err);
    const fallbackList: Cliente[] = SAMPLE_CLIENTES.map((c, i) => ({
      id: `sample-${i + 1}`,
      negocioId,
      ...c,
    }));
    callback(fallbackList);
    return () => {};
  }
}

/**
 * Real-time subscription to a single client document by Auth UID (Client Portal)
 */
export function subscribeToClienteByUid(
  uid: string,
  callback: (cliente: Cliente | null) => void
): () => void {
  const clientesRef = collection(db, CLIENTES_COLLECTION);
  const q = query(clientesRef, where('uid', '==', uid));

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      // Also check if doc id matches uid
      const directRef = doc(db, CLIENTES_COLLECTION, uid);
      getDoc(directRef).then((snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, ...snap.data() } as Cliente);
        } else {
          callback(null);
        }
      }).catch(() => callback(null));
      return;
    }
    const docSnap = snapshot.docs[0];
    callback({ id: docSnap.id, ...docSnap.data() } as Cliente);
  }, (err) => {
    console.warn('Error subscribing to cliente by uid:', err);
    callback(null);
  });
}

/**
 * Real-time subscription to subcollection "sellosHistorial" of a client
 */
export function subscribeToSellosHistorial(
  clienteId: string,
  callback: (sellos: SelloHistorial[]) => void
): () => void {
  try {
    const sellosRef = collection(db, CLIENTES_COLLECTION, clienteId, SELLOS_SUBCOLLECTION);
    const q = query(sellosRef, orderBy('fecha', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const list: SelloHistorial[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as SelloHistorial[];
      callback(list);
    }, (err) => {
      console.warn('Error subscribing to sellosHistorial:', err);
      callback([]);
    });
  } catch (err) {
    console.error('Error in subscribeToSellosHistorial:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Adds an immutable stamp to the subcollection "sellosHistorial"
 */
export async function addSelloHistorial(
  clienteId: string,
  sello: {
    fecha?: string;
    otorgadoPor?: string;
    visible?: boolean;
    tipo?: 'visita' | 'correccion' | 'canje';
    notas?: string;
  }
): Promise<string> {
  const sellosRef = collection(db, CLIENTES_COLLECTION, clienteId, SELLOS_SUBCOLLECTION);
  const newDoc = cleanFirestorePayload({
    fecha: sello.fecha || new Date().toISOString(),
    otorgadoPor: sello.otorgadoPor || 'vidriero',
    visible: sello.visible !== undefined ? sello.visible : true,
    tipo: sello.tipo || 'visita',
    notas: sello.notas || '',
  });

  const docRef = await addDoc(sellosRef, newDoc);
  return docRef.id;
}

/**
 * Adds an immutable transparent correction note to the stamp history
 */
export async function agregarNotaCorreccionSello(
  clienteId: string,
  nota: string
): Promise<void> {
  await addSelloHistorial(clienteId, {
    tipo: 'correccion',
    notas: nota,
    otorgadoPor: 'vidriero',
    visible: true,
    fecha: new Date().toISOString(),
  });
}

/**
 * Recursively removes any `undefined` properties from objects/arrays
 */
export function cleanFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestorePayload(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Seeds initial demo clients into Firestore if collection is empty
 */
async function seedInitialClientes(negocioId: string = 'perfect-glass'): Promise<void> {
  try {
    const clientesRef = collection(db, CLIENTES_COLLECTION);
    const snap = await getDocs(clientesRef);
    if (!snap.empty) return;

    for (const item of SAMPLE_CLIENTES) {
      const docRef = await addDoc(clientesRef, cleanFirestorePayload({
        ...item,
        negocioId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Seed initial sample stamps into sellosHistorial subcollection
      if (item.historialVisitas) {
        for (const v of item.historialVisitas) {
          if (v.selloOtorgado) {
            await addDoc(collection(db, CLIENTES_COLLECTION, docRef.id, SELLOS_SUBCOLLECTION), {
              fecha: v.createdAt || new Date().toISOString(),
              otorgadoPor: 'vidriero',
              visible: true,
              tipo: 'visita',
              negocioId,
              notas: v.notas || 'Visita completada',
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn('Could not auto-seed sample clientes into Firestore:', error);
  }
}

/**
 * Registers a new Client (Rol Cliente) with 'pendiente' status
 */
export async function registrarNuevoCliente(data: {
  uid: string;
  email: string;
  nombre: string;
  telefono: string;
  localComercial: string;
  negocioId?: string;
}): Promise<string> {
  const clientesRef = collection(db, CLIENTES_COLLECTION);
  const fechaHoy = getTodayISODate();
  
  const rawDoc: Record<string, any> = {
    uid: data.uid,
    emailRegistro: data.email,
    nombre: data.nombre,
    telefono: data.telefono,
    localComercial: data.localComercial,
    negocioId: data.negocioId || 'perfect-glass',
    estadoRegistro: 'pendiente', // Pending approval by vidriero
    direccion: '', // Completed by vidriero upon approval
    zona: '',
    tipoSuperficie: 'Ventanas y vidrieras',
    frecuenciaVisitaDias: 30,
    duracionServicioMinutos: 30,
    fechaUltimaVisita: fechaHoy,
    fechaProximaVisita: calcularProximaVisita(fechaHoy, 30),
    notas: `Solicitud de registro web para ${data.localComercial}`,
    activo: true,
    sellosAcumulados: 0,
    sellosNecesarios: 5,
    recompensaDescripcion: 'Limpieza de vidrios gratis',
    recompensaDisponible: false,
    totalRecompensasCanjeadas: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newDoc = cleanFirestorePayload(rawDoc);
  const docRef = await addDoc(clientesRef, newDoc);
  return docRef.id;
}

/**
 * Subscribes to pending client registration requests (for the Vidriero admin)
 */
export function subscribeToSolicitudesRegistro(
  callback: (solicitudes: Cliente[]) => void
): () => void {
  const clientesRef = collection(db, CLIENTES_COLLECTION);
  const q = query(clientesRef, where('estadoRegistro', '==', 'pendiente'));

  return onSnapshot(q, (snapshot) => {
    const list: Cliente[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Cliente[];
    callback(list);
  }, (err) => {
    console.warn('Error subscribing to solicitudes:', err);
    callback([]);
  });
}

/**
 * Approves a pending client registration request and activates their account,
 * with optional linking to an existing client record.
 */
export async function aprobarSolicitudCliente(
  solicitudId: string,
  configData: Partial<Cliente>,
  vincularAClienteId?: string,
  userId?: string
): Promise<void> {
  const timestamp = new Date().toISOString();

  if (vincularAClienteId) {
    // 1. Get the pending registration data to extract uid and email
    const pendingDocRef = doc(db, CLIENTES_COLLECTION, solicitudId);
    const pendingSnap = await getDoc(pendingDocRef);
    const pendingData = pendingSnap.data() || {};

    // 2. Update existing client record with uid, emailRegistro, localComercial and approve
    const existingDocRef = doc(db, CLIENTES_COLLECTION, vincularAClienteId);
    const updates: Record<string, any> = {
      uid: pendingData.uid || configData.uid,
      emailRegistro: pendingData.emailRegistro || configData.emailRegistro,
      localComercial: pendingData.localComercial || configData.localComercial,
      estadoRegistro: 'aprobado',
      ...configData,
      updatedAt: timestamp,
      updatedBy: userId || 'vidriero',
    };

    await updateDoc(existingDocRef, cleanFirestorePayload(updates));

    // 3. Delete the temporary pending request doc if it is different from existing
    if (solicitudId !== vincularAClienteId) {
      await deleteDoc(pendingDocRef);
    }
  } else {
    // Approve the new client doc directly
    const clientDocRef = doc(db, CLIENTES_COLLECTION, solicitudId);
    const updates: Record<string, any> = {
      estadoRegistro: 'aprobado',
      ...configData,
      updatedAt: timestamp,
      updatedBy: userId || 'vidriero',
    };
    await updateDoc(clientDocRef, cleanFirestorePayload(updates));
  }
}

/**
 * Rejects a client registration request
 */
export async function rechazarSolicitudCliente(
  solicitudId: string,
  motivo?: string,
  userId?: string
): Promise<void> {
  const clientDocRef = doc(db, CLIENTES_COLLECTION, solicitudId);
  const updates: Record<string, any> = {
    estadoRegistro: 'rechazado',
    notas: motivo ? `Rechazado: ${motivo}` : 'Solicitud no aprobada',
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'vidriero',
  };
  await updateDoc(clientDocRef, cleanFirestorePayload(updates));
}

/**
 * Safe profile update invoked from the Client Portal.
 * Only modifies non-sensitive profile info (name, phone, localComercial).
 * Strictly forbids modifying stamps, visit dates, or approval status.
 */
export async function updateClienteProfileByClient(
  clienteId: string,
  profileData: {
    nombre?: string;
    telefono?: string;
    localComercial?: string;
    direccion?: string;
    notas?: string;
  }
): Promise<void> {
  const clientDocRef = doc(db, CLIENTES_COLLECTION, clienteId);
  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (profileData.nombre !== undefined) updates.nombre = profileData.nombre.trim();
  if (profileData.telefono !== undefined) updates.telefono = profileData.telefono.trim();
  if (profileData.localComercial !== undefined) updates.localComercial = profileData.localComercial.trim();
  if (profileData.direccion !== undefined) updates.direccion = profileData.direccion.trim();
  if (profileData.notas !== undefined) updates.notas = profileData.notas.trim();

  await updateDoc(clientDocRef, cleanFirestorePayload(updates));
}

/**
 * Adds a new client to Firestore (Admin)
 */
export async function addCliente(
  data: Omit<Cliente, 'id'>,
  userId?: string,
  negocioId?: string
): Promise<string> {
  const clientesRef = collection(db, CLIENTES_COLLECTION);
  
  const fechaUltima = data.fechaUltimaVisita || getTodayISODate();
  const fechaProxima = data.fechaProximaVisita || calcularProximaVisita(fechaUltima, data.frecuenciaVisitaDias || 30);

  const finalNegocioId = negocioId || data.negocioId || 'perfect-glass';

  const rawDoc: Record<string, any> = {
    negocioId: finalNegocioId,
    nombre: data.nombre || '',
    telefono: data.telefono || '',
    direccion: data.direccion || '',
    zona: data.zona || '',
    tipoSuperficie: data.tipoSuperficie || 'Ventanas residenciales',
    frecuenciaVisitaDias: Number(data.frecuenciaVisitaDias) || 30,
    duracionServicioMinutos: Number(data.duracionServicioMinutos) || 30,
    fechaUltimaVisita: fechaUltima,
    fechaProximaVisita: fechaProxima,
    notas: data.notas || '',
    activo: data.activo !== undefined ? Boolean(data.activo) : true,
    
    // Auth & Status
    uid: data.uid || null,
    emailRegistro: data.emailRegistro || null,
    localComercial: data.localComercial || data.nombre || '',
    estadoRegistro: data.estadoRegistro || 'aprobado',

    // Loyalty defaults
    sellosAcumulados: data.sellosAcumulados !== undefined ? Number(data.sellosAcumulados) : 0,
    sellosNecesarios: Number(data.sellosNecesarios) || 5,
    recompensaDescripcion: data.recompensaDescripcion || 'Limpieza de vidrios gratis',
    recompensaDisponible: data.recompensaDisponible !== undefined ? Boolean(data.recompensaDisponible) : false,
    totalRecompensasCanjeadas: Number(data.totalRecompensasCanjeadas) || 0,
    fechaUltimoCanje: data.fechaUltimoCanje || '',

    historialVisitas: data.historialVisitas || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'vidriero',
  };

  if (data.fotoAntes) rawDoc.fotoAntes = data.fotoAntes;
  if (data.fotoDespues) rawDoc.fotoDespues = data.fotoDespues;

  const newDoc = cleanFirestorePayload(rawDoc);
  const docRef = await addDoc(clientesRef, newDoc);
  return docRef.id;
}

/**
 * Updates an existing client in Firestore (Admin)
 */
export async function updateCliente(
  id: string,
  data: Partial<Cliente>,
  userId?: string
): Promise<void> {
  const clientDocRef = doc(db, CLIENTES_COLLECTION, id);

  const updates: any = {
    ...data,
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'vidriero',
  };

  if (data.fechaUltimaVisita || data.frecuenciaVisitaDias) {
    const fechaUltima = data.fechaUltimaVisita || getTodayISODate();
    const frecuencia = data.frecuenciaVisitaDias || 30;
    updates.fechaProximaVisita = calcularProximaVisita(fechaUltima, frecuencia);
  }

  const cleanedUpdates = cleanFirestorePayload(updates);
  await updateDoc(clientDocRef, cleanedUpdates);
}

/**
 * Deletes a client from Firestore (Admin only)
 */
export async function deleteCliente(id: string): Promise<void> {
  const clientDocRef = doc(db, CLIENTES_COLLECTION, id);
  await deleteDoc(clientDocRef);
}

export interface MarcarVisitaResult {
  rewardUnlocked: boolean;
  sellosAcumulados: number;
  sellosNecesarios: number;
  recompensaDescripcion: string;
}

/**
 * Marks a visit as completed for a client:
 * 1. Sets fechaUltimaVisita = visitDate
 * 2. Recalculates fechaProximaVisita = visitDate + frecuenciaDias
 * 3. Appends a new entry to historialVisitas array
 * 4. Adds +1 to sellosAcumulados
 * 5. Writes an immutable record to subcollection sellosHistorial
 * 6. If sellosAcumulados reaches sellosNecesarios: sets recompensaDisponible = true, resets sellosAcumulados = 0
 */
export async function marcarVisitaCompletada(
  clienteId: string,
  visita: {
    fecha: string;
    notas: string;
    fotoAntes?: string;
    fotoDespues?: string;
  },
  frecuenciaDias: number,
  userId?: string
): Promise<MarcarVisitaResult> {
  const clientDocRef = doc(db, CLIENTES_COLLECTION, clienteId);
  const snap = await getDoc(clientDocRef);
  const currentData = snap.exists() ? snap.data() : {};

  const fechaVisita = visita.fecha || getTodayISODate();
  const nuevaFechaProxima = calcularProximaVisita(fechaVisita, frecuenciaDias || 30);

  // Loyalty calculations
  const sellosNecesarios = Number(currentData.sellosNecesarios) || 5;
  const recompensaDescripcion = currentData.recompensaDescripcion || 'Limpieza de vidrios gratis';
  const prevSellos = Number(currentData.sellosAcumulados) || 0;
  const nuevoTotal = prevSellos + 1;

  let rewardUnlocked = false;
  let finalSellos = nuevoTotal;
  let finalRecompensaDisponible = Boolean(currentData.recompensaDisponible);

  if (nuevoTotal >= sellosNecesarios) {
    rewardUnlocked = true;
    finalRecompensaDisponible = true;
    finalSellos = 0; // Reset stamps count as required
  }

  const nuevoRegistroVisita: Record<string, any> = {
    id: `visita_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fecha: fechaVisita,
    notas: visita.notas || 'Visita periódica completada con éxito.',
    selloOtorgado: true,
    completadoPor: 'vidriero',
    createdAt: new Date().toISOString(),
  };

  if (visita.fotoAntes) nuevoRegistroVisita.fotoAntes = visita.fotoAntes;
  if (visita.fotoDespues) nuevoRegistroVisita.fotoDespues = visita.fotoDespues;

  const updates: any = {
    fechaUltimaVisita: fechaVisita,
    fechaProximaVisita: nuevaFechaProxima,
    sellosAcumulados: finalSellos,
    sellosNecesarios: sellosNecesarios,
    recompensaDescripcion: recompensaDescripcion,
    recompensaDisponible: finalRecompensaDisponible,
    historialVisitas: arrayUnion(cleanFirestorePayload(nuevoRegistroVisita)),
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'vidriero',
  };

  if (visita.fotoAntes) updates.fotoAntes = visita.fotoAntes;
  if (visita.fotoDespues) updates.fotoDespues = visita.fotoDespues;

  await updateDoc(clientDocRef, cleanFirestorePayload(updates));

  // Also write to subcollection sellosHistorial
  try {
    await addSelloHistorial(clienteId, {
      fecha: new Date().toISOString(),
      otorgadoPor: 'vidriero',
      visible: true,
      tipo: 'visita',
      notas: visita.notas || 'Visita periódica completada',
    });
  } catch (err) {
    console.warn('Could not write to sellosHistorial subcollection:', err);
  }

  return {
    rewardUnlocked,
    sellosAcumulados: finalSellos,
    sellosNecesarios,
    recompensaDescripcion,
  };
}

/**
 * Redeems an available loyalty reward for a client:
 * Sets recompensaDisponible = false, increments totalRecompensasCanjeadas and records last redeem date.
 */
export async function canjearRecompensa(
  clienteId: string,
  userId?: string
): Promise<void> {
  const clientDocRef = doc(db, CLIENTES_COLLECTION, clienteId);
  const snap = await getDoc(clientDocRef);
  const currentData = snap.exists() ? snap.data() : {};

  const totalCanjes = (Number(currentData.totalRecompensasCanjeadas) || 0) + 1;
  const recompensaDesc = currentData.recompensaDescripcion || 'Limpieza de vidrios gratis';

  const logRegistro: Record<string, any> = {
    id: `canje_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fecha: getTodayISODate(),
    notas: `🎁 Recompensa canjeada: ${recompensaDesc}`,
    completadoPor: 'vidriero',
    createdAt: new Date().toISOString(),
  };

  const updates: Record<string, any> = {
    recompensaDisponible: false,
    totalRecompensasCanjeadas: totalCanjes,
    fechaUltimoCanje: getTodayISODate(),
    historialVisitas: arrayUnion(cleanFirestorePayload(logRegistro)),
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'vidriero',
  };

  await updateDoc(clientDocRef, cleanFirestorePayload(updates));

  // Add canje entry to sellosHistorial
  try {
    await addSelloHistorial(clienteId, {
      fecha: new Date().toISOString(),
      otorgadoPor: 'vidriero',
      visible: true,
      tipo: 'canje',
      notas: `🎁 Canje de premio: ${recompensaDesc}`,
    });
  } catch (e) {
    console.warn('Error logging canje to sellosHistorial:', e);
  }
}

/**
 * Adds a stamp manually to a client (Admin only).
 * Note: Only adding positive stamps is allowed. No stamp deletion/reduction is supported.
 */
export async function ajustarSellosCliente(
  clienteId: string,
  nuevosSellos: number,
  userId?: string
): Promise<{ rewardUnlocked: boolean }> {
  const clientDocRef = doc(db, CLIENTES_COLLECTION, clienteId);
  const snap = await getDoc(clientDocRef);
  const currentData = snap.exists() ? snap.data() : {};

  const sellosNecesarios = Number(currentData.sellosNecesarios) || 5;
  let finalSellos = Math.max(0, nuevosSellos);
  let finalRecompensaDisponible = Boolean(currentData.recompensaDisponible);
  let rewardUnlocked = false;

  if (finalSellos >= sellosNecesarios) {
    finalRecompensaDisponible = true;
    finalSellos = 0;
    rewardUnlocked = true;
  }

  const updates: Record<string, any> = {
    sellosAcumulados: finalSellos,
    recompensaDisponible: finalRecompensaDisponible,
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'vidriero',
  };

  await updateDoc(clientDocRef, cleanFirestorePayload(updates));

  // Add record to subcollection
  try {
    await addSelloHistorial(clienteId, {
      fecha: new Date().toISOString(),
      otorgadoPor: 'vidriero',
      visible: true,
      tipo: 'visita',
      notas: 'Sello otorgado por el vidriero',
    });
  } catch (e) {
    console.warn('Error in addSelloHistorial for ajustarSellos:', e);
  }

  return { rewardUnlocked };
}

/**
 * Uploads client photo to Firebase Storage with a fallback to base64 data URL
 */
export async function uploadClienteFoto(
  file: File,
  clienteId: string,
  tipo: 'antes' | 'despues' | 'visita',
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    const filename = `${clienteId}_${tipo}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `clientes/${clienteId}/${filename}`);

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
          console.warn('Firebase Storage upload failed, converting to DataURL:', error);
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(error);
          reader.readAsDataURL(file);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (e) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(e);
            reader.readAsDataURL(file);
          }
        }
      );
    });
  } catch (error) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Batch reschedules multiple clients to a new target date in a single atomic transaction.
 */
export async function reprogramarClientesFechaBatch(
  clienteIds: string[],
  nuevaFecha: string,
  motivo?: string,
  userId?: string
): Promise<void> {
  if (!clienteIds || clienteIds.length === 0 || !nuevaFecha) return;

  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();

  for (const id of clienteIds) {
    const docRef = doc(db, CLIENTES_COLLECTION, id);
    const updates: Record<string, any> = {
      fechaProximaVisita: nuevaFecha,
      updatedAt: timestamp,
      updatedBy: userId || 'vidriero',
    };
    batch.update(docRef, cleanFirestorePayload(updates));
  }

  await batch.commit();
}

/**
 * Updates the client's last review request date (ultimoPedidoResena) in Firestore
 */
export async function registrarPedidoResenaEnviado(
  clienteId: string,
  userId?: string
): Promise<void> {
  const docRef = doc(db, CLIENTES_COLLECTION, clienteId);
  const hoy = getTodayISODate();
  await updateDoc(docRef, cleanFirestorePayload({
    ultimoPedidoResena: hoy,
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'vidriero',
  }));
}



