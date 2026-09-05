import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Cliente,
  Turno,
  Resena,
  BusinessConfig,
  EmailSimulado,
  ModoSandboxConfig,
} from '../types';
import { createTurno, cancelarTurnoPorToken } from './turnosService';
import { guardarResena } from './resenasService';
import { enqueueMailForFirebaseExtension } from './emailNotificationService';

export const MODO_SANDBOX_COLLECTION = 'modoSandbox';
export const MODO_SANDBOX_DOC_ID = 'estado';
export const EMAILS_SIMULADOS_COLLECTION = 'emailsSimulados';

// In-memory cache for fast synchronous checks
let cachedModoSandboxActivo: boolean = false;
let hasInitializedListener = false;

/**
 * Initializes the real-time listener for Modo Sandbox status
 */
export function initModoSandboxListener(): () => void {
  if (hasInitializedListener) {
    return () => {};
  }
  hasInitializedListener = true;

  const docRef = doc(db, MODO_SANDBOX_COLLECTION, MODO_SANDBOX_DOC_ID);
  const unsub = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        cachedModoSandboxActivo = Boolean(data.activo);
      } else {
        cachedModoSandboxActivo = false;
      }
    },
    (err) => {
      console.warn('Error en listener de modoSandbox:', err);
    }
  );

  return unsub;
}

// Automatically start listener
if (typeof window !== 'undefined') {
  initModoSandboxListener();
}

/**
 * Returns the synchronous cached value of Modo Sandbox
 */
export function isModoSandboxActivoSync(): boolean {
  return cachedModoSandboxActivo;
}

/**
 * Fetches the current Modo Sandbox status from Firestore
 */
export async function isModoSandboxActivo(): Promise<boolean> {
  try {
    const docRef = doc(db, MODO_SANDBOX_COLLECTION, MODO_SANDBOX_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const activo = Boolean(data.activo);
      cachedModoSandboxActivo = activo;
      return activo;
    }
    return cachedModoSandboxActivo;
  } catch (err) {
    console.warn('No se pudo verificar modoSandbox en Firestore:', err);
    return cachedModoSandboxActivo;
  }
}

/**
 * Realtime subscription to Modo Sandbox document
 */
export function subscribeModoSandbox(
  callback: (config: ModoSandboxConfig) => void
): () => void {
  const docRef = doc(db, MODO_SANDBOX_COLLECTION, MODO_SANDBOX_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ModoSandboxConfig;
        cachedModoSandboxActivo = Boolean(data.activo);
        callback({
          activo: Boolean(data.activo),
          actualizadoEn: data.actualizadoEn,
          actualizadoPor: data.actualizadoPor,
        });
      } else {
        cachedModoSandboxActivo = false;
        callback({ activo: false });
      }
    },
    (err) => {
      console.warn('Error en subscribeModoSandbox:', err);
      callback({ activo: cachedModoSandboxActivo });
    }
  );
}

/**
 * Enables or disables Sandbox Mode in Firestore
 */
export async function setModoSandbox(
  activo: boolean,
  userEmail?: string
): Promise<void> {
  const docRef = doc(db, MODO_SANDBOX_COLLECTION, MODO_SANDBOX_DOC_ID);
  const nowIso = new Date().toISOString();
  cachedModoSandboxActivo = activo;

  await setDoc(
    docRef,
    {
      activo,
      actualizadoEn: nowIso,
      actualizadoPor: userEmail || 'SuperAdmin',
    },
    { merge: true }
  );
}

/**
 * Saves a simulated email into the 'emailsSimulados' collection in Firestore
 */
export async function guardarEmailSimulado(
  emailData: Omit<EmailSimulado, 'id'>
): Promise<string> {
  const colRef = collection(db, EMAILS_SIMULADOS_COLLECTION);
  const nowIso = new Date().toISOString();

  const docRef = await addDoc(colRef, {
    tipoDeEmail: emailData.tipoDeEmail || 'general',
    destinatario: emailData.destinatario || 'cliente@ejemplo.com',
    asunto: emailData.asunto || 'Notificación',
    cuerpo: emailData.cuerpo || '',
    fecha: emailData.fecha || nowIso,
    negocioId: emailData.negocioId || 'perfect-glass',
    turnoId: emailData.turnoId || null,
    clienteId: emailData.clienteId || null,
    metadata: emailData.metadata || null,
    createdAt: nowIso,
  });

  return docRef.id;
}

