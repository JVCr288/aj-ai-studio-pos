import { getDb } from '../db/index';
import { onboardingProjects, onboardingDrafts, onboardingSubmissions, onboardingAssets } from '../db/schema/index';
import { eq, and, max } from 'drizzle-orm';
import { StudioOnboardingProject, SubmissionSnapshot } from '../types';
import { getDefaultOnboardingProject, migrateSixStepDraftToFiveStep } from './onboardingPersistenceService';

const serverMemoryDrafts = new Map<string, StudioOnboardingProject>();

export const getOnboardingProjectDraft = async (
  projectId: string,
  tenantId: string
): Promise<StudioOnboardingProject> => {
  const db = getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(onboardingDrafts)
        .where(and(eq(onboardingDrafts.projectId, projectId), eq(onboardingDrafts.tenantId, tenantId)))
        .limit(1);

      if (rows.length > 0) {
        const payload = rows[0].payload as any;
        return migrateSixStepDraftToFiveStep(payload);
      }
    } catch (err) {
      console.warn('[ServerOnboardingService] Database read draft failed, using fallback:', err);
    }
  }

  const mem = serverMemoryDrafts.get(projectId);
  if (mem) {
    return migrateSixStepDraftToFiveStep(mem);
  }

  return getDefaultOnboardingProject(projectId);
};

export const saveOnboardingProjectDraft = async (
  projectId: string,
  tenantId: string,
  projectData: StudioOnboardingProject
): Promise<StudioOnboardingProject> => {
  const now = new Date().toISOString();

  // Load current to check stale write
  const current = await getOnboardingProjectDraft(projectId, tenantId);
  if (
    current &&
    current.progress.draftRevision !== undefined &&
    projectData.progress.draftRevision !== undefined &&
    projectData.progress.draftRevision < current.progress.draftRevision
  ) {
    throw new Error(
      `STALE_WRITE_REJECTED: Incoming draft revision (${projectData.progress.draftRevision}) is older than stored revision (${current.progress.draftRevision}).`
    );
  }

  const completedStepsCount = projectData.progress.completedSteps.length;
  const completionPercentage = Math.round((completedStepsCount / 5) * 100);
  const nextRevision = ((projectData.progress.draftRevision ?? current?.progress.draftRevision) ?? 0) + 1;

  const updated: StudioOnboardingProject = {
    ...projectData,
    project: {
      ...projectData.project,
      projectId,
      status: projectData.project.status === 'NOT_STARTED' ? 'DRAFT' : projectData.project.status,
      updatedAt: now,
    },
    progress: {
      ...projectData.progress,
      completionPercentage,
      lastSavedAt: now,
      draftRevision: nextRevision,
    },
  };

  const db = getDb();
  if (db) {
    try {
      // Upsert project record
      const existingProject = await db
        .select()
        .from(onboardingProjects)
        .where(eq(onboardingProjects.id, projectId))
        .limit(1);

      if (existingProject.length === 0) {
        await db.insert(onboardingProjects).values({
          id: projectId,
          tenantId,
          studioDisplayName: updated.studio.name || 'Studio Owner Partner',
          status: updated.project.status,
        });
      } else {
        await db
          .update(onboardingProjects)
          .set({
            studioDisplayName: updated.studio.name || existingProject[0].studioDisplayName,
            updatedAt: new Date(),
          })
          .where(eq(onboardingProjects.id, projectId));
      }

      // Upsert draft record
      const existingDraft = await db
        .select()
        .from(onboardingDrafts)
        .where(eq(onboardingDrafts.projectId, projectId))
        .limit(1);

      if (existingDraft.length === 0) {
        await db.insert(onboardingDrafts).values({
          projectId,
          tenantId,
          draftRevision: nextRevision,
          payload: updated as any,
        });
      } else {
        await db
          .update(onboardingDrafts)
          .set({
            draftRevision: nextRevision,
            payload: updated as any,
            updatedAt: new Date(),
          })
          .where(eq(onboardingDrafts.projectId, projectId));
      }
    } catch (err) {
      console.warn('[ServerOnboardingService] Database draft save failed, storing in memory:', err);
    }
  }

  serverMemoryDrafts.set(projectId, updated);
  return updated;
};

export const submitOnboardingProjectSnapshot = async (
  projectId: string,
  tenantId: string,
  projectData: StudioOnboardingProject
): Promise<StudioOnboardingProject> => {
  const now = new Date().toISOString();
  const db = getDb();
  let newVersion = (projectData.submission?.currentSubmissionVersion || 0) + 1;

  const snapshotPayload = JSON.parse(
    JSON.stringify({
      schemaVersion: '1.0',
      project: projectData.project,
      studio: projectData.studio,
      packages: projectData.packages,
      spaces: projectData.spaces,
      paymentConfiguration: projectData.paymentConfiguration,
      bookingRules: projectData.bookingRules,
      invoiceProfile: projectData.invoiceProfile,
      assets: projectData.assets,
    })
  );

  if (db) {
    try {
      await db.transaction(async (tx) => {
        // Query max existing version for this project
        const maxVersionRow = await tx
          .select({ maxVer: max(onboardingSubmissions.version) })
          .from(onboardingSubmissions)
          .where(eq(onboardingSubmissions.projectId, projectId));

        const maxVer = maxVersionRow[0]?.maxVer ?? 0;
        newVersion = maxVer + 1;

        // Insert immutable submission version
        await tx.insert(onboardingSubmissions).values({
          projectId,
          tenantId,
          version: newVersion,
          sourceDraftRevision: projectData.progress.draftRevision || 1,
          immutableSnapshot: snapshotPayload,
          status: 'SUBMITTED',
        });

        // Update project status to SUBMITTED
        await tx
          .update(onboardingProjects)
          .set({ status: 'SUBMITTED', updatedAt: new Date() })
          .where(eq(onboardingProjects.id, projectId));
      });
    } catch (err) {
      console.warn('[ServerOnboardingService] Database submission transaction failed, using fallback:', err);
    }
  }

  const existingSubmissions = projectData.submission?.submissions || [];
  const snapshot: SubmissionSnapshot = {
    submissionId: `sub-${projectId}-v${newVersion}`,
    version: newVersion,
    schemaVersion: '1.0',
    snapshot: snapshotPayload,
    submittedAt: now,
    submittedBy: 'Studio Owner',
    reviewStatus: 'SUBMITTED',
    feedback: [],
  };

  const updated: StudioOnboardingProject = {
    ...projectData,
    project: {
      ...projectData.project,
      status: 'SUBMITTED',
      updatedAt: now,
    },
    submission: {
      currentSubmissionVersion: newVersion,
      submissions: [...existingSubmissions, snapshot],
    },
  };

  serverMemoryDrafts.set(projectId, updated);
  return updated;
};

export const getOnboardingSubmissions = async (
  projectId: string
): Promise<any[]> => {
  const db = getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(onboardingSubmissions)
        .where(eq(onboardingSubmissions.projectId, projectId));

      if (rows.length > 0) {
        return rows.map((r) => ({
          submissionId: `sub-${projectId}-v${r.version}`,
          version: r.version,
          sourceDraftRevision: r.sourceDraftRevision,
          submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString(),
          status: r.status,
          snapshotData: r.immutableSnapshot,
        }));
      }
    } catch (err) {
      console.warn('[ServerOnboardingService] Database fetch submissions failed');
    }
  }

  const draft = serverMemoryDrafts.get(projectId);
  return draft?.submission?.submissions || [];
};
