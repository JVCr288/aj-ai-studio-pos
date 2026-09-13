import {
  StudioOnboardingProject,
  SubmissionSnapshot,
  OnboardingSubmissionPayload,
  ProductionStudioProfile,
  ProductionBookingPackage,
  ProductionStudioSpace,
  ProductionPaymentConfiguration,
  ProductionBookingRules,
  ProductionEffectiveInvoiceProfile,
  MappedAssetBinding,
  ProductionInitialConfiguration,
  MappingError,
  MappingWarning,
  MappingValidationResult,
  ProductionConfigurationResult,
  AssetReference,
  UploadStatus,
} from '../types';

/**
 * APPROVED CONFIGURATION MAPPER SERVICE (PHASE 10.5 & 10.5.1 HARDENED)
 * Transforms an APPROVED onboarding submission snapshot into a deterministic,
 * production-ready initial configuration object.
 *
 * Rules:
 * - Operates ONLY on submission.approvedSubmissionId
 * - Pure and deterministic transformation logic
 * - Decoupled production-side contracts (ProductionStudioProfile, ProductionBookingPackage, etc.)
 * - Required vs Optional Asset evaluation (QR code on enabled gateways is required; studio/space assets are optional)
 * - Excludes raw storageRef from UI-facing MappedAssetBinding
 * - Stops BEFORE real database persistence
 */

export const ONBOARDING_CONFIGURATION_MAPPER_VERSION = '1.0';

// ----------------------------------------------------------------------------
// SOURCE RESOLUTION
// ----------------------------------------------------------------------------

export const resolveApprovedSubmission = (
  project: StudioOnboardingProject
): { snapshot?: SubmissionSnapshot; error?: MappingError } => {
  if (project.project.status !== 'APPROVED') {
    return {
      error: {
        code: 'APPROVED_STATUS_MISMATCH',
        message: `Project status is '${project.project.status}', expected 'APPROVED'. Onboarding must be approved before production mapping.`,
      },
    };
  }

  const approvedSubmissionId = project.submission?.approvedSubmissionId;
  if (!approvedSubmissionId) {
    return {
      error: {
        code: 'APPROVED_SUBMISSION_MISSING',
        message: 'Project is marked APPROVED but submission.approvedSubmissionId is missing.',
      },
    };
  }

  const matchingSnapshot = project.submission?.submissions?.find(
    (s) => s.submissionId === approvedSubmissionId
  );

  if (!matchingSnapshot) {
    return {
      error: {
        code: 'APPROVED_SUBMISSION_NOT_FOUND',
        message: `No submission snapshot found matching approvedSubmissionId '${approvedSubmissionId}'.`,
      },
    };
  }

  if (matchingSnapshot.reviewStatus !== 'APPROVED') {
    return {
      error: {
        code: 'APPROVED_STATUS_MISMATCH',
        message: `Matching snapshot '${approvedSubmissionId}' has reviewStatus '${matchingSnapshot.reviewStatus}', expected 'APPROVED'.`,
      },
    };
  }

  return { snapshot: matchingSnapshot };
};

// ----------------------------------------------------------------------------
// DOMAIN SUB-MAPPERS (DECOUPLED PRODUCTION CONTRACTS)
// ----------------------------------------------------------------------------

export const mapStudioProfile = (snapshot: OnboardingSubmissionPayload): ProductionStudioProfile => {
  return {
    name: snapshot.studio.name.trim(),
    logoAssetId: snapshot.studio.logoAssetId?.trim() || undefined,
    address: snapshot.studio.address.trim(),
    googleMapsUrl: snapshot.studio.googleMapsUrl?.trim() || undefined,
    phone: snapshot.studio.phone.trim(),
    email: snapshot.studio.email.trim(),
    facebookUrl: snapshot.studio.facebookUrl?.trim() || undefined,
    telegramContact: snapshot.studio.telegramContact?.trim() || undefined,
    otherContact: snapshot.studio.otherContact?.trim() || undefined,
    openingHours: snapshot.studio.openingHours?.trim() || undefined,
    closedDays: snapshot.studio.closedDays ? [...snapshot.studio.closedDays] : [],
  };
};