/**
 * Realtime subscription to the 'emailsSimulados' collection
 */
export function subscribeEmailsSimulados(
  callback: (emails: EmailSimulado[]) => void
): () => void {
  const colRef = collection(db, EMAILS_SIMULADOS_COLLECTION);
  const q = query(colRef, orderBy('fecha', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: EmailSimulado[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<EmailSimulado, 'id'>),
      }));
      callback(list);
    },
    (err) => {
      console.warn('Error al escuchar emailsSimulados:', err);
      callback([]);
    }
  );
}

/**
 * Deletes an individual simulated email
 */
export async function eliminarEmailSimulado(id: string): Promise<void> {
  if (!id) return;
  const docRef = doc(db, EMAILS_SIMULADOS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Clears all simulated emails from 'emailsSimulados'
 */
export async function limpiarEmailsSimulados(): Promise<number> {
  const colRef = collection(db, EMAILS_SIMULADOS_COLLECTION);
  const snap = await getDocs(colRef);
  let count = 0;

  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }

  return count;
}

/**
 * Cleans up all test/sandbox data (clientes, turnos, reseñas, emails)
 */
export async function limpiarDatosDePrueba(
  negocioId?: string
): Promise<{
  clientesBorrados: number;
  turnosBorrados: number;
  resenasBorrados: number;
  emailsBorrados: number;
}> {
  let clientesBorrados = 0;
  let turnosBorrados = 0;
  let resenasBorrados = 0;
  let emailsBorrados = 0;

  // 1. Delete clientes marked esSandbox or demo
  try {
    const cliRef = collection(db, 'clientes');
    const snap = await getDocs(cliRef);
    for (const d of snap.docs) {
      const data = d.data();
      const isSandbox =
        data.esSandbox === true ||
        (data.emailRegistro && data.emailRegistro.includes('demo')) ||
        (data.nombre && data.nombre.toLowerCase().includes('(demo)')) ||
        (data.nombre && data.nombre.toLowerCase().includes('demo'));
      if (isSandbox) {
        // Also delete subcollection sellosHistorial if exists
        try {
          const sellosRef = collection(db, 'clientes', d.id, 'sellosHistorial');
          const sellosSnap = await getDocs(sellosRef);
          for (const s of sellosSnap.docs) {
            await deleteDoc(s.ref);
          }
        } catch {
          // ignore
        }
        await deleteDoc(d.ref);
        clientesBorrados++;
      }
    }
  } catch (err) {
    console.warn('Error al limpiar clientes de prueba:', err);
  }

  // 2. Delete turnos marked esSandbox or demo
  try {
    const turnosRef = collection(db, 'turnos');
    const snap = await getDocs(turnosRef);
    for (const d of snap.docs) {
      const data = d.data();
      const isSandbox =
        data.esSandbox === true ||
        (data.emailCliente && data.emailCliente.includes('demo')) ||
        (data.nombreCliente && data.nombreCliente.toLowerCase().includes('demo'));
      if (isSandbox) {
        await deleteDoc(d.ref);
        turnosBorrados++;
      }
    }
  } catch (err) {
    console.warn('Error al limpiar turnos de prueba:', err);
  }

  // 3. Delete reseñas marked esSandbox or demo
  try {
    for (const colName of ['reseñas', 'resenas']) {
      const resenasRef = collection(db, colName);
      const snap = await getDocs(resenasRef);
      for (const d of snap.docs) {
        const data = d.data();
        const isSandbox =
          data.esSandbox === true ||
          (data.clienteEmail && data.clienteEmail.includes('demo')) ||
          (data.clienteNombre && data.clienteNombre.toLowerCase().includes('demo'));
        if (isSandbox) {
          await deleteDoc(d.ref);
          resenasBorrados++;
        }
      }
    }
  } catch (err) {
    console.warn('Error al limpiar reseñas de prueba:', err);
  }

  // 4. Delete emails simulados
  try {
    emailsBorrados = await limpiarEmailsSimulados();
  } catch (err) {
    console.warn('Error al limpiar emails simulados:', err);
  }

  return {
    clientesBorrados,
    turnosBorrados,
    resenasBorrados,
    emailsBorrados,
  };
}

// ---------------------------------------------------------------------------
// E2E DEMO WORKFLOW HELPERS (Step-by-Step Test Engine)
// ---------------------------------------------------------------------------

/**
 * Step 1: Generates a test client ready for review/approval
 */
export async function simularCrearClientePrueba(
  negocioId: string = 'perfect-glass'
): Promise<Cliente> {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const id = `cliente_demo_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const clienteData: Cliente = {
    id,
    negocioId,
    nombre: `Restaurante Bellini #${randomSuffix} (Demo)`,
    telefono: `+54 9 11 4455-${randomSuffix}`,
    emailRegistro: `contacto.bellini${randomSuffix}@demo-perfectglass.com`,
    localComercial: `Bellini Café #${randomSuffix}`,
    direccion: `Av. Santa Fe 3240, Palermo`,
    zona: 'Palermo',
    tipoSuperficie: 'Vidrieras comerciales + marquesina',
    frecuenciaVisitaDias: 30,
    duracionServicioMinutos: 40,
    fechaUltimaVisita: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    fechaProximaVisita: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    notas: 'Cliente creado automáticamente para demostración integral en Modo Sandbox.',
    activo: true,
    estadoRegistro: 'pendiente', // listo para que el vidriero/admin lo apruebe
    sellosAcumulados: 4, // Listo para completar el 5to sello y ganar recompensa
    sellosNecesarios: 5,
    recompensaDescripcion: 'Limpieza de frente y marquesina gratis',
    recompensaDisponible: false,
    esSandbox: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const docRef = doc(db, 'clientes', id);
  await setDoc(docRef, clienteData);

  return clienteData;
}

/**
 * Step 2: Approves the test client
 */
export async function simularAprobarClientePrueba(
  clienteId: string
): Promise<Cliente> {
  const docRef = doc(db, 'clientes', clienteId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`El cliente de prueba con ID ${clienteId} no existe.`);
  }

  const nowIso = new Date().toISOString();
  await updateDoc(docRef, {
    estadoRegistro: 'aprobado',
    updatedAt: nowIso,
  });

  const updatedSnap = await getDoc(docRef);
  return { id: clienteId, ...(updatedSnap.data() as Omit<Cliente, 'id'>) };
}

