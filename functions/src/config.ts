import { defineSecret } from 'firebase-functions/params';

/**
 * Secret parameter for Resend API Key stored securely in Google Cloud Secret Manager.
 * Set via: firebase functions:secrets:set RESEND_API_KEY
 */
export const resendApiKey = defineSecret('RESEND_API_KEY');
