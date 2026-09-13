import crypto from 'crypto';
import { getDb } from '../db/index';
import { ownerAccessLinks, onboardingProjects } from '../db/schema/index';
import { eq } from 'drizzle-orm';
import { getOnboardingProjectDraft } from './serverOnboardingService.js';

export interface SetupLinkRecord {
  id: string;
  projectId: string;
  tenantId: string;
  tokenHash: string;
  status: 'VALID' | 'EXPIRED' | 'REVOKED' | 'ALREADY_SUBMITTED';
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface VerificationResult {
  status: 'VALID' | 'EXPIRED' | 'REVOKED' | 'NOT_FOUND' | 'ALREADY_SUBMITTED';
  projectId?: string;
  tenantId?: string;
  linkId?: string;
  studioDisplayName?: string;
}

// Local development fallback store when PostgreSQL database is unreachable
const memoryLinkStore = new Map<string, SetupLinkRecord>();

export const hashSetupToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

export const createSetupLink = async (
  projectId: string,
  tenantId: string,
  options: { expiresInHours?: number; studioDisplayName?: string } = {}
): Promise<{ rawToken: string; linkId: string; expiresAt: Date | null }> => {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64-char hex token
  const tokenHash = hashSetupToken(rawToken);

  const expiresInHours = options.expiresInHours ?? 168; // Default 7 days
  const expiresAt = options.expiresInHours !== undefined ? new Date(Date.now() + expiresInHours * 3600 * 1000) : new Date(Date.now() + 168 * 3600 * 1000);

  const db = getDb();
  let linkId: string = crypto.randomUUID();

  if (db) {
    try {
      // Ensure project record exists
      const existingProject = await db
        .select()
        .from(onboardingProjects)
        .where(eq(onboardingProjects.id, projectId))
        .limit(1);

      if (existingProject.length === 0) {
        await db.insert(onboardingProjects).values({
          id: projectId,
          tenantId,
          studioDisplayName: options.studioDisplayName || 'Studio Owner Partner',
          status: 'DRAFT',
          schemaId: 'photo-studio-v1',
          schemaVersion: '1.0',
        });
      }

      const [inserted] = await db
        .insert(ownerAccessLinks)
        .values({
          projectId,
          tenantId,
          tokenHash,
          status: 'VALID',
          expiresAt,
        })
        .returning({ id: ownerAccessLinks.id });

      if (inserted?.id) {
        linkId = String(inserted.id);
      }
    } catch (err) {
      console.warn('[OwnerTokenService] Database insert failed, falling back to memory store:', err);
    }
  }

  // Always update memory store for quick verification & offline fallback
  const record: SetupLinkRecord = {
    id: linkId,
    projectId,
    tenantId,
    tokenHash,
    status: 'VALID',
    expiresAt,
    revokedAt: null,
    createdAt: new Date(),
    lastUsedAt: null,
  };
  memoryLinkStore.set(tokenHash, record);

  return { rawToken, linkId, expiresAt };
};

export const verifySetupToken = async (rawToken: string): Promise<VerificationResult> => {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
    return { status: 'NOT_FOUND' };
  }

  const tokenHash = hashSetupToken(rawToken);
  const db = getDb();
  let record: SetupLinkRecord | undefined;

  if (db) {
    try {
      const rows = await db
        .select()
        .from(ownerAccessLinks)
        .where(eq(ownerAccessLinks.tokenHash, tokenHash))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        record = {
          id: row.id,
          projectId: row.projectId,
          tenantId: row.tenantId,
          tokenHash: row.tokenHash,
          status: row.status as any,
          expiresAt: row.expiresAt,
          revokedAt: row.revokedAt,
          createdAt: row.createdAt,
          lastUsedAt: row.lastUsedAt,
        };
      }
    } catch (err) {
      console.warn('[OwnerTokenService] Database query failed, checking memory store fallback');
    }
  }

  if (!record) {
    record = memoryLinkStore.get(tokenHash);
  }

  if (!record) {
    return { status: 'NOT_FOUND' };
  }

  // Check revocation
  if (record.status === 'REVOKED' || record.revokedAt) {
    return { status: 'REVOKED', projectId: record.projectId, tenantId: record.tenantId };
  }

  // Check expiration
  if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
    return { status: 'EXPIRED', projectId: record.projectId, tenantId: record.tenantId };
  }

  // Check if project is already submitted/approved
  let studioDisplayName: string | undefined;
  if (db) {
    try {
      const projects = await db
        .select()
        .from(onboardingProjects)
        .where(eq(onboardingProjects.id, record.projectId))
        .limit(1);

      if (projects.length > 0) {
        studioDisplayName = projects[0].studioDisplayName;
        if (projects[0].status === 'SUBMITTED' || projects[0].status === 'APPROVED' || projects[0].status === 'INTEGRATED') {
          return {
            status: 'ALREADY_SUBMITTED',
            projectId: record.projectId,
            tenantId: record.tenantId,
            linkId: record.id,
            studioDisplayName,
          };
        }
      }
    } catch {
      // Ignore fallback
    }
  }

  // Check server memory fallback
  try {
    const memoryDraft = await getOnboardingProjectDraft(record.projectId, record.tenantId);
    if (memoryDraft && (memoryDraft.project.status === 'SUBMITTED' || memoryDraft.project.status === 'APPROVED' || memoryDraft.project.status === 'INTEGRATED')) {
      return {
        status: 'ALREADY_SUBMITTED',
        projectId: record.projectId,
        tenantId: record.tenantId,
        linkId: record.id,
        studioDisplayName: memoryDraft.studio.name,
      };
    }
  } catch {
    // Ignore fallback
  }

  return {
    status: record.status,
    projectId: record.projectId,
    tenantId: record.tenantId,
    linkId: record.id,
    studioDisplayName,
  };
};

export interface OwnerSessionRecord {
  sessionToken: string;
  projectId: string;
  tenantId: string;
  csrfToken: string;
  createdAt: Date;
  expiresAt: Date;
}

const memorySessionStore = new Map<string, OwnerSessionRecord>();

export const createOwnerSession = (
  projectId: string,
  tenantId: string
): OwnerSessionRecord => {
  const sessionToken = `sess_${crypto.randomBytes(32).toString('hex')}`;
  const csrfToken = `csrf_${crypto.randomBytes(16).toString('hex')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 3600 * 1000); // 24 Hours

  const record: OwnerSessionRecord = {
    sessionToken,
    projectId,
    tenantId,
    csrfToken,
    createdAt: now,
    expiresAt,
  };

  memorySessionStore.set(sessionToken, record);
  return record;
};

export const verifyOwnerSession = (
  sessionToken: string
): OwnerSessionRecord | null => {
  if (!sessionToken || typeof sessionToken !== 'string') return null;

  const session = memorySessionStore.get(sessionToken);
  if (!session) return null;

  if (new Date() > session.expiresAt) {
    memorySessionStore.delete(sessionToken);
    return null;
  }

  return session;
};

export const revokeSetupToken = async (rawToken: string): Promise<boolean> => {
  const tokenHash = hashSetupToken(rawToken);
  const now = new Date();
  const db = getDb();
  let updated = false;

  if (db) {
    try {
      await db
        .update(ownerAccessLinks)
        .set({ status: 'REVOKED', revokedAt: now })
        .where(eq(ownerAccessLinks.tokenHash, tokenHash));
      updated = true;
    } catch {
      // Fallback
    }
  }

  const mem = memoryLinkStore.get(tokenHash);
  if (mem) {
    mem.status = 'REVOKED';
    mem.revokedAt = now;
    updated = true;
  }

  return updated;
};
