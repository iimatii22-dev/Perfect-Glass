export type PlanNegocio = 'demo' | 'básico' | 'premium';

export interface Negocio {
  id: string; // ID del documento en la colección 'negocios' (ej: 'perfect-glass')
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  logoUrl: string;
  instagram: string;
  whatsapp: string;
  facebook: string;
  colorPrimario: string;
  emailAdministrador: string; // Email del vidriero dueño
  fechaCreacion: string; // Timestamp ISO
  activo: boolean; // Estado activo/inactivo del negocio
  plan: PlanNegocio | string; // 'demo', 'básico', 'premium'
  
  // Fidelidad
  sellosNecesarios?: number; // Default 5
  recompensaDescripcion?: string; // Default "Limpieza de vidrios gratis"
  
  // Auto-agendamiento público
  horaInicioJornada?: string; // Default "08:00"
  horaFinJornada?: string; // Default "18:00"
  duracionServicioDefaultMinutos?: number; // Default 30
  emailVidriero?: string; // Default ""
  mensajeEmailConfirmacion?: string; // Mensaje de confirmación personalizado
  diasLaborables?: number[]; // [1, 2, 3, 4, 5, 6] (1=Lun, 6=Sáb, 0=Dom)

  // Reseñas Automáticas de Google
  linkGoogleReviews?: string; // Link directo a reseñas de Google Maps
  solicitarResenasAuto?: boolean; // Sí/No envío automático tras visita
  diasMinimosEntreResenas?: number; // Frecuencia mínima en días (default 90)

  // Notificaciones Push y Email
  notificacionesPushActivas?: boolean; // Default true
  emailsActivos?: boolean; // Default true
  pushSilencioInicio?: string; // Default "20:00"
  pushSilencioFin?: string; // Default "08:00"

  updatedAt?: string;
  updatedBy?: string;
}

export type BusinessConfig = Negocio;

export interface NegocioMetricas {
  totalClientes: number;
  visitasCompletadasMes: number;
  turnosMes: number;
  presupuestosMes: number;
}

export interface SuperAdminRecord {
  id: string;
  email: string;
  nombre?: string;
  activo?: boolean;
  fechaAlta?: string;
}

export type TabType = 'agenda' | 'clientes' | 'resenas' | 'fidelidad' | 'reportes' | 'configuracion' | 'superadmin';

export type UserRole = 'superadmin' | 'admin' | 'cliente';

export type TipoVidrio = 'comun' | 'templado' | 'espejo' | 'laminado' | 'otro';

export interface ItemPresupuesto {
  id: string;
  tipoVidrio: TipoVidrio;
  descripcion?: string; // Ej: "Cancel de baño", "Ventanal living", "Espejo recibidor"
  anchoMetros: number; // Ej: 1.20 o m2 si es superficie directa
  altoMetros: number; // Ej: 2.00 o 1 si es superficie directa
  cantidad: number; // Ej: 1
  m2Unitario: number; // ancho * alto o superficie directa
  m2Total: number; // m2Unitario * cantidad
  precioPorM2: number; // Precio al momento del cálculo
  subtotal: number; // m2Total * precioPorM2
  modoMedida?: 'dimensiones' | 'superficie_directa'; // 'dimensiones' (Ancho x Alto) o 'superficie_directa' (m2 directos / pisos)
}

export interface TarifasConfig {
  id?: string;
  negocioId?: string;
  precioPorM2VidrioComun: number; // Default ej: 1800
  precioPorM2VidrioTemplado: number; // Default ej: 3500
  precioPorM2Espejo: number; // Default ej: 2400
  precioMinimoServicio: number; // Default ej: 1500
  monedaSimbolo?: string; // Default '$'
  actualizadoEn?: string;
  actualizadoPor?: string;
}

export interface PlantillaPresupuesto {
  id: string;
  negocioId?: string;
  nombre: string; // Ej: "Mampara Baño Estándar", "Espejo Biselado 1x1m"
  descripcion?: string;
  items: ItemPresupuesto[];
  creadoEn: string;
}

export type EstadoPresupuesto = 'pendiente' | 'enviado' | 'aceptado' | 'rechazado';

export interface Presupuesto {
  id: string;
  negocioId?: string;
  clienteId?: string | null;
  clienteNombre: string;
  clienteTelefono: string;
  fecha: string; // YYYY-MM-DD
  items: ItemPresupuesto[];
  subtotalCalculado: number;
  precioMinimoAplicado: boolean;
  totalFinal: number;
  estado: EstadoPresupuesto;
  notasVoz?: string; // Transcripción de voz editable
  creadoEn: string;
  actualizadoEn?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName?: string | null;
  negocioId?: string | null;
  clienteData?: Cliente | null;
}

export interface SelloHistorial {
  id: string;
  negocioId?: string;
  fecha: string; // ISO string o timestamp
  otorgadoPor: string; // "vidriero"
  visible: boolean; // true
  tipo?: 'visita' | 'correccion' | 'canje';
  notas?: string;
}

export interface VisitaRegistro {
  id: string;
  negocioId?: string;
  fecha: string; // YYYY-MM-DD
  notas: string;
  fotoAntes?: string;
  fotoDespues?: string;
  selloOtorgado?: boolean;
  completadoPor?: string;
  createdAt?: string;
}

