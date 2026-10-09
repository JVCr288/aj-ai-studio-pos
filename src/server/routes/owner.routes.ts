import { Router, Request, Response } from 'express';
import { setupRateLimiter } from '../middleware/rateLimiters.js';
import { verifyOwnerSessionMiddleware } from '../middleware/auth.js';
import {
  verifySetupToken,
  createOwnerSession,
} from '../../services/ownerTokenService.js';
import {
  authorizeAssetUpload,
  confirmAssetUpload,
  registerSimulatedUpload,
} from '../../services/supabaseStorageService.js';
import {
  getOnboardingProjectDraft,
  saveOnboardingProjectDraft,
  submitOnboardingProjectSnapshot,
  getOnboardingSubmissions,
} from '../../services/serverOnboardingService.js';

export const ownerRouter = Router();

// Setup Token Initial Resolution & Verification Endpoint
ownerRouter.get('/api/setup/:token', setupRateLimiter, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const rawToken = req.params.token;
    const verification = await verifySetupToken(rawToken);

    if (verification.status === 'NOT_FOUND') {
      return res.status(404).json({ status: 'NOT_FOUND', error: 'Setup link is invalid or does not exist.' });
    }
    if (verification.status === 'EXPIRED') {
      return res.status(410).json({ status: 'EXPIRED', error: 'Setup link has expired.' });
    }
    if (verification.status === 'REVOKED') {
      return res.status(403).json({ status: 'REVOKED', error: 'Setup link has been revoked.' });
    }
    if (verification.status === 'ALREADY_SUBMITTED') {
      return res.json({
        status: 'ALREADY_SUBMITTED',
        projectId: verification.projectId,
        tenantId: verification.tenantId,
        studioDisplayName: verification.studioDisplayName,
      });
    }

    return res.json({
      status: 'VALID',
      projectId: verification.projectId,
      tenantId: verification.tenantId,
      studioDisplayName: verification.studioDisplayName,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to verify setup token' });
  }
});

// Setup Token Exchange Endpoint (Sets HttpOnly owner_session cookie, returns CSRF token, NO sessionToken in body)
ownerRouter.post('/api/setup/exchange', setupRateLimiter, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const { rawToken } = req.body;
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({ error: 'MISSING_RAW_TOKEN' });
    }

    const verification = await verifySetupToken(rawToken);
    if (verification.status !== 'VALID' && verification.status !== 'ALREADY_SUBMITTED') {
      return res.status(403).json({ error: `SETUP_LINK_${verification.status}` });
    }

    const session = createOwnerSession(verification.projectId!, verification.tenantId!);

    // Set HttpOnly, SameSite cookie (Secure in production)
    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      `owner_session=${session.sessionToken}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}; Max-Age=86400`
    );

    return res.json({
      success: true,
      status: verification.status,
      csrfToken: session.csrfToken,
      projectId: session.projectId,
      tenantId: session.tenantId,
      studioDisplayName: verification.studioDisplayName,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to exchange setup token' });
  }
});

// Owner Logout Endpoint (Clears HttpOnly Cookie)
ownerRouter.post('/api/owner/logout', setupRateLimiter, (req: Request, res: Response) => {
  res.setHeader('Set-Cookie', 'owner_session=; Path=/; HttpOnly; Max-Age=0');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Owner Authenticated Draft Read Endpoint
ownerRouter.get('/api/owner/draft', setupRateLimiter, verifyOwnerSessionMiddleware, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    const session = res.locals.ownerSession;
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED: Production persistence unavailable.' });
    }

    const draft = await getOnboardingProjectDraft(session.projectId, session.tenantId);
    return res.json({ success: true, draft });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch onboarding draft' });
  }
});

