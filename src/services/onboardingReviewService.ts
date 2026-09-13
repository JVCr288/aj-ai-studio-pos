import {
  StudioOnboardingProject,
  SubmissionSnapshot,
  ReviewFeedback,
  OnboardingStatus,
  CanonicalStepName,
  FeedbackSeverity,
  AssetReference,
  OnboardingSubmissionPayload,
  UploadStatus,
} from '../types';
import { saveOnboardingDraft } from './onboardingPersistenceService';

/**
 * DEVELOPER REVIEW SERVICE
 * Manages developer review workflow, field-level feedback, and immutable snapshot review transitions.
 */

export const DEV_REVIEWER_PLACEHOLDER_ID = 'DEV_ADMIN_PLACEHOLDER';

// ----------------------------------------------------------------------------
// ASSET DIAGNOSTIC AUDIT TYPES & HELPERS
// ----------------------------------------------------------------------------
export type AssetDiagnosticStatus = 'READY' | 'FAILED_UPLOAD' | 'DANGLING_REFERENCE' | 'REMOVED_REFERENCE';

export interface AssetReviewDiagnostic {
  assetId: string;
  sourceField?: string;
  originalFilename?: string;
  category?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  uploadStatus?: UploadStatus;
  diagnosticStatus: AssetDiagnosticStatus;
  diagnosticMessage: string;
}

/**
 * Analyzes snapshot asset references and asset registry to distinguish:
 * - READY: Valid ready asset
 * - FAILED_UPLOAD: Asset exists in assets[] with FAILED upload status
 * - DANGLING_REFERENCE: Domain references an assetId missing from assets[]
 * - REMOVED_REFERENCE: Domain references an assetId with REMOVED status
 */
