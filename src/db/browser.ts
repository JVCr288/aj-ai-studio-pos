/**
 * BROWSER DATABASE STUB
 * When Vite builds the browser frontend bundle, this stub ensures
 * the Node.js PostgreSQL driver (`postgres`) is never pulled into client assets.
 * In the browser, all database operations are served via backend API fetch routes.
 */

export const getDb = (): null => null;
export const closeDb = async (): Promise<void> => {};
export const assertDemoIsolation = async (): Promise<{ isolated: boolean; reason?: string }> => ({
  isolated: false,
  reason: 'Browser environment: database accessed via HTTP API only.',
});
export const getDbOrThrow = (): never => {
  throw new Error('Database is server-only and unavailable directly in the browser.');
};
export const db = null as any;
