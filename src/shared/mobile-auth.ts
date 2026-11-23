import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const SCRYPT_PREFIX = 'scrypt';
const DEFAULT_MOBILE_JWT_SECRET = 'school-coupon-mobile-dev-secret';

export interface MobileTokenPayload {
  sub: string;
  role: 'parent' | 'merchant';
  name: string;
  merchantCode?: string;
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(pin, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}:${salt}:${derived}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== SCRYPT_PREFIX) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const actualBuffer = scryptSync(pin, salt, expectedBuffer.length);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function getMobileJwtSecret(): string {
  return process.env.MOBILE_JWT_SECRET ?? DEFAULT_MOBILE_JWT_SECRET;
}

export function signMobileToken(payload: MobileTokenPayload): string {
  return jwt.sign(payload, getMobileJwtSecret(), { expiresIn: '30d' });
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getMobileJwtSecret());
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'sub' in decoded &&
      'role' in decoded &&
      'name' in decoded &&
      (decoded.role === 'parent' || decoded.role === 'merchant')
    ) {
      return {
        sub: String(decoded.sub),
        role: decoded.role,
        name: String(decoded.name),
        merchantCode:
          'merchantCode' in decoded && typeof decoded.merchantCode === 'string'
            ? decoded.merchantCode
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