export const mapBookingPackages = (snapshot: OnboardingSubmissionPayload): ProductionBookingPackage[] => {
  // Only map active enabled packages for initial production configuration (exclude PLACEHOLDER system seeds)
  const enabledPackages = (snapshot.packages || []).filter((p) => p.enabled && p.status !== 'PLACEHOLDER');

  // Deterministically sort by sortOrder ascending
  return [...enabledPackages].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((pkg) => ({
    packageId: pkg.packageId,
    name: pkg.name.trim(),
    price: pkg.price ?? 0,
    currency: pkg.currency,
    sessionDurationMinutes: pkg.sessionDurationMinutes ?? 0,
    includedItems: [...(pkg.includedItems || [])],
    retouchedPhotoCount: pkg.retouchedPhotoCount,
    description: pkg.description?.trim() || undefined,
    notes: pkg.notes?.trim() || undefined,
    enabled: pkg.enabled,
    sortOrder: pkg.sortOrder,
    depositOverride: pkg.depositOverride
      ? pkg.depositOverride.type === 'NONE'
        ? { type: 'NONE', value: null, refundablePolicy: pkg.depositOverride.refundablePolicy }
        : { ...pkg.depositOverride }
      : undefined,
  }));
};

export const mapStudioSpaces = (snapshot: OnboardingSubmissionPayload): ProductionStudioSpace[] => {
  // Only map enabled spaces for initial active production configuration
  const enabledSpaces = (snapshot.spaces || []).filter((s) => s.enabled);

  // Deterministically sort by sortOrder ascending
  return [...enabledSpaces].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((sp) => ({
    spaceId: sp.spaceId,
    name: sp.name.trim(),
    primaryUse: sp.primaryUse,
    approximateSize: sp.approximateSize?.trim() || undefined,
    photoAssetIds: [...(sp.photoAssetIds || [])],
    floorPlanAssetId: sp.floorPlanAssetId?.trim() || undefined,
    sketchAssetId: sp.sketchAssetId?.trim() || undefined,
    notes: sp.notes?.trim() || undefined,
    enabled: sp.enabled,
    sortOrder: sp.sortOrder,
  }));
};

export const mapPaymentConfiguration = (snapshot: OnboardingSubmissionPayload): ProductionPaymentConfiguration => {
  const enabledMethods = (snapshot.paymentConfiguration?.methods || []).filter((m) => m.enabled);

  return {
    methods: enabledMethods.map((m) => ({
      paymentMethodId: m.paymentMethodId,
      provider: m.provider,
      enabled: m.enabled,
      accountName: m.accountName?.trim() || undefined,
      accountIdentifier: m.accountIdentifier?.trim() || undefined,
      qrAssetId: m.qrAssetId?.trim() || undefined,
      notes: m.notes?.trim() || undefined,
    })),
    defaultDepositRule:
      snapshot.paymentConfiguration?.defaultDepositRule?.type === 'NONE'
        ? { type: 'NONE', value: null, refundablePolicy: snapshot.paymentConfiguration.defaultDepositRule.refundablePolicy }
        : { ...snapshot.paymentConfiguration.defaultDepositRule },
    remainingBalanceTiming: snapshot.paymentConfiguration?.remainingBalanceTiming || 'UPON_SESSION_START',
  };
};

export const mapBookingRules = (snapshot: OnboardingSubmissionPayload): ProductionBookingRules => {
  return { ...snapshot.bookingRules, closedDays: [...(snapshot.bookingRules.closedDays || [])] };
};

export const mapInvoiceProfile = (
  snapshot: OnboardingSubmissionPayload,
  studioProfile: ProductionStudioProfile
): ProductionEffectiveInvoiceProfile => {
  const inv = snapshot.invoiceProfile;
  const useStudio = inv.useStudioProfile;

  return {
    useStudioProfile: useStudio,
    effectiveStudioName: useStudio ? studioProfile.name : inv.studioName?.trim() || studioProfile.name,
    effectiveAddress: useStudio ? studioProfile.address : inv.address?.trim() || studioProfile.address,
    effectivePhone: useStudio ? studioProfile.phone : inv.phone?.trim() || studioProfile.phone,
    effectiveLogoAssetId: useStudio ? studioProfile.logoAssetId : inv.logoAssetId?.trim() || studioProfile.logoAssetId,
    businessInfo: inv.businessInfo?.trim() || undefined,
    taxInfo: inv.taxInfo?.trim() || undefined,
    footerMessage: inv.footerMessage?.trim() || undefined,
  };
};

// Helper: Determine if an asset reference is REQUIRED for production integration
export const isRequiredAssetReference = (sourceField: string): boolean => {
  // Enabled Payment Method QR Code is conditionally required if payment method references qrAssetId
  if (sourceField.includes('paymentConfiguration.methods') && sourceField.includes('qrAssetId')) {
    return true;
  }
  return false;
};