export const analyzeSnapshotAssets = (snapshot: OnboardingSubmissionPayload): AssetReviewDiagnostic[] => {
  const diagnostics: AssetReviewDiagnostic[] = [];
  const assetsMap = new Map<string, AssetReference>();
  snapshot.assets?.forEach((a) => assetsMap.set(a.assetId, a));

  // Collect all domain asset ID references
  const domainRefs: { assetId: string; sourceField: string }[] = [];
  if (snapshot.studio.logoAssetId) {
    domainRefs.push({ assetId: snapshot.studio.logoAssetId, sourceField: 'studio.logoAssetId' });
  }
  snapshot.spaces?.forEach((s, idx) => {
    if (s.floorPlanAssetId) domainRefs.push({ assetId: s.floorPlanAssetId, sourceField: `spaces[${idx}].floorPlanAssetId` });
    if (s.sketchAssetId) domainRefs.push({ assetId: s.sketchAssetId, sourceField: `spaces[${idx}].sketchAssetId` });
    s.photoAssetIds?.forEach((pid) => domainRefs.push({ assetId: pid, sourceField: `spaces[${idx}].photoAssetIds` }));
  });
  snapshot.paymentConfiguration?.methods?.forEach((m, idx) => {
    if (m.qrAssetId) domainRefs.push({ assetId: m.qrAssetId, sourceField: `paymentConfiguration.methods[${idx}].qrAssetId` });
  });
  if (snapshot.invoiceProfile?.logoAssetId) {
    domainRefs.push({ assetId: snapshot.invoiceProfile.logoAssetId, sourceField: 'invoiceProfile.logoAssetId' });
  }

  const processedAssetIds = new Set<string>();

  // 1. Audit referenced domain assets
  domainRefs.forEach(({ assetId, sourceField }) => {
    processedAssetIds.add(assetId);
    const assetRef = assetsMap.get(assetId);
    if (!assetRef) {
      diagnostics.push({
        assetId,
        sourceField,
        diagnosticStatus: 'DANGLING_REFERENCE',
        diagnosticMessage: `Missing Asset Reference: '${assetId}' referenced in '${sourceField}' but not registered in assets[].`,
      });
    } else if (assetRef.uploadStatus === 'REMOVED') {
      diagnostics.push({
        assetId,
        sourceField,
        originalFilename: assetRef.originalFilename,
        category: assetRef.category,
        fileSizeBytes: assetRef.fileSizeBytes,
        mimeType: assetRef.mimeType,
        uploadStatus: assetRef.uploadStatus,
        diagnosticStatus: 'REMOVED_REFERENCE',
        diagnosticMessage: `Removed Asset Reference: '${assetId}' referenced in '${sourceField}' but marked REMOVED.`,
      });
    } else if (assetRef.uploadStatus === 'FAILED') {
      diagnostics.push({
        assetId,
        sourceField,
        originalFilename: assetRef.originalFilename,
        category: assetRef.category,
        fileSizeBytes: assetRef.fileSizeBytes,
        mimeType: assetRef.mimeType,
        uploadStatus: assetRef.uploadStatus,
        diagnosticStatus: 'FAILED_UPLOAD',
        diagnosticMessage: `Failed Upload: '${assetRef.originalFilename}' referenced in '${sourceField}' failed upload.`,
      });
    } else {
      diagnostics.push({
        assetId,
        sourceField,
        originalFilename: assetRef.originalFilename,
        category: assetRef.category,
        fileSizeBytes: assetRef.fileSizeBytes,
        mimeType: assetRef.mimeType,
        uploadStatus: assetRef.uploadStatus,
        diagnosticStatus: 'READY',
        diagnosticMessage: `Valid Ready Asset Reference in '${sourceField}'.`,
      });
    }
  });

  // 2. Audit unreferenced registered assets (e.g. standalone uploads or failed standalone uploads)
  snapshot.assets?.forEach((assetRef) => {
    if (!processedAssetIds.has(assetRef.assetId)) {
      if (assetRef.uploadStatus === 'FAILED') {
        diagnostics.push({
          assetId: assetRef.assetId,
          originalFilename: assetRef.originalFilename,
          category: assetRef.category,
          fileSizeBytes: assetRef.fileSizeBytes,
          mimeType: assetRef.mimeType,
          uploadStatus: assetRef.uploadStatus,
          diagnosticStatus: 'FAILED_UPLOAD',
          diagnosticMessage: `Failed Standalone Upload: '${assetRef.originalFilename}' failed upload.`,
        });
      } else if (assetRef.uploadStatus === 'READY') {
        diagnostics.push({
          assetId: assetRef.assetId,
          originalFilename: assetRef.originalFilename,
          category: assetRef.category,
          fileSizeBytes: assetRef.fileSizeBytes,
          mimeType: assetRef.mimeType,
          uploadStatus: assetRef.uploadStatus,
          diagnosticStatus: 'READY',
          diagnosticMessage: `Valid Standalone Ready Asset.`,
        });
      }
    }
  });

  return diagnostics;
};

// ----------------------------------------------------------------------------
// STATE TRANSITION SAFETY CHECK
// ----------------------------------------------------------------------------
export const canTransition = (fromStatus: OnboardingStatus, toStatus: OnboardingStatus): boolean => {
  const allowedMap: Record<OnboardingStatus, OnboardingStatus[]> = {
    NOT_STARTED: ['DRAFT'],
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['NEEDS_CHANGES', 'APPROVED'],
    NEEDS_CHANGES: ['DRAFT', 'SUBMITTED'],
    APPROVED: ['INTEGRATED'],
    INTEGRATED: [],
  };

  return allowedMap[fromStatus]?.includes(toStatus) ?? false;
};

// ----------------------------------------------------------------------------
// SNAPSHOT RESOLUTION HELPERS
// ----------------------------------------------------------------------------
export const getLatestSubmissionSnapshot = (project: StudioOnboardingProject): SubmissionSnapshot | undefined => {
  const submissions = project.submission?.submissions || [];
  if (submissions.length === 0) return undefined;
  
  const currentVer = project.submission?.currentSubmissionVersion;
  if (currentVer) {
    const found = submissions.find((s) => s.version === currentVer);
    if (found) return found;
  }
  
  // Sort descending by version number to avoid array ordering dependency
  const sorted = [...submissions].sort((a, b) => b.version - a.version);
  return sorted[0];
};

export const getSubmissionByVersion = (
  project: StudioOnboardingProject,
  version: number
): SubmissionSnapshot | undefined => {
  return project.submission?.submissions?.find((s) => s.version === version);
};

// ----------------------------------------------------------------------------
// REVIEW WORKFLOW MUTATION FUNCTIONS
// ----------------------------------------------------------------------------

