import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { safeCompare, verifyWithScrypt, hashSha256 } from '../utils/crypto.js';
import {
  verifyAdminAuth,
  verifyStudioAdminMiddleware,
  memoryAdminSessions,
  AdminSessionRecord,
} from '../middleware/auth.js';
import { adminLoginRateLimiter } from '../middleware/rateLimiters.js';
import { createSetupLink } from '../../services/ownerTokenService.js';
import { getOnboardingSubmissions } from '../../services/serverOnboardingService.js';
import { getDb } from '../../db/index.js';
import { adminUsers, adminSessions, productionStudios } from '../../db/schema/index.js';
import { eq, or, and } from 'drizzle-orm';

export const adminRouter = Router();

// Admin / Dev Controlled Link Generation (Platform Ops Only)
adminRouter.post('/api/admin/setup-links', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, tenantId, expiresInHours, studioDisplayName } = req.body;
    const targetProject = projectId || 'proj-aj-studio-01';
    const targetTenant = tenantId || 'aj-ai-studio';

    const linkInfo = await createSetupLink(targetProject, targetTenant, {
      expiresInHours: expiresInHours ? parseInt(expiresInHours, 10) : 168,
      studioDisplayName: studioDisplayName || 'AJ AI Studio POS & Atelier',
    });

    return res.json({
      success: true,
      rawToken: linkInfo.rawToken,
      linkId: linkInfo.linkId,
      expiresAt: linkInfo.expiresAt,
      setupUrl: `/setup/${linkInfo.rawToken}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create setup link' });
  }
});

// Developer Review Submission Fetcher (Platform Ops Only)
adminRouter.get('/api/admin/onboarding/submissions', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.projectId as string) || 'proj-aj-studio-01';
    const submissions = await getOnboardingSubmissions(projectId);
    return res.json({ success: true, projectId, submissions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch review submissions' });
  }
});

import { isMemoryDemoAllowed, isDemoTenantSlug, DEMO_TENANT_SLUGS } from '../utils/storageMode.js';

// Per-Tenant Studio Admin Login Endpoint
adminRouter.post('/api/admin/login', adminLoginRateLimiter, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  const { tenantSlug, tenantId, username, password } = req.body || {};
  const targetTenant = (tenantSlug || tenantId || 'aj-ai-studio').trim();
  const targetUser = (username || 'admin').trim();
  const inputSecret = (password || '').trim();

  if (!targetTenant) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TENANT',
      error: 'INVALID_TENANT: Tenant slug is required.',
    });
  }

  const db = getDb();

  // 1. Verify tenant exists
  let tenantExists = false;
  let studioDisplayName = 'Studio Operations Desk';

  if (db) {
    try {
      const studios = await db
        .select()
        .from(productionStudios)
        .where(
          or(
            eq(productionStudios.slug, targetTenant),
            eq(productionStudios.legacyStudioId, targetTenant)
          )
        )
        .limit(1);

      if (studios.length > 0) {
        tenantExists = true;
        studioDisplayName = studios[0].displayName;
      }
    } catch (err) {
      console.error('[AdminLogin] Tenant query error:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database tenant query failed.',
      });
    }
  } else {
    // Memory demo mode allows only recognized demo slugs
    if (isMemoryDemoAllowed() && isDemoTenantSlug(targetTenant)) {
      tenantExists = true;
    }
  }

  if (!tenantExists) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TENANT',
      error: 'INVALID_TENANT: Specified studio tenant does not exist or is unrecognized.',
    });
  }

  if (!inputSecret) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIAL',
      error: 'INVALID_CREDENTIAL: Password is required.',
    });
  }

  // 2. Authenticate user credentials
  let authenticatedUser: { id: string; username: string; role: AdminSessionRecord['userRole'] } | null = null;

  if (db) {
    try {
      const users = await db
        .select()
        .from(adminUsers)
        .where(
          and(
            eq(adminUsers.tenantId, targetTenant),
            eq(adminUsers.username, targetUser),
            eq(adminUsers.isActive, true)
          )
        )
        .limit(1);

      if (users.length > 0) {
        const user = users[0];
        const isMatch = await verifyWithScrypt(inputSecret, user.passwordHash);
        if (isMatch) {
          authenticatedUser = {
            id: user.id,
            username: user.username,
            role: user.role as AdminSessionRecord['userRole'],
          };
        }
      }
    } catch (err) {
      console.error('[AdminLogin] User query error:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Database authentication query failed.',
      });
    }
  } else {
    // Demo fallback authentication allowed ONLY under isMemoryDemoAllowed() and for demo slugs
    if (isMemoryDemoAllowed() && isDemoTenantSlug(targetTenant)) {
      if (inputSecret === 'admin123') {
        authenticatedUser = {
          id: `usr-demo-${targetTenant}`,
          username: targetUser,
          role: 'STUDIO_ADMIN',
        };
      }
    }
  }

  if (!authenticatedUser) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIAL',
      error: 'INVALID_CREDENTIAL: Incorrect credentials for specified studio tenant.',
    });
  }

  // 3. Issue persistent session
  const sessionToken = `admin_sess_${crypto.randomBytes(32).toString('hex')}`;
  const csrfToken = `admin_csrf_${crypto.randomBytes(16).toString('hex')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000);

  const sessionRecord: AdminSessionRecord = {
    sessionToken,
    tenantId: targetTenant,
    userRole: authenticatedUser.role,
    userName: `${targetUser} (${studioDisplayName})`,
    csrfToken,
    createdAt: now,
    expiresAt,
  };

  // Persist to database if available
  if (db) {
    try {
      const sessionTokenHash = hashSha256(sessionToken);
      await db.insert(adminSessions).values({
        sessionTokenHash,
        tenantId: targetTenant,
        userId: authenticatedUser.id,
        username: authenticatedUser.username,
        role: authenticatedUser.role,
        csrfToken,
        expiresAt,
        createdAt: now,
      });
    } catch (err) {
      console.error('[AdminLogin] Failed to persist session row to DB:', err);
      return res.status(503).json({
        success: false,
        code: 'STORAGE_UNAVAILABLE',
        retryable: true,
        error: 'STORAGE_UNAVAILABLE: Failed to persist admin session to database.',
      });
    }
  }

  // Cache in-memory
  memoryAdminSessions.set(sessionToken, sessionRecord);

  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `aj_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}; Max-Age=86400`
  );

  return res.json({
    success: true,
    tenantId: targetTenant,
    userRole: authenticatedUser.role,
    userName: sessionRecord.userName,
    csrfToken,
  });
});

// Admin Session Check Endpoint
adminRouter.get('/api/admin/session', verifyStudioAdminMiddleware, (req: Request, res: Response) => {
  const session = res.locals.adminSession as AdminSessionRecord;
  return res.json({
    authenticated: true,
    tenantId: session.tenantId,
    userRole: session.userRole,
    userName: session.userName,
    csrfToken: session.csrfToken,
  });
});

// Admin Logout Endpoint
adminRouter.post('/api/admin/logout', async (req: Request, res: Response) => {
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.match(/aj_admin_session=([^;]+)/);
    if (match) {
      const rawToken = decodeURIComponent(match[1].trim());
      memoryAdminSessions.delete(rawToken);
      const db = getDb();
      if (db) {
        try {
          const tokenHash = hashSha256(rawToken);
          await db.delete(adminSessions).where(eq(adminSessions.sessionTokenHash, tokenHash));
        } catch {
          // Safe delete fallthrough
        }
      }
    }
  }

  res.setHeader('Set-Cookie', 'aj_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ success: true, message: 'Logged out of admin panel.' });
});
