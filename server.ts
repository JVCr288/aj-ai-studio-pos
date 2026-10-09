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

  const app = createApp();
  const PORT = process.env.PORT || 4000;

  const server = app.listen(PORT, () => {
    console.log(`[AJ AI Studio Platform API] Server running on http://localhost:${PORT}`);
    console.log(`[AJ AI Studio Platform API] Health check available at http://localhost:${PORT}/api/health`);
  });

  return server;
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});

export default createApp();
