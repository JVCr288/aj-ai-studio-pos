import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import {
  recordDemoLead,
  recordDemoActivity,
  provisionOrRestoreSandbox,
  resetSandbox,
  getDemoLeadsSummary,
  convertLeadsToCsv,
  cleanupIdleSandboxes,
  reseedSampleStudio,
} from '../services/demoProvisioningService.js';

export const demoRouter = Router();

// Demo SPA HTML Entry Point
demoRouter.get(['/demo', '/demo/*'], (_req: Request, res: Response) => {
  const distHtml = path.resolve(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(distHtml)) {
    return res.sendFile(distHtml);
  }
  return res.status(200).send('<!DOCTYPE html><html><head><title>AJ Studio Demo</title></head><body><div id="root"></div></body></html>');
});

// ----------------------------------------------------------------------------
// HMAC-SIGNED DEMO SESSION & COOKIE MANAGEMENT
// ----------------------------------------------------------------------------
// Signing secret for visitor cookies. Production must set DEMO_COOKIE_SECRET (server.ts refuses to boot without it).
// The fixed fallback exists only for development/test runs.
const COOKIE_SECRET =
  process.env.DEMO_COOKIE_SECRET ||
  (process.env.NODE_ENV === 'production' ? crypto.randomBytes(32).toString('hex') : 'aj-demo-dev-signing-secret');

export function signPayload(data: object): string {
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = crypto.createHmac('sha256', COOKIE_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifySignedPayload<T>(token: string): T | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', COOKIE_SECRET).update(b64).digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export interface VisitorSession {
  leadId: string;
  sandboxId: string;
  createdAt: number;
}

export function extractVisitorSession(req: Request): VisitorSession | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const match = header.match(/(?:^|;\s*)demo_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1].trim());
  return verifySignedPayload<VisitorSession>(token);
}

export function extractVisitorLeadId(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  // 1. First check demo_session cookie
  const sess = extractVisitorSession(req);
  if (sess?.leadId) return sess.leadId;

  // 2. Check demo_lead_id signed cookie
  const match = header.match(/(?:^|;\s*)demo_lead_id=([^;]+)/);
  if (match) {
    const raw = decodeURIComponent(match[1].trim());
    const payload = verifySignedPayload<{ leadId: string }>(raw);
    if (payload?.leadId) return payload.leadId;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
      return raw;
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// RATE LIMITER: 5 signups per hour per IP (guidance wording, no "Error" text)
// ----------------------------------------------------------------------------
export const demoSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      success: false,
      guidance: 'ဆာဗာလုံခြုံရေးအရ တစ်နာရီလျှင် စတူဒီယိုအသစ် ၅ ခုသာ ဖွင့်ခွင့်ရှိပါသည်။ ခေတ္တစောင့်ဆိုင်းပြီးမှ ပြန်လည်ကြိုးစားပါ သို့မဟုတ် ရှိပြီးသား စတူဒီယိုတွင် ဆက်လက်စမ်းသပ်ပါ။ (Demo signup rate limit reached. Please wait a while before creating another studio or explore your existing sandbox.)',
    });
  },
});

// ----------------------------------------------------------------------------
// MIDDLEWARE: Founder Authentication via ADMIN_API_KEY
// ----------------------------------------------------------------------------
export function requireAdminApiKey(req: Request, res: Response, next: () => void) {
  // Same rule as Phase 1 auth.ts: the dev key exists only when NODE_ENV === 'development' explicitly.
  const configuredKey = process.env.ADMIN_API_KEY || (process.env.NODE_ENV === 'development' ? 'dev-admin-secret' : null);
  if (!configuredKey) {
    return res.status(401).json({ error: 'UNAUTHORIZED_ADMIN' });
  }
  const authHeader = req.headers.authorization;
  const adminKeyHeader = req.headers['x-admin-key'] as string;

  let providedKey = '';
  if (adminKeyHeader) {
    providedKey = adminKeyHeader.trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  }

  // Explicit check: session cookies or missing keys are immediately rejected with 401
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({ error: 'UNAUTHORIZED: Valid ADMIN_API_KEY required.' });
  }

  next();
}

