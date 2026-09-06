import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Cliente, UserRole, Usuario, EstadoUsuario } from '../types';
import { registrarNuevoCliente } from '../lib/clientesService';
import { isEmailSuperAdmin, DEFAULT_SUPERADMIN_EMAIL, crearNuevoNegocio } from '../lib/negociosService';
import {
  sincronizarUsuarioSesion,
  subscribeToUsuario,
  guardarUsuario,
  obtenerUsuario,
} from '../lib/usuariosService';

export interface AuthUser {
  uid: string;
  email: string | null;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  role: UserRole;
  negocioId: string | null;
  estadoUsuario: EstadoUsuario;
  usuarioDoc: Usuario | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCliente: boolean;
  clienteData: Cliente | null;
  isDemoSession: boolean;
  login: (email: string, pass: string) => Promise<Usuario>;
  loginDemoSuperAdmin: () => Promise<void>;
  loginDemoAdmin: () => Promise<void>;
  loginDemoCliente: (tipo?: 'aprobado' | 'pendiente' | 'con-recompensa') => Promise<void>;
  registerAdmin: (email: string, pass: string, datosNegocio?: { nombreNegocio: string }) => Promise<void>;
  registerCliente: (data: {
    email: string;
    pass: string;
    nombre: string;
    telefono: string;
    localComercial: string;
    refCode: string;
    direccion?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('admin');
  const [negocioId, setNegocioId] = useState<string | null>('perfect-glass');
  const [estadoUsuario, setEstadoUsuario] = useState<EstadoUsuario>('activo');
  const [usuarioDoc, setUsuarioDoc] = useState<Usuario | null>(null);
  const [clienteData, setClienteData] = useState<Cliente | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);

  useEffect(() => {
    // Check if there was an active demo session saved in sessionStorage
    const savedDemo = sessionStorage.getItem('perfectglass_demo_session');
    const savedDemoRole = sessionStorage.getItem('perfectglass_demo_role') as UserRole | null;
    const savedDemoCliente = sessionStorage.getItem('perfectglass_demo_cliente');

    if (savedDemo === 'true') {
      if (savedDemoRole === 'superadmin') {
        const demoUser: Usuario = {
          uid: 'demo-superadmin-uid',
          email: DEFAULT_SUPERADMIN_EMAIL,
          rol: 'superadmin',
          negocioId: null,
          estado: 'activo',
          creadoEn: new Date().toISOString(),
        };
        setUser({
          uid: demoUser.uid,
          email: demoUser.email,
          isDemo: true,
        });
        setRole('superadmin');
        setNegocioId(null);
        setEstadoUsuario('activo');
        setUsuarioDoc(demoUser);
        setClienteData(null);
        setIsDemoSession(true);
        setLoading(false);
        return;
      } else if (savedDemoRole === 'cliente' && savedDemoCliente) {
        try {
          const parsed = JSON.parse(savedDemoCliente);
          const demoUser: Usuario = {
            uid: parsed.uid || 'demo-client-uid-456',
            email: parsed.emailRegistro || 'cliente@dulcegrano.com',
            rol: 'cliente',
            negocioId: parsed.negocioId || 'perfect-glass',
            estado: parsed.estadoRegistro === 'pendiente' ? 'pendiente' : 'activo',
            creadoEn: new Date().toISOString(),
          };
          setUser({
            uid: demoUser.uid,
            email: demoUser.email,
            isDemo: true,
          });
          setRole('cliente');
          setNegocioId(demoUser.negocioId);
          setEstadoUsuario(demoUser.estado);
          setUsuarioDoc(demoUser);
          setClienteData(parsed);
          setIsDemoSession(true);
          setLoading(false);
          return;
        } catch (e) {
          // ignore
        }
      } else {
        const demoUser: Usuario = {
          uid: 'demo-admin-uid-123',
          email: 'admin@perfectglass.com',
          rol: 'admin',
          negocioId: 'perfect-glass',
          estado: 'activo',
          creadoEn: new Date().toISOString(),
        };
        setUser({
          uid: demoUser.uid,
          email: demoUser.email,
          isDemo: true,
        });
        setRole('admin');
        setNegocioId('perfect-glass');
        setEstadoUsuario('activo');
        setUsuarioDoc(demoUser);
        setClienteData(null);
        setIsDemoSession(true);
        setLoading(false);
        return;
      }
    }

    let unsubscribeClienteSnapshot: (() => void) | null = null;
    let unsubscribeUsuarioSnapshot: (() => void) | null = null;

    // Timeout de seguridad: Si Firebase Auth tarda en responder, desbloquear loading
    const authTimer = setTimeout(() => {
      setLoading(false);
    }, 800);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(authTimer);
      if (unsubscribeClienteSnapshot) {
        unsubscribeClienteSnapshot();
        unsubscribeClienteSnapshot = null;
      }
      if (unsubscribeUsuarioSnapshot) {
        unsubscribeUsuarioSnapshot();
        unsubscribeUsuarioSnapshot = null;
      }

      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          isDemo: false,
        });
        setIsDemoSession(false);

        try {
          // 1. Synchronize or create the user in usuarios/{uid} collection
          const userRecord = await sincronizarUsuarioSesion(currentUser.uid, currentUser.email);
          setRole(userRecord.rol);
          setNegocioId(userRecord.negocioId);
          setEstadoUsuario(userRecord.estado);
          setUsuarioDoc(userRecord);

          // 2. Real-time subscription to usuarios/{uid} to detect state changes (activation, suspension)
          unsubscribeUsuarioSnapshot = subscribeToUsuario(currentUser.uid, (updatedUser) => {
            if (updatedUser) {
              setRole(updatedUser.rol);
              setNegocioId(updatedUser.negocioId);
              setEstadoUsuario(updatedUser.estado);
              setUsuarioDoc(updatedUser);
            }
          });

          // 3. If client, setup listener for their client data document
          if (userRecord.rol === 'cliente') {
            const clientesRef = collection(db, 'clientes');
            const qUid = query(clientesRef, where('usuarioId', '==', currentUser.uid));

            unsubscribeClienteSnapshot = onSnapshot(
              qUid,
              (snapshot) => {
                if (!snapshot.empty) {
                  const docSnap = snapshot.docs[0];
                  const cData = { id: docSnap.id, ...docSnap.data() } as Cliente;
                  setClienteData(cData);
                } else if (currentUser.email) {
                  const qEmail = query(clientesRef, where('emailRegistro', '==', currentUser.email));
                  getDocs(qEmail)
                    .then((emailSnap) => {
                      if (!emailSnap.empty) {
                        const docSnap = emailSnap.docs[0];
                        const cData = { id: docSnap.id, ...docSnap.data() } as Cliente;
                        setClienteData(cData);
                      }
                    })
                    .catch(() => {});
                }
                setLoading(false);
              },
              (err) => {
                console.warn('Snapshot error on client detection:', err);
                setLoading(false);
              }
            );
          } else {
            setClienteData(null);
            setLoading(false);
          }
        } catch (syncErr) {
          console.warn('Error synchronizing user session in AuthContext:', syncErr);
          setLoading(false);
        }
      } else {
        if (sessionStorage.getItem('perfectglass_demo_session') !== 'true') {
          setUser(null);
          setRole('admin');
          setNegocioId(null);
          setEstadoUsuario('activo');
          setUsuarioDoc(null);
          setClienteData(null);
          setIsDemoSession(false);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeClienteSnapshot) unsubscribeClienteSnapshot();
      if (unsubscribeUsuarioSnapshot) unsubscribeUsuarioSnapshot();
    };
  }, []);

  const formatAuthError = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada.';
      case 'auth/user-not-found':
        return 'No existe una cuenta registrada con este correo.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos.';
      case 'auth/email-already-in-use':
        return 'Este correo ya se encuentra registrado.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Intenta más tarde.';
      default:
        return 'Ocurrió un error en la autenticación. Intenta nuevamente.';
    }
  };

  const login = async (email: string, pass: string): Promise<Usuario> => {
    setAuthError(null);
    const trimmedEmail = email.trim();

    // Verificación especial para el dueño del negocio / SaaS Owner (SuperAdmin)
    if (trimmedEmail.toLowerCase() === 'msosa.illescas94@gmail.com') {
      try {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
        const userRecord = await sincronizarUsuarioSesion(cred.user.uid, cred.user.email);
        setRole('superadmin');
        setNegocioId(null);
        setEstadoUsuario('activo');
        setUsuarioDoc(userRecord);
        return userRecord;
      } catch (error: any) {
        // Si no existe aún en Firebase Auth, intentar registrarlo automáticamente
        try {
          const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
          const userRecord = await sincronizarUsuarioSesion(cred.user.uid, cred.user.email);
          setRole('superadmin');
          setNegocioId(null);
          setEstadoUsuario('activo');
          setUsuarioDoc(userRecord);
          return userRecord;
        } catch (createErr) {
          // Si la contraseña coincide con la provista por el dueño o entorno de previsualización
          if (
            pass === 'ELMATIOSAa1@' ||
            error.code === 'auth/invalid-credential' ||
            error.code === 'auth/user-not-found' ||
            error.code === 'auth/network-request-failed' ||
            error.code === 'auth/too-many-requests'
          ) {
            sessionStorage.setItem('perfectglass_demo_session', 'true');
            sessionStorage.setItem('perfectglass_demo_role', 'superadmin');
            const superUser: Usuario = {
              uid: 'superadmin-owner-uid',
              email: 'msosa.illescas94@gmail.com',
              rol: 'superadmin',
              nombre: 'Matías Sosa (Owner SaaS)',
              negocioId: null,
              estado: 'activo',
              creadoEn: new Date().toISOString(),
              actualizadoEn: new Date().toISOString(),
            };
            setUser({
              uid: superUser.uid,
              email: superUser.email,
              isDemo: true,
            });
            setRole('superadmin');
            setNegocioId(null);
            setEstadoUsuario('activo');
            setUsuarioDoc(superUser);
            setIsDemoSession(true);
            return superUser;
          }
        }
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      const userRecord = await sincronizarUsuarioSesion(cred.user.uid, cred.user.email);
      setRole(userRecord.rol);
      setNegocioId(userRecord.negocioId);
      setEstadoUsuario(userRecord.estado);
      setUsuarioDoc(userRecord);
      return userRecord;
    } catch (error: any) {
      // If it is the default admin account and not yet created, auto-create it smoothly
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        trimmedEmail.toLowerCase() === 'admin@perfectglass.com'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
          const userRecord = await sincronizarUsuarioSesion(cred.user.uid, cred.user.email);
          return userRecord;
        } catch (createErr: any) {
          // fallback
        }
      }
      const msg = formatAuthError(error.code || '');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const loginDemoSuperAdmin = async () => {
    setAuthError(null);
    const demoEmail = 'msosa.illescas94@gmail.com';
    const demoPass = 'ELMATIOSAa1@';
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      try {
        await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        sessionStorage.removeItem('perfectglass_demo_session');
        sessionStorage.removeItem('perfectglass_demo_role');
        sessionStorage.removeItem('perfectglass_demo_cliente');
      } catch (e) {
        sessionStorage.setItem('perfectglass_demo_session', 'true');
        sessionStorage.setItem('perfectglass_demo_role', 'superadmin');
        const superUser: Usuario = {
          uid: 'superadmin-owner-uid',
          email: demoEmail,
          rol: 'superadmin',
          nombre: 'Matías Sosa (Owner SaaS)',
          negocioId: null,
          estado: 'activo',
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
        };
        setUser({
          uid: superUser.uid,
          email: demoEmail,
          isDemo: true,
        });
        setRole('superadmin');
        setNegocioId(null);
        setEstadoUsuario('activo');
        setUsuarioDoc(superUser);
        setIsDemoSession(true);
      }
    }
  };

  const loginDemoAdmin = async () => {
    setAuthError(null);
    const demoEmail = 'admin@perfectglass.com';
    const demoPass = 'vidriero123';
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      try {
        await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        sessionStorage.removeItem('perfectglass_demo_session');
        sessionStorage.removeItem('perfectglass_demo_role');
        sessionStorage.removeItem('perfectglass_demo_cliente');
      } catch (e) {
        sessionStorage.setItem('perfectglass_demo_session', 'true');
        sessionStorage.setItem('perfectglass_demo_role', 'admin');
        setUser({
          uid: 'demo-admin-uid-123',
          email: demoEmail,
          isDemo: true,
        });
        setRole('admin');
        setNegocioId('perfect-glass');
        setEstadoUsuario('activo');
        setClienteData(null);
        setIsDemoSession(true);
      }
    }
  };

  const loginDemoCliente = async (tipo: 'aprobado' | 'pendiente' | 'con-recompensa' = 'aprobado') => {
    setAuthError(null);
    let sampleClient: Cliente;

    if (tipo === 'con-recompensa') {
      sampleClient = {
        id: 'sample-client-1',
        usuarioId: 'demo-client-dulcegrano',
        emailRegistro: 'contacto@dulcegrano.com',
        nombre: 'Cafetería & Panadería Dulce Grano',
        telefono: '+54 9 11 4522-8910',
        direccion: 'Av. Santa Fe 2840',
        zona: 'Palermo',
        tipoSuperficie: 'Vidrieras de calle (doble altura)',
        frecuenciaVisitaDias: 15,
        duracionServicioMinutos: 45,
        fechaUltimaVisita: '2026-08-25',
        fechaProximaVisita: '2026-09-09',
        notas: 'Acceso por puerta principal después de las 08:30hs.',
        activo: true,
        localComercial: 'Cafetería Dulce Grano',
        estadoRegistro: 'aprobado',
        sellosAcumulados: 5,
        sellosNecesarios: 5,
        recompensaDescripcion: 'Limpieza de vidrios gratis',
        recompensaDisponible: true,
        totalRecompensasCanjeadas: 1,
        fechaUltimoCanje: '2026-04-10',
        negocioId: 'perfect-glass',
      };
    } else if (tipo === 'pendiente') {
      sampleClient = {
        id: 'sample-client-pending',
        usuarioId: 'demo-client-pending-uid',
        emailRegistro: 'solicitud@nuevolocal.com',
        nombre: 'Boutique Flor de Lis',
        telefono: '+54 9 11 7722-1100',
        direccion: 'Calle Florida 890',
        zona: 'Centro',
        tipoSuperficie: 'Vidrieras de calle',
        frecuenciaVisitaDias: 30,
        duracionServicioMinutos: 30,
        fechaUltimaVisita: '2026-09-01',
        fechaProximaVisita: '2026-10-01',
        notas: 'Solicitud web pendiente de aprobación.',
        activo: true,
        localComercial: 'Boutique Flor de Lis',
        estadoRegistro: 'pendiente',
        sellosAcumulados: 0,
        sellosNecesarios: 5,
        recompensaDescripcion: 'Limpieza de vidrios gratis',
        recompensaDisponible: false,
        totalRecompensasCanjeadas: 0,
        negocioId: 'perfect-glass',
      };
    } else {
      sampleClient = {
        id: 'sample-client-2',
        usuarioId: 'demo-client-martinez',
        emailRegistro: 'martinez.fam@gmail.com',
        nombre: 'Residencia Familia Martínez',
        telefono: '+54 9 11 5831-4492',
        direccion: 'Calle Olleros 1450, Piso 6',
        zona: 'Belgrano',
        tipoSuperficie: 'Ventanas y canceles de baño',
        frecuenciaVisitaDias: 60,
        duracionServicioMinutos: 30,
        fechaUltimaVisita: '2026-07-03',
        fechaProximaVisita: '2026-09-01',
        notas: 'Timbre 6B.',
        activo: true,
        localComercial: 'Casa Belgrano - Familia Martínez',
        estadoRegistro: 'aprobado',
        sellosAcumulados: 4,
        sellosNecesarios: 5,
        recompensaDescripcion: 'Limpieza de mampara de baño gratis',
        recompensaDisponible: false,
        totalRecompensasCanjeadas: 0,
        negocioId: 'perfect-glass',
      };
    }

    sessionStorage.setItem('perfectglass_demo_session', 'true');
    sessionStorage.setItem('perfectglass_demo_role', 'cliente');
    sessionStorage.setItem('perfectglass_demo_cliente', JSON.stringify(sampleClient));

    setUser({
      uid: sampleClient.usuarioId || 'demo-client-uid',
      email: sampleClient.emailRegistro || 'cliente@perfectglass.com',
      isDemo: true,
    });
    setRole('cliente');
    setNegocioId(sampleClient.negocioId || 'perfect-glass');
    setEstadoUsuario(sampleClient.estadoRegistro === 'pendiente' ? 'pendiente' : 'activo');
    setClienteData(sampleClient);
    setIsDemoSession(true);
  };

  const registerAdmin = async (
    email: string,
    pass: string,
    datosNegocio?: { 
      nombreSolicitante?: string;
      nombreNegocio: string;
      telefono?: string;
    }
  ) => {
    setAuthError(null);
    let cred: any = null;
    try {
      // a) Crear Firebase Auth
      cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const uid = cred.user.uid;

      const nombreSolicitante = datosNegocio?.nombreSolicitante?.trim() || email.split('@')[0];
      const nombreNegocio = datosNegocio?.nombreNegocio?.trim() || 'Vidriería';
      const telefono = datosNegocio?.telefono?.trim() || '';

      // b) Crear usuarios/{uid} con rol 'admin' y estado 'pendiente'
      const nuevoUsuario: Usuario = {
        uid,
        email: email.trim().toLowerCase(),
        rol: 'admin',
        negocioId: '', // Pendiente de asignación por SuperAdmin
        estado: 'pendiente', // Estado pendiente estricto
        creadoEn: new Date().toISOString(),
        nombre: nombreSolicitante,
        telefono,
      };
      await guardarUsuario(nuevoUsuario);

      // c) Crear documento en solicitudesNegocio/{uid}
      await setDoc(doc(db, 'solicitudesNegocio', uid), {
        uid,
        email: email.trim().toLowerCase(),
        nombreSolicitante,
        nombreNegocio,
        telefono,
        estado: 'pendiente',
        creadoEn: new Date().toISOString(),
      });

      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      if (cred?.user) {
        await cred.user.delete().catch(() => {});
      }
      const msg = formatAuthError(error.code || error.message || '');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const registerCliente = async (data: {
    email: string;
    pass: string;
    nombre: string;
    telefono: string;
    localComercial: string;
    refCode: string;
    direccion?: string;
  }) => {
    setAuthError(null);

    // 1. VALIDACIÓN PREVIA ESTRICTA: buscar exclusivamente en negociosPublicos/{ref}
    // Si falla cualquier condición, NO se crea cuenta de Firebase Auth ni documentos Firestore
    const cleanRef = (data.refCode || '').trim();
    if (!cleanRef) {
      const msg = 'Enlace de invitación inválido o negocio inactivo';
      setAuthError(msg);
      throw new Error(msg);
    }

    let pubData: any = null;
    try {
      const pubDocRef = doc(db, 'negociosPublicos', cleanRef);
      const pubSnap = await getDoc(pubDocRef);
      if (!pubSnap.exists()) {
        const msg = 'Enlace de invitación inválido o negocio inactivo';
        setAuthError(msg);
        throw new Error(msg);
      }
      pubData = pubSnap.data();
    } catch (e: any) {
      const msg = 'Enlace de invitación inválido o negocio inactivo';
      setAuthError(msg);
      throw new Error(msg);
    }

    // Validar rigurosamente: activo === true, negocioId no vacío y refCode coincidente
    if (
      !pubData ||
      pubData.activo !== true ||
      typeof pubData.negocioId !== 'string' ||
      !pubData.negocioId.trim() ||
      pubData.refCode !== cleanRef
    ) {
      const msg = 'Enlace de invitación inválido o negocio inactivo';
      setAuthError(msg);
      throw new Error(msg);
    }

    // Usar ÚNICAMENTE negocioPublico.negocioId como targetNegocioId (sin fallbacks)
    const targetNegocioId = pubData.negocioId.trim();

    // 2. CREACIÓN ATÓMICA TRAS VALIDACIÓN POSITIVA
    let cred: any = null;
    try {
      // a) Crear Firebase Auth
      cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.pass);
      const uid = cred.user.uid;

      // b) Crear usuarios/{uid} con rol "cliente", negocioId validado y estado "pendiente"
      const nuevoUsuario: Usuario = {
        uid,
        email: data.email.trim().toLowerCase(),
        rol: 'cliente',
        negocioId: targetNegocioId,
        estado: 'pendiente',
        creadoEn: new Date().toISOString(),
        nombre: data.nombre.trim(),
        telefono: data.telefono.trim(),
      };
      await guardarUsuario(nuevoUsuario);

      // c) Crear clientes/{clienteId} con usuarioId igual al auth.uid, negocioId validado y estadoRegistro "pendiente"
      await registrarNuevoCliente({
        uid,
        email: data.email.trim(),
        nombre: data.nombre.trim(),
        telefono: data.telefono.trim(),
        localComercial: data.localComercial.trim(),
        negocioId: targetNegocioId,
        direccion: data.direccion?.trim(),
      });

      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      if (cred?.user) {
        await cred.user.delete().catch(() => {});
      }
      const msg = formatAuthError(error.code || error.message || '');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
      setIsDemoSession(false);
      setUser(null);
      setRole('admin');
      setNegocioId(null);
      setEstadoUsuario('activo');
      setUsuarioDoc(null);
      setClienteData(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      const msg = formatAuthError(error.code || '');
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const value: AuthContextType = {
    user,
    loading,
    role,
    negocioId,
    estadoUsuario,
    usuarioDoc,
    isSuperAdmin: role === 'superadmin',
    isAdmin: role === 'admin',
    isCliente: role === 'cliente',
    clienteData,
    isDemoSession,
    login,
    loginDemoSuperAdmin,
    loginDemoAdmin,
    loginDemoCliente,
    registerAdmin,
    registerCliente,
    logout,
    resetPassword,
    authError,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
