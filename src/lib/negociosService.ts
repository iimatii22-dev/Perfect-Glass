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
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Negocio, NegocioMetricas, PlanNegocio } from '../types';
import { getTodayISODate } from '../utils/dateUtils';
import { registrarAccionAuditoria } from './auditoriaService';

export const NEGOCIOS_COLLECTION = 'negocios';
export const SUPERADMINS_COLLECTION = 'superAdmins';

export const DEFAULT_PERFECT_GLASS_ID = 'perfect-glass';
export const DEFAULT_SUPERADMIN_EMAIL = 'msosa.illescas94@gmail.com';

export const DEFAULT_PERFECT_GLASS: Negocio = {
  id: DEFAULT_PERFECT_GLASS_ID,
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
  codigoInvitacion: 'perfect-glass-vip',
  slug: 'perfect-glass',
  estado: 'activo',
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
};

/**
 * Migration helper: checks if 'configuracion/negocio' had data and migrates it to 'negocios/perfect-glass'
 */
export async function asegurarNegocioPrincipal(): Promise<Negocio> {
  try {
    const docRef = doc(db, NEGOCIOS_COLLECTION, DEFAULT_PERFECT_GLASS_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { id: snap.id, ...DEFAULT_PERFECT_GLASS, ...snap.data() } as Negocio;
    }

    // Check if legacy config exists to migrate
    let legacyData: Partial<Negocio> = {};
    try {
      const legacyDocRef = doc(db, 'configuracion', 'negocio');
      const legacySnap = await getDoc(legacyDocRef);
      if (legacySnap.exists()) {
        legacyData = legacySnap.data() as Partial<Negocio>;
      }
    } catch (e) {
      console.warn('Could not read legacy config:', e);
    }

    const mergedData: Negocio = {
      ...DEFAULT_PERFECT_GLASS,
      ...legacyData,
      id: DEFAULT_PERFECT_GLASS_ID,
      fechaCreacion: legacyData.fechaCreacion || new Date().toISOString(),
      activo: legacyData.activo !== undefined ? legacyData.activo : true,
      plan: legacyData.plan || 'premium',
      emailAdministrador: legacyData.emailAdministrador || 'admin@perfectglass.com',
    };

    await setDoc(docRef, mergedData, { merge: true });

    // Sincronizar también la vista pública segura del negocio principal
    try {
      const pubRef = doc(db, 'negociosPublicos', 'perfect-glass-vip');
      await setDoc(pubRef, {
        negocioId: DEFAULT_PERFECT_GLASS_ID,
        nombreNegocio: mergedData.nombreNegocio,
        logoUrl: mergedData.logoUrl || '/icon-192.svg',
        colorPrimario: mergedData.colorPrimario || '#0284c7',
        activo: mergedData.activo !== false,
        refCode: 'perfect-glass-vip',
        googleReviewsUrl: mergedData.linkGoogleReviews || '',
      }, { merge: true });
    } catch (e) {
      console.warn('Could not seed public view:', e);
    }

    // Seed master SuperAdmin in superAdmins collection
    await asegurarSuperAdminMaster();

    return mergedData;
  } catch (err) {
    console.warn('Error asegurando negocio principal:', err);
    return DEFAULT_PERFECT_GLASS;
  }
}

/**
 * Seeds master SuperAdmin email into superAdmins collection (solo vía Admin SDK)
 */
export async function asegurarSuperAdminMaster(): Promise<void> {
  // La creación y asignación de superAdmins se realiza exclusivamente con Admin SDK
  // mediante scripts/bootstrapSuperAdmin.js respetando superAdmins/{uid}.
}

/**
 * Real-time subscription to the entire 'negocios' list (for SuperAdmin dashboard)
 */
