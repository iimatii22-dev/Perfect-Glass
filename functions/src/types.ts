export interface NegocioConfig {
  id: string;
  nombreNegocio: string;
  emailVidriero: string;
  emailAdministrador?: string;
  emailRemitente?: string;
  dominioRemitente?: string;
  linkAgendamientoPublico?: string;
  enviarEmailsAutomaticos?: boolean;
  enviarNotificacionesPush?: boolean;
  colorPrimario?: string;
  logoUrl?: string;
  telefono?: string;
  whatsapp?: string;
  direccion?: string;
  mensajeEmailConfirmacion?: string;
  horaInicioJornada?: string;
  horaFinJornada?: string;
  duracionServicioDefaultMinutos?: number;
  esSandbox?: boolean;
  activo?: boolean;
}

export type TurnoEstado = 'confirmado' | 'cancelado' | 'completado';

export interface TurnoDocument {
  id?: string;
  negocioId: string;
  clienteId?: string;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente: string;
  direccionServicio?: string;
  direccion?: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  estado: TurnoEstado;
  tokenCancelacionHash?: string;
  fechaCancelacion: string | null;
  emailConfirmacionEnviado?: boolean;
  emailCancelacionEnviado?: boolean;
  creadoEn: string;
  notas?: string;
  duracionMinutos?: number;
  motivoCancelacion?: string;
  canceladoEn?: string;
  esSandbox?: boolean;
}

export interface LogEmail {
  id?: string;
  destinatario: string;
  asunto: string;
  tipo: 'confirmacion_cliente' | 'aviso_vidriero' | 'cancelacion_cliente' | 'cancelacion_vidriero';
  negocioId: string;
  turnoId?: string;
  estado: 'enviado' | 'error' | 'simulado';
  error?: string | null;
  resendId?: string | null;
  fecha: string;
  esSandbox?: boolean;
}

export interface LogCancelacion {
  id?: string;
  turnoId: string;
  negocioId: string;
  fechaCancelacion: string;
  nombreCliente: string;
  emailCliente: string;
  origen: 'http_function' | 'public_app' | 'admin';
  exito: boolean;
  error?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface EmailSimulado {
  id?: string;
  tipoDeEmail: string;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  html?: string;
  linkCancelacion?: string;
  fecha: string;
  negocioId: string;
  turnoId?: string;
  clienteId?: string;
  metadata?: Record<string, any>;
}

export interface TokenPush {
  uid: string;
  rol: 'admin' | 'cliente' | 'superadmin';
  fcmToken: string;
  pushActivo: boolean;
  negocioId?: string;
}
