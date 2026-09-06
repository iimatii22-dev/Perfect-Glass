import { TurnoDocument, NegocioConfig } from './types';

function formatearFechaLegible(fechaStr: string): string {
  try {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return fechaStr;
  }
}

/**
 * Generates modern, mobile-friendly HTML email confirming the appointment to the client.
 */
export function generarHtmlEmailConfirmacion(
  turno: TurnoDocument,
  config: NegocioConfig,
  linkCancelacion: string
): { subject: string; html: string; text: string } {
  const primaryColor = config.colorPrimario || '#0284c7';
  const businessName = config.nombreNegocio || 'Perfect Glass';
  const telefonoContacto = config.telefono || config.whatsapp || 'No especificado';
  const fechaTexto = formatearFechaLegible(turno.fecha);
  const direccion = turno.direccionServicio || turno.direccion || 'Domicilio del cliente';

  const subject = `Confirmación de turno - ${businessName}`;

  const text = `
¡Hola ${turno.nombreCliente}!

Tu turno en ${businessName} ha sido confirmado con éxito.

DATOS DEL TURNO:
------------------------------------------
• Cliente: ${turno.nombreCliente}
• Fecha: ${fechaTexto}
• Horario: ${turno.horaInicio} a ${turno.horaFin} hs
• Dirección del servicio: ${direccion}
• Teléfono de contacto: ${telefonoContacto}
${turno.notas ? `• Notas: ${turno.notas}\n` : ''}
${config.mensajeEmailConfirmacion ? `\nMensaje del vidriero: "${config.mensajeEmailConfirmacion}"\n` : ''}

¿NECESITÁS CANCELAR TU TURNO?
Si te surgió un imprevisto, podés cancelar tu turno directamente desde el siguiente enlace seguro (no requiere contraseñas):
${linkCancelacion}

¡Muchas gracias por confiar en ${businessName}!
`.trim();

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header with Branding -->
    <div style="background-color: ${primaryColor}; padding: 32px 24px; text-align: center; color: #ffffff;">
      ${config.logoUrl ? `<img src="${config.logoUrl}" alt="${businessName}" style="max-height: 56px; max-width: 180px; margin-bottom: 12px; border-radius: 12px; background: rgba(255,255,255,0.2); padding: 4px;" /><br/>` : ''}
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${businessName}</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; opacity: 0.95; color: #ffffff;">Confirmación de turno programado</p>
    </div>

    <!-- Main Body -->
    <div style="padding: 32px 24px;">
      <h2 style="margin-top: 0; margin-bottom: 14px; font-size: 20px; font-weight: 800; color: #0f172a;">¡Hola ${turno.nombreCliente}!</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Tu turno ha sido agendado y confirmado con éxito. Estaremos puntuales en el horario pactado para realizar el trabajo.
      </p>

      <!-- Details Summary Card -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; color: #64748b;">
          Resumen de tu Turno
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Cliente:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${turno.nombreCliente}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Fecha:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${fechaTexto}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Horario:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${turno.horaInicio} a ${turno.horaFin} hs</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Dirección del servicio:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${direccion}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Teléfono de contacto:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${telefonoContacto}</td>
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
      <div style="background-color: #fff1f2; border: 1px dashed #fecdd3; border-radius: 16px; padding: 24px; text-align: center; margin-top: 24px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #881337; font-weight: 700;">
          ¿Te surgió un imprevisto y necesitás cancelar?
        </p>
        <p style="margin: 0 0 18px 0; font-size: 13px; color: #9f1239; line-height: 1.5;">
          Haciendo clic en el botón a continuación podrás cancelar tu reserva de forma inmediata y liberar el horario sin necesidad de llamadas ni contraseñas:
        </p>
        <a href="${linkCancelacion}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #e11d48; color: #ffffff !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">
          Cancelar mi turno
        </a>
        <p style="margin: 14px 0 0 0; font-size: 11px; color: #9f1239; opacity: 0.85;">
          Este enlace es exclusivo y seguro para este turno.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.5;">
      <p style="margin: 0;">${businessName} • Tel: ${telefonoContacto} ${config.direccion ? ' • ' + config.direccion : ''}</p>
      <p style="margin: 4px 0 0 0;">Este email fue generado automáticamente por el sistema de turnos de ${businessName}.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Generates email notification sent to the glazier when an appointment is cancelled.
 */
export function generarHtmlAvisoCancelacionVidriero(
  turno: TurnoDocument,
  config: NegocioConfig
): { subject: string; html: string; text: string } {
  const businessName = config.nombreNegocio || 'Perfect Glass';
  const fechaTexto = formatearFechaLegible(turno.fecha);
  const subject = `Turno cancelado: ${turno.nombreCliente}, ${turno.fecha}, ${turno.horaInicio} hs`;

  const text = `
Turno cancelado: ${turno.nombreCliente}, ${turno.fecha}, ${turno.horaInicio} hs.
El horario quedó disponible nuevamente en la agenda.

DETALLES DEL TURNO CANCELADO:
------------------------------------------
• Cliente: ${turno.nombreCliente}
• Teléfono: ${turno.telefonoCliente}
• Email: ${turno.emailCliente}
• Fecha: ${fechaTexto}
• Horario liberado: ${turno.horaInicio} a ${turno.horaFin} hs
• Dirección: ${turno.direccionServicio || turno.direccion || 'No especificada'}
${turno.motivoCancelacion ? `• Motivo: ${turno.motivoCancelacion}\n` : ''}

El horario ha quedado inmediatamente disponible en tu agenda pública para que otro cliente pueda reservarlo.
`.trim();

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.05);">
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #e11d48; font-size: 20px; font-weight: 800;">🔔 Turno Cancelado</h2>
    </div>
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
      El cliente ha cancelado el siguiente turno. El horario quedó disponible nuevamente en tu agenda.
    </p>
    <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Cliente:</strong> ${turno.nombreCliente}</p>
      <p style="margin: 4px 0;"><strong>Teléfono:</strong> <a href="tel:${turno.telefonoCliente}" style="color: #0284c7;">${turno.telefonoCliente}</a></p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${turno.emailCliente}</p>
      <p style="margin: 4px 0;"><strong>Fecha cancelada:</strong> ${fechaTexto} (${turno.fecha})</p>
      <p style="margin: 4px 0;"><strong>Horario liberado:</strong> ${turno.horaInicio} a ${turno.horaFin} hs</p>
      <p style="margin: 4px 0;"><strong>Dirección:</strong> ${turno.direccionServicio || turno.direccion || 'No especificada'}</p>
      ${turno.motivoCancelacion ? `<p style="margin: 4px 0;"><strong>Motivo:</strong> ${turno.motivoCancelacion}</p>` : ''}
    </div>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; font-size: 13px; color: #166534;">
      ✅ <strong>Disponibilidad actualizada:</strong> Este horario ya aparece libre en tu sistema de turnos para nuevas reservas.
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
