import {
  StudioOnboardingProject,
  OnboardingStepIndex,
  CanonicalStepName,
} from '../types';

export interface StepDefinition {
  stepNumber: OnboardingStepIndex;
  id: CanonicalStepName;
  label: string;
  shortHelper: string;
  validate: (project: StudioOnboardingProject) => string[];
}

// ----------------------------------------------------------------------------
// LEVEL 2 — SECTION VALIDATION RULES
// ----------------------------------------------------------------------------

export const validateStudioInformation = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  if (!project.studio.name || !project.studio.name.trim()) {
    errors.push('Studio name is required.');
  }
  if (!project.studio.phone || !project.studio.phone.trim()) {
    errors.push('Primary contact phone is required.');
  }
  if (!project.studio.email || !project.studio.email.trim() || !project.studio.email.includes('@')) {
    errors.push('Valid primary contact email is required.');
  }
  if (!project.studio.address || !project.studio.address.trim()) {
    errors.push('Studio location address is required.');
  }
  if (!project.project.projectSlug || !project.project.projectSlug.trim()) {
    errors.push('Project slug identifier is required.');
  }
  return errors;
};

export const validateBookingPackages = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  if (!project.packages || project.packages.length === 0) {
    return errors;
  }
  project.packages.forEach((pkg, index) => {
    if (pkg.status === 'PLACEHOLDER' || pkg.source === 'SYSTEM_SEED') {
      return; // Placeholders pass pre-configuration submission without blocking
    }
    if (!pkg.name || !pkg.name.trim()) {
      errors.push(`Package #${index + 1}: Name is required.`);
    }
    if (pkg.price <= 0) {
      errors.push(`Package #${index + 1} (${pkg.name || 'Unnamed'}): Price must be greater than 0.`);
    }
  });
  return errors;
};

export const validateStudioSpaces = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  if (!project.spaces || project.spaces.length === 0) {
    errors.push('At least one studio space/bay must be defined.');
    return errors;
  }
  const enabledSpaces = project.spaces.filter((s) => s.enabled);
  if (enabledSpaces.length === 0) {
    errors.push('At least one studio space must be enabled.');
  }
  project.spaces.forEach((space, index) => {
    if (!space.name || !space.name.trim()) {
      errors.push(`Space #${index + 1}: Name is required.`);
    }
    if (!space.primaryUse || !space.primaryUse.trim()) {
      errors.push(`Space #${index + 1} (${space.name || 'Unnamed'}): Primary use category is required.`);
    }
  });
  return errors;
};

export const validatePaymentConfiguration = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  const methods = project.paymentConfiguration?.methods || [];
  const enabledMethods = methods.filter((m) => m.enabled);
  if (enabledMethods.length === 0) {
    errors.push('At least one payment method must be enabled.');
  }
  enabledMethods.forEach((method) => {
    if (method.provider !== 'CASH') {
      if (!method.accountName || !method.accountName.trim()) {
        errors.push(`${method.provider}: Account title name is required for enabled digital payments.`);
      }
      if (!method.accountIdentifier || !method.accountIdentifier.trim()) {
        errors.push(`${method.provider}: Account number/identifier is required for enabled digital payments.`);
      }
    }
  });
  return errors;
};

export const validateBookingRules = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  const rules = project.bookingRules;
  if (!rules.openingTime || !rules.openingTime.trim()) {
    errors.push('Studio opening time is required.');
  }
  if (!rules.closingTime || !rules.closingTime.trim()) {
    errors.push('Studio closing time is required.');
  }
  return errors;
};

export const validateInvoiceProfile = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  const inv = project.invoiceProfile;
  if (!inv.studioName || !inv.studioName.trim()) {
    errors.push('Invoice studio header name is required.');
  }
  if (!inv.address || !inv.address.trim()) {
    errors.push('Invoice billing address is required.');
  }
  if (!inv.phone || !inv.phone.trim()) {
    errors.push('Invoice contact phone is required.');
  }
  return errors;
};

