import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { resendApiKey } from './config';
import { verificarTokenCancelacion } from './crypto';
import { generarHtmlAvisoCancelacionVidriero } from './emailTemplates';
import { notificarVidrieroPushCancelacion } from './notifications';
import { enviarEmailOModoSandbox } from './resendService';
import { getBusinessConfig } from './turnosTrigger';
import { TurnoDocument, NegocioConfig, LogCancelacion } from './types';

/**
 * Generates an HTML response page for browser clients.
 */
function renderHtmlResponse(params: {
  success: boolean;
  title: string;
  message: string;
  config: NegocioConfig;
  turno?: TurnoDocument;
  linkReagendar?: string;
}): string {
  const primaryColor = params.config.colorPrimario || '#0284c7';
  const businessName = params.config.nombreNegocio || 'Perfect Glass';
  const link = params.linkReagendar || params.config.linkAgendamientoPublico || '/?agendar=true';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title} - ${businessName}</title>
  <style>
    body {
      margin: 0;
      padding: 32px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #ffffff;
      border-radius: 20px;
      padding: 36px 28px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    .icon-wrapper {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    .icon-success {
      background-color: #dcfce7;
      color: #16a34a;
    }
    .icon-error {
      background-color: #fee2e2;
      color: #dc2626;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 12px 0;
      color: #0f172a;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .details {
      background-color: #f1f5f9;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
      font-size: 13px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .btn {
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
      padding: 14px 24px;
      border-radius: 12px;
      background-color: ${primaryColor};
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper ${params.success ? 'icon-success' : 'icon-error'}">
      ${params.success ? '✓' : '✕'}
    </div>
    <h1>${params.title}</h1>
    <p>${params.message}</p>

    ${
      params.turno && params.success
        ? `<div class="details">
            <div class="details-row"><span style="color:#64748b;">Cliente:</span> <strong>${params.turno.nombreCliente}</strong></div>
            <div class="details-row"><span style="color:#64748b;">Fecha cancelada:</span> <strong>${params.turno.fecha}</strong></div>
            <div class="details-row"><span style="color:#64748b;">Horario:</span> <strong>${params.turno.horaInicio} - ${params.turno.horaFin} hs</strong></div>
            <div class="details-row"><span style="color:#64748b;">Estado:</span> <strong style="color:#e11d48;">Cancelado</strong></div>
          </div>`
        : ''
    }

    <a href="${link}" class="btn">
      Volver a agendar turno
    </a>

    <div class="footer">
      ${businessName} • Sistema de turnos
    </div>
  </div>
</body>
</html>`;
}

/**
 * Cloud Function 2nd Gen HTTP endpoint: cancelarTurno
 * Accepts: GET or POST with turnoId (or turno) and token
 */
export const cancelarTurno = onRequest(
  {
    cors: true,
    secrets: [resendApiKey],
  },
  async (req, res) => {
    // 1. Extraer turnoId y token de query string o body
    const turnoId = (req.query.turnoId || req.query.turno || req.body?.turnoId || req.body?.turno) as string;
    const token = (req.query.token || req.query.cancelToken || req.body?.token) as string;
    const motivo = (req.body?.motivo || req.query.motivo || 'Cancelado por el cliente desde el enlace seguro') as string;

    const wantsJson = req.headers.accept?.includes('application/json') || req.method === 'POST';
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    const userAgent = req.headers['user-agent'] || '';
    const db = admin.firestore();

    // 2. Validar que vengan ambos parámetros (SEGURIDAD: nunca permitir solo con turnoId)
    if (!turnoId || typeof turnoId !== 'string' || !token || typeof token !== 'string') {
      const errorMsg = 'Parámetros incompletos. Se requiere turnoId y token válido para cancelar.';
      if (wantsJson) {
        res.status(400).json({ success: false, error: errorMsg });
        return;
      }
      res.status(400).send(
        renderHtmlResponse({
          success: false,
          title: 'Solicitud inválida',
          message: errorMsg,
          config: { id: 'default', nombreNegocio: 'Perfect Glass', emailVidriero: '' },
        })
      );
      return;
    }

    let config: NegocioConfig = { id: 'default', nombreNegocio: 'Perfect Glass', emailVidriero: '' };
    let turnoData: TurnoDocument | null = null;
    let fechaCancelacionIso = new Date().toISOString();

    try {
      const turnoRef = db.collection('turnos').doc(turnoId.trim());

      // 3. Transacción Firestore para asegurar atomicidad y evitar carreras o cancelaciones duplicadas
      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(turnoRef);

        if (!docSnap.exists) {
          throw { code: 'NOT_FOUND', message: 'El turno solicitado no existe.' };
        }

        const data = docSnap.data() as TurnoDocument;
        turnoData = data;

        // 4. Comparar token con tokenCancelacionHash de manera segura
        if (!data.tokenCancelacionHash) {
          throw { code: 'NO_HASH', message: 'Este turno no cuenta con token de cancelación válido.' };
        }

        const esValido = verificarTokenCancelacion(token.trim(), data.tokenCancelacionHash);
        if (!esValido) {
          throw { code: 'INVALID_TOKEN', message: 'El token de cancelación no coincide o es inválido.' };
        }

        // 5. Rechazar si ya está cancelado, completado o vencido
        if (data.estado === 'cancelado') {
          throw { code: 'ALREADY_CANCELLED', message: 'Este turno ya fue cancelado anteriormente.' };
        }

        if (data.estado === 'completado') {
          throw { code: 'ALREADY_COMPLETED', message: 'No se puede cancelar un servicio que ya fue completado.' };
        }

        // 6. Si es válido, cambiar estado a "cancelado" y guardar fechaCancelacion
        fechaCancelacionIso = new Date().toISOString();
        transaction.update(turnoRef, {
          estado: 'cancelado',
          fechaCancelacion: fechaCancelacionIso,
          canceladoEn: fechaCancelacionIso,
          motivoCancelacion: motivo,
          emailCancelacionEnviado: false, // Flag inicial para enviar la notificación
        });
      });

      // 7. Cargar la configuración del negocio
      config = await getBusinessConfig(db, turnoData?.negocioId || '');

      // 8. Registrar cancelación exitosa en logsCancelaciones
      await db.collection('logsCancelaciones').add({
        turnoId,
        negocioId: turnoData?.negocioId || config.id,
        fechaCancelacion: fechaCancelacionIso,
        nombreCliente: turnoData?.nombreCliente || '',
        emailCliente: turnoData?.emailCliente || '',
        origen: 'http_function',
        exito: true,
        ip: clientIp,
        userAgent,
      } as LogCancelacion);

      // 9. NOTIFICACIÓN AL VIDRIERO:
      // Enviar email informando al vidriero con datos y horario liberado
      if (turnoData && config.emailVidriero) {
        const emailVidrieroContent = generarHtmlAvisoCancelacionVidriero(turnoData, config);
        await enviarEmailOModoSandbox({
          to: config.emailVidriero.trim(),
          subject: emailVidrieroContent.subject,
          html: emailVidrieroContent.html,
          text: emailVidrieroContent.text,
          tipo: 'cancelacion_vidriero',
          negocioId: turnoData.negocioId || config.id,
          turnoId,
          config,
        });

        // Marcar en turno para evitar re-envíos duplicados si el cliente recarga la página
        await turnoRef.update({
          emailCancelacionEnviado: true,
        });
      }

      // 10. Si existe Firebase Cloud Messaging, enviar notificación push al vidriero
      if (turnoData && config.enviarNotificacionesPush !== false) {
        notificarVidrieroPushCancelacion(
          turnoData.negocioId || config.id,
          turnoData.nombreCliente,
          turnoData.fecha,
          turnoData.horaInicio,
          turnoData.horaFin
        ).catch((err) => console.error('Error in glazier push notification:', err));
      }

      // 11. Responder al cliente
      if (wantsJson) {
        res.status(200).json({
          success: true,
          message: 'Tu turno ha sido cancelado con éxito y el horario quedó liberado.',
          turnoId,
          fecha: turnoData?.fecha,
          horaInicio: turnoData?.horaInicio,
        });
        return;
      }

      res.status(200).send(
        renderHtmlResponse({
          success: true,
          title: 'Turno cancelado con éxito',
          message: 'Tu reserva fue cancelada correctamente. El horario quedó disponible en la agenda. Si lo deseas, puedes volver a agendar en cualquier momento.',
          config,
          turno: turnoData || undefined,
        })
      );
    } catch (err: any) {
      console.error('[cancelarTurno] Error during cancellation:', err);

      // Log failure in logsCancelaciones
      await db.collection('logsCancelaciones').add({
        turnoId,
        negocioId: turnoData?.negocioId || 'unknown',
        fechaCancelacion: new Date().toISOString(),
        nombreCliente: turnoData?.nombreCliente || '',
        emailCliente: turnoData?.emailCliente || '',
        origen: 'http_function',
        exito: false,
        error: err?.message || 'Error en cancelación',
        ip: clientIp,
        userAgent,
      } as LogCancelacion);

      const isAlreadyCancelled = err?.code === 'ALREADY_CANCELLED';
      const isInvalidToken = err?.code === 'INVALID_TOKEN' || err?.code === 'NO_HASH';
      const isNotFound = err?.code === 'NOT_FOUND';

      let statusCode = 400;
      let errorTitle = 'No fue posible cancelar el turno';
      let errorMessage = err?.message || 'Ocurrió un error al procesar la cancelación.';

      if (isAlreadyCancelled) {
        statusCode = 200; // Return user-friendly 200 with notice that it was already cancelled
        errorTitle = 'Turno ya cancelado';
        errorMessage = 'Este turno ya había sido cancelado previamente. El horario se encuentra disponible.';
      } else if (isInvalidToken) {
        statusCode = 403;
        errorTitle = 'Token de cancelación inválido';
        errorMessage = 'El enlace de cancelación es incorrecto o ha expirado. Por favor verifica el link recibido en tu email.';
      } else if (isNotFound) {
        statusCode = 404;
        errorTitle = 'Turno no encontrado';
        errorMessage = 'No se encontró un turno con el identificador provisto.';
      }

      if (wantsJson) {
        res.status(statusCode).json({
          success: isAlreadyCancelled,
          error: errorMessage,
          code: err?.code || 'ERROR',
        });
        return;
      }

      res.status(statusCode).send(
        renderHtmlResponse({
          success: isAlreadyCancelled,
          title: errorTitle,
          message: errorMessage,
          config,
        })
      );
    }
  }
);