export const startReview = async (
  projectId: string,
  project: StudioOnboardingProject,
  reviewerId = DEV_REVIEWER_PLACEHOLDER_ID
): Promise<StudioOnboardingProject> => {
  if (project.project.status !== 'SUBMITTED') {
    throw new Error(`Cannot start review: project status is '${project.project.status}', expected 'SUBMITTED'.`);
  }

  const now = new Date().toISOString();
  const latestSnapshot = getLatestSubmissionSnapshot(project);
  if (!latestSnapshot) {
    throw new Error('No submission snapshot found to review.');
  }

  const updatedSubmissions = project.submission.submissions.map((sub) => {
    if (sub.submissionId === latestSnapshot.submissionId) {
      return {
        ...sub,
        reviewStatus: 'UNDER_REVIEW' as OnboardingStatus,
        reviewStartedAt: now,
        reviewerId,
      };
    }
    return sub;
  });

  const updatedProject: StudioOnboardingProject = {
    ...project,
    project: {
      ...project.project,
      status: 'UNDER_REVIEW',
      updatedAt: now,
    },
    submission: {
      ...project.submission,
      submissions: updatedSubmissions,
    },
  };

  return saveOnboardingDraft(projectId, updatedProject);
};

export const addFeedbackItem = async (
  projectId: string,
  project: StudioOnboardingProject,
  feedbackData: {
    section: CanonicalStepName;
    fieldPath?: string;
    severity: FeedbackSeverity;
    message: string;
  }
): Promise<StudioOnboardingProject> => {
  if (!feedbackData.message || !feedbackData.message.trim()) {
    throw new Error('Feedback message is required.');
  }

  if (feedbackData.severity === 'CHANGE_REQUIRED' && (!feedbackData.section || !feedbackData.message)) {
    throw new Error('CHANGE_REQUIRED feedback requires section and message.');
  }

  const latestSnapshot = getLatestSubmissionSnapshot(project);
  if (!latestSnapshot) {
    throw new Error('No active submission snapshot found to attach feedback.');
  }

  const now = new Date().toISOString();
  const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newFeedback: ReviewFeedback = {
    feedbackId,
    submissionId: latestSnapshot.submissionId,
    section: feedbackData.section,
    fieldPath: feedbackData.fieldPath?.trim() || undefined,
    severity: feedbackData.severity,
    message: feedbackData.message.trim(),
    createdAt: now,
    resolved: false,
  };

  const updatedSubmissions = project.submission.submissions.map((sub) => {
    if (sub.submissionId === latestSnapshot.submissionId) {
      return {
        ...sub,
        feedback: [...(sub.feedback || []), newFeedback],
      };
    }
    return sub;
  });

  const updatedProject: StudioOnboardingProject = {
    ...project,
    submission: {
      ...project.submission,
      submissions: updatedSubmissions,
    },
  };

  return saveOnboardingDraft(projectId, updatedProject);
};

export const updateFeedbackItem = async (
  projectId: string,
  project: StudioOnboardingProject,
  feedbackId: string,
  updates: Partial<ReviewFeedback>
): Promise<StudioOnboardingProject> => {
  const latestSnapshot = getLatestSubmissionSnapshot(project);
  if (!latestSnapshot) throw new Error('No active submission snapshot found.');

  const now = new Date().toISOString();

  const updatedSubmissions = project.submission.submissions.map((sub) => {
    if (sub.submissionId === latestSnapshot.submissionId) {
      const updatedFeedback = sub.feedback.map((fb) => {
        if (fb.feedbackId === feedbackId) {
          const isResolving = updates.resolved === true && !fb.resolved;
          return {
            ...fb,
            ...updates,
            resolvedAt: isResolving ? now : updates.resolved === false ? undefined : fb.resolvedAt,
          };
        }
        return fb;
      });
      return { ...sub, feedback: updatedFeedback };
    }
    return sub;
  });

  const updatedProject: StudioOnboardingProject = {
    ...project,
    submission: {
      ...project.submission,
      submissions: updatedSubmissions,
    },
  };

  return saveOnboardingDraft(projectId, updatedProject);
};

