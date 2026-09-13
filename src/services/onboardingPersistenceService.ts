import { StudioOnboardingProject } from '../types';

/**
 * STUDIO ONBOARDING PERSISTENCE SERVICE (Development / Demo Adapter)
 * 
 * NOTE: localStorage is used strictly as a temporary client development persistence layer.
 * This adapter isolates storage strategy so a replaceable backend/API persistence adapter later
 * can replace it seamlessly without component-level refactoring.
 */

const PRIMARY_STORAGE_PREFIX = 'aj_studio_onboarding_project_v1_';
const LEGACY_STORAGE_PREFIX = 'akk_studio_onboarding_project_v1_';
const STORAGE_PREFIX = PRIMARY_STORAGE_PREFIX;

export const getCleanOnboardingProject = (projectId: string): StudioOnboardingProject => {
  const now = new Date().toISOString();
  return {
    schemaVersion: '1.0',
    project: {
      projectId,
      projectSlug: projectId,
      displayName: 'New Studio Owner Setup',
      clientType: 'STUDIO_OWNER',
      status: 'NOT_STARTED',
      createdAt: now,
      updatedAt: now,
    },
    studio: {
      name: '',
      primaryContactName: '',
      logoAssetId: undefined,
      address: '',
      googleMapsUrl: '',
      phone: '',
      email: '',
      telegramContact: '',
      openingHours: '',
      closedDays: [],
    },
    packages: [
      {
        packageId: 'pkg-silver-placeholder',
        name: 'Silver',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 1,
      },
      {
        packageId: 'pkg-gold-placeholder',
        name: 'Gold',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 2,
      },
      {
        packageId: 'pkg-platinum-placeholder',
        name: 'Platinum',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 3,
      },
      {
        packageId: 'pkg-diamond-placeholder',
        name: 'Diamond',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 4,
      },
    ],
    spaces: [
      {
        spaceId: 'space-bay-01',
        name: '',
        primaryUse: 'COMMERCIAL',
        approximateSize: '',
        photoAssetIds: [],
        enabled: true,
        sortOrder: 1,
      },
    ],
    paymentConfiguration: {
      defaultDepositRule: {
        type: 'PERCENTAGE',
        value: 30,
        refundablePolicy: '',
      },
      remainingBalanceTiming: 'UPON_SESSION_START',
      methods: [
        {
          paymentMethodId: 'pm-kbzpay',
          provider: 'KBZPAY',
          enabled: false,
          accountName: '',
          accountIdentifier: '',
        },
        {
          paymentMethodId: 'pm-wavepay',
          provider: 'WAVEPAY',
          enabled: false,
          accountName: '',
          accountIdentifier: '',
        },
        {
          paymentMethodId: 'pm-cash',
          provider: 'CASH',
          enabled: false,
          notes: 'Cash payment upon studio arrival',
        },
      ],
    },
    bookingRules: {
      openingTime: '',
      closingTime: '',
      defaultSessionDurationMinutes: 120,
      bufferMinutes: 30,
      closedDays: [],
      maxAdvanceBookingDays: 60,
      sameDayBooking: false,
      reschedulePolicy: '',
      cancellationPolicy: '',
      depositRefundPolicy: '',
    },
    invoiceProfile: {
      useStudioProfile: true,
      studioName: '',
      address: '',
      phone: '',
      logoAssetId: undefined,
      businessInfo: '',
      taxInfo: '',
      footerMessage: '',
    },
    assets: [],
    progress: {
      currentStep: 1,
      completedSteps: [],
      completionPercentage: 0,
      lastSavedAt: now,
      lastSavedBy: 'Studio Owner',
      draftRevision: 1,
    },
    submission: {
      currentSubmissionVersion: 0,
      submissions: [],
    },
  };
};