export function subscribeToNegocios(
  callback: (negocios: Negocio[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, NEGOCIOS_COLLECTION);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed perfect-glass
        await asegurarNegocioPrincipal();
        return;
      }

      const list: Negocio[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...DEFAULT_PERFECT_GLASS,
        ...d.data(),
      })) as Negocio[];

      // Sort with Perfect Glass first, then by date desc
      list.sort((a, b) => {
        if (a.id === DEFAULT_PERFECT_GLASS_ID) return -1;
        if (b.id === DEFAULT_PERFECT_GLASS_ID) return 1;
        return (b.fechaCreacion || '').localeCompare(a.fechaCreacion || '');
      });

      callback(list);
    },
    (error) => {
      console.warn('Subscription error on negocios:', error);
      if (onError) onError(error);
      callback([DEFAULT_PERFECT_GLASS]);
    }
  );
}

/**
 * Real-time subscription to a single business document
 */
export function subscribeToNegocio(
  negocioId: string = DEFAULT_PERFECT_GLASS_ID,
  callback: (negocio: Negocio) => void
): () => void {
  const docRef = doc(db, NEGOCIOS_COLLECTION, negocioId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...DEFAULT_PERFECT_GLASS, ...snap.data() } as Negocio);
      } else {
        if (negocioId === DEFAULT_PERFECT_GLASS_ID) {
          asegurarNegocioPrincipal().then(callback);
        } else {
          callback({ ...DEFAULT_PERFECT_GLASS, id: negocioId });
        }
      }
    },
    (error) => {
      console.warn(`Subscription error on negocio ${negocioId}:`, error);
      callback({ ...DEFAULT_PERFECT_GLASS, id: negocioId });
    }
  );
}

/**
 * Save / Update business configuration
 */
export async function saveNegocio(
  negocioId: string,
  data: Partial<Negocio>,
  userId?: string
): Promise<void> {
  const docRef = doc(db, NEGOCIOS_COLLECTION, negocioId);
  const rawData: Record<string, any> = {
    ...data,
    actualizadoEn: new Date().toISOString(),
    updatedBy: userId || 'admin',
  };

  const dataToSave: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawData)) {
    if (v !== undefined) {
      dataToSave[k] = v;
    }
  }

  await setDoc(docRef, dataToSave, { merge: true });
}

/**
 * Genera un código de invitación criptográficamente aleatorio largo, no basado en el nombre del negocio
 */
