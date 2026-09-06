import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Usuario, EstadoUsuario, UserRole } from '../types';
import { DEFAULT_SUPERADMIN_EMAIL, isEmailSuperAdmin } from './negociosService';

export const USUARIOS_COLLECTION = 'usuarios';

/**
 * Obtiene el documento de usuario desde la colección usuarios/{uid}
 */
export async function obtenerUsuario(uid: string): Promise<Usuario | null> {
  try {
    const userDocRef = doc(db, USUARIOS_COLLECTION, uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as Usuario;
    }
    return null;
  } catch (error) {
    console.warn('Error al obtener usuario desde Firestore:', error);
    return null;
  }
}

/**
 * Crea o actualiza el documento de usuario en usuarios/{uid}
 */
export async function guardarUsuario(usuario: Usuario): Promise<void> {
  const userDocRef = doc(db, USUARIOS_COLLECTION, usuario.uid);
  await setDoc(
    userDocRef,
    {
      ...usuario,
      actualizadoEn: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Actualiza el estado de un usuario ('activo' | 'pendiente' | 'suspendido')
 */
export async function actualizarEstadoUsuario(uid: string, estado: EstadoUsuario): Promise<void> {
  const userDocRef = doc(db, USUARIOS_COLLECTION, uid);
  await updateDoc(userDocRef, {
    estado,
    actualizadoEn: new Date().toISOString(),
  });
}

/**
 * Actualiza el rol o negocioId de un usuario
 */
export async function actualizarRolUsuario(
  uid: string,
  rol: UserRole,
  negocioId: string | null = null
): Promise<void> {
  const userDocRef = doc(db, USUARIOS_COLLECTION, uid);
  await updateDoc(userDocRef, {
    rol,
    negocioId,
    actualizadoEn: new Date().toISOString(),
  });
}

/**
 * Sincroniza y asegura la existencia del documento usuarios/{uid} en el login.
 * Si no existe, determina el rol de forma segura y crea el registro.
 */
export async function sincronizarUsuarioSesion(
  uid: string,
  email: string | null
): Promise<Usuario> {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Check if user already exists
  const existing = await obtenerUsuario(uid);
  if (existing) {
    // If it is the hardcoded superadmin email, always guarantee superadmin role
    if (cleanEmail === DEFAULT_SUPERADMIN_EMAIL.toLowerCase() && existing.rol !== 'superadmin') {
      const updatedUser: Usuario = {
        ...existing,
        rol: 'superadmin',
        negocioId: null,
        estado: 'activo',
        actualizadoEn: new Date().toISOString(),
      };
      await guardarUsuario(updatedUser);
      return updatedUser;
    }
    return existing;
  }

  // 2. New user detected - determine role
  let rol: UserRole = 'cliente';
  let negocioId: string | null = null;
  let estado: EstadoUsuario = 'activo';

  // Check if superadmin
  const isSuper = await isEmailSuperAdmin(cleanEmail);
  if (isSuper) {
    rol = 'superadmin';
    negocioId = null;
    estado = 'activo';
  } else {
    // Check if user is a business owner (admin) in negocios
    try {
      const negociosRef = collection(db, 'negocios');
      const qAdmin = query(negociosRef, where('emailAdministrador', '==', cleanEmail));
      const adminSnap = await getDocs(qAdmin);
      if (!adminSnap.empty) {
        rol = 'admin';
        negocioId = adminSnap.docs[0].id;
        estado = 'activo';
      } else if (cleanEmail === 'admin@perfectglass.com') {
        rol = 'admin';
        negocioId = 'perfect-glass';
        estado = 'activo';
      } else {
        // Check if user is registered in clientes
        const clientesRef = collection(db, 'clientes');
        const qCli = query(clientesRef, where('emailRegistro', '==', cleanEmail));
        const cliSnap = await getDocs(qCli);
        if (!cliSnap.empty) {
          const cliDoc = cliSnap.docs[0].data();
          rol = 'cliente';
          negocioId = cliDoc.negocioId || 'perfect-glass';
          estado = cliDoc.estadoRegistro === 'aprobado' ? 'activo' : 'pendiente';
        } else {
          // Default fallback for general logins
          rol = 'cliente';
          negocioId = 'perfect-glass';
          estado = 'pendiente';
        }
      }
    } catch (e) {
      console.warn('Error determinando rol de usuario inicial:', e);
      if (cleanEmail === 'admin@perfectglass.com') {
        rol = 'admin';
        negocioId = 'perfect-glass';
      }
    }
  }

  const defaultNombre = cleanEmail.split('@')[0] || 'Usuario';
  const nuevoUsuario: Usuario = {
    uid,
    email: cleanEmail,
    rol,
    negocioId,
    estado,
    creadoEn: new Date().toISOString(),
    nombre: defaultNombre,
    telefono: '',
  };

  await guardarUsuario(nuevoUsuario);
  return nuevoUsuario;
}

/**
 * Escucha cambios en tiempo real del documento del usuario autenticado
 */
export function subscribeToUsuario(
  uid: string,
  callback: (usuario: Usuario | null) => void
): () => void {
  const userDocRef = doc(db, USUARIOS_COLLECTION, uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Usuario);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Error en suscripción de usuario:', err);
      callback(null);
    }
  );
}
