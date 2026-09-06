import { Turno, BusinessConfig, Cliente } from '../types';
import { formatearFechaLarga, formatearFecha } from '../utils/dateUtils';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { isModoSandboxActivo, guardarEmailSimulado } from './sandboxService';

export interface EmailLog {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  tipo: 'confirmacion_cliente' | 'aviso_vidriero' | 'cancelacion_cliente' | 'cancelacion_vidriero' | 'solicitud_resena';
}

const EMAIL_LOGS_KEY = 'perfectglass_email_logs';

/**
 * Records an email event in Firestore 'logsEmails' and 'emailsSimulados'.
 * Replaces any dependency on Firebase Extensions or Trigger Email with Cloud Functions 2nd Gen + Resend.
 */
export async function registrarEmailNotificacion(mailData: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  tipo?: string;
  negocioId?: string;
  turnoId?: string;
  clienteId?: string;
  linkCancelacion?: string;
}): Promise<void> {
  try {
    const recipients = Array.isArray(mailData.to) ? mailData.to : [mailData.to];
    const validRecipients = recipients
      .map((r) => (r || '').trim().toLowerCase())
      .filter((r) => r.length > 3 && r.includes('@'));

    if (validRecipients.length === 0) {
      return;
    }

    // Check Sandbox Mode: if active, simulate email and save to 'emailsSimulados'
    const sandboxActivo = await isModoSandboxActivo();
    if (sandboxActivo) {
      await guardarEmailSimulado({
        tipoDeEmail: mailData.tipo || 'notificacion',
        destinatario: validRecipients.join(', '),
        asunto: mailData.subject,
        cuerpo: mailData.text || (mailData.html ? mailData.html.replace(/<[^>]*>/g, ' ') : ''),
        fecha: new Date().toISOString(),
        negocioId: mailData.negocioId || 'perfect-glass',
        turnoId: mailData.turnoId,
        clienteId: mailData.clienteId,
        metadata: {
          html: mailData.html || null,
          linkCancelacion: mailData.linkCancelacion,
        },
      });
    }

    // Register in logsEmails collection for audit
    await addDoc(collection(db, 'logsEmails'), {
      destinatario: validRecipients.join(', '),
      asunto: mailData.subject,
      tipo: mailData.tipo || 'confirmacion_cliente',
      negocioId: mailData.negocioId || 'perfect-glass',
      turnoId: mailData.turnoId || null,
      clienteId: mailData.clienteId || null,
      estado: sandboxActivo ? 'simulado' : 'enviado',
      fecha: new Date().toISOString(),
      esSandbox: sandboxActivo,
    });
  } catch (error) {
    console.warn('Notice: Email log could not be saved to logsEmails:', error);
  }
}

// Backwards compatibility alias
export const enqueueMailForFirebaseExtension = registrarEmailNotificacion;

/**
 * Saves an email record to local history for inspection / audit
 */
function logEmailSent(log: {
  from?: string;
  to: string;
  subject: string;
  body: string;
  tipo: 'confirmacion_cliente' | 'aviso_vidriero' | 'cancelacion_cliente' | 'cancelacion_vidriero' | 'solicitud_resena';
}): EmailLog {
  const newLog: EmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    from: log.from || 'notificaciones@perfectglass.app',
    to: log.to,
    subject: log.subject,
    body: log.body,
    sentAt: new Date().toISOString(),
    tipo: log.tipo,
  };

  try {
    const existing = JSON.parse(localStorage.getItem(EMAIL_LOGS_KEY) || '[]');
    existing.unshift(newLog);
    // Keep last 50 logs
    localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    console.warn('Could not persist email log:', e);
  }

  return newLog;
}