export interface Cliente {
  id: string;
  negocioId?: string; // Negocio al que pertenece el cliente
  nombre: string;
  telefono: string;
  direccion: string;
  zona: string; // Barrio o zona geográfica
  tipoSuperficie: string; // ej: "ventanas", "vidrieras comerciales", "cancel de baño"
  frecuenciaVisitaDias: number; // 30, 60, 90, etc.
  duracionServicioMinutos?: number; // Duración del servicio para este cliente (def: 30)
  fechaUltimaVisita: string; // YYYY-MM-DD
  fechaProximaVisita: string; // YYYY-MM-DD
  notas: string;
  fotoAntes?: string;
  fotoDespues?: string;
  activo: boolean;
  
  // Auth & Roles (Cliente Portal)
  uid?: string | null; // ID de Firebase Auth del cliente
  emailRegistro?: string | null; // Email usado para el registro
  localComercial?: string; // Nombre del comercio o casa del cliente
  estadoRegistro?: 'pendiente' | 'aprobado' | 'rechazado' | null;

  // Fidelidad fields
  sellosAcumulados?: number; // 0 por defecto
  sellosNecesarios?: number; // Configurable por cliente o negocio (default 5)
  recompensaDescripcion?: string; // ej: "Limpieza de vidrios gratis"
  recompensaDisponible?: boolean; // true cuando sellosAcumulados alcanza sellosNecesarios
  totalRecompensasCanjeadas?: number; // Histórico de canjes
  fechaUltimoCanje?: string; // YYYY-MM-DD

  // Reseñas
  ultimoPedidoResena?: string; // YYYY-MM-DD fecha en que se le solicitó reseña por última vez
  ultimaResenaEnviada?: string | null; // Timestamp ISO o fecha de la última reseña enviada (null por defecto)

  // Modo Sandbox
  esSandbox?: boolean; // Marca datos de prueba/simulación

  historialVisitas?: VisitaRegistro[];
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type TurnoEstado = 'confirmado' | 'cancelado' | 'completado';

export interface Turno {
  id: string;
  negocioId?: string; // Negocio al que pertenece el turno
  clienteId: string; // ID del cliente existente o "nuevoCliente"
  nombreCliente: string;
  telefonoCliente: string;
  emailCliente: string;
  direccion?: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm (ej: "09:30")
  horaFin: string; // HH:mm (ej: "10:00")
  duracionMinutos: number; // ej: 30
  estado: TurnoEstado;
  notas?: string;
  
  // Modo Sandbox
  esSandbox?: boolean; // Turno creado en modo sandbox o demo

  // Campos de cancelación y notificaciones por email y push
  tokenCancelacion: string; // Texto, único, generado automáticamente (32 caracteres)
  emailEnviado: boolean; // Booleano, true cuando se envió el email de confirmación
  notificacionEnviada?: boolean; // Booleano, true para evitar duplicar alertas push
  recordatorioEnviado?: boolean; // Booleano, true si ya se envió el recordatorio de 24h
  fechaCancelacion: string | null; // Timestamp ISO, null hasta que se cancele

  cancelToken?: string; // Alias de compatibilidad hacia atrás
  creadoEn?: string;
  completadoEn?: string;
  canceladoEn?: string;
  motivoCancelacion?: string;
}

export interface Resena {
  id: string;
  clienteId: string; // Referencia al cliente
  clienteNombre?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  negocioId: string; // Referencia al negocio del vidriero
  calificacion: number; // Número del 1 al 5
  comentario?: string; // Texto (opcional, obligatorio si calificación <= 3)
  fecha: string; // Timestamp ISO o fecha
  turnoId?: string | null; // Referencia al turno o visita que generó la reseña, opcional
  derivadoAGoogle: boolean; // Booleano, true si el cliente hizo clic en el botón de Google Maps tras dar 4 o 5
  esSandbox?: boolean; // Reseña generada en modo sandbox (no altera métricas reales)
  createdAt?: string;
}

export type FeedbackInterno = Resena;

export interface ModoSandboxConfig {
  activo: boolean;
  actualizadoEn?: string;
  actualizadoPor?: string;
}

export interface EmailSimulado {
  id?: string;
  tipoDeEmail: string;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  fecha: string;
  negocioId?: string;
  turnoId?: string;
  clienteId?: string;
  metadata?: Record<string, any>;
}

export interface TokenPush {
  id: string; // ID del documento en 'tokensPush' (generalmente el uid del usuario)
  uid: string;
  negocioId?: string;
  email?: string | null;
  rol: UserRole; // 'admin' (vidriero) | 'cliente' | 'superadmin'
  fcmToken: string;
  userAgent?: string;
  plataforma?: string;
  pushActivo: boolean; // Si el usuario tiene habilitadas las notificaciones push
  emailActivo: boolean; // Si el usuario tiene habilitados los emails automáticos
  silencioInicio?: string; // Hora de inicio para silenciar (ej: "20:00")
  silencioFin?: string; // Hora de fin para silenciar (ej: "08:00")
  valido: boolean; // False si expira o falla repetidamente
  actualizadoEn: string;
  creadoEn?: string;
}

export interface LogNotificacion {
  id: string;
  tipo: 'nuevo_turno' | 'cancelacion' | 'recordatorio' | 'confirmacion_cliente' | 'test';
  destinatarioUid?: string;
  destinatarioRol: 'vidriero' | 'cliente' | 'todos';
  destinatarioEmail?: string;
  fcmToken?: string;
  titulo: string;
  cuerpo: string;
  datos?: Record<string, any>;
  exito: boolean;
  error?: string;
  fecha: string; // ISO
  negocioId?: string;
  turnoId?: string;
  clienteId?: string;
  canal: 'fcm_push' | 'web_push_native' | 'simulado';
}