export const getLegacyAkkOnboardingProject = (projectId = 'proj-akk-studio-01'): StudioOnboardingProject => {
  const now = new Date().toISOString();
  return {
    schemaVersion: '1.0',
    project: {
      projectId,
      projectSlug: 'akk-photo-studio-yangon',
      displayName: 'AKK Photo Studio & Atelier',
      clientType: 'STUDIO_OWNER',
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    },
    studio: {
      name: 'AKK Photo Studio & Atelier',
      primaryContactName: 'AKK Studio Manager',
      logoAssetId: 'asset-logo-01',
      address: 'No. 42 Strand Road, Botahtaung Township, Yangon, Myanmar',
      googleMapsUrl: 'https://maps.google.com/?q=No.+42+Strand+Road+Yangon',
      phone: '09 792 108 421',
      email: 'onboarding@akkphotostudio.mm',
      telegramContact: '@akkphotostudio',
      openingHours: '09:00 - 21:00 MMT Daily',
      closedDays: [],
    },
    packages: [
      {
        packageId: 'pkg-silver-placeholder',
        name: 'Silver',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 1,
      },
      {
        packageId: 'pkg-gold-placeholder',
        name: 'Gold',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 2,
      },
      {
        packageId: 'pkg-platinum-placeholder',
        name: 'Platinum',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 3,
      },
      {
        packageId: 'pkg-diamond-placeholder',
        name: 'Diamond',
        price: null,
        currency: 'MMK',
        sessionDurationMinutes: null,
        includedItems: [],
        enabled: false,
        status: 'PLACEHOLDER',
        source: 'SYSTEM_SEED',
        sortOrder: 4,
      },
    ],
    spaces: [
      {
        spaceId: 'space-bay-a1',
        name: 'BAY ALPHA-01 (Commercial Stage)',
        primaryUse: 'COMMERCIAL',
        approximateSize: '25ft x 35ft (875 sq ft)',
        photoAssetIds: ['asset-room-a1-01'],
        floorPlanAssetId: 'asset-fp-a1',
        notes: 'Primary high-ceiling cyclorama bay with overhead Profoto rig.',
        enabled: true,
        sortOrder: 1,
      },
      {
        spaceId: 'space-bay-b2',
        name: 'BAY BETA-02 (Portrait Nook)',
        primaryUse: 'PORTRAIT',
        approximateSize: '18ft x 22ft (396 sq ft)',
        photoAssetIds: ['asset-room-b2-01'],
        notes: 'Intimate editorial portrait bay with natural light windows and blackout shades.',
        enabled: true,
        sortOrder: 2,
      },
    ],
    paymentConfiguration: {
      defaultDepositRule: {
        type: 'PERCENTAGE',
        value: 30,
        refundablePolicy: 'Full deposit refund if cancelled 48 hours prior.',
      },
      remainingBalanceTiming: 'UPON_SESSION_START',
      methods: [
        {
          paymentMethodId: 'pm-kbzpay',
          provider: 'KBZPAY',
          enabled: true,
          accountName: 'AKK Photo Studio',
          accountIdentifier: '09 792 108 421',
          qrAssetId: 'asset-qr-kbzpay',
          notes: 'Instant QR transfer available',
        },
        {
          paymentMethodId: 'pm-wavepay',
          provider: 'WAVEPAY',
          enabled: true,
          accountName: 'AKK Photo Studio',
          accountIdentifier: '09 792 108 421',
        },
        {
          paymentMethodId: 'pm-ayapay',
          provider: 'AYA_PAY',
          enabled: true,
          accountName: 'AKK Photo Studio',
          accountIdentifier: '0092 1002 8847 2190',
        },
        {
          paymentMethodId: 'pm-cash',
          provider: 'CASH',
          enabled: true,
          notes: 'Cash payment upon studio arrival',
        },
      ],
    },
    bookingRules: {
      openingTime: '09:00',
      closingTime: '21:00',
      defaultSessionDurationMinutes: 120,
      bufferMinutes: 30,
      closedDays: [],
      maxAdvanceBookingDays: 60,
      sameDayBooking: false,
      reschedulePolicy: 'Reschedule permitted up to 24h prior without penalty.',
      cancellationPolicy: 'Full deposit refund if cancelled 48 hours before shoot date.',
      depositRefundPolicy: 'Eligible for refund up to 48 hours before shoot.',
    },
    invoiceProfile: {
      useStudioProfile: true,
      studioName: 'AKK PHOTO STUDIO & ATELIER',
      address: 'No. 42 Strand Road, Botahtaung, Yangon',
      phone: '09 792 108 421',
      logoAssetId: 'asset-logo-01',
      businessInfo: 'REG: AKK-MM-2026-YGN-091',
      taxInfo: 'Commercial Tax Exempt (0%)',
      footerMessage: 'All equipment is calibrated before handover. Includes 30-day lossless Vault cloud retention.',
    },
    assets: [
      {
        assetId: 'asset-logo-01',
        projectId,
        category: 'STUDIO_LOGO',
        provider: 'DEV_LOCAL',
        storageRef: '/assets/akk_logo.svg',
        originalFilename: 'akk_studio_logo_dark.svg',
        mimeType: 'image/svg+xml',
        fileSizeBytes: 12400,
        uploadStatus: 'READY',
        uploadedAt: now,
      },
    ],
    progress: {
      currentStep: 1,
      completedSteps: [1, 2, 3, 4],
      completionPercentage: 80,
      lastSavedAt: now,
      lastSavedBy: 'Studio Owner',
      draftRevision: 1,
    },
    submission: {
      currentSubmissionVersion: 0,
      submissions: [],
    },
  };
};

