import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Resena, Cliente, Turno } from '../types';
import {
  RESENAS_COLLECTION,
  guardarResena,
  actualizarDerivadoAGoogle,
  subscribeToResenas,
  obtenerUltimaResenaCliente,
  puedeClienteDejarResena,
  verificarElegibilidadResena,
  calcularEstadisticasResenas,
  ResenasStats,
} from './resenasService';

export {
  RESENAS_COLLECTION,
  guardarResena,
  actualizarDerivadoAGoogle,
  subscribeToResenas,
  obtenerUltimaResenaCliente,
  puedeClienteDejarResena,
  verificarElegibilidadResena,
  calcularEstadisticasResenas,
};

export type { ResenasStats };

export const FEEDBACK_COLLECTION = RESENAS_COLLECTION;

/**
 * Guarda feedback delegando a guardarResena
 */
export async function guardarFeedbackInterno(
  data: {
    clienteId?: string;
    clienteNombre?: string;
    clienteTelefono?: string;
    clienteEmail?: string;
    negocioId?: string;
    calificacion: number;
    comentario?: string;
    turnoId?: string | null;
    derivadoAGoogle?: boolean;
    fecha?: string;
  },
  negocioId: string = 'perfect-glass'
): Promise<string> {
  return guardarResena({
    clienteId: data.clienteId || 'nuevoCliente',
    clienteNombre: data.clienteNombre,
    clienteTelefono: data.clienteTelefono,
    clienteEmail: data.clienteEmail,
    negocioId: data.negocioId || negocioId,
    calificacion: data.calificacion,
    comentario: data.comentario,
    turnoId: data.turnoId,
    derivadoAGoogle: data.derivadoAGoogle,
  });
}

/**
 * Suscripción delegada a la colección "reseñas"
 */
export function subscribeToFeedbackInterno(
  callback: (feedbackList: Resena[]) => void,
  negocioId: string = 'perfect-glass'
): () => void {
  return subscribeToResenas(callback, negocioId);
}

/**
 * Intenta buscar la información del cliente o turno para auto-completar datos en la pantalla de opinión
 */
export async function fetchFeedbackTargetInfo(identifier: string): Promise<{
  clienteId?: string;
  turnoId?: string;
  nombre?: string;
  telefono?: string;
  email?: string;
} | null> {
  if (!identifier) return null;

  try {
    // 1. Intentar como Turno
    const turnoDocRef = doc(db, 'turnos', identifier);
    const turnoSnap = await getDoc(turnoDocRef);
    if (turnoSnap.exists()) {
      const turnoData = turnoSnap.data() as Turno;
      return {
        turnoId: turnoSnap.id,
        clienteId: turnoData.clienteId !== 'nuevoCliente' ? turnoData.clienteId : undefined,
        nombre: turnoData.nombreCliente,
        telefono: turnoData.telefonoCliente,
        email: turnoData.emailCliente,
      };
    }

    // 2. Intentar como Cliente
    const clienteDocRef = doc(db, 'clientes', identifier);
    const clienteSnap = await getDoc(clienteDocRef);
    if (clienteSnap.exists()) {
      const clienteData = clienteSnap.data() as Cliente;
      return {
        clienteId: clienteSnap.id,
        nombre: clienteData.nombre || clienteData.localComercial,
        telefono: clienteData.telefono,
        email: clienteData.emailRegistro || undefined,
      };
    }
  } catch (err) {
    console.warn('Error al obtener info de feedback:', err);
  }

  return null;
}

export interface FeedbackStats {
  totalRespuestas: number;
  promedioCalificacion: number;
  derivadosGoogle: number; // 4 o 5
  porcentajeDerivadosGoogle: number;
  feedbackInternoMejora: number; // 1, 2 o 3
  porcentajeFeedbackMejora: number;
  conComentarios: number;
  distribucion: { [rating: number]: number };
  criticos: Resena[]; // 1, 2, 3
}

export function calcularEstadisticasFeedback(feedbackList: Resena[]): FeedbackStats {
  const stats = calcularEstadisticasResenas(feedbackList);
  const conComentarios = feedbackList.filter(
    (f) => f.comentario && f.comentario.trim().length > 0
  ).length;

  return {
    totalRespuestas: stats.total,
    promedioCalificacion: stats.promedio,
    derivadosGoogle: stats.derivadosGoogle,
    porcentajeDerivadosGoogle: stats.porcentajeDerivadosGoogle,
    feedbackInternoMejora: stats.total1a3,
    porcentajeFeedbackMejora:
      stats.total > 0 ? Math.round((stats.total1a3 / stats.total) * 100) : 0,
    conComentarios,
    distribucion: stats.distribucion,
    criticos: stats.criticos,
  };
}
