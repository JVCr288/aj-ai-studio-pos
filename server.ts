import 'dotenv/config';
import { createApp } from './src/server/app.js';
import { broadcastStudioEvent, StudioDomainEvent } from './src/server/events/sseBus.js';
import { getDb } from './src/db/index.js';
import { sql } from 'drizzle-orm';

export { broadcastStudioEvent };
export type { StudioDomainEvent };

async function startServer() {
  // Fail-closed environment & database validation in Production
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
    const missing: string[] = [];
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') missing.push('DATABASE_URL');
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') missing.push('GEMINI_API_KEY');
    if (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.trim() === '') missing.push('ALLOWED_ORIGINS');

    if (missing.length > 0) {
      console.error(`FATAL [Production Boot]: Missing required environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }

    const db = getDb();
    if (!db) {
      console.error('FATAL [Production Boot]: Failed to initialize PostgreSQL connection pool.');
      process.exit(1);
    }

    try {
      await db.execute(sql`SELECT 1`);
      console.log('[Production Boot]: Database connectivity verified successfully.');
    } catch (err) {
      console.error('FATAL [Production Boot]: PostgreSQL ping failed:', err);
      process.exit(1);
    }
  }

  // Fail-closed validation for DEMO_MODE
  if (process.env.DEMO_MODE === 'true') {
    if (!process.env.DEMO_DATABASE_URL || process.env.DEMO_DATABASE_URL.trim() === '') {
      console.error('FATAL [Demo Boot]: DEMO_MODE is true but DEMO_DATABASE_URL is not configured.');
      process.exit(1);
    }
    if (!process.env.DEMO_COOKIE_SECRET || process.env.DEMO_COOKIE_SECRET.trim().length < 32) {
      console.error('FATAL [Demo Boot]: DEMO_COOKIE_SECRET must be set (at least 32 characters) in DEMO_MODE.');
      process.exit(1);
    }
    if (!process.env.ADMIN_API_KEY) {
      console.error('FATAL [Demo Boot]: ADMIN_API_KEY must be set in DEMO_MODE (protects the founder lead list and maintenance endpoints).');
      process.exit(1);
    }
    const { assertDemoIsolation } = await import('./src/db/index.js');
    const isolation = await assertDemoIsolation();
    if (!isolation.isolated) {
      console.error(`FATAL [Demo Boot]: Database connection isolation assertion failed: ${isolation.reason}`);
      process.exit(1);
    }
    console.log('[Demo Boot]: Database isolation verified successfully (role is demo_app, search_path is demo).');
  }

  const app = createApp();
  const PORT = process.env.PORT || 4000;

  // HOST lets a VPS deployment bind to 127.0.0.1 behind the reverse proxy; Docker keeps the 0.0.0.0 default.
  const HOST = process.env.HOST || '0.0.0.0';
  const server = app.listen(Number(PORT), HOST, async () => {
    console.log(`[AJ Studio Desk API] Server running on http://localhost:${PORT}`);
    console.log(`[AJ Studio Desk API] Health check available at http://localhost:${PORT}/api/health`);

    if (process.env.DEMO_MODE === 'true') {
      const { DemoScheduler } = await import('./src/server/services/demoSchedulerService.js');
      const scheduler = new DemoScheduler();
      scheduler.start();
    }
  });

  return server;
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});

export default createApp();
