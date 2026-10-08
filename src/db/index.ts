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

    const connectTimeoutSec = process.env.DATABASE_CONNECT_TIMEOUT
      ? parseInt(process.env.DATABASE_CONNECT_TIMEOUT, 10)
      : 2;

    queryClient = postgres(connectionString, {
      max: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) : 10,
      ssl: sslConfig,
      idle_timeout: 30,
      connect_timeout: connectTimeoutSec,
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

let lastHealthCheckTime = 0;
let lastHealthCheckResult: { configured: boolean; reachable: boolean; error?: string } | null = null;
const HEALTH_CACHE_TTL_MS = 10000; // 10-second cache to prevent consecutive connection stalling

export const checkDatabaseHealth = async (forceFresh = false): Promise<{ configured: boolean; reachable: boolean; error?: string }> => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { configured: false, reachable: false };
  }

  const now = Date.now();
  if (!forceFresh && lastHealthCheckResult && (now - lastHealthCheckTime < HEALTH_CACHE_TTL_MS)) {
    return lastHealthCheckResult;
  }

  try {
    const isSupabaseHost = connectionString.includes('supabase.co') || connectionString.includes('supabase.com');
    const sslMode = process.env.DATABASE_SSL;
    const sslConfig = sslMode === 'true' || (isSupabaseHost && sslMode !== 'false')
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false;

    const client = postgres(connectionString, {
      max: 1,
      connect_timeout: 2,
      ssl: sslConfig,
    });

    await client`SELECT 1`;
    await client.end();
    const result = { configured: true, reachable: true };
    lastHealthCheckResult = result;
    lastHealthCheckTime = Date.now();
    return result;
  } catch (err: any) {
    const result = {
      configured: true,
      reachable: false,
      error: err.message || 'Failed to ping database',
    };
    lastHealthCheckResult = result;
    lastHealthCheckTime = Date.now();
    return result;
  }
};

export { schema };