export const getDefaultOnboardingProject = (projectId = 'proj-akk-studio-01'): StudioOnboardingProject => {
  if (projectId === 'proj-akk-studio-01') {
    return getLegacyAkkOnboardingProject(projectId);
  }
  return getCleanOnboardingProject(projectId);
};

const inMemoryStore = new Map<string, string>();

export function migrateSixStepDraftToFiveStep(draft: any): StudioOnboardingProject {
  if (!draft || typeof draft !== 'object') return draft;
  const migrated = { ...draft };
  if (!migrated.packages || migrated.packages.length === 0) {
    migrated.packages = getDefaultOnboardingProject().packages;
  }
  if (migrated.progress && typeof migrated.progress.activeStep === 'number') {
    if (migrated.progress.activeStep > 5) {
      migrated.progress.activeStep = 5;
    }
  }
  if (!migrated.progress.draftRevision) {
    migrated.progress.draftRevision = 1;
  }
  return migrated;
}

export function getCsrfTokenFromStorage(): string | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return sessionStorage.getItem('aj_csrf_token') || null;
  }
  return null;
}

export type PersistenceMode = 'DATABASE' | 'LOCAL_DEVELOPMENT' | 'UNAVAILABLE';

export const getPersistenceMode = (): PersistenceMode => {
  if (typeof process !== 'undefined' && process.env?.DATABASE_URL) {
    return 'DATABASE';
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return 'LOCAL_DEVELOPMENT';
  }
  return 'UNAVAILABLE';
};