// ----------------------------------------------------------------------------
// 1. VISITOR SIGN-UP & SANDBOX PROVISIONING
// ----------------------------------------------------------------------------
demoRouter.post('/api/demo/signup', demoSignupLimiter, async (req: Request, res: Response) => {
  const { name, phone, studioName, city, contactHandle, preferredChannel, consent, source } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'အမည် (Name) ထည့်သွင်းရန် လိုအပ်ပါသည်။' });
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'ဖုန်းနံပါတ် (Phone Number) ထည့်သွင်းရန် လိုအပ်ပါသည်။' });
  }

  if (!studioName || typeof studioName !== 'string' || !studioName.trim()) {
    return res.status(400).json({ error: 'စတူဒီယို အမည် (Studio Name) ထည့်သွင်းရန် လိုအပ်ပါသည်။' });
  }

  try {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const { lead, isNew } = await recordDemoLead({
      name,
      phone,
      studioName,
      city,
      contactHandle,
      preferredChannel,
      consent,
      source: source || 'showroom',
      userAgent,
    });

    // Do NOT trust existingSandboxId from request body. Restore only via visitor's signed cookie leadId or matched phone.
    const cookieLeadId = extractVisitorLeadId(req);
    const sandbox = await provisionOrRestoreSandbox(lead.id, studioName.trim(), cookieLeadId || undefined);

    // Optional Telegram instant notification for new leads
    if (isNew && process.env.DEMO_LEAD_TELEGRAM_CHAT_ID) {
      try {
        const text = `🎯 <b>[NEW DEMO LEAD SIGNUP]</b>\n\n` +
          `• <b>Name:</b> ${lead.name}\n` +
          `• <b>Studio:</b> ${lead.studioName}\n` +
          `• <b>Phone:</b> <code>${lead.phone}</code>\n` +
          `• <b>Channel:</b> ${lead.preferredChannel || 'N/A'} (${lead.contactHandle || 'N/A'})\n` +
          `• <b>Source:</b> ${lead.source || 'showroom'}\n` +
          `• <b>Sandbox:</b> <code>${sandbox.sandboxId}</code>\n` +
          `• <b>Time:</b> ${new Date().toLocaleString('en-GB')}`;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.DEMO_LEAD_TELEGRAM_CHAT_ID;
        if (botToken && chatId) {
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
          }).catch((err) => console.warn('[Telegram Lead Alert] Fetch error:', err));
        }
      } catch (tgErr) {
        console.warn('[Telegram Lead Alert] Warning:', tgErr);
      }
    }

    // Set signed httpOnly demo_session cookie and signed demo_lead_id cookie
    const sessionToken = signPayload({
      leadId: lead.id,
      sandboxId: sandbox.sandboxId,
      createdAt: Date.now(),
    });
    const leadToken = signPayload({ leadId: lead.id });

    res.cookie('demo_session', sessionToken, {
      maxAge: 90 * 24 * 3600 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.cookie('demo_lead_id', leadToken, {
      maxAge: 90 * 24 * 3600 * 1000,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.json({
      success: true,
      leadId: lead.id,
      sandboxId: sandbox.sandboxId,
      tenantSlug: sandbox.tenantSlug,
      studioName: sandbox.studioName,
      adminCredentials: sandbox.adminCredentials,
      staffList: sandbox.staffList,
      seedMetrics: sandbox.seedMetrics,
      isRestored: sandbox.isRestored,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        visitCount: lead.visitCount,
      },
    });
  } catch (error: any) {
    console.error('[Demo Signup] Error:', error);
    return res.status(500).json({ error: 'Demo sandbox provisioning encountered an error.' });
  }
});

// ----------------------------------------------------------------------------
// 2. DEMO VISITOR ACTIVITY EVENT LOGGING
// ----------------------------------------------------------------------------
const ALLOWED_ACTIVITY_EVENTS = new Set([
  'DEMO_STARTED',
  'BOOKING_CREATED',
  'POS_SALE',
  'SLIP_CHECKED',
  'Z_REPORT',
  'RESET',
]);