/**
 * Step 3: Schedules a test appointment for this client
 */
export async function simularAgendarTurnoPrueba(
  cliente: Cliente,
  config: BusinessConfig
): Promise<Turno> {
  // Tomorrow's date
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const fechaStr = tomorrow.toISOString().split('T')[0];

  const nuevoTurno = await createTurno(
    {
      clienteId: cliente.id,
      nombreCliente: cliente.nombre,
      telefonoCliente: cliente.telefono,
      emailCliente:
        cliente.emailRegistro || 'cliente.demo@demo-perfectglass.com',
      direccion: cliente.direccion,
      fecha: fechaStr,
      horaInicio: '10:00',
      duracionMinutos: cliente.duracionServicioMinutos || 30,
      notas: 'Turno agendado en modo Sandbox para prueba E2E de vidriero',
    },
    config,
    true // esSandbox = true
  );

  return nuevoTurno;
}

/**
 * Step 4: Cancels the test appointment via its secure token
 */
export async function simularCancelarTurnoPrueba(
  turno: Turno,
  config: BusinessConfig
): Promise<Turno> {
  const motivo = 'Simulación de imprevisto del cliente desde el link del email';
  const token = turno.tokenCancelacion || turno.cancelToken;
  if (!token) {
    throw new Error('El turno no posee token de cancelación válido.');
  }

  const turnoCancelado = await cancelarTurnoPorToken(token, config, motivo);
  return turnoCancelado;
}

/**
 * Step 5: Marks a visit as completed, awards a stamp, and dispatches review request email
 */