export const deleteFeedbackItem = async (
  projectId: string,
  project: StudioOnboardingProject,
  feedbackId: string
): Promise<StudioOnboardingProject> => {
  const latestSnapshot = getLatestSubmissionSnapshot(project);
  if (!latestSnapshot) throw new Error('No active submission snapshot found.');

  const updatedSubmissions = project.submission.submissions.map((sub) => {
    if (sub.submissionId === latestSnapshot.submissionId) {
      return {
        ...sub,
        feedback: sub.feedback.filter((f) => f.feedbackId !== feedbackId),
      };
    }
    return sub;
  });

  const updatedProject: StudioOnboardingProject = {
    ...project,
    submission: {
      ...project.submission,
      submissions: updatedSubmissions,
    },
  };

  return saveOnboardingDraft(projectId, updatedProject);
};

export const requestChanges = async (
  projectId: string,
  project: StudioOnboardingProject
): Promise<StudioOnboardingProject> => {
  if (project.project.status !== 'UNDER_REVIEW') {
    throw new Error(`Cannot request changes: status is '${project.project.status}', expected 'UNDER_REVIEW'.`);
  }

  const latestSnapshot = getLatestSubmissionSnapshot(project);
  if (!latestSnapshot) throw new Error('No active submission snapshot found.');

  const unresolvedChangeRequired = latestSnapshot.feedback.filter(
    (f) => !f.resolved && f.severity === 'CHANGE_REQUIRED'
  );

  if (unresolvedChangeRequired.length === 0) {
    throw new Error('Cannot request changes: At least one unresolved CHANGE_REQUIRED feedback item is required.');
  }

  const now = new Date().toISOString();

  const updatedSubmissions = project.submission.submissions.map((sub) => {
    if (sub.submissionId === latestSnapshot.submissionId) {
      return {
        ...sub,
        reviewStatus: 'NEEDS_CHANGES' as OnboardingStatus,
      };
    }
    return sub;
  });

  // Copy snapshot domain payload to editable draft state for client correction mode
  const snapshotData = latestSnapshot.snapshot;

  const updatedProject: StudioOnboardingProject = {
    ...project,
    project: {
      ...project.project,
      status: 'NEEDS_CHANGES',
      updatedAt: now,
    },
    studio: { ...snapshotData.studio },
    packages: [...snapshotData.packages],
    spaces: [...snapshotData.spaces],
    paymentConfiguration: { ...snapshotData.paymentConfiguration },
    bookingRules: { ...snapshotData.bookingRules },
    invoiceProfile: { ...snapshotData.invoiceProfile },
    assets: [...snapshotData.assets],
    submission: {
      ...project.submission,
      submissions: updatedSubmissions,
    },
  };

  return saveOnboardingDraft(projectId, updatedProject);
};

export const approveSubmission = async (
  projectId: string,
  project: StudioOnboardingProject
): Promise<StudioOnboardingProject> => {
  if (project.project.status !== 'UNDER_REVIEW') {
    throw new Error(`Cannot approve submission: status is '${project.project.status}', expected 'UNDER_REVIEW'.`);
  }

  const latestSnapshot = getLatestSubmissionSnapshot(project);
  if (!latestSnapshot) throw new Error('No active submission snapshot found.');

  const unresolvedChangeRequired = latestSnapshot.feedback.filter(
    (f) => !f.resolved && f.severity === 'CHANGE_REQUIRED'
  );

  if (unresolvedChangeRequired.length > 0) {
    throw new Error(`Cannot approve: ${unresolvedChangeRequired.length} unresolved CHANGE_REQUIRED items remain.`);
  }

  const now = new Date().toISOString();

  const updatedSubmissions = project.submission.submissions.map((sub) => {
    if (sub.submissionId === latestSnapshot.submissionId) {
      return {
        ...sub,
        reviewStatus: 'APPROVED' as OnboardingStatus,
        approvedAt: now,
      };
    }
    return sub;
  });

  const updatedProject: StudioOnboardingProject = {
    ...project,
    project: {
      ...project.project,
      status: 'APPROVED',
      updatedAt: now,
    },
    submission: {
      ...project.submission,
      approvedSubmissionId: latestSnapshot.submissionId,
      submissions: updatedSubmissions,
    },
  };

  return saveOnboardingDraft(projectId, updatedProject);
};