demoRouter.post('/api/demo/activity', async (req: Request, res: Response) => {
  const session = extractVisitorSession(req);
  if (!session || !session.leadId || !session.sandboxId) {
    return res.status(401).json({ error: 'UNAUTHORIZED: Valid demo session required.' });
  }

  const { event } = req.body;
  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'event is required.' });
  }

  const isAllowed = ALLOWED_ACTIVITY_EVENTS.has(event) || event.startsWith('ROLE_OPENED:');
  if (!isAllowed) {
    return res.status(400).json({ error: 'INVALID_EVENT: Disallowed or unknown activity event.' });
  }

  try {
    await recordDemoActivity(session.leadId, session.sandboxId, event);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Demo Activity] Error recording event:', err);
    return res.status(500).json({ error: 'Failed to record activity.' });
  }
});

// ----------------------------------------------------------------------------
// 3. RESET VISITOR'S SANDBOX
// ----------------------------------------------------------------------------
demoRouter.post('/api/demo/reset', async (req: Request, res: Response) => {
  const session = extractVisitorSession(req);
  if (!session || !session.sandboxId) {
    return res.status(401).json({ error: 'UNAUTHORIZED: Valid demo session required to reset sandbox.' });
  }

  const targetSandboxId = session.sandboxId;
  if (targetSandboxId === 'sample-studio' || targetSandboxId.startsWith('sample-')) {
    return res.status(403).json({ error: 'FORBIDDEN: sample-studio cannot be reset.' });
  }

  const studioName = req.body?.studioName || 'Demo Studio';

  try {
    await resetSandbox(targetSandboxId, studioName);
    return res.json({ success: true, message: 'Sandbox reseeded successfully.' });
  } catch (err: any) {
    console.error('[Demo Reset] Error:', err);
    return res.status(500).json({ error: 'Failed to reset sandbox.' });
  }
});

// ----------------------------------------------------------------------------
// 4. RESEED PERMANENT SAMPLE STUDIO (`/s/sample-studio`)
// ----------------------------------------------------------------------------
demoRouter.post('/api/demo/reseed-sample', requireAdminApiKey, async (_req: Request, res: Response) => {
  try {
    await reseedSampleStudio();
    return res.json({ success: true, message: 'sample-studio reseeded successfully.' });
  } catch (err: any) {
    console.error('[Sample Studio Reseed] Error:', err);
    return res.status(500).json({ error: 'Failed to reseed sample studio.' });
  }
});

// ----------------------------------------------------------------------------
// 5. FOUNDER-ONLY: LEADS TABLE & STATS
// ----------------------------------------------------------------------------
demoRouter.get('/api/demo/leads', requireAdminApiKey, async (_req: Request, res: Response) => {
  try {
    const leads = await getDemoLeadsSummary();
    return res.json({ success: true, leads });
  } catch (err: any) {
    console.error('[Demo Leads View] Error:', err);
    return res.status(500).json({ error: 'Failed to retrieve demo leads.' });
  }
});

// ----------------------------------------------------------------------------
// 6. FOUNDER-ONLY: EXPORT CSV
// ----------------------------------------------------------------------------
demoRouter.get('/api/demo/leads/export', requireAdminApiKey, async (_req: Request, res: Response) => {
  try {
    const leads = await getDemoLeadsSummary();
    const csvData = convertLeadsToCsv(leads);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="aj_studio_desk_demo_leads.csv"');
    return res.status(200).send(csvData);
  } catch (err: any) {
    console.error('[Demo Leads Export] Error:', err);
    return res.status(500).json({ error: 'Failed to export leads CSV.' });
  }
});

// ----------------------------------------------------------------------------
// 7. SANDBOX CLEANUP (7-DAY EXPIRY)
// ----------------------------------------------------------------------------
demoRouter.post('/api/demo/cleanup', requireAdminApiKey, async (req: Request, res: Response) => {
  try {
    const rawIdle = req.body?.maxIdleDays !== undefined ? Number(req.body.maxIdleDays) : 7;
    // Over HTTP, clamp maxIdleDays to >= 1 to prevent wiping active sandboxes
    const maxIdleDays = Math.max(1, isNaN(rawIdle) ? 7 : rawIdle);
    const deleted = await cleanupIdleSandboxes(maxIdleDays);
    return res.json({ success: true, deletedSandboxesCount: deleted.deletedSandboxes });
  } catch (err: any) {
    console.error('[Demo Cleanup] Error:', err);
    return res.status(500).json({ error: 'Failed to execute cleanup.' });
  }
});
