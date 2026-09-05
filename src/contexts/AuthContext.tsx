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
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Cliente, UserRole } from '../types';
import { registrarNuevoCliente } from '../lib/clientesService';
import { isEmailSuperAdmin, DEFAULT_SUPERADMIN_EMAIL } from '../lib/negociosService';

export interface AuthUser {
  uid: string;
  email: string | null;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCliente: boolean;
  clienteData: Cliente | null;
  isDemoSession: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginDemoSuperAdmin: () => Promise<void>;
  loginDemoAdmin: () => Promise<void>;
  loginDemoCliente: (tipo?: 'aprobado' | 'pendiente' | 'con-recompensa') => Promise<void>;
  registerAdmin: (email: string, pass: string) => Promise<void>;
  registerCliente: (data: {
    email: string;
    pass: string;
    nombre: string;
    telefono: string;
    localComercial: string;
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
        setUser({
          uid: 'demo-superadmin-uid',
          email: DEFAULT_SUPERADMIN_EMAIL,
          isDemo: true,
        });
        setRole('superadmin');
        setClienteData(null);
        setIsDemoSession(true);
        setLoading(false);
        return;
      } else if (savedDemoRole === 'cliente' && savedDemoCliente) {
        try {
          const parsed = JSON.parse(savedDemoCliente);
          setUser({
            uid: parsed.uid || 'demo-client-uid-456',
            email: parsed.emailRegistro || 'cliente@dulcegrano.com',
            isDemo: true,
          });
          setRole('cliente');
          setClienteData(parsed);
          setIsDemoSession(true);
          setLoading(false);
          return;
        } catch (e) {
          // ignore
        }
      } else {
        setUser({
          uid: 'demo-admin-uid-123',
          email: 'admin@perfectglass.com',
          isDemo: true,
        });
        setRole('admin');
        setClienteData(null);
        setIsDemoSession(true);
        setLoading(false);
        return;
      }
    }

