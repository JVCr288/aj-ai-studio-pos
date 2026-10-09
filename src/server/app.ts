import express, { Express, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  helmetMiddleware,
  permissionsPolicyMiddleware,
  corsMiddleware,
  corsErrorHandler,
} from './middleware/security.js';
import { requestLogger } from './middleware/logger.js';
import { healthRouter } from './routes/health.routes.js';
import { eventsRouter } from './routes/events.routes.js';
import { ocrRouter } from './routes/ocr.routes.js';
import { ownerRouter } from './routes/owner.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { bookingRouter } from './routes/booking.routes.js';
import { posRouter } from './routes/pos.routes.js';
import { demoRouter } from './routes/demo.routes.js';
import { assertDemoIsolation } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(opts?: { demoMode?: boolean }): Express {
  const app = express();

  // Trust proxy for TLS reverse proxies (VPS deployment)
  const trustProxySetting = process.env.TRUST_PROXY;
  if (trustProxySetting) {
    const num = Number(trustProxySetting);
    app.set('trust proxy', isNaN(num) ? trustProxySetting : num);
  }
  // No TRUST_PROXY set -> do not trust X-Forwarded-* headers (otherwise a direct client could spoof its IP
  // and bypass the per-IP limiters). Production behind the VPS reverse proxy sets TRUST_PROXY=1.

  // 1. Security Headers & Policies
  app.use(helmetMiddleware);
  app.use(permissionsPolicyMiddleware);

  // 2. CORS Handling
  app.use(corsMiddleware);
  app.options('*', corsMiddleware);
  app.use(corsErrorHandler);

  // 3. Body Parsing Middleware
  // Note: JSON body limit set to 16MB to allow ~10MB raw binary image payloads accounting for ~33% base64 inflation.
  app.use(express.json({ limit: '16mb' }));
  app.use(express.urlencoded({ extended: true, limit: '16mb' }));

  // 4. Request Logging
  app.use(requestLogger);

  // 5. Mount Modular API Routers
  app.use(healthRouter);
  app.use(eventsRouter);
  app.use(ocrRouter);
  app.use(ownerRouter);
  app.use(adminRouter);
  app.use(bookingRouter);
  app.use(posRouter);

  // Mount Demo routes only when DEMO_MODE is true
  const isDemoMode = opts?.demoMode !== undefined ? opts.demoMode : (process.env.DEMO_MODE === 'true');
  if (isDemoMode) {
    // Fail closed if DEMO_DATABASE_URL is missing and DATABASE_URL is set (prevents silent fallback to owner)
    if (process.env.DATABASE_URL && !process.env.DEMO_DATABASE_URL) {
      console.error('FATAL [Demo Startup]: DEMO_MODE is true but DEMO_DATABASE_URL is not set. Refusing to start.');
      throw new Error('DEMO_DATABASE_URL_REQUIRED: DEMO_MODE requires DEMO_DATABASE_URL to be set.');
    }

    let isolationVerified: boolean | null = null;
    let isolationFailureReason = '';

    const demoIsolationGate = async (_req: Request, res: Response, next: () => void) => {
      // In offline mode (no DB URL), bypass isolation check
      if (!process.env.DEMO_DATABASE_URL) {
        return next();
      }

      if (isolationVerified === true) {
        return next();
      }
      if (isolationVerified === false) {
        return res.status(404).json({
          error: `DEMO_MODE_DISABLED: Demo database isolation check failed: ${isolationFailureReason}`,
        });
      }

      const check = await assertDemoIsolation();
      if (!check.isolated) {
        isolationVerified = false;
        isolationFailureReason = check.reason || 'Unknown isolation failure';
        console.error(`[AJ Demo Security] Isolation assertion failed: ${isolationFailureReason}. Demo routes will not be served.`);
        return res.status(404).json({
          error: `DEMO_MODE_DISABLED: Demo database isolation check failed: ${isolationFailureReason}`,
        });
      }

      isolationVerified = true;
      next();
    };

    app.use(['/demo', '/demo/*', '/api/demo', '/api/demo/*'], demoIsolationGate);
    app.use(demoRouter);
  } else {
    app.use(['/demo', '/demo/*', '/api/demo', '/api/demo/*'], (_req: Request, res: Response) => {
      res.status(404).json({ error: 'DEMO_MODE_DISABLED: Public demo routes are disabled in this environment.' });
    });
  }

  // 6. Production Static Serving
  if (process.env.NODE_ENV === 'production') {
    // Project root dist directory
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  // 7. Global 404 Fallback
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
  });

  return app;
}