export const mapAssetBindings = (
  snapshot: OnboardingSubmissionPayload
): { bindings: MappedAssetBinding[]; errors: MappingError[]; warnings: MappingWarning[] } => {
  const bindings: MappedAssetBinding[] = [];
  const errors: MappingError[] = [];
  const warnings: MappingWarning[] = [];

  const assetsMap = new Map<string, AssetReference>();
  snapshot.assets?.forEach((a) => assetsMap.set(a.assetId, a));

  const domainRefs: { assetId: string; sourceField: string }[] = [];
  if (snapshot.studio.logoAssetId) {
    domainRefs.push({ assetId: snapshot.studio.logoAssetId, sourceField: 'studio.logoAssetId' });
  }
  snapshot.spaces?.forEach((s, idx) => {
    if (s.floorPlanAssetId) domainRefs.push({ assetId: s.floorPlanAssetId, sourceField: `spaces[${idx}].floorPlanAssetId` });
    if (s.sketchAssetId) domainRefs.push({ assetId: s.sketchAssetId, sourceField: `spaces[${idx}].sketchAssetId` });
    s.photoAssetIds?.forEach((pid) => domainRefs.push({ assetId: pid, sourceField: `spaces[${idx}].photoAssetIds` }));
  });
  snapshot.paymentConfiguration?.methods?.filter((m) => m.enabled).forEach((m, idx) => {
    if (m.qrAssetId) domainRefs.push({ assetId: m.qrAssetId, sourceField: `paymentConfiguration.methods[${idx}].qrAssetId` });
  });
  if (snapshot.invoiceProfile?.logoAssetId) {
    domainRefs.push({ assetId: snapshot.invoiceProfile.logoAssetId, sourceField: 'invoiceProfile.logoAssetId' });
  }

  const processed = new Set<string>();

  domainRefs.forEach(({ assetId, sourceField }) => {
    processed.add(assetId);
    const assetRef = assetsMap.get(assetId);
    const required = isRequiredAssetReference(sourceField);

    if (!assetRef) {
      if (required) {
        errors.push({
          code: 'INVALID_ASSET_REFERENCE',
          message: `Required asset reference '${assetId}' in '${sourceField}' is missing from asset registry (DANGLING_REFERENCE).`,
          fieldPath: sourceField,
        });
      } else {
        warnings.push({
          code: 'DANGLING_ASSET_WARNING',
          message: `Optional asset reference '${assetId}' in '${sourceField}' is missing from asset registry. Omitted from production bindings.`,
          fieldPath: sourceField,
        });
      }
    } else if (assetRef.uploadStatus === 'FAILED') {
      if (required) {
        errors.push({
          code: 'INVALID_ASSET_REFERENCE',
          message: `Required asset upload '${assetRef.originalFilename}' in '${sourceField}' failed upload (FAILED_UPLOAD).`,
          fieldPath: sourceField,
        });
      } else {
        warnings.push({
          code: 'FAILED_ASSET_WARNING',
          message: `Optional asset upload '${assetRef.originalFilename}' in '${sourceField}' failed upload. Omitted from production bindings.`,
          fieldPath: sourceField,
        });
      }
    } else if (assetRef.uploadStatus === 'REMOVED') {
      if (required) {
        errors.push({
          code: 'INVALID_ASSET_REFERENCE',
          message: `Required asset '${assetRef.originalFilename}' in '${sourceField}' was marked REMOVED (REMOVED_REFERENCE).`,
          fieldPath: sourceField,
        });
      } else {
        warnings.push({
          code: 'REMOVED_ASSET_WARNING',
          message: `Optional asset '${assetRef.originalFilename}' in '${sourceField}' was marked REMOVED. Omitted from production bindings.`,
          fieldPath: sourceField,
        });
      }
    } else if (assetRef.uploadStatus === 'READY') {
      bindings.push({
        assetId: assetRef.assetId,
        category: assetRef.category,
        originalFilename: assetRef.originalFilename,
        mimeType: assetRef.mimeType,
        fileSizeBytes: assetRef.fileSizeBytes,
        sourceField,
        status: assetRef.uploadStatus,
      });
    }
  });

  return { bindings, errors, warnings };
};

// ----------------------------------------------------------------------------
// VALIDATION SERVICE
// ----------------------------------------------------------------------------