// Owner Authenticated Draft Save Endpoint (with Revision & CSRF Protection)
ownerRouter.put('/api/owner/draft', setupRateLimiter, verifyOwnerSessionMiddleware, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    const session = res.locals.ownerSession;
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED: Production persistence unavailable.' });
    }

    const projectData = req.body;
    if (!projectData || !projectData.project) {
      return res.status(400).json({ error: 'INVALID_DRAFT_PAYLOAD' });
    }

    const targetSlug = projectData.project.projectSlug || session.tenantId;
    if (typeof targetSlug === 'string' && (targetSlug.startsWith('demo-') || targetSlug === 'sample-studio')) {
      return res.status(400).json({
        message: 'The slug prefixes "demo-" and "sample-studio" are reserved for demonstration environments. Please choose a custom identifier.',
      });
    }

    const updated = await saveOnboardingProjectDraft(
      session.projectId,
      session.tenantId,
      projectData
    );

    return res.json({ success: true, draft: updated });
  } catch (err: any) {
    if (err?.message?.includes('STALE_WRITE_REJECTED')) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: err?.message || 'Failed to save onboarding draft' });
  }
});

// Owner Authenticated Asset Authorization Endpoint
ownerRouter.post('/api/owner/assets/authorize', setupRateLimiter, verifyOwnerSessionMiddleware, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    const session = res.locals.ownerSession;
    const { role, fileName, mimeType, fileSizeBytes } = req.body;

    if (!role || !fileName || !mimeType || !fileSizeBytes) {
      return res.status(400).json({ error: 'MISSING_ASSET_METADATA_FIELDS' });
    }

    const auth = await authorizeAssetUpload(
      session.projectId,
      session.tenantId,
      role,
      fileName,
      mimeType,
      parseInt(fileSizeBytes, 10)
    );

    return res.json({ success: true, authorization: auth });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Asset authorization failed' });
  }
});

// Binary Bytes Asset Upload Destination (Simulated / Local Dev Destination)
ownerRouter.post('/api/simulated-upload/:assetId', setupRateLimiter, (req: Request, res: Response) => {
  const { storageKey, sizeBytes, mimeType } = req.body || {};
  const key = storageKey || (req.headers['x-storage-key'] as string);

  if (!key) {
    return res.status(400).json({ error: 'MISSING_STORAGE_KEY' });
  }

  registerSimulatedUpload(key, sizeBytes || 1024, mimeType || 'image/png');
  return res.json({ success: true, storageKey: key });
});

// Owner Authenticated Asset Confirmation Endpoint (Verifies object existence before READY)
ownerRouter.post('/api/owner/assets/confirm', setupRateLimiter, verifyOwnerSessionMiddleware, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    const session = res.locals.ownerSession;
    const { assetId, storageKey } = req.body;

    if (!assetId || !storageKey) {
      return res.status(400).json({ error: 'MISSING_CONFIRMATION_FIELDS' });
    }

    const confirmation = await confirmAssetUpload(assetId, storageKey);
    return res.json({
      success: true,
      assetId: confirmation.assetId,
      projectId: session.projectId,
      tenantId: session.tenantId,
      uploadStatus: confirmation.uploadStatus,
    });
  } catch (err: any) {
    if (err?.message?.includes('OBJECT_NOT_FOUND')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err?.message || 'Asset confirmation failed' });
  }
});

// Owner Authenticated Submission Endpoint
ownerRouter.post('/api/owner/submit', setupRateLimiter, verifyOwnerSessionMiddleware, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    const session = res.locals.ownerSession;
    const projectData = req.body;
    const targetSlug = projectData?.project?.projectSlug || session.tenantId;
    if (typeof targetSlug === 'string' && (targetSlug.startsWith('demo-') || targetSlug === 'sample-studio')) {
      return res.status(400).json({
        message: 'The slug prefixes "demo-" and "sample-studio" are reserved for demonstration environments. Please choose a custom identifier.',
      });
    }

    const submitted = await submitOnboardingProjectSnapshot(
      session.projectId,
      session.tenantId,
      projectData
    );

    return res.json({ success: true, project: submitted });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Submission failed' });
  }
});

// Owner Authenticated Project Status Endpoint
ownerRouter.get('/api/owner/status', setupRateLimiter, verifyOwnerSessionMiddleware, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    const session = res.locals.ownerSession;
    const draft = await getOnboardingProjectDraft(session.projectId, session.tenantId);
    const submissions = await getOnboardingSubmissions(session.projectId);

    return res.json({
      success: true,
      projectId: session.projectId,
      tenantId: session.tenantId,
      projectStatus: draft.project.status,
      currentSubmissionVersion: draft.submission?.currentSubmissionVersion || 0,
      submissions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch owner status' });
  }
});
