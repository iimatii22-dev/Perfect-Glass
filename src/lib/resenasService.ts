import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Resena, Cliente, Turno, BusinessConfig, SelloHistorial } from '../types';
import { getTodayISODate } from '../utils/dateUtils';
import { isModoSandboxActivo } from './sandboxService';

export const RESENAS_COLLECTION = 'reseñas';

// Sample initial reviews for graceful fallback / demo seeds
const SAMPLE_RESENAS: Omit<Resena, 'id'>[] = [
  {
    clienteId: 'sample-cli-1',
    clienteNombre: 'Cafetería Dulce Grano',
    clienteTelefono: '+54 9 11 4522-8910',
    clienteEmail: 'contacto@dulcegrano.com',
    negocioId: 'perfect-glass',
    calificacion: 5,
    comentario: '¡Excelente atención y las vidrieras quedaron impecables! Totalmente recomendados.',
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    turnoId: 'sample-turno-1',
    derivadoAGoogle: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    clienteId: 'sample-cli-2',
    clienteNombre: 'Estudio Jurídico Alvear & Asoc.',
    clienteTelefono: '+54 9 11 6390-1122',
    clienteEmail: 'administracion@estudioalvear.com',
    negocioId: 'perfect-glass',
    calificacion: 5,
    comentario: 'Puntuales y muy prolijos. Se nota la experiencia en trabajos en altura.',
    fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    turnoId: 'sample-turno-2',
    derivadoAGoogle: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    clienteId: 'sample-cli-3',
    clienteNombre: 'Boutique Palermo Chic',
    clienteTelefono: '+54 9 11 3344-9988',
    clienteEmail: 'info@palermochic.com',
    negocioId: 'perfect-glass',
    calificacion: 4,
    comentario: 'Muy buen trabajo, quedaron muy transparentes y limpios.',
    fecha: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    turnoId: 'sample-turno-3',
    derivadoAGoogle: false, // Sin derivar a Google (oportunidad para contactar por WhatsApp)
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    clienteId: 'sample-cli-4',
    clienteNombre: 'Dr. Roberto Méndez (Consultorio)',
    clienteTelefono: '+54 9 11 7788-2211',
    clienteEmail: 'roberto.mendez@consultorio.com',
    negocioId: 'perfect-glass',
    calificacion: 3,
    comentario: 'Quedó una pequeña marca en el vidrio superior derecho del ventanal principal.',
    fecha: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    turnoId: 'sample-turno-4',
    derivadoAGoogle: false,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    clienteId: 'sample-cli-5',
    clienteNombre: 'Gimnasio Iron Fit',
    clienteTelefono: '+54 9 11 5566-4433',
    clienteEmail: 'contacto@ironfit.com',
    negocioId: 'perfect-glass',
    calificacion: 2,
    comentario: 'Llegaron unos 25 minutos después de lo acordado y tuvimos que esperarlos.',
    fecha: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    turnoId: 'sample-turno-5',
    derivadoAGoogle: false,
    createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Guarda una nueva reseña en la colección "reseñas" y actualiza la fecha de última reseña del cliente
 */
export async function guardarResena(datos: {
  clienteId: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  negocioId?: string;
  calificacion: number;
  comentario?: string;
  turnoId?: string | null;
  derivadoAGoogle?: boolean;
  esSandbox?: boolean;
}): Promise<string> {
  const calificacion = Math.min(5, Math.max(1, Math.round(Number(datos.calificacion) || 5)));
  const comentario = (datos.comentario || '').trim();

  // Validación: si calificacion <= 3, comentario es obligatorio
  if (calificacion <= 3 && !comentario) {
    throw new Error('Para calificaciones de 1 a 3, es obligatorio indicar qué podemos mejorar.');
  }

  // Detect sandbox mode
  const sandboxActivo = await isModoSandboxActivo();
  const esSandbox = datos.esSandbox !== undefined ? datos.esSandbox : sandboxActivo;

  const colRef = collection(db, RESENAS_COLLECTION);
  const nowIso = new Date().toISOString();

  const docData: Omit<Resena, 'id'> = {
    clienteId: datos.clienteId,
    clienteNombre: datos.clienteNombre || 'Cliente',
    clienteTelefono: datos.clienteTelefono || '',
    clienteEmail: datos.clienteEmail || '',
    negocioId: datos.negocioId || 'perfect-glass',
    calificacion,
    comentario,
    fecha: nowIso,
    turnoId: datos.turnoId || null,
    derivadoAGoogle: Boolean(datos.derivadoAGoogle),
    esSandbox: Boolean(esSandbox),
    createdAt: nowIso,
  };

  const docRef = await addDoc(colRef, docData);

  // Actualizar automáticamente "ultimaResenaEnviada" en la ficha del cliente en Firestore
  if (datos.clienteId && datos.clienteId !== 'nuevoCliente') {
    try {
      const clienteDocRef = doc(db, 'clientes', datos.clienteId);
      await updateDoc(clienteDocRef, {
        ultimaResenaEnviada: nowIso,
        ultimoPedidoResena: getTodayISODate(),
        updatedAt: nowIso,
      });
    } catch (err) {
      console.warn('No se pudo actualizar ultimaResenaEnviada en cliente:', err);
    }
  }

  return docRef.id;
}

/**
 * Actualiza el campo derivadoAGoogle a true cuando el cliente pulsa el botón de Google Maps
 */
export async function actualizarDerivadoAGoogle(resenaId: string, clienteId?: string): Promise<void> {
  if (!resenaId) return;

  try {
    const docRef = doc(db, RESENAS_COLLECTION, resenaId);
    await updateDoc(docRef, {
      derivadoAGoogle: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error al actualizar derivadoAGoogle en reseña:', err);
  }

  // Garantizar que la fecha de última reseña también quede fijada en el cliente
  if (clienteId && clienteId !== 'nuevoCliente') {
    try {
      const clienteDocRef = doc(db, 'clientes', clienteId);
      await updateDoc(clienteDocRef, {
        ultimaResenaEnviada: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error al sincronizar ultimaResenaEnviada tras derivación:', e);
    }
  }
}

/**
 * Suscripción en tiempo real a la colección "reseñas" del negocio
 */
export function subscribeToResenas(
  callback: (resenas: Resena[]) => void,
  negocioId: string = 'perfect-glass'
): () => void {
  const colRef = collection(db, RESENAS_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  let initialized = false;

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty && !initialized) {
        initialized = true;
        // Si la colección está vacía, sembrar reseñas iniciales para facilitar la prueba
        try {
          for (const item of SAMPLE_RESENAS) {
            await addDoc(colRef, { ...item, negocioId });
          }
        } catch (e) {
          console.warn('No se pudieron sembrar reseñas iniciales:', e);
        }
        return;
      }

      initialized = true;
      const all: Resena[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Resena, 'id'>),
      }));

      const list = all.filter(
        (r) =>
          !r.negocioId ||
          r.negocioId === negocioId ||
          (negocioId === 'perfect-glass' && !r.negocioId)
      );

      // Ordenar por fecha más reciente primero
      list.sort((a, b) => {
        const dateA = new Date(a.fecha || a.createdAt || 0).getTime();
        const dateB = new Date(b.fecha || b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      callback(list);
    },
    (error) => {
      console.error('Error al escuchar reseñas:', error);
      callback(
        SAMPLE_RESENAS.map((item, index) => ({
          id: `sample-${index}`,
          negocioId,
          ...item,
        }))
      );
    }
  );

  return unsubscribe;
}

/**
 * Obtiene la última reseña registrada de un cliente específico
 */
export async function obtenerUltimaResenaCliente(clienteId: string): Promise<Resena | null> {
  if (!clienteId) return null;

  try {
    const colRef = collection(db, RESENAS_COLLECTION);
    const q = query(
      colRef,
      where('clienteId', '==', clienteId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return {
        id: docData.id,
        ...(docData.data() as Omit<Resena, 'id'>),
      };
    }
  } catch (err) {
    console.warn('Error al buscar reseña de cliente:', err);
  }

  return null;
}

/**
 * Valida si un cliente puede dejar una reseña según las reglas de negocio:
 * 1. El cliente tiene al menos una visita con estado "completado" en su historial.
 * 2. Su ultimaResenaEnviada es null o fue hace más de 90 días.
 */
export function puedeClienteDejarResena(
  cliente: Cliente | null | undefined,
  sellosHistorial?: SelloHistorial[]
): { puede: boolean; razon?: string; diasRestantes?: number } {
  if (!cliente) {
    return { puede: false, razon: 'Cliente no identificado.' };
  }

  // 1. Debe tener al menos una visita completada
  const tieneVisitaCompletada = Boolean(
    cliente.fechaUltimaVisita ||
    (cliente.historialVisitas && cliente.historialVisitas.length > 0) ||
    (sellosHistorial && sellosHistorial.length > 0) ||
    (cliente.sellosAcumulados && cliente.sellosAcumulados > 0)
  );

  if (!tieneVisitaCompletada) {
    return {
      puede: false,
      razon: 'Aún no tienes visitas completadas registradas en tu cuenta.',
    };
  }

  // 2. Control de 90 días desde la última reseña enviada
  const fechaResenaStr = cliente.ultimaResenaEnviada || cliente.ultimoPedidoResena;
  if (fechaResenaStr) {
    const fechaResena = new Date(fechaResenaStr).getTime();
    const hoy = new Date().getTime();
    const diffMs = hoy - fechaResena;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 90) {
      const diasRestantes = 90 - diffDias;
      return {
        puede: false,
        razon: `Ya enviaste tu opinión recientemente (hace ${diffDias} día${diffDias === 1 ? '' : 's'}). Podrás dejar una nueva reseña en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}.`,
        diasRestantes,
      };
    }
  }

  return { puede: true };
}

/**
 * Verifica si un cliente es elegible para recibir un pedido automático de reseña
 */
export function verificarElegibilidadResena(
  cliente: Cliente,
  config: BusinessConfig
): { eligible: boolean; razon?: string; diasPasados?: number; diasMinimos: number } {
  const diasMinimos = config.diasMinimosEntreResenas || 90;
  const autoHabilitado = config.solicitarResenasAuto !== false;

  if (!autoHabilitado) {
    return {
      eligible: false,
      razon: 'El envío automático de solicitudes de reseña está desactivado en Configuración.',
      diasMinimos,
    };
  }

  const fechaReferencia = cliente.ultimaResenaEnviada || cliente.ultimoPedidoResena;
  if (fechaReferencia) {
    const ultimoDate = new Date(fechaReferencia).getTime();
    const hoyDate = new Date().getTime();
    const diffMs = hoyDate - ultimoDate;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < diasMinimos) {
      return {
        eligible: false,
        razon: `Ya se le solicitó o envió reseña hace ${diffDias} día${diffDias === 1 ? '' : 's'} (límite: ${diasMinimos} días).`,
        diasPasados: diffDias,
        diasMinimos,
      };
    }

    return { eligible: true, diasPasados: diffDias, diasMinimos };
  }

  return { eligible: true, diasMinimos };
}

export interface ResenasStats {
  total: number;
  promedio: number;
  total1a3: number;
  total4a5: number;
  derivadosGoogle: number;
  porcentajeDerivadosGoogle: number; // Porcentaje de los 4-5 que fueron derivados a Google
  sinDerivarGoogle: Resena[]; // Reseñas de 4-5 estrellas que aún no han hecho clic en Google Maps
  distribucion: { [rating: number]: number };
  criticos: Resena[]; // Reseñas de 1-3 estrellas
}

/**
 * Calcula estadísticas completas para el panel de Reseñas y Reportes
 * Las reseñas de modo Sandbox (esSandbox: true) se filtran por defecto para no afectar el promedio real.
 */
export function calcularEstadisticasResenas(
  resenas: Resena[],
  incluirSandbox: boolean = false
): ResenasStats {
  const dataset = incluirSandbox ? resenas : resenas.filter((r) => !r.esSandbox);
  const total = dataset.length;

  if (total === 0) {
    return {
      total: 0,
      promedio: 0,
      total1a3: 0,
      total4a5: 0,
      derivadosGoogle: 0,
      porcentajeDerivadosGoogle: 0,
      sinDerivarGoogle: [],
      distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      criticos: [],
    };
  }

  let suma = 0;
  let total1a3 = 0;
  let total4a5 = 0;
  let derivadosGoogle = 0;
  const sinDerivarGoogle: Resena[] = [];
  const criticos: Resena[] = [];
  const distribucion: { [rating: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const r of dataset) {
    const star = Math.min(5, Math.max(1, Math.round(r.calificacion || 5)));
    suma += star;
    distribucion[star] = (distribucion[star] || 0) + 1;

    if (star >= 4) {
      total4a5++;
      if (r.derivadoAGoogle) {
        derivadosGoogle++;
      } else {
        sinDerivarGoogle.push(r);
      }
    } else {
      total1a3++;
      criticos.push(r);
    }
  }

  const promedio = Number((suma / total).toFixed(1));
  const porcentajeDerivadosGoogle =
    total4a5 > 0 ? Math.round((derivadosGoogle / total4a5) * 100) : 0;

  return {
    total,
    promedio,
    total1a3,
    total4a5,
    derivadosGoogle,
    porcentajeDerivadosGoogle,
    sinDerivarGoogle,
    distribucion,
    criticos,
  };
}
