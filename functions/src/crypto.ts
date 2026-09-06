import * as crypto from 'crypto';

/**
 * Generates a 32-byte (64 hex characters) cryptographically secure random token.
 * This is sufficiently long, high-entropy, and impossible to guess.
 */
export function generarTokenCancelacionSeguro(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculates SHA-256 hash of a cancellation token string.
 */
export function calcularHashToken(token: string): string {
  if (!token || typeof token !== 'string') {
    return '';
  }
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Compares a user-provided token with a stored SHA-256 hash in a timing-safe manner
 * to protect against timing attacks.
 */
export function verificarTokenCancelacion(tokenRecibido: string, hashAlmacenado: string): boolean {
  if (!tokenRecibido || !hashAlmacenado) {
    return false;
  }
  const hashCalculado = calcularHashToken(tokenRecibido);
  const bufferCalculado = Buffer.from(hashCalculado, 'utf8');
  const bufferAlmacenado = Buffer.from(hashAlmacenado.trim(), 'utf8');

  if (bufferCalculado.length !== bufferAlmacenado.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferCalculado, bufferAlmacenado);
}
