import { getDb } from '../../db/index.js';

export const DEMO_TENANT_SLUGS = [
  'aj-ai-studio',
  'neutral-studio-tenant',
  'nocturne',
  'akk-photo-studio',
] as const;

export type DemoTenantSlug = (typeof DEMO_TENANT_SLUGS)[number];

/**
 * The in-memory demo path may run ONLY when DEMO_MODE === 'true' AND getDb() returns null.
 * When a database is configured, in-memory demo fallbacks are strictly prohibited.
 */
export function isMemoryDemoAllowed(): boolean {
  return process.env.DEMO_MODE === 'true' && getDb() === null;
}

/**
 * Checks if a slug is one of the recognized demo tenant slugs.
 */
export function isDemoTenantSlug(slug: string): boolean {
  return DEMO_TENANT_SLUGS.includes(slug as DemoTenantSlug);
}
