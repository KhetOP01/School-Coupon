import jwt from 'jsonwebtoken';
import { hashScryptSecret, verifyScryptSecret } from './scrypt-hash';

const DEFAULT_MOBILE_JWT_SECRET = 'school-coupon-mobile-dev-secret';

export interface MobileTokenPayload {
  sub: string;
  role: 'parent' | 'merchant';
  name: string;
  merchantCode?: string;
}

export function hashPin(pin: string): string {
  return hashScryptSecret(pin);
}

export function verifyPin(pin: string, storedHash: string): boolean {
  return verifyScryptSecret(pin, storedHash);
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