export const loadOnboardingDraft = async (
  projectId = 'proj-akk-studio-01'
): Promise<StudioOnboardingProject | null> => {
  try {
    const res = await fetch('/api/owner/draft', {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.draft) {
        return migrateSixStepDraftToFiveStep(data.draft);
      }
    } else if (res.status === 401 || res.status === 403 || res.status === 503) {
      if (process.env.NODE_ENV === 'production') {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'SERVER_PERSISTENCE_FAILED');
      }
    }
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }

  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = localStorage.getItem(`${PRIMARY_STORAGE_PREFIX}${projectId}`) || localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${projectId}`);
    } else {
      raw = inMemoryStore.get(`${PRIMARY_STORAGE_PREFIX}${projectId}`) || inMemoryStore.get(`${LEGACY_STORAGE_PREFIX}${projectId}`) || null;
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schemaVersion === '1.0') {
        return migrateSixStepDraftToFiveStep(parsed) as StudioOnboardingProject;
      }
    }
  } catch {
    // Fallback if JSON parse fails
  }
  return getDefaultOnboardingProject(projectId);
};

export const saveOnboardingDraft = async (
  projectId: string,
  projectData: StudioOnboardingProject
): Promise<StudioOnboardingProject> => {
  const csrfToken = getCsrfTokenFromStorage();
  try {
    const res = await fetch('/api/owner/draft', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify(projectData),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.draft) {
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem(`${PRIMARY_STORAGE_PREFIX}${projectId}`, JSON.stringify(data.draft));
          } catch {}
        }
        return data.draft;
      }
    } else if (res.status === 409) {
      const errData = await res.json();
      throw new Error(errData.error || 'STALE_WRITE_REJECTED');
    } else if (res.status === 401 || res.status === 403 || res.status === 503) {
      if (process.env.NODE_ENV === 'production') {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'SERVER_SAVE_FAILED');
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('STALE_WRITE_REJECTED') || process.env.NODE_ENV === 'production') {
      throw err;
    }
  }

  const now = new Date().toISOString();

  // Stale write protection check
  const current = await loadOnboardingDraft(projectId);
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

  const serialized = JSON.stringify(updated);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`${PRIMARY_STORAGE_PREFIX}${projectId}`, serialized);
    } catch {
      // Storage quota exception fallback
    }
  }
  inMemoryStore.set(`${PRIMARY_STORAGE_PREFIX}${projectId}`, serialized);

  return updated;
};

export const submitOnboardingDraft = async (
  projectId: string,
  projectData: StudioOnboardingProject,
  submittedBy = 'Studio Owner'
): Promise<StudioOnboardingProject> => {
  const csrfToken = getCsrfTokenFromStorage();
  try {
    const res = await fetch('/api/owner/submit', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: JSON.stringify(projectData),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.project) {
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem(`${PRIMARY_STORAGE_PREFIX}${projectId}`, JSON.stringify(data.project));
          } catch {}
        }
        return data.project;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (process.env.NODE_ENV === 'production') {
        throw new Error(errData.error || 'SUBMISSION_FAILED');
      }
    }
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }

  const now = new Date().toISOString();
  const currentVersion = projectData.submission?.currentSubmissionVersion || 0;
  const version = currentVersion + 1;
  const submissionId = `sub-${projectId}-v${version}`;

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

  const snapshot = {
    submissionId,
    version,
    schemaVersion: '1.0' as const,
    snapshot: snapshotPayload,
    submittedAt: now,
    submittedBy,
    reviewStatus: 'SUBMITTED' as const,
    feedback: [],
  };

  const existingSubmissions = projectData.submission?.submissions || [];

  const updated: StudioOnboardingProject = {
    ...projectData,
    project: {
      ...projectData.project,
      status: 'SUBMITTED',
      updatedAt: now,
    },
    submission: {
      currentSubmissionVersion: version,
      approvedSubmissionId: projectData.submission?.approvedSubmissionId,
      submissions: [...existingSubmissions, snapshot],
    },
  };

  return saveOnboardingDraft(projectId, updated);
};

export const approveSubmission = async (
  projectId: string,
  projectData: StudioOnboardingProject,
  submissionId: string
): Promise<StudioOnboardingProject> => {
  const now = new Date().toISOString();
  const submissions = (projectData.submission?.submissions || []).map((sub) => {
    if (sub.submissionId === submissionId) {
      return {
        ...sub,
        reviewStatus: 'APPROVED' as const,
        approvedAt: now,
      };
    }
    return sub;
  });

  const updated: StudioOnboardingProject = {
    ...projectData,
    project: {
      ...projectData.project,
      status: 'APPROVED',
      updatedAt: now,
    },
    submission: {
      ...projectData.submission,
      approvedSubmissionId: submissionId,
      submissions,
    },
  };

  return saveOnboardingDraft(projectId, updated);
};

export const clearOnboardingDraft = async (projectId: string): Promise<void> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(`${PRIMARY_STORAGE_PREFIX}${projectId}`);
      localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}${projectId}`);
    } catch {
      // ignore
    }
  }
  inMemoryStore.delete(`${PRIMARY_STORAGE_PREFIX}${projectId}`);
  inMemoryStore.delete(`${LEGACY_STORAGE_PREFIX}${projectId}`);
};