export async function simularMarcarVisitaPrueba(
  cliente: Cliente,
  config: BusinessConfig
): Promise<{
  clienteActualizado: Cliente;
  selloAgregado: number;
  recompensaDesbloqueada: boolean;
}> {
  const docRef = doc(db, 'clientes', cliente.id);
  const snap = await getDoc(docRef);
  const current = snap.exists() ? (snap.data() as Cliente) : cliente;

  const nuevosSellos = (current.sellosAcumulados || 0) + 1;
  const sellosReq = current.sellosNecesarios || config.sellosNecesarios || 5;
  const recompensaLista = nuevosSellos >= sellosReq;
  const hoyStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  await updateDoc(docRef, {
    sellosAcumulados: nuevosSellos,
    recompensaDisponible: recompensaLista,
    fechaUltimaVisita: hoyStr,
    fechaProximaVisita: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    updatedAt: nowIso,
  });

  // Guardar subcolección de sellos
  try {
    const sellosCol = collection(db, 'clientes', cliente.id, 'sellosHistorial');
    await addDoc(sellosCol, {
      fecha: nowIso,
      otorgadoPor: 'vidriero',
      visible: true,
      tipo: 'visita',
      notas: 'Visita de demostración completada con éxito (Sandbox)',
    });
  } catch (err) {
    console.warn('Error al agregar sello de prueba:', err);
  }

  // Disparar solicitud de reseña simulada
  const opinionUrl = `${window.location.origin}/?resena=${encodeURIComponent(cliente.id)}`;
  const asuntoResena = `⭐ ¿Cómo fue tu experiencia con ${config.nombreNegocio || 'Perfect Glass'}? Tu opinión nos importa`;
  const cuerpoResena = `
Estimado/a ${cliente.nombre},

Esperamos que hayas quedado totalmente satisfecho/a con el servicio de limpieza de vidrios realizado en ${cliente.direccion}.

¡Felicitaciones! Has sumado tu sello #${nuevosSellos} de ${sellosReq}. ${recompensaLista ? '¡Has desbloqueado tu recompensa de servicio gratis!' : ''}

¿Nos regalarías 15 segundos para calificar el trabajo recibido?
👉 Ingresá en este enlace seguro para dejar tu valoración:
${opinionUrl}

¡Muchas gracias por tu confianza!
Equipo de ${config.nombreNegocio || 'Perfect Glass'}
  `.trim();

  await guardarEmailSimulado({
    tipoDeEmail: 'solicitud_resena',
    destinatario: cliente.emailRegistro || 'cliente.demo@demo-perfectglass.com',
    asunto: asuntoResena,
    cuerpo: cuerpoResena,
    fecha: nowIso,
    negocioId: config.id,
    clienteId: cliente.id,
  });

  const clienteActualizado: Cliente = {
    ...current,
    sellosAcumulados: nuevosSellos,
    recompensaDisponible: recompensaLista,
    fechaUltimaVisita: hoyStr,
  };

  return {
    clienteActualizado,
    selloAgregado: nuevosSellos,
    recompensaDesbloqueada: recompensaLista,
  };
}

/**
 * Step 6: Leaves a review (1-3 with internal comment or 4-5 with Google Maps redirect)
 */
export async function simularDejarResenaPrueba(
  cliente: Cliente,
  config: BusinessConfig,
  calificacion: number,
  comentario: string
): Promise<{ resenaId: string; esAltaCalificacion: boolean }> {
  const esAltaCalificacion = calificacion >= 4;

  const resenaId = await guardarResena({
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    clienteTelefono: cliente.telefono,
    clienteEmail: cliente.emailRegistro || undefined,
    negocioId: config.id || 'perfect-glass',
    calificacion,
    comentario:
      comentario ||
      (esAltaCalificacion
        ? 'Excelente servicio y puntualidad. Los vidrios quedaron impecables.'
        : 'Llegaron unos minutos tarde y faltó repasar una esquina.'),
    derivadoAGoogle: esAltaCalificacion,
    esSandbox: true,
  });

  return {
    resenaId,
    esAltaCalificacion,
  };
}
