import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { resendApiKey } from './config';
import { NegocioConfig, LogEmail, EmailSimulado } from './types';

let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    const key = resendApiKey.value();
    if (!key) {
      throw new Error('RESEND_API_KEY secret is not defined or empty.');
    }
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  tipo: LogEmail['tipo'];
  negocioId: string;
  turnoId?: string;
  config: NegocioConfig;
  linkCancelacion?: string;
  isSandbox?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  simulated: boolean;
  resendId?: string;
  error?: string;
}

/**
 * Sends an email using Resend or simulates it if Sandbox mode is active.
 * Logs all attempts and outcomes to the "logsEmails" collection.
 */
export async function enviarEmailOModoSandbox(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const db = admin.firestore();
  const fechaIso = new Date().toISOString();

  // Determine if sandbox mode is active (explicit flag or business setting)
  const isSandbox = options.isSandbox || options.config.esSandbox === true;

  if (isSandbox) {
    // Save to emailsSimulados
    const emailSimulado: EmailSimulado = {
      tipoDeEmail: options.tipo,
      destinatario: options.to,
      asunto: options.subject,
      cuerpo: options.text,
      html: options.html,
      linkCancelacion: options.linkCancelacion,
      fecha: fechaIso,
      negocioId: options.negocioId,
      turnoId: options.turnoId,
    };

    const docRef = await db.collection('emailsSimulados').add(emailSimulado);

    // Also register in logsEmails
    await db.collection('logsEmails').add({
      destinatario: options.to,
      asunto: options.subject,
      tipo: options.tipo,
      negocioId: options.negocioId,
      turnoId: options.turnoId,
      estado: 'simulado',
      resendId: `simulated-${docRef.id}`,
      fecha: fechaIso,
      esSandbox: true,
    });

    return {
      success: true,
      simulated: true,
      resendId: docRef.id,
    };
  }

  // Real delivery via Resend
  try {
    const resend = getResendClient();

    // From formatting: use configured sender, or domain, or Resend sandbox fallback
    let fromAddress = 'onboarding@resend.dev';
    if (options.config.emailRemitente && options.config.emailRemitente.includes('@')) {
      fromAddress = options.config.emailRemitente;
    } else if (options.config.dominioRemitente) {
      fromAddress = `turnos@${options.config.dominioRemitente}`;
    }

    const businessName = options.config.nombreNegocio || 'Perfect Glass';
    const fromHeader = `${businessName} <${fromAddress}>`;

    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('Error from Resend API:', error);
      // Log error to logsEmails
      await db.collection('logsEmails').add({
        destinatario: options.to,
        asunto: options.subject,
        tipo: options.tipo,
        negocioId: options.negocioId,
        turnoId: options.turnoId,
        estado: 'error',
        error: error.message || JSON.stringify(error),
        fecha: fechaIso,
        esSandbox: false,
      });

      return {
        success: false,
        simulated: false,
        error: error.message,
      };
    }

    // Success log
    const resendId = data?.id || 'resend-ok';
    await db.collection('logsEmails').add({
      destinatario: options.to,
      asunto: options.subject,
      tipo: options.tipo,
      negocioId: options.negocioId,
      turnoId: options.turnoId,
      estado: 'enviado',
      resendId,
      fecha: fechaIso,
      esSandbox: false,
    });

    return {
      success: true,
      simulated: false,
      resendId,
    };
  } catch (err: any) {
    console.error('Exception calling Resend:', err);
    await db.collection('logsEmails').add({
      destinatario: options.to,
      asunto: options.subject,
      tipo: options.tipo,
      negocioId: options.negocioId,
      turnoId: options.turnoId,
      estado: 'error',
      error: err?.message || 'Error desconocido al enviar email',
      fecha: fechaIso,
      esSandbox: false,
    });

    return {
      success: false,
      simulated: false,
      error: err?.message || 'Error desconocido',
    };
  }
}
