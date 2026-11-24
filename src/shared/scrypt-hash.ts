import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt';

export function hashScryptSecret(secret: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(secret, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}:${salt}:${derived}`;
}

export function verifyScryptSecret(secret: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== SCRYPT_PREFIX) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const actualBuffer = scryptSync(secret, salt, expectedBuffer.length);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