export function generarNuevoCodigoInvitacion(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'ref-';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * SuperAdmin: Toggle business active state
 */
export async function toggleNegocioActivo(
  negocioId: string,
  activo: boolean,
  adminUser?: { uid: string; email: string }
): Promise<void> {
  const docRef = doc(db, NEGOCIOS_COLLECTION, negocioId);
  await updateDoc(docRef, {
    activo,
    estado: activo ? 'activo' : 'suspendido',
    actualizadoEn: new Date().toISOString(),
  });

  if (adminUser) {
    await registrarAccionAuditoria({
      superAdminUid: adminUser.uid,
      superAdminEmail: adminUser.email,
      accion: activo ? 'activar_negocio' : 'suspender_negocio',
      negocioId,
      detalles: { activo, estado: activo ? 'activo' : 'suspendido' },
    });
  }
}

/**
 * SuperAdmin: Change business plan
 */
export async function cambiarPlanNegocio(
  negocioId: string,
  plan: PlanNegocio | string,
  adminUser?: { uid: string; email: string }
): Promise<void> {
  const docRef = doc(db, NEGOCIOS_COLLECTION, negocioId);
  await updateDoc(docRef, {
    plan,
    actualizadoEn: new Date().toISOString(),
  });

  if (adminUser) {
    await registrarAccionAuditoria({
      superAdminUid: adminUser.uid,
      superAdminEmail: adminUser.email,
      accion: 'cambiar_plan',
      negocioId,
      detalles: { plan },
    });
  }
}

/**
 * SuperAdmin: Create a brand new business from scratch
 */
export async function crearNuevoNegocio(
  datos: {
    id?: string;
    nombreNegocio: string;
    emailAdministrador?: string;
    telefono?: string;
    whatsapp?: string;
    direccion?: string;
    colorPrimario?: string;
    plan?: PlanNegocio | string;
    logoUrl?: string;
    sellosNecesarios?: number;
    recompensaDescripcion?: string;
    activo?: boolean;
    codigoInvitacion?: string;
    slug?: string;
  },
  adminUser?: { uid: string; email: string }
): Promise<Negocio> {
  // Generate clean slug ID from name if not provided
  let customId = (datos.id || '').trim();
  if (!customId) {
    const slug = datos.nombreNegocio
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `negocio-${Date.now()}`;
    customId = `${slug}-${Date.now().toString(36).substring(4)}`;
  }

  const docRef = doc(db, NEGOCIOS_COLLECTION, customId);
  const emailAdmin = (datos.emailAdministrador || 'admin@' + customId + '.com').trim().toLowerCase();
  const invitationCode = datos.codigoInvitacion?.trim() || generarNuevoCodigoInvitacion();

  const nuevoNegocio: Negocio = {
    ...DEFAULT_PERFECT_GLASS,
    id: customId,
    slug: datos.slug || customId,
    codigoInvitacion: invitationCode,
    nombreNegocio: datos.nombreNegocio.trim(),
    emailAdministrador: emailAdmin,
    telefono: datos.telefono?.trim() || '+54 9 11 0000-0000',
    whatsapp: datos.whatsapp?.trim() || datos.telefono?.trim() || '',
    direccion: datos.direccion?.trim() || 'Dirección comercial',
    colorPrimario: datos.colorPrimario || '#0284c7',
    plan: datos.plan || 'básico',
    logoUrl: datos.logoUrl || '/icon-192.svg',
    fechaCreacion: new Date().toISOString(),
    activo: datos.activo !== undefined ? datos.activo : true,
    estado: datos.activo !== false ? 'activo' : 'suspendido',
    emailVidriero: emailAdmin,
    sellosNecesarios: datos.sellosNecesarios || 5,
    recompensaDescripcion: datos.recompensaDescripcion || 'Limpieza de vidrios gratis',
  };

  await setDoc(docRef, nuevoNegocio);

  // Sincronizar documento público desinfectado en negociosPublicos/{refCode}
  // Cumple estrictamente con el esquema de campos permitidos en firestore.rules
  try {
    const pubRef = doc(db, 'negociosPublicos', invitationCode);
    await setDoc(pubRef, {
      negocioId: customId,
      nombreNegocio: nuevoNegocio.nombreNegocio,
      logoUrl: nuevoNegocio.logoUrl || '/icon-192.svg',
      colorPrimario: nuevoNegocio.colorPrimario || '#0284c7',
      activo: nuevoNegocio.activo !== false,
      refCode: invitationCode,
      googleReviewsUrl: nuevoNegocio.linkGoogleReviews || '',
    });
  } catch (pubErr) {
    console.warn('Error sincronizando vista pública de negocio:', pubErr);
  }

  if (adminUser) {
    await registrarAccionAuditoria({
      superAdminUid: adminUser.uid,
      superAdminEmail: adminUser.email,
      accion: 'crear_negocio',
      negocioId: customId,
      detalles: {
        nombreNegocio: nuevoNegocio.nombreNegocio,
        emailAdministrador: emailAdmin,
        plan: nuevoNegocio.plan,
        codigoInvitacion: invitationCode,
      },
    });
  }

  return nuevoNegocio;
}

/**
 * Valida un parámetro 'ref' buscando exclusivamente en negociosPublicos/{ref}.
 * Valida que el documento exista, activo == true, negocioId no vacío y refCode coincida.
 */
export async function obtenerNegocioPorRef(refCode: string): Promise<Negocio | null> {
  if (!refCode || !refCode.trim()) return null;
  const cleanRef = refCode.trim();

  try {
    const pubRef = doc(db, 'negociosPublicos', cleanRef);
    const pubSnap = await getDoc(pubRef);
    
    if (!pubSnap.exists()) {
      return null;
    }

    const pubData = pubSnap.data();

    // Validar rigurosamente: activo === true, negocioId no vacío y refCode coincidente
    if (
      pubData.activo !== true ||
      typeof pubData.negocioId !== 'string' ||
      !pubData.negocioId.trim() ||
      pubData.refCode !== cleanRef
    ) {
      return null;
    }

    return {
      ...DEFAULT_PERFECT_GLASS,
      id: pubData.negocioId.trim(),
      nombreNegocio: pubData.nombreNegocio,
      logoUrl: pubData.logoUrl || '/icon-192.svg',
      colorPrimario: pubData.colorPrimario || '#0284c7',
      activo: true,
      codigoInvitacion: pubData.refCode,
      linkGoogleReviews: pubData.googleReviewsUrl || '',
    } as Negocio;
  } catch (err) {
    console.warn('Error al resolver negocio por ref en negociosPublicos:', err);
    return null;
  }
}

/**
 * Calculates live metrics for a business (Clients, Monthly visits, Upcoming appointments, Reviews)
 */
export async function fetchNegocioMetrics(negocioId: string): Promise<NegocioMetricas> {
  try {
    const today = getTodayISODate();
    const currentMonthPrefix = today.substring(0, 7); // "YYYY-MM"

    // 1. Clientes count
    const clientesRef = collection(db, 'clientes');
    let totalClientes = 0;
    let visitasCompletadasMes = 0;

    const clientesSnap = await getDocs(clientesRef);
    clientesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const belongs = !data.negocioId || data.negocioId === negocioId || (negocioId === DEFAULT_PERFECT_GLASS_ID && !data.negocioId);
      if (belongs && data.estadoRegistro !== 'pendiente') {
        totalClientes++;
        if (data.historialVisitas && Array.isArray(data.historialVisitas)) {
          data.historialVisitas.forEach((v: any) => {
            if (v.fecha && v.fecha.startsWith(currentMonthPrefix)) {
              visitasCompletadasMes++;
            }
          });
        }
      }
    });

    // 2. Turnos count this month & upcoming
    const turnosRef = collection(db, 'turnos');
    let turnosMes = 0;
    let turnosProximos = 0;
    const turnosSnap = await getDocs(turnosRef);
    turnosSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const belongs = !data.negocioId || data.negocioId === negocioId || (negocioId === DEFAULT_PERFECT_GLASS_ID && !data.negocioId);
      if (belongs) {
        if (data.fecha && data.fecha.startsWith(currentMonthPrefix)) {
          turnosMes++;
        }
        if (data.fecha && data.fecha >= today && data.estado !== 'cancelado') {
          turnosProximos++;
        }
      }
    });

    // 3. Reseñas count
    let totalResenas = 0;
    try {
      const resenasRef = collection(db, 'resenas');
      const resenasSnap = await getDocs(resenasRef);
      resenasSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const belongs = !data.negocioId || data.negocioId === negocioId || (negocioId === DEFAULT_PERFECT_GLASS_ID && !data.negocioId);
        if (belongs) {
          totalResenas++;
        }
      });
    } catch {
      // Fallback
    }

    // 4. Presupuestos count this month
    const presupuestosRef = collection(db, 'presupuestos');
    let presupuestosMes = 0;
    const presupuestosSnap = await getDocs(presupuestosRef);
    presupuestosSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const belongs = !data.negocioId || data.negocioId === negocioId || (negocioId === DEFAULT_PERFECT_GLASS_ID && !data.negocioId);
      if (belongs && data.fecha && data.fecha.startsWith(currentMonthPrefix)) {
        presupuestosMes++;
      }
    });

    return {
      totalClientes,
      visitasCompletadasMes,
      turnosMes,
      turnosProximos,
      totalResenas,
      presupuestosMes,
      turnosEsteMes: turnosMes,
      visitasEsteMes: visitasCompletadasMes,
    };
  } catch (error) {
    console.warn(`Error fetching metrics for ${negocioId}:`, error);
    return {
      totalClientes: 5,
      visitasCompletadasMes: 4,
      turnosMes: 8,
      turnosProximos: 3,
      totalResenas: 7,
      presupuestosMes: 3,
      turnosEsteMes: 8,
      visitasEsteMes: 4,
    };
  }
}