export const validateSpacesAndAvailability = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  errors.push(...validateStudioSpaces(project));
  errors.push(...validateBookingRules(project));
  return errors;
};

export const validateBookingPaymentInvoice = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  errors.push(...validatePaymentConfiguration(project));
  errors.push(...validateInvoiceProfile(project));
  return errors;
};

export const validateBrandAssets = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  if (!project.studio.logoAssetId) {
    errors.push('Primary studio logo asset reference is required.');
  }
  return errors;
};

export const validateReviewSubmit = (project: StudioOnboardingProject): string[] => {
  const errors: string[] = [];
  const s1 = validateStudioInformation(project);
  const s2 = validateSpacesAndAvailability(project);
  const s3 = validateBookingPaymentInvoice(project);
  const s4 = validateBrandAssets(project);
  if (s1.length > 0 || s2.length > 0 || s3.length > 0 || s4.length > 0) {
    errors.push('All preceding steps (Steps 1–4) must be completed before final review & submission.');
  }
  return errors;
};

// ----------------------------------------------------------------------------
// CANONICAL STEP DEFINITIONS TABLE (5 STEPS)
// ----------------------------------------------------------------------------

export const ONBOARDING_STEPS: StepDefinition[] = [
  {
    stepNumber: 1,
    id: 'STUDIO_INFORMATION',
    label: 'Studio Information',
    shortHelper: 'Studio identity, location, and primary contact details',
    validate: validateStudioInformation,
  },
  {
    stepNumber: 2,
    id: 'SPACES_AND_AVAILABILITY',
    label: 'Spaces & Availability',
    shortHelper: 'Studio stage bays, room photos, and operating hours',
    validate: validateSpacesAndAvailability,
  },
  {
    stepNumber: 3,
    id: 'BOOKING_PAYMENT_INVOICE',
    label: 'Booking, Payment & Invoice',
    shortHelper: 'Booking rules, payment gateways, and billing profile',
    validate: validateBookingPaymentInvoice,
  },
  {
    stepNumber: 4,
    id: 'BRAND_ASSETS',
    label: 'Brand Assets',
    shortHelper: 'Studio logo, invoice header logo, and brand media assets',
    validate: validateBrandAssets,
  },
  {
    stepNumber: 5,
    id: 'REVIEW_SUBMIT',
    label: 'Review & Submit',
    shortHelper: 'Read-only grouped summary and final owner submission',
    validate: validateReviewSubmit,
  },
];

// ----------------------------------------------------------------------------
// STEP COMPLETION & PERCENTAGE CALCULATIONS
// ----------------------------------------------------------------------------

export const computeCompletedSteps = (project: StudioOnboardingProject): OnboardingStepIndex[] => {
  return ONBOARDING_STEPS.filter((stepDef) => {
    const errs = stepDef.validate(project);
    return errs.length === 0;
  }).map((stepDef) => stepDef.stepNumber);
};

export const computeCompletionPercentage = (completedSteps: OnboardingStepIndex[]): number => {
  return Math.round((completedSteps.length / 5) * 100);
};

// ----------------------------------------------------------------------------
// LEVEL 4 — SUBMISSION VALIDATION (ALL DOMAINS)
// ----------------------------------------------------------------------------

export interface SubmissionValidationResult {
  isValid: boolean;
  errorsByStep: Record<OnboardingStepIndex, string[]>;
  allErrors: string[];
}

export const validateFullSubmission = (project: StudioOnboardingProject): SubmissionValidationResult => {
  const errorsByStep: Record<OnboardingStepIndex, string[]> = {
    1: validateStudioInformation(project),
    2: validateSpacesAndAvailability(project),
    3: validateBookingPaymentInvoice(project),
    4: validateBrandAssets(project),
    5: validateReviewSubmit(project),
  };

  const allErrors = Object.values(errorsByStep).flat();
  return {
    isValid: allErrors.length === 0,
    errorsByStep,
    allErrors,
  };
};