export function getEmailLogs(): EmailLog[] {
  try {
    return JSON.parse(localStorage.getItem(EMAIL_LOGS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearEmailLogs(): void {
  try {
    localStorage.removeItem(EMAIL_LOGS_KEY);
  } catch (e) {
    console.warn('Could not clear email logs:', e);
  }
}

/**
 * Returns the public cancellation page URL for a Turno: perfectglass.app/cancelar/[tokenCancelacion]
 */
export function getCancelacionPublicUrl(tokenCancelacion?: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://perfectglass.app';
  if (!tokenCancelacion) {
    return `${origin}/cancelar`;
  }
  return `${origin}/cancelar/${encodeURIComponent(tokenCancelacion)}`;
}

/**
 * Builds the cancellation / management link for a Turno
 */
export function getTurnoPublicUrl(turnoId: string, cancelToken?: string): string {
  if (cancelToken) {
    return getCancelacionPublicUrl(cancelToken);
  }
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://perfectglass.app';
  const params = new URLSearchParams();
  params.set('agendar', 'true');
  params.set('turnoId', turnoId);
  return `${origin}?${params.toString()}`;
}

/**
 * Generates a Google Calendar direct Add URL
 */
export function generateGoogleCalendarUrl(turno: Turno, config: BusinessConfig): string {
  const [year, month, day] = turno.fecha.split('-').map(Number);
  const [startH, startM] = turno.horaInicio.split(':').map(Number);
  const [endH, endM] = turno.horaFin.split(':').map(Number);

  // Format UTC strings: YYYYMMDDTHHmmss
  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
  const endStr = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;

  const title = encodeURIComponent(`Limpieza de Vidrios - ${config.nombreNegocio || 'Perfect Glass'}`);
  const details = encodeURIComponent(
    `Servicio de limpieza de vidrios profesional agendado con ${config.nombreNegocio}.\n` +
      `Cliente: ${turno.nombreCliente}\n` +
      `Teléfono: ${turno.telefonoCliente}\n` +
      `Horario: ${turno.horaInicio} a ${turno.horaFin}\n` +
      `Dirección: ${turno.direccion || config.direccion || ''}\n` +
      `Contacto: ${config.telefono || config.whatsapp || ''}\n\n` +
      `Para gestionar o cancelar tu turno ingresa a: ${getTurnoPublicUrl(turno.id, turno.cancelToken)}`
  );
  const location = encodeURIComponent(turno.direccion || config.direccion || 'Domicilio del cliente');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}

/**
 * Generates an .ics Calendar download file
 */
export function downloadIcsFile(turno: Turno, config: BusinessConfig) {
  const [year, month, day] = turno.fecha.split('-').map(Number);
  const [startH, startM] = turno.horaInicio.split(':').map(Number);
  const [endH, endM] = turno.horaFin.split(':').map(Number);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
  const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Perfect Glass//Auto Agendamiento//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:turno-${turno.id}@perfectglass.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Limpieza de Vidrios - ${config.nombreNegocio || 'Perfect Glass'}`,
    `DESCRIPTION:Servicio de limpieza programado con ${config.nombreNegocio}. Tel: ${config.telefono || ''}`,
    `LOCATION:${turno.direccion || 'Domicilio'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `turno_perfectglass_${turno.fecha}_${turno.horaInicio.replace(':', '')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates formatted WhatsApp text message for client confirmation
 */
export function generateWhatsAppConfirmationMessage(turno: Turno, config: BusinessConfig): string {
  const fechaTexto = formatearFechaLarga(turno.fecha);
  const cancelUrl = getTurnoPublicUrl(turno.id, turno.cancelToken);

  return (
    `✨ *¡Turno Confirmado en ${config.nombreNegocio || 'Perfect Glass'}!* ✨\n\n` +
    `Hola *${turno.nombreCliente}*, tu servicio de limpieza de vidrios ha sido agendado con éxito:\n\n` +
    `📅 *Fecha:* ${fechaTexto}\n` +
    `⏰ *Horario:* ${turno.horaInicio} a ${turno.horaFin} hs\n` +
    `📍 *Dirección:* ${turno.direccion || 'A coordinar'}\n` +
    (turno.notas ? `📝 *Notas:* ${turno.notas}\n` : '') +
    `\n` +
    (config.mensajeEmailConfirmacion ? `💬 _"${config.mensajeEmailConfirmacion}"_\n\n` : '') +
    `¿Necesitas consultar o cancelar tu turno? Puedes hacerlo desde este enlace:\n` +
    `${cancelUrl}\n\n` +
    `¡Muchas gracias por elegirnos!`
  );
}

/**
 * Formats a modern, mobile-first, professional HTML email for client confirmation
 */
function generarHtmlEmailConfirmacion(
  turno: Turno,
  config: BusinessConfig,
  cancelUrl: string
): string {
  const primaryColor = config.colorPrimario || '#0284c7';
  const businessName = config.nombreNegocio || 'Perfect Glass';
  const telefonoVidriero = config.telefono || config.whatsapp || 'No informado';
  const fechaLarga = formatearFechaLarga(turno.fecha);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Turno</title>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header with Branding -->
    <div style="background-color: ${primaryColor}; padding: 32px 24px; text-align: center; color: #ffffff;">
      ${config.logoUrl ? `<img src="${config.logoUrl}" alt="${businessName}" style="max-height: 56px; max-width: 180px; margin-bottom: 12px; border-radius: 12px; background: rgba(255,255,255,0.2); padding: 4px;" /><br/>` : ''}
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${businessName}</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; opacity: 0.95; color: #ffffff;">Confirmación de turno para servicio de limpieza de vidrios</p>
    </div>

    <!-- Main Body -->
    <div style="padding: 32px 24px;">
      <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 800; color: #0f172a;">¡Hola ${turno.nombreCliente}!</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Tu turno ya quedó registrado y confirmado. Vamos a estar puntuales en el horario pactado para realizar el trabajo.
      </p>

      <!-- Details Summary Card -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; color: #64748b;">
          Resumen de tu Turno
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Cliente:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${turno.nombreCliente}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Fecha:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${fechaLarga}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Horario:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${turno.horaInicio} a ${turno.horaFin} hs</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Dirección:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${turno.direccion || 'A convenir con el cliente'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Vidriero:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${businessName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Teléfono:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${telefonoVidriero}</td>
          </tr>
          ${turno.notas ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Notas:</td>
            <td style="padding: 6px 0; color: #334155;">${turno.notas}</td>
          </tr>` : ''}
        </table>
      </div>

      ${config.mensajeEmailConfirmacion ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-bottom: 24px; font-size: 13px; color: #166534; line-height: 1.5;">
        <strong>Mensaje del vidriero:</strong> "${config.mensajeEmailConfirmacion}"
      </div>` : ''}

      <!-- Prominent Cancellation CTA Box -->
      <div style="background-color: #fff1f2; border: 1px dashed #fecdd3; border-radius: 16px; padding: 24px; text-align: center; margin-top: 28px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #881337; font-weight: 600;">
          ¿Te surgió un imprevisto o necesitás cancelar el turno?
        </p>
        <p style="margin: 0 0 16px 0; font-size: 12px; color: #9f1239;">
          Podés cancelarlo directamente haciendo un solo clic en este botón, sin necesidad de contraseñas ni registrarte:
        </p>
        <a href="${cancelUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #e11d48; color: #ffffff !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 10px rgba(225, 29, 72, 0.25);">
          Cancelar mi turno
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.5;">
      <p style="margin: 0;">${businessName} • Tel: ${telefonoVidriero} ${config.direccion ? ' • ' + config.direccion : ''}</p>
      <p style="margin: 4px 0 0 0;">Este email fue enviado automáticamente al agendar tu turno.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends automatic confirmation email to the client
 */
export async function enviarEmailConfirmacionCliente(
  turno: Turno,
  config: BusinessConfig
): Promise<EmailLog> {
  const token = turno.tokenCancelacion || turno.cancelToken;
  const cancelUrl = getCancelacionPublicUrl(token);
  const fechaLarga = formatearFechaLarga(turno.fecha);
  const businessName = config.nombreNegocio || 'Perfect Glass';
  const telefonoVidriero = config.telefono || config.whatsapp || 'No informado';

  // Asunto obligatorio requerido por el usuario
  const asunto = `Confirmación de turno - ${businessName}`;

  const cuerpoTexto = `
¡Hola ${turno.nombreCliente}!

Tu turno en ${businessName} ha sido confirmado con éxito.

DATOS DEL TURNO:
------------------------------------------
• Cliente: ${turno.nombreCliente}
• Fecha: ${fechaLarga}
• Horario: ${turno.horaInicio} a ${turno.horaFin} hs
• Dirección del servicio: ${turno.direccion || 'A coordinar con el vidriero'}
• Vidriero: ${businessName}
• Teléfono de contacto: ${telefonoVidriero}
${turno.notas ? `• Notas: ${turno.notas}\n` : ''}
${config.mensajeEmailConfirmacion ? `\nMensaje: "${config.mensajeEmailConfirmacion}"\n` : ''}

¿NECESITÁS CANCELAR TU TURNO?
Si te surgió un imprevisto podés cancelar tu turno directamente desde el siguiente enlace seguro (sin necesidad de login):
${cancelUrl}

¡Muchas gracias por confiar en nuestro servicio de limpieza de vidrios!
  `.trim();

  const cuerpoHtml = generarHtmlEmailConfirmacion(turno, config, cancelUrl);

  // 1. Log to local storage audit queue
  const emailLog = logEmailSent({
    to: turno.emailCliente || 'cliente@email.com',
    subject: asunto,
    body: cuerpoTexto,
    tipo: 'confirmacion_cliente',
  });

  // 2. Enqueue in Firestore collection 'mail' for Firebase Extensions Trigger Email
  await enqueueMailForFirebaseExtension({
    to: turno.emailCliente,
    subject: asunto,
    text: cuerpoTexto,
    html: cuerpoHtml,
    tipo: 'confirmacion_cliente',
    negocioId: config.id || 'perfect-glass',
    turnoId: turno.id,
  });

  return emailLog;
}

/**
 * Sends notification email to the business owner (vidriero) on new appointment
 */
export async function enviarAvisoVidrieroNuevoTurno(
  turno: Turno,
  config: BusinessConfig
): Promise<EmailLog> {
  const vidrieroEmail = config.emailVidriero || config.emailAdministrador || 'vidriero@perfectglass.com';
  const fechaFormateada = formatearFecha(turno.fecha);
  
  // Asunto requerido: "Nuevo turno agendado: [nombreCliente], [fecha], [hora], [teléfonoCliente]"
  const asunto = `Nuevo turno agendado: ${turno.nombreCliente}, ${fechaFormateada}, ${turno.horaInicio}`;

  const cuerpoTexto = `
Nuevo turno agendado: ${turno.nombreCliente}, ${fechaFormateada}, ${turno.horaInicio} hs, ${turno.telefonoCliente}

DETALLES DE LA RESERVA:
------------------------------------------
• Cliente: ${turno.nombreCliente}
• Teléfono: ${turno.telefonoCliente}
• Email: ${turno.emailCliente}
• Fecha: ${formatearFechaLarga(turno.fecha)}
• Horario: ${turno.horaInicio} a ${turno.horaFin} hs (${turno.duracionMinutos} minutos)
• Dirección: ${turno.direccion || 'No especificada'}
• Notas: ${turno.notas || 'Ninguna'}

Este turno ya figura confirmado en tu agenda de Perfect Glass.
  `.trim();

  const cuerpoHtml = `
  <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
    <h2 style="color: #0284c7; margin-top: 0;">🔔 Nuevo Turno Agendado</h2>
    <p style="font-size: 15px; font-weight: bold;">
      Nuevo turno agendado: ${turno.nombreCliente}, ${fechaFormateada}, ${turno.horaInicio} hs, ${turno.telefonoCliente}
    </p>
    <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 12px;">
      <p><strong>Cliente:</strong> ${turno.nombreCliente}</p>
      <p><strong>Teléfono:</strong> <a href="tel:${turno.telefonoCliente}">${turno.telefonoCliente}</a></p>
      <p><strong>Email:</strong> ${turno.emailCliente}</p>
      <p><strong>Fecha y Horario:</strong> ${formatearFechaLarga(turno.fecha)} de ${turno.horaInicio} a ${turno.horaFin} hs</p>
      <p><strong>Dirección:</strong> ${turno.direccion || 'No especificada'}</p>
      ${turno.notas ? `<p><strong>Notas:</strong> ${turno.notas}</p>` : ''}
    </div>
  </div>
  `.trim();

  const emailLog = logEmailSent({
    to: vidrieroEmail,
    subject: asunto,
    body: cuerpoTexto,
    tipo: 'aviso_vidriero',
  });

  await enqueueMailForFirebaseExtension({
    to: vidrieroEmail,
    subject: asunto,
    text: cuerpoTexto,
    html: cuerpoHtml,
    tipo: 'aviso_vidriero',
    negocioId: config.id || 'perfect-glass',
    turnoId: turno.id,
  });

  return emailLog;
}

/**
 * Sends cancellation notification email to client and vidriero
 */
export async function enviarAvisosCancelacionTurno(
  turno: Turno,
  config: BusinessConfig,
  motivo?: string
): Promise<{ clientLog: EmailLog; vidrieroLog: EmailLog }> {
  const fechaLarga = formatearFechaLarga(turno.fecha);
  const fechaFormateada = formatearFecha(turno.fecha);
  const businessName = config.nombreNegocio || 'Perfect Glass';

  // 1. To client
  const clientSubject = `Turno cancelado - ${businessName}`;
  const clientBody = `
¡Hola ${turno.nombreCliente}!

Te confirmamos que tu turno para el servicio de limpieza de vidrios programado para el ${fechaLarga} (${turno.horaInicio} a ${turno.horaFin} hs) ha sido CANCELADO.

${motivo ? `Motivo: ${motivo}\n` : ''}
Si querés agendar otro horario, podés hacerlo en cualquier momento desde nuestra página de turnos:
${window.location.origin + window.location.pathname}?agendar=true

Cualquier consulta estamos a tu disposición por WhatsApp al ${config.whatsapp || config.telefono || ''}.
  `.trim();

  const clientLog = logEmailSent({
    to: turno.emailCliente || 'cliente@email.com',
    subject: clientSubject,
    body: clientBody,
    tipo: 'cancelacion_cliente',
  });

  await enqueueMailForFirebaseExtension({
    to: turno.emailCliente,
    subject: clientSubject,
    text: clientBody,
    tipo: 'cancelacion_cliente',
    negocioId: config.id || 'perfect-glass',
    turnoId: turno.id,
  });

  // 2. To vidriero
  // Asunto requerido: "Turno cancelado: [nombreCliente], [fecha], [hora]. El horario quedó disponible nuevamente"
  const vidrieroEmail = config.emailVidriero || config.emailAdministrador || 'vidriero@perfectglass.com';
  const vidrieroSubject = `Turno cancelado: ${turno.nombreCliente}, ${fechaFormateada}, ${turno.horaInicio}`;
  const vidrieroBody = `
Turno cancelado: ${turno.nombreCliente}, ${fechaFormateada}, ${turno.horaInicio} hs. El horario quedó disponible nuevamente.

DATOS DEL TURNO CANCELADO:
------------------------------------------
• Cliente: ${turno.nombreCliente}
• Teléfono: ${turno.telefonoCliente}
• Email: ${turno.emailCliente}
• Horario liberado: ${turno.horaInicio} a ${turno.horaFin} hs
${motivo ? `• Motivo indicado: ${motivo}` : ''}

El horario ya ha quedado inmediatamente habilitado en tu agenda pública para que otro cliente pueda reservarlo.
  `.trim();

  const vidrieroLog = logEmailSent({
    to: vidrieroEmail,
    subject: vidrieroSubject,
    body: vidrieroBody,
    tipo: 'cancelacion_vidriero',
  });

  await enqueueMailForFirebaseExtension({
    to: vidrieroEmail,
    subject: vidrieroSubject,
    text: vidrieroBody,
    tipo: 'cancelacion_vidriero',
    negocioId: config.id || 'perfect-glass',
    turnoId: turno.id,
  });

  return { clientLog, vidrieroLog };
}

/**
 * Checks whether a client is eligible to receive an automated Google review request
 */
export function verificarElegibilidadResena(
  cliente: Cliente,
  config: BusinessConfig
): { eligible: boolean; razon?: string; diasPasados?: number; diasMinimos: number } {
  const diasMinimos = config.diasMinimosEntreResenas || 90;
  const autoHabilitado = config.solicitarResenasAuto ?? true;

  if (!autoHabilitado) {
    return {
      eligible: false,
      razon: 'El envío automático de solicitudes de reseña está desactivado en Configuración.',
      diasMinimos,
    };
  }

  if (!config.linkGoogleReviews || !config.linkGoogleReviews.trim()) {
    return {
      eligible: false,
      razon: 'No hay un link de Google Reviews configurado en el perfil del negocio.',
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
        razon: `Ya se le solicitó o envió reseña hace ${diffDias} día${diffDias === 1 ? '' : 's'} (límite configurado: ${diasMinimos} días).`,
        diasPasados: diffDias,
        diasMinimos,
      };
    }

    return { eligible: true, diasPasados: diffDias, diasMinimos };
  }

  return { eligible: true, diasMinimos };
}

/**
 * Generates the public review / satisfaction survey URL for a client or turno
 */
export function generateOpinionUrl(identifier?: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://perfectglass.app';
  
  if (!identifier) {
    return `${origin}/?resena=true`;
  }
  return `${origin}/?resena=${encodeURIComponent(identifier)}`;
}

/**
 * Formats a warm, high-converting WhatsApp message requesting feedback through the satisfaction filter
 */
export function generateWhatsAppReviewMessage(
  cliente: Cliente,
  config: BusinessConfig,
  turnoId?: string
): string {
  const businessName = config.nombreNegocio || 'Perfect Glass';
  const opinionLink = generateOpinionUrl(turnoId || cliente.id);

  return (
    `⭐ *¡Muchas gracias por confiar en ${businessName}!* ⭐\n\n` +
    `Hola *${cliente.nombre}*, esperamos que hayas quedado muy conforme con el servicio de limpieza de vidrios realizado hoy.\n\n` +
    `Tu opinión nos ayuda muchísimo a mantener la máxima calidad. ¿Nos regalarías 15 segundos para calificar el servicio? 👇\n\n` +
    `🌟 ${opinionLink}\n\n` +
    `¡Te lo agradecemos de corazón!`
  );
}

/**
 * Dispatches an automated email review request to the client
 */
export async function enviarEmailSolicitudResena(
  cliente: Cliente,
  config: BusinessConfig,
  turnoId?: string
): Promise<EmailLog> {
  const businessName = config.nombreNegocio || 'Perfect Glass';
  const opinionLink = generateOpinionUrl(turnoId || cliente.id);
  const asunto = `⭐ ¿Cómo fue tu experiencia con ${businessName}? Tu opinión nos importa`;

  const cuerpo = `
Estimado/a ${cliente.nombre},

Esperamos que hayas quedado totalmente satisfecho/a con el servicio de limpieza de vidrios que realizamos en ${cliente.direccion || 'tu local o domicilio'}.

En ${businessName} nos esforzamos día a día por brindar la máxima calidad, transparencia y puntualidad en cada trabajo.

¿NOS REGALAS 15 SEGUNDOS PARA CALIFICAR EL SERVICIO?
Tu valoración nos ayuda a seguir mejorando y atendiendo de la mejor manera:

👉 Haz clic aquí para calificar tu experiencia:
${opinionLink}

¡Muchísimas gracias por confiar en nosotros!

Atentamente,
El equipo de ${businessName}
Teléfono: ${config.telefono || config.whatsapp || ''}
  `.trim();

  const emailLog = logEmailSent({
    to: cliente.emailRegistro || 'cliente@email.com',
    subject: asunto,
    body: cuerpo,
    tipo: 'solicitud_resena',
  });

  if (cliente.emailRegistro) {
    await enqueueMailForFirebaseExtension({
      to: cliente.emailRegistro,
      subject: asunto,
      text: cuerpo,
      tipo: 'solicitud_resena',
      negocioId: config.id || 'perfect-glass',
      clienteId: cliente.id,
      turnoId,
    });
  }

  return emailLog;
}