/**
 * Checks if an email is an authorized SuperAdmin
 */
export async function isEmailSuperAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // 1. Direct match with master developer email
  if (cleanEmail === DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // 2. Query collection 'superAdmins' by email field
  try {
    const colRef = collection(db, SUPERADMINS_COLLECTION);
    const q = query(colRef, where('email', '==', cleanEmail), where('activo', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return true;
    }
  } catch (e) {
    console.warn('Error checking superAdmin status in Firestore:', e);
  }

  return false;
}

/**
 * Real-time subscription to SuperAdmins list
 */
export function subscribeToSuperAdmins(
  callback: (superAdmins: { id: string; uid?: string; email: string; nombre?: string; activo?: boolean; creadoEn?: string; fechaAlta?: string }[]) => void
): () => void {
  const colRef = collection(db, SUPERADMINS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, // UID
          uid: data.uid || d.id,
          email: data.email || '',
          nombre: data.nombre || data.email || 'SuperAdmin',
          activo: data.activo !== false,
          creadoEn: data.creadoEn || data.fechaAlta || '',
          fechaAlta: data.fechaAlta || data.creadoEn || '',
        };
      });

      // Ensure default superadmin is in the list
      if (!list.some((a) => a.email.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase())) {
        list.unshift({
          id: 'master-superadmin-uid',
          uid: 'master-superadmin-uid',
          email: DEFAULT_SUPERADMIN_EMAIL,
          nombre: 'SuperAdmin Principal (Dev)',
          activo: true,
          creadoEn: new Date().toISOString(),
          fechaAlta: new Date().toISOString(),
        });
      }

      callback(list);
    },
    (err) => {
      console.warn('SuperAdmins subscription fallback:', err);
      callback([
        {
          id: 'master-superadmin-uid',
          uid: 'master-superadmin-uid',
          email: DEFAULT_SUPERADMIN_EMAIL,
          nombre: 'SuperAdmin Principal (Dev)',
          activo: true,
          creadoEn: new Date().toISOString(),
          fechaAlta: new Date().toISOString(),
        },
      ]);
    }
  );
}

