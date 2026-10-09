import crypto from 'crypto';
import type { Request } from 'express';

/**
 * Constant-time safe string comparison preventing timing attacks.
 */
export function safeCompare(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Parses HTTP request Cookie header into key-value pairs safely.
 */
export function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const key = parts.shift()?.trim();
      if (key) {
        list[key] = decodeURIComponent(parts.join('='));
      }
    });
  }
  return list;
}

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Helper to parse base64 Data URL or raw base64 string
 */
export function parseBase64Image(
  dataString: string,
  fallbackMime?: string
): { mimeType: string; base64Data: string; byteLength: number; isMalformed: boolean } {
  let mimeType = fallbackMime || 'image/png';
  let base64Data = dataString.trim();

  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) {
      return { mimeType: '', base64Data: '', byteLength: 0, isMalformed: true };
    }
    mimeType = match[1].toLowerCase();
    base64Data = match[2].replace(/\s/g, '');
  } else {
    // If not starting with data:, check for valid base64 character set
    if (!/^[A-Za-z0-9+/=\s]+$/.test(base64Data)) {
      return { mimeType: '', base64Data: '', byteLength: 0, isMalformed: true };
    }
    base64Data = base64Data.replace(/\s/g, '');
  }

  // Calculate approximate decoded binary byte size of base64 data
  const byteLength = Math.round((base64Data.length * 3) / 4);
  return { mimeType, base64Data, byteLength, isMalformed: false };
}

/**
 * Hash secret with scrypt and a salt. Format: scrypt:<saltHex>:<keyHex>
 */
export async function hashWithScrypt(secret: string, customSaltHex?: string): Promise<string> {
  const salt = customSaltHex ? Buffer.from(customSaltHex, 'hex') : crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.scrypt(secret, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt.toString('hex')}:${(derivedKey as Buffer).toString('hex')}`);
    });
  });
}

/**
 * Verify secret against scrypt hash in format scrypt:<saltHex>:<keyHex>
 */
export async function verifyWithScrypt(secret: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = Buffer.from(parts[1], 'hex');
    const expectedKey = Buffer.from(parts[2], 'hex');
    return new Promise((resolve) => {
      crypto.scrypt(secret, salt, expectedKey.length, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          resolve(crypto.timingSafeEqual(derivedKey as Buffer, expectedKey));
        } catch {
          resolve(false);
        }
      });
    });
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 hash of a string
 */
export function hashSha256(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

/**
 * Single-use Manager Override Token Store (2-minute lifetime)
 */
interface OverrideTokenRecord {
  token: string;
  tenantId: string;
  managerId: string;
  action: string;
  expiresAt: number;
}
const overrideTokens = new Map<string, OverrideTokenRecord>();

export function createManagerOverrideToken(tenantId: string, managerId: string, action: string): string {
  const token = `ovr_${crypto.randomBytes(24).toString('hex')}`;
  overrideTokens.set(token, {
    token,
    tenantId,
    managerId,
    action,
    expiresAt: Date.now() + 2 * 60 * 1000,
  });
  return token;
}

export function verifyAndConsumeOverrideToken(token: string, tenantId: string, expectedAction?: string): boolean {
  if (!token) return false;
  const record = overrideTokens.get(token);
  if (!record) return false;
  overrideTokens.delete(token); // Single-use consumption
  if (Date.now() > record.expiresAt) return false;
  if (record.tenantId !== tenantId) return false;
  if (expectedAction && record.action !== expectedAction) return false;
  return true;
}

