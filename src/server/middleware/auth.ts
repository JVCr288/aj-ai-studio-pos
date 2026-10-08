import type { Request, Response, NextFunction } from 'express';
import { safeCompare, parseCookies } from '../utils/crypto.js';
import { verifyOwnerSession } from '../../services/ownerTokenService.js';

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

// Admin Authorization Middleware (No secrets exposed to frontend)
export const verifyAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'ADMIN_DISABLED_IN_PRODUCTION: Production admin API is disabled by default.' });
  }

  const rawAdminKey = req.headers['x-admin-key'] || req.headers['authorization'];
  const expectedKey = process.env.ADMIN_API_KEY || (process.env.NODE_ENV !== 'production' ? 'dev-admin-secret' : null);

  if (!expectedKey || !rawAdminKey || typeof rawAdminKey !== 'string') {
    return res.status(401).json({ error: 'UNAUTHORIZED: Admin credentials required' });
  }

  const cleanAdminKey = rawAdminKey.startsWith('Bearer ') ? rawAdminKey.slice(7).trim() : rawAdminKey.trim();

  if (!safeCompare(cleanAdminKey, expectedKey)) {
    return res.status(401).json({ error: 'UNAUTHORIZED: Admin credentials required' });
  }
  next();
};

// Owner Session Verification Middleware with HttpOnly Cookie & CSRF Protection
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

// Studio Admin Session Middleware
export const verifyStudioAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, private');
  const cookies = parseCookies(req);
  const sessionToken = cookies['aj_admin_session'] || (req.headers['x-admin-session'] as string);

  // 1. Session Cookie Auth Path
  if (sessionToken) {
    const session = memoryAdminSessions.get(sessionToken);
    if (!session || new Date() > session.expiresAt) {
      if (session) memoryAdminSessions.delete(sessionToken);
      return res.status(401).json({ error: 'EXPIRED_ADMIN_SESSION: Admin session has expired. Please log in again.' });
    }

    // CSRF check for mutating HTTP methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfHeader || csrfHeader !== session.csrfToken) {
        return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED: Invalid CSRF token.' });
      }
    }

    res.locals.adminSession = session;
    res.locals.tenantId = session.tenantId;
    return next();
  }

  // 2. Dev API Key Header Fallback Path
  const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
  const expectedKey = process.env.ADMIN_API_KEY || (process.env.NODE_ENV !== 'production' ? 'dev-admin-secret' : null);
  const cleanAdminKey = typeof adminKey === 'string' ? (adminKey.startsWith('Bearer ') ? adminKey.slice(7).trim() : adminKey.trim()) : '';

  if (expectedKey && cleanAdminKey && safeCompare(cleanAdminKey, expectedKey)) {
    const requestedTenant = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'aj-ai-studio';
    res.locals.tenantId = requestedTenant;
    res.locals.adminSession = {
      sessionToken: 'hdr_key',
      tenantId: requestedTenant,
      userRole: 'PLATFORM_ADMIN',
      userName: 'Platform Developer',
      csrfToken: 'hdr_csrf',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    };
    return next();
  }

  return res.status(401).json({ error: 'UNAUTHORIZED_ADMIN: Valid admin authentication required.' });
};
