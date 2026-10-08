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