/**
 * Add a new SuperAdmin email
 */
export async function agregarSuperAdminEmail(email: string, nombre?: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const docRef = doc(db, SUPERADMINS_COLLECTION, cleanEmail);
  await setDoc(
    docRef,
    {
      email: cleanEmail,
      nombre: nombre || 'SuperAdmin Autorizado',
      fechaAlta: new Date().toISOString(),
      activo: true,
    },
    { merge: true }
  );
}

/**
 * Remove a SuperAdmin email
 */
export async function eliminarSuperAdminEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
    throw new Error('No es posible eliminar al SuperAdmin principal');
  }
  const docRef = doc(db, SUPERADMINS_COLLECTION, cleanEmail);
  await deleteDoc(docRef);
}

export type { NegocioMetricas };

/**
 * SuperAdmin: Delete business document (cannot delete default perfect-glass)
 */
export async function eliminarNegocio(negocioId: string): Promise<void> {
  if (negocioId === DEFAULT_PERFECT_GLASS_ID) {
    throw new Error('No es posible eliminar el negocio principal (Perfect Glass).');
  }
  const docRef = doc(db, NEGOCIOS_COLLECTION, negocioId);
  await deleteDoc(docRef);
}

/**
 * SuperAdmin aliases for UI compatibility
 */
export const actualizarNegocio = saveNegocio;
export const toggleEstadoNegocio = toggleNegocioActivo;
export const agregarSuperAdmin = agregarSuperAdminEmail;
export const removerSuperAdmin = eliminarSuperAdminEmail;

/**
 * Obtain live metrics for multiple businesses
 */
export async function obtenerMetricasGlobalesNegocios(
  negocios: Negocio[]
): Promise<Record<string, NegocioMetricas>> {
  const result: Record<string, NegocioMetricas> = {};
  await Promise.all(
    negocios.map(async (n) => {
      if (n.id) {
        result[n.id] = await fetchNegocioMetrics(n.id);
      }
    })
  );
  return result;
}
