import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

/**
 * SERVER DATABASE MODULE (PHASE 10.7B LOCAL FOUNDATION)
 * Provides server-side connection pool and health diagnostics.
 *
 * Rules:
 * - Server-side only (never import in React frontend code)
 * - Safe conditional connection pool (does not crash build or test scripts when DATABASE_URL is unset)
 */

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

export const getDb = () => {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  try {
    const isSupabaseHost = connectionString.includes('supabase.co') || connectionString.includes('supabase.com');
    const sslMode = process.env.DATABASE_SSL;
    const sslConfig = sslMode === 'true' || (isSupabaseHost && sslMode !== 'false')
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false;

    queryClient = postgres(connectionString, {
      max: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) : 10,
      ssl: sslConfig,
      idle_timeout: 30,
      connect_timeout: 5,
    });

    dbInstance = drizzle(queryClient, { schema });
    return dbInstance;
  } catch (error) {
    console.error('[AJ DB] Failed to initialize PostgreSQL connection pool:', error);
    return null;
  }
};

export const getDbOrThrow = () => {
  const instance = getDb();
  if (!instance) {
    throw new Error('DATABASE_NOT_CONFIGURED: PostgreSQL connection pool is not configured.');
  }
  return instance;
};

export const db = new Proxy({} as NonNullable<ReturnType<typeof getDb>>, {
  get(_target, prop) {
    const instance = getDbOrThrow();
    return (instance as any)[prop];
  },
});

export const checkDatabaseHealth = async (): Promise<{ configured: boolean; reachable: boolean; error?: string }> => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { configured: false, reachable: false };
  }

  try {
    const isSupabaseHost = connectionString.includes('supabase.co') || connectionString.includes('supabase.com');
    const sslMode = process.env.DATABASE_SSL;
    const sslConfig = sslMode === 'true' || (isSupabaseHost && sslMode !== 'false')
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false;

    const client = postgres(connectionString, {
      max: 1,
      connect_timeout: 3,
      ssl: sslConfig,
    });

    await client`SELECT 1`;
    await client.end();
    return { configured: true, reachable: true };
  } catch (err: any) {
    return {
      configured: true,
      reachable: false,
      error: err.message || 'Failed to ping database',
    };
  }
};

export { schema };