export const validateProductionInitialConfiguration = (
  config?: ProductionInitialConfiguration,
  initialErrors: MappingError[] = [],
  initialWarnings: MappingWarning[] = []
): MappingValidationResult => {
  const errors: MappingError[] = [...initialErrors];
  const warnings: MappingWarning[] = [...initialWarnings];

  if (!config) {
    return {
      valid: false,
      errors: errors.length > 0 ? errors : [{ code: 'APPROVED_SUBMISSION_MISSING', message: 'No valid configuration produced.' }],
      warnings,
      readinessState: 'NOT_READY',
    };
  }

  if (!config.studioProfile.name) {
    errors.push({ code: 'INVALID_INVOICE_PROFILE', message: 'Studio profile name is required.' });
  }

  if (!config.bookingPackages || config.bookingPackages.length === 0) {
    errors.push({ code: 'NO_ACTIVE_PACKAGE', message: 'At least one active booking package is required for production integration.' });
  }

  if (!config.spacesConfiguration || config.spacesConfiguration.length === 0) {
    errors.push({ code: 'NO_ACTIVE_SPACE', message: 'At least one active studio space is required for production integration.' });
  }

  if (!config.paymentConfiguration.methods || config.paymentConfiguration.methods.length === 0) {
    errors.push({ code: 'INVALID_PAYMENT_CONFIGURATION', message: 'At least one active payment method is required.' });
  }

  if (!config.invoiceProfile.effectiveStudioName) {
    errors.push({ code: 'INVALID_INVOICE_PROFILE', message: 'Effective invoice studio name is required.' });
  }

  const isValid = errors.length === 0;

  return {
    valid: isValid,
    errors,
    warnings,
    readinessState: isValid ? 'READY_FOR_INTEGRATION' : 'NOT_READY',
  };
};

// ----------------------------------------------------------------------------
// MAIN MAPPER ENTRY POINT
// ----------------------------------------------------------------------------

export const buildProductionInitialConfiguration = (
  project: StudioOnboardingProject
): ProductionConfigurationResult => {
  const now = new Date().toISOString();

  // 1. Resolve Approved Submission Snapshot
  const { snapshot, error } = resolveApprovedSubmission(project);
  if (error || !snapshot) {
    const validation = validateProductionInitialConfiguration(undefined, error ? [error] : []);
    return { success: false, validation };
  }

  const payload = snapshot.snapshot;

  // 2. Execute Sub-Mappers
  const studioProfile = mapStudioProfile(payload);
  const bookingPackages = mapBookingPackages(payload);
  const spacesConfiguration = mapStudioSpaces(payload);
  const paymentConfiguration = mapPaymentConfiguration(payload);
  const bookingRules = mapBookingRules(payload);
  const invoiceProfile = mapInvoiceProfile(payload, studioProfile);
  const { bindings: assetBindings, errors: assetErrors, warnings: assetWarnings } = mapAssetBindings(payload);

  // 3. Build ProductionInitialConfiguration Object
  const config: ProductionInitialConfiguration = {
    source: {
      projectId: project.project.projectId,
      approvedSubmissionId: snapshot.submissionId,
      submissionVersion: snapshot.version,
      schemaVersion: '1.0',
      approvedAt: snapshot.approvedAt || now,
      mappedAt: now,
      mapperVersion: ONBOARDING_CONFIGURATION_MAPPER_VERSION,
    },
    studioProfile,
    bookingPackages,
    spacesConfiguration,
    paymentConfiguration,
    bookingRules,
    invoiceProfile,
    assetBindings,
  };

  // 4. Validate Mapped Configuration
  const validation = validateProductionInitialConfiguration(config, assetErrors, assetWarnings);

  return {
    success: validation.valid,
    config,
    validation,
  };
};

// ----------------------------------------------------------------------------
// FUTURE PERSISTENCE INTERFACE (DISABLED BOUNDARY)
// ----------------------------------------------------------------------------

export interface ProductionConfigurationPersistenceAdapter {
  preview: (config: ProductionInitialConfiguration) => MappingValidationResult;
  apply: (config: ProductionInitialConfiguration) => Promise<never>;
}

export const productionConfigurationPersistenceAdapter: ProductionConfigurationPersistenceAdapter = {
  preview: (config) => validateProductionInitialConfiguration(config),
  apply: async () => {
    throw new Error(
      'NOT_IMPLEMENTED_FOR_PHASE_10_5: Production persistence adapter is non-operational. Integration remains preview-only for future deployment.'
    );
  },
};

