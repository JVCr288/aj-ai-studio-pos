import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { safeCompare } from '../utils/crypto.js';
import {
  verifyAdminAuth,
  verifyStudioAdminMiddleware,
  memoryAdminSessions,
  AdminSessionRecord,
} from '../middleware/auth.js';
import { createSetupLink } from '../../services/ownerTokenService.js';
import { getOnboardingSubmissions } from '../../services/serverOnboardingService.js';

export const adminRouter = Router();

// Admin / Dev Controlled Link Generation
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

// Developer Review Submission Fetcher
adminRouter.get('/api/admin/onboarding/submissions', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.projectId as string) || 'proj-aj-studio-01';
    const submissions = await getOnboardingSubmissions(projectId);
    return res.json({ success: true, projectId, submissions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch review submissions' });
  }
});

// Admin Login Endpoint
adminRouter.post('/api/admin/login', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  const { tenantId, adminKey } = req.body || {};
  const targetTenant = tenantId || 'aj-ai-studio';

  const validTenants = ['aj-ai-studio', 'neutral-studio-tenant', 'nocturne', 'akk-photo-studio'];
  if (!targetTenant || typeof targetTenant !== 'string' || !validTenants.includes(targetTenant)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_TENANT',
      error: 'INVALID_TENANT: Specified tenant identity is unrecognized or unsupported.',
    });
  }

  const expectedKey = process.env.ADMIN_API_KEY || (process.env.NODE_ENV !== 'production' ? 'dev-admin-secret' : '');
  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      code: 'ADMIN_NOT_CONFIGURED',
      error: 'ADMIN_NOT_CONFIGURED: Server administrator credential is not configured.',
    });
  }

  if (!adminKey || typeof adminKey !== 'string') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIAL',
      error: 'INVALID_CREDENTIAL: Admin access key credential is required.',
    });
  }

  if (!safeCompare(adminKey, expectedKey)) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_CREDENTIAL',
      error: 'INVALID_CREDENTIAL: Incorrect admin access key credential.',
    });
  }

  const sessionToken = `admin_sess_${crypto.randomBytes(32).toString('hex')}`;
  const csrfToken = `admin_csrf_${crypto.randomBytes(16).toString('hex')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000);

  const userRole: 'PLATFORM_ADMIN' | 'STUDIO_ADMIN' | 'VIEWER' = 'STUDIO_ADMIN';
  const userName = 'AJ AI Studio Admin';

  const session: AdminSessionRecord = {
    sessionToken,
    tenantId: targetTenant,
    userRole,
    userName,
    csrfToken,
    createdAt: now,
    expiresAt,
  };

  memoryAdminSessions.set(sessionToken, session);

  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `aj_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}; Max-Age=86400`
  );

  return res.json({
    success: true,
    tenantId: targetTenant,
    userRole,
    userName: session.userName,
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
adminRouter.post('/api/admin/logout', (req: Request, res: Response) => {
  res.setHeader('Set-Cookie', 'aj_admin_session=; Path=/; HttpOnly; Max-Age=0');
  return res.json({ success: true, message: 'Logged out of admin panel.' });
});
