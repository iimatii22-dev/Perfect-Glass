import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { resendApiKey } from './config';
import { generarTokenCancelacionSeguro, calcularHashToken } from './crypto';
import { generarHtmlEmailConfirmacion } from './emailTemplates';
import { enviarEmailOModoSandbox } from './resendService';
import { TurnoDocument, NegocioConfig } from './types';

/**
 * Validates basic email syntax.
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Helper to fetch business configuration from 'negocios' or 'configuracion'.
 */
export async function getBusinessConfig(
  db: admin.firestore.Firestore,
  negocioId: string
): Promise<NegocioConfig> {
  const defaultFallback: NegocioConfig = {
    id: negocioId || 'perfect-glass',
    nombreNegocio: 'Perfect Glass',
    emailVidriero: 'vidrieria@perfectglass.app',
    emailRemitente: 'turnos@perfectglass.app',
    colorPrimario: '#0284c7',
    enviarEmailsAutomaticos: true,
    enviarNotificacionesPush: true,
  };

  try {
    // 1. Check in 'negocios' collection
    if (negocioId) {
      const snapNegocios = await db.collection('negocios').doc(negocioId).get();
      if (snapNegocios.exists) {
        return { id: snapNegocios.id, ...defaultFallback, ...snapNegocios.data() } as NegocioConfig;
      }
    }

    // 2. Check in 'configuracion' collection
    const targetConfigId = negocioId || 'perfect-glass';
    const snapConfig = await db.collection('configuracion').doc(targetConfigId).get();
    if (snapConfig.exists) {
      return { id: snapConfig.id, ...defaultFallback, ...snapConfig.data() } as NegocioConfig;
    }

    // 3. Check fallback 'perfect-glass' in 'configuracion'
    const snapDefault = await db.collection('configuracion').doc('perfect-glass').get();
    if (snapDefault.exists) {
      return { id: snapDefault.id, ...defaultFallback, ...snapDefault.data() } as NegocioConfig;
    }
  } catch (e) {
    console.error('Error fetching business config:', e);
  }

  return defaultFallback;
}

/**
 * Helper to determine the public app base URL for cancellation links.
 */
function getAppBaseUrl(config: NegocioConfig): string {
  if (config.linkAgendamientoPublico && config.linkAgendamientoPublico.startsWith('http')) {
    try {
      const u = new URL(config.linkAgendamientoPublico);
      return u.origin;
    } catch {
      // ignore
    }
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG
    ? JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId
    : '';

  if (projectId) {
    return `https://${projectId}.web.app`;
  }

  return 'https://perfectglass.app';
}

/**
 * Cloud Function 2nd Gen triggered whenever a new document is created in turnos/{turnoId}.
 */
export const onTurnoCreated = onDocumentCreated(
  {
    document: 'turnos/{turnoId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log('No data associated with the event.');
      return;
    }

    const turnoId = event.params.turnoId;
    const turno = snap.data() as TurnoDocument;
    const db = admin.firestore();

    console.log(`[onTurnoCreated] Triggered for turno: ${turnoId}, estado: ${turno.estado}`);

    // 1. Verificar que el turno tenga estado "confirmado"
    if (turno.estado !== 'confirmado') {
      console.log(`[onTurnoCreated] Turno ${turnoId} is not 'confirmado'. Skipping.`);
      return;
    }

    // 2. Verificar que emailCliente sea válido
    if (!isValidEmail(turno.emailCliente)) {
      console.warn(`[onTurnoCreated] Turno ${turnoId} has invalid emailCliente: "${turno.emailCliente}". Skipping.`);
      await db.collection('logsEmails').add({
        destinatario: turno.emailCliente || 'desconocido',
        asunto: 'Error: email no válido al agendar turno',
        tipo: 'confirmacion_cliente',
        negocioId: turno.negocioId || 'default',
        turnoId,
        estado: 'error',
        error: `Email de cliente inválido: ${turno.emailCliente}`,
        fecha: new Date().toISOString(),
      });
      return;
    }

    // 3. Evitar envíos duplicados si ya fue marcado
    if (turno.emailConfirmacionEnviado === true) {
      console.log(`[onTurnoCreated] Email already sent for turno ${turnoId}. Skipping.`);
      return;
    }

    // 4. Obtener la configuración del negocio desde la colección "negocios" o "configuracion"
    const config = await getBusinessConfig(db, turno.negocioId);

    // Si los emails automáticos están apagados explícitamente en el negocio
    if (config.enviarEmailsAutomaticos === false) {
      console.log(`[onTurnoCreated] enviarEmailsAutomaticos is disabled for negocio ${turno.negocioId}.`);
      return;
    }

    // 5. Generar token de cancelación y su hash
    // El token en texto plano SOLO existirá en memoria para armar el link del email
    const tokenPlano = generarTokenCancelacionSeguro();
    const tokenHash = calcularHashToken(tokenPlano);

    // 6. Actualizar el turno con el hash y estado inicial
    const turnoDocRef = db.collection('turnos').doc(turnoId);
    await turnoDocRef.update({
      tokenCancelacionHash: tokenHash,
      emailConfirmacionEnviado: false,
      fechaCancelacion: null,
      emailCancelacionEnviado: false,
    });

    // 7. Construir enlace de cancelación seguro
    // Formato obligatorio: https://DOMINIO_DE_LA_APP/cancelar?token=TOKEN&turno=TURNO_ID
    const appBaseUrl = getAppBaseUrl(config);
    const linkCancelacion = `${appBaseUrl}/cancelar?token=${tokenPlano}&turno=${turnoId}`;

    // 8. Generar contenido HTML y texto del email
    const emailContent = generarHtmlEmailConfirmacion(turno, config, linkCancelacion);

    // 9. Enviar mediante Resend (o modo sandbox si está activo)
    const result = await enviarEmailOModoSandbox({
      to: turno.emailCliente.trim(),
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      tipo: 'confirmacion_cliente',
      negocioId: turno.negocioId || config.id,
      turnoId,
      config,
      linkCancelacion,
    });

    // 10. Si el envío fue exitoso (o simulado), marcar emailConfirmacionEnviado = true
    if (result.success) {
      await turnoDocRef.update({
        emailConfirmacionEnviado: true,
      });
      console.log(`[onTurnoCreated] Email confirmation processed successfully for turno ${turnoId} (simulated=${result.simulated}).`);
    } else {
      // Si el envío falla, el error ya fue registrado en logsEmails por enviarEmailOModoSandbox
      // Se deja emailConfirmacionEnviado: false para permitir reintentar sin duplicar
      console.error(`[onTurnoCreated] Failed to send email for turno ${turnoId}: ${result.error}`);
    }
  }
);
