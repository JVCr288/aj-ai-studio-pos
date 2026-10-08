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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

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