    let unsubscribeClienteSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeClienteSnapshot) {
        unsubscribeClienteSnapshot();
        unsubscribeClienteSnapshot = null;
      }

      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          isDemo: false,
        });
        setIsDemoSession(false);

        // 1. Check if user is SuperAdmin
        const isSuper = await isEmailSuperAdmin(currentUser.email);
        if (isSuper) {
          setRole('superadmin');
          setClienteData(null);
          setLoading(false);
          return;
        }

        // 2. Check if this user is a Client in Firestore (by uid or email)
        try {
          const clientesRef = collection(db, 'clientes');
          const qUid = query(clientesRef, where('uid', '==', currentUser.uid));

          unsubscribeClienteSnapshot = onSnapshot(qUid, (snapshot) => {
            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              const cData = { id: docSnap.id, ...docSnap.data() } as Cliente;
              setRole('cliente');
              setClienteData(cData);
            } else {
              // Check by email as fallback
              if (currentUser.email) {
                const qEmail = query(clientesRef, where('emailRegistro', '==', currentUser.email));
                getDocs(qEmail).then((emailSnap) => {
                  if (!emailSnap.empty) {
                    const docSnap = emailSnap.docs[0];
                    const cData = { id: docSnap.id, ...docSnap.data() } as Cliente;
                    setRole('cliente');
                    setClienteData(cData);
                  } else {
                    setRole('admin');
                    setClienteData(null);
                  }
                }).catch(() => {
                  setRole('admin');
                  setClienteData(null);
                });
              } else {
                setRole('admin');
                setClienteData(null);
              }
            }
            setLoading(false);
          }, (err) => {
            console.warn('Snapshot error on client detection:', err);
            setRole('admin');
            setClienteData(null);
            setLoading(false);
          });
        } catch (e) {
          console.warn('Error setting up client listener:', e);
          setRole('admin');
          setClienteData(null);
          setLoading(false);
        }
      } else {
        if (sessionStorage.getItem('perfectglass_demo_session') !== 'true') {
          setUser(null);
          setRole('admin');
          setClienteData(null);
          setIsDemoSession(false);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeClienteSnapshot) unsubscribeClienteSnapshot();
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

  const login = async (email: string, pass: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, pass);
    } catch (error: any) {
      // If it is the demo admin account and not yet created, auto-create it smoothly
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        trimmedEmail.toLowerCase() === 'admin@perfectglass.com'
      ) {
        try {
          await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
          return;
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
    const demoEmail = DEFAULT_SUPERADMIN_EMAIL;
    const demoPass = 'superadmin123';
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      try {
        await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        sessionStorage.removeItem('perfectglass_demo_session');
      } catch (createErr: any) {
        console.warn('Firebase Auth demo superadmin fallback:', createErr);
        sessionStorage.setItem('perfectglass_demo_session', 'true');
        sessionStorage.setItem('perfectglass_demo_role', 'superadmin');
        setUser({
          uid: 'demo-superadmin-uid-master',
          email: demoEmail,
          isDemo: true,
        });
        setRole('superadmin');
        setClienteData(null);
        setIsDemoSession(true);
      }
    }
  };

  const loginDemoAdmin = async () => {
    setAuthError(null);
    const demoEmail = 'admin@perfectglass.com';
    const demoPass = 'admin123456';
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      try {
        await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        sessionStorage.removeItem('perfectglass_demo_session');
      } catch (createErr: any) {
        console.warn('Firebase Auth demo admin fallback:', createErr);
        sessionStorage.setItem('perfectglass_demo_session', 'true');
        sessionStorage.setItem('perfectglass_demo_role', 'admin');
        setUser({
          uid: 'demo-admin-uid-123',
          email: demoEmail,
          isDemo: true,
        });
        setRole('admin');
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
        uid: 'demo-client-dulce-grano',
        emailRegistro: 'contacto@dulcegrano.com',
        nombre: 'Cafetería & Panadería Dulce Grano',
        telefono: '+54 9 11 4522-8910',
        direccion: 'Av. Santa Fe 2840',
        zona: 'Palermo',
        tipoSuperficie: 'Vidrieras comerciales y marquesina',
        frecuenciaVisitaDias: 30,
        duracionServicioMinutos: 45,
        fechaUltimaVisita: '2026-07-28',
        fechaProximaVisita: '2026-08-27',
        notas: 'Horario preferente: antes de las 9:00 AM.',
        activo: true,
        localComercial: 'Cafetería Dulce Grano',
        estadoRegistro: 'aprobado',
        sellosAcumulados: 0,
        sellosNecesarios: 5,
        recompensaDescripcion: 'Limpieza de vidrios gratis',
        recompensaDisponible: true,
        totalRecompensasCanjeadas: 1,
        fechaUltimoCanje: '2026-04-10',
      };
    } else if (tipo === 'pendiente') {
      sampleClient = {
        id: 'sample-client-pending',
        uid: 'demo-client-pending-uid',
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
      };
    } else {
      // Aprobado con sellos en progreso (Familia Martínez)
      sampleClient = {
        id: 'sample-client-2',
        uid: 'demo-client-martinez',
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
        sellosAcumulados: 4, // 4 de 5 sellos acumulados
        sellosNecesarios: 5,
        recompensaDescripcion: 'Limpieza de mampara de baño gratis',
        recompensaDisponible: false,
        totalRecompensasCanjeadas: 0,
      };
    }

    sessionStorage.setItem('perfectglass_demo_session', 'true');
    sessionStorage.setItem('perfectglass_demo_role', 'cliente');
    sessionStorage.setItem('perfectglass_demo_cliente', JSON.stringify(sampleClient));

    setUser({
      uid: sampleClient.uid || 'demo-client-uid',
      email: sampleClient.emailRegistro || 'cliente@perfectglass.com',
      isDemo: true,
    });
    setRole('cliente');
    setClienteData(sampleClient);
    setIsDemoSession(true);
  };

  const registerAdmin = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      const msg = formatAuthError(error.code || '');
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
  }) => {
    setAuthError(null);
    try {
      // 1. Create auth user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.pass);
      const uid = cred.user.uid;

      // 2. Create client document in Firestore with status 'pendiente'
      await registrarNuevoCliente({
        uid,
        email: data.email.trim(),
        nombre: data.nombre.trim(),
        telefono: data.telefono.trim(),
        localComercial: data.localComercial.trim(),
      });

      sessionStorage.removeItem('perfectglass_demo_session');
      sessionStorage.removeItem('perfectglass_demo_role');
      sessionStorage.removeItem('perfectglass_demo_cliente');
    } catch (error: any) {
      const msg = formatAuthError(error.code || '');
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

