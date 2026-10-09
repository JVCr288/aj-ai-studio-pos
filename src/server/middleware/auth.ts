import type { Request, Response, NextFunction } from 'express';
import { safeCompare, parseCookies, hashSha256 } from '../utils/crypto.js';
import { verifyOwnerSession } from '../../services/ownerTokenService.js';
import { getDb } from '../../db/index.js';
import { adminSessions } from '../../db/schema/index.js';
import { eq, and, gt } from 'drizzle-orm';

export interface AdminSessionRecord {
  sessionToken: string;
  tenantId: string;
  userRole: 'PLATFORM_ADMIN' | 'STUDIO_OWNER' | 'STUDIO_ADMIN' | 'STUDIO_STAFF' | 'VIEWER';
  userName: string;
  csrfToken: string;
  createdAt: Date;
  expiresAt: Date;
}

export const memoryAdminSessions = new Map<string, AdminSessionRecord>();

/**
 * Resolves an admin session token against memory cache and persistent database.
 */
export async function resolveAdminSession(sessionToken: string): Promise<AdminSessionRecord | null> {
  if (!sessionToken) return null;

  // 1. Fast in-memory lookup
  const cached = memoryAdminSessions.get(sessionToken);
  if (cached) {
    if (new Date() > cached.expiresAt) {
      memoryAdminSessions.delete(sessionToken);
      return null;
    }
    return cached;
  }

  // 2. Database lookup
  const db = getDb();
  if (db) {
    try {
      const tokenHash = hashSha256(sessionToken);
      const rows = await db
        .select()
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.sessionTokenHash, tokenHash),
            gt(adminSessions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        const record: AdminSessionRecord = {
          sessionToken,
          tenantId: row.tenantId,
          userRole: row.role as AdminSessionRecord['userRole'],
          userName: row.username,
          csrfToken: row.csrfToken,
          createdAt: row.createdAt,
          expiresAt: row.expiresAt,
        };
        memoryAdminSessions.set(sessionToken, record);
        return record;
      }
    } catch (err) {
      console.warn('[Auth] Database session resolution query failed:', err);
    }
  }

  return null;
}

/**
 * Admin Authorization Middleware (Platform operations ONLY, e.g. setup-links, onboarding reviews)
 * A key can never impersonate a studio tenant.
 */
export const verifyAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'ADMIN_DISABLED_IN_PRODUCTION: Production admin API is disabled by default.' });
  }

  const rawAdminKey = req.headers['x-admin-key'] || req.headers['authorization'];
  // dev-admin-secret ONLY when NODE_ENV === 'development' explicitly
  const expectedKey = process.env.ADMIN_API_KEY || (process.env.NODE_ENV === 'development' ? 'dev-admin-secret' : null);

  if (!expectedKey || !rawAdminKey || typeof rawAdminKey !== 'string') {
    return res.status(401).json({ error: 'UNAUTHORIZED: Admin credentials required' });
  }

  const cleanAdminKey = rawAdminKey.startsWith('Bearer ') ? rawAdminKey.slice(7).trim() : rawAdminKey.trim();

  if (!safeCompare(cleanAdminKey, expectedKey)) {
    return res.status(401).json({ error: 'UNAUTHORIZED: Admin credentials required' });
  }
  next();
};

/**
 * Owner Session Verification Middleware with HttpOnly Cookie & CSRF Protection
 */
export const verifyOwnerSessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const cookies = parseCookies(req);
  const sessionToken = cookies['owner_session'] || (req.headers['x-owner-session'] as string) || (req.headers['authorization']?.replace('Bearer ', ''));

  if (!sessionToken) {
    return res.status(401).json({ error: 'UNAUTHORIZED_OWNER_SESSION: Session cookie or token is required.' });
  }

  const session = verifyOwnerSession(sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'EXPIRED_OWNER_SESSION: Session has expired or is invalid.' });
  }

  // CSRF validation for mutating HTTP requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    if (!csrfHeader || csrfHeader !== session.csrfToken) {
      return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED: Invalid CSRF token.' });
    }
  }

  res.locals.ownerSession = session;
  next();
};

/**
 * Studio Admin Session Middleware
 * Tenant identity comes strictly from the validated session.
 * Header-based API key impersonation is permanently removed.
 */
export const verifyStudioAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, private');
  const cookies = parseCookies(req);
  const sessionToken = cookies['aj_admin_session'] || (req.headers['x-admin-session'] as string);

  if (sessionToken) {
    const session = await resolveAdminSession(sessionToken);
    if (!session || new Date() > session.expiresAt) {
      if (session) memoryAdminSessions.delete(sessionToken);
      return res.status(401).json({ error: 'EXPIRED_ADMIN_SESSION: Admin session has expired. Please log in again.' });
    }

    // CSRF check for mutating HTTP methods when relying on ambient cookie
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const hasExplicitHeader = Boolean(req.headers['x-admin-session']);
      if (!hasExplicitHeader) {
        const csrfHeader = req.headers['x-csrf-token'];
        if (!csrfHeader || csrfHeader !== session.csrfToken) {
          return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED: Invalid CSRF token.' });
        }
      }
    }

    res.locals.adminSession = session;
    res.locals.tenantId = session.tenantId;
    return next();
  }

  return res.status(401).json({ error: 'UNAUTHORIZED_ADMIN: Valid studio admin session required.' });
};
