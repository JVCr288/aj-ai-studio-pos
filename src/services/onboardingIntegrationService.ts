import {
  StudioOnboardingProject,
  ProductionInitialConfiguration,
  ProductionIntegrationPlan,
  IntegrationOperation,
  IntegrationOperationType,
  IntegrationMode,
  IntegrationStatus,
  IntegrationError,
  IntegrationReceipt,
  MappingValidationResult,
  MappingWarning,
} from '../types';
import {
  buildProductionInitialConfiguration,
  resolveApprovedSubmission,
  ONBOARDING_CONFIGURATION_MAPPER_VERSION,
} from './onboardingConfigurationMapper';

/**
 * CONTROLLED INTEGRATION TRANSACTION SERVICE (PHASE 10.6)
 * Defines and implements the safe, deterministic transaction boundary for converting
 * APPROVED onboarding snapshots into production configuration integration plans.
 *
 * Rules:
 * - Real production apply remains disabled (REAL_APPLY returns PRODUCTION_PERSISTENCE_NOT_CONFIGURED)
 * - Operations derived exclusively from APPROVED submission snapshots
 * - Deterministic idempotency key derived from stable provenance and normalized payload (no timestamps or random IDs)
 * - DevelopmentMemoryProductionAdapter provides simulated transaction semantics with atomic rollback
 * - project.status remains 'APPROVED' (no transition to 'INTEGRATED')
 */

export const INTEGRATION_PLAN_VERSION = '1.0';

// ----------------------------------------------------------------------------
// DETERMINISTIC HASHING & IDEMPOTENCY KEY CALCULATION
// ----------------------------------------------------------------------------

/**
 * Fast, deterministic string hashing algorithm (FNV-1a 32-bit).
 * Runs identically in Node.js and browser without platform dependencies.
 */

export const fnv1aHash = (str: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/**
 * Normalizes configuration into a deterministic structure for hashing.
 * Excludes mappedAt, createdAt, random IDs, or volatile timestamps.
 */
export const normalizeConfigForHashing = (config: ProductionInitialConfiguration): Record<string, any> => {
  return {
    source: {
      projectId: config.source.projectId,
      approvedSubmissionId: config.source.approvedSubmissionId,
      submissionVersion: config.source.submissionVersion,
      schemaVersion: config.source.schemaVersion,
      mapperVersion: config.source.mapperVersion,
    },
    studioProfile: config.studioProfile,
    bookingPackages: [...config.bookingPackages].sort((a, b) => a.packageId.localeCompare(b.packageId)),
    spacesConfiguration: [...config.spacesConfiguration].sort((a, b) => a.spaceId.localeCompare(b.spaceId)),
    paymentConfiguration: {
      defaultDepositRule: config.paymentConfiguration.defaultDepositRule,
      remainingBalanceTiming: config.paymentConfiguration.remainingBalanceTiming,
      methods: [...config.paymentConfiguration.methods].sort((a, b) => a.paymentMethodId.localeCompare(b.paymentMethodId)),
    },
    bookingRules: config.bookingRules,
    invoiceProfile: config.invoiceProfile,
    assetBindings: [...config.assetBindings].sort((a, b) =>
      `${a.assetId}:${a.sourceField}`.localeCompare(`${b.assetId}:${b.sourceField}`)
    ),
  };
};

/**
 * Calculates a deterministic idempotency key for an integration plan.
 */
export const calculateIdempotencyKey = (
  sourceOrConfig: StudioOnboardingProject | ProductionInitialConfiguration
): string => {
  let config: ProductionInitialConfiguration;

  if ('project' in sourceOrConfig) {
    const mapperResult = buildProductionInitialConfiguration(sourceOrConfig);
    if (!mapperResult.success || !mapperResult.config) {
      // Fallback deterministic key for unmapped/unapproved state
      const projId = sourceOrConfig.project?.projectId || 'unknown_project';
      const subId = sourceOrConfig.submission?.approvedSubmissionId || 'no_approved_sub';
      return `idemp_${fnv1aHash(`${projId}:${subId}:unmapped`)}`;
    }
    config = mapperResult.config;
  } else {
    config = sourceOrConfig;
  }

  const normalized = normalizeConfigForHashing(config);
  const serialized = JSON.stringify(normalized);
  const digest = fnv1aHash(serialized);

  return `idemp_${config.source.projectId}_${digest}`;
};

// ----------------------------------------------------------------------------
// INTEGRATION PLAN GENERATION
// ----------------------------------------------------------------------------

export const createIntegrationPlan = (
  project: StudioOnboardingProject
): {
  success: boolean;
  plan?: ProductionIntegrationPlan;
  error?: IntegrationError;
  validation: MappingValidationResult;
} => {
  const now = new Date().toISOString();

  // 1. Authoritative Provenance Resolution
  const { snapshot, error: resolveError } = resolveApprovedSubmission(project);
  if (resolveError || !snapshot) {
    const error: IntegrationError = {
      code: 'INTEGRATION_SOURCE_NOT_APPROVED',
      message: resolveError?.message || 'Onboarding project source is not approved.',
    };
    return {
      success: false,
      error,
      validation: {
        valid: false,
        errors: [{ code: 'APPROVED_SUBMISSION_MISSING', message: error.message }],
        warnings: [],
        readinessState: 'NOT_READY',
      },
    };
  }

  // 2. Configuration Mapper Invocation
  const mapperResult = buildProductionInitialConfiguration(project);
  if (!mapperResult.success || !mapperResult.config) {
    const error: IntegrationError = {
      code: 'MAPPER_NOT_READY',
      message: 'Configuration mapper validation failed. Cannot construct integration plan.',
    };
    return {
      success: false,
      error,
      validation: mapperResult.validation,
    };
  }

  const config = mapperResult.config;
  const operations: IntegrationOperation[] = [];
  let seq = 1;

  // 3. Construct Deterministic Operations (Order: Studio Profile -> Packages -> Spaces -> Payments -> Rules -> Invoice -> Assets)
  // Operation 1: Studio Profile
  operations.push({
    operationId: `op_${seq}_studio_profile`,
    type: 'UPSERT_STUDIO_PROFILE',
    targetKey: 'studio_profile',
    sourceId: snapshot.submissionId,
    payload: config.studioProfile,
    sequence: seq++,
  });

  // Operations 2..N: Booking Packages
  config.bookingPackages.forEach((pkg) => {
    operations.push({
      operationId: `op_${seq}_booking_package_${pkg.packageId}`,
      type: 'UPSERT_BOOKING_PACKAGE',
      targetKey: `booking_package:${pkg.packageId}`,
      sourceId: snapshot.submissionId,
      payload: pkg,
      sequence: seq++,
    });
  });

  // Operations N..M: Studio Spaces
  config.spacesConfiguration.forEach((sp) => {
    operations.push({
      operationId: `op_${seq}_studio_space_${sp.spaceId}`,
      type: 'UPSERT_STUDIO_SPACE',
      targetKey: `studio_space:${sp.spaceId}`,
      sourceId: snapshot.submissionId,
      payload: sp,
      sequence: seq++,
    });
  });

  // Operation: Payment Configuration
  operations.push({
    operationId: `op_${seq}_payment_configuration`,
    type: 'UPSERT_PAYMENT_CONFIGURATION',
    targetKey: 'payment_configuration',
    sourceId: snapshot.submissionId,
    payload: config.paymentConfiguration,
    sequence: seq++,
  });

  // Operation: Booking Rules
  operations.push({
    operationId: `op_${seq}_booking_rules`,
    type: 'UPSERT_BOOKING_RULES',
    targetKey: 'booking_rules',
    sourceId: snapshot.submissionId,
    payload: config.bookingRules,
    sequence: seq++,
  });

  // Operation: Invoice Profile
  operations.push({
    operationId: `op_${seq}_invoice_profile`,
    type: 'UPSERT_INVOICE_PROFILE',
    targetKey: 'invoice_profile',
    sourceId: snapshot.submissionId,
    payload: config.invoiceProfile,
    sequence: seq++,
  });

  // Operations: Asset Bindings
  config.assetBindings.forEach((ab) => {
    const cleanField = ab.sourceField.replace(/[^a-zA-Z0-9_]/g, '_');
    operations.push({
      operationId: `op_${seq}_asset_binding_${ab.assetId}_${cleanField}`,
      type: 'REGISTER_ASSET_BINDING',
      targetKey: `asset_binding:${ab.assetId}:${ab.sourceField}`,
      sourceId: snapshot.submissionId,
      payload: ab,
      sequence: seq++,
    });
  });

  // 4. Calculate Deterministic Idempotency Key
  const idempotencyKey = calculateIdempotencyKey(config);

  const plan: ProductionIntegrationPlan = {
    planVersion: INTEGRATION_PLAN_VERSION,
    idempotencyKey,
    source: {
      projectId: config.source.projectId,
      approvedSubmissionId: config.source.approvedSubmissionId,
      submissionVersion: config.source.submissionVersion,
      schemaVersion: '1.0',
      mapperVersion: ONBOARDING_CONFIGURATION_MAPPER_VERSION,
    },
    operations,
    validation: mapperResult.validation,
    createdAt: now,
  };

  return {
    success: true,
    plan,
    validation: mapperResult.validation,
  };
};

// ----------------------------------------------------------------------------
// PLAN VALIDATION & DRY RUN
// ----------------------------------------------------------------------------

export const validateIntegrationPlan = (
  plan: ProductionIntegrationPlan
): { valid: boolean; errors: IntegrationError[] } => {
  const errors: IntegrationError[] = [];
  const targetKeys = new Set<string>();

  if (!plan.operations || plan.operations.length === 0) {
    errors.push({
      code: 'INVALID_INTEGRATION_PLAN',
      message: 'Integration plan contains no operations.',
    });
    return { valid: false, errors };
  }

  for (const op of plan.operations) {
    if (!op.type) {
      errors.push({
        code: 'UNSUPPORTED_OPERATION',
        message: `Operation '${op.operationId}' has missing type.`,
        operationId: op.operationId,
      });
    }

    if (targetKeys.has(op.targetKey)) {
      errors.push({
        code: 'DUPLICATE_TARGET',
        message: `Duplicate operation targetKey '${op.targetKey}' detected in plan.`,
        operationId: op.operationId,
      });
    }
    targetKeys.add(op.targetKey);
  }

  return { valid: errors.length === 0, errors };
};

export const performDryRun = (
  plan: ProductionIntegrationPlan
): {
  success: boolean;
  readiness: 'NOT_READY' | 'READY_FOR_INTEGRATION';
  errors: IntegrationError[];
  warnings: MappingWarning[];
  operationCount: number;
  idempotencyKey: string;
  receipt: IntegrationReceipt;
} => {
  const now = new Date().toISOString();
  const planVal = validateIntegrationPlan(plan);
  const mapperVal = plan.validation;

  const errors: IntegrationError[] = [...planVal.errors];
  if (!mapperVal.valid) {
    mapperVal.errors.forEach((e) => {
      errors.push({
        code: 'MAPPER_NOT_READY',
        message: e.message,
        fieldPath: e.fieldPath,
      });
    });
  }

  const success = errors.length === 0;

  const receipt: IntegrationReceipt = {
    integrationId: `rcpt_dryrun_${plan.idempotencyKey.replace('idemp_', '')}`,
    idempotencyKey: plan.idempotencyKey,
    source: plan.source,
    mode: 'DRY_RUN',
    status: success ? 'DRY_RUN_SUCCESS' : 'FAILED',
    operationCount: plan.operations.length,
    startedAt: now,
    completedAt: now,
    warnings: plan.validation.warnings || [],
    error: errors.length > 0 ? errors[0] : undefined,
  };

  return {
    success,
    readiness: success ? 'READY_FOR_INTEGRATION' : 'NOT_READY',
    errors,
    warnings: plan.validation.warnings || [],
    operationCount: plan.operations.length,
    idempotencyKey: plan.idempotencyKey,
    receipt,
  };
};

// ----------------------------------------------------------------------------
// DEVELOPMENT MEMORY PERSISTENCE ADAPTER (NON-PRODUCTION)
// ----------------------------------------------------------------------------

export interface DevelopmentTransactionContext {
  idempotencyKey: string;
  planId: string;
  stagedOperations: Map<string, IntegrationOperation>;
}

export class DevelopmentMemoryProductionAdapter {
  public readonly adapterName = 'DevelopmentMemoryProductionAdapter';
  public readonly isProduction = false;

  private receiptsMap = new Map<string, IntegrationReceipt>();
  private appliedDataStore = new Map<string, any>();

  public checkIdempotency(idempotencyKey: string): IntegrationReceipt | null {
    const existing = this.receiptsMap.get(idempotencyKey);
    if (existing && (existing.status === 'SIMULATED_COMMITTED' || existing.status === 'ALREADY_APPLIED')) {
      return existing;
    }
    return null;
  }

  public beginTransaction(context: { idempotencyKey: string; planId: string }): DevelopmentTransactionContext {
    return {
      idempotencyKey: context.idempotencyKey,
      planId: context.planId,
      stagedOperations: new Map<string, IntegrationOperation>(),
    };
  }

  public applyOperation(tx: DevelopmentTransactionContext, op: IntegrationOperation): void {
    tx.stagedOperations.set(op.targetKey, op);
  }

  public commitTransaction(tx: DevelopmentTransactionContext): void {
    tx.stagedOperations.forEach((op, targetKey) => {
      this.appliedDataStore.set(targetKey, op.payload);
    });
    tx.stagedOperations.clear();
  }

  public rollbackTransaction(tx: DevelopmentTransactionContext): void {
    // Clear staged operations — zero side effects persist
    tx.stagedOperations.clear();
  }

  public recordIntegrationReceipt(receipt: IntegrationReceipt): void {
    this.receiptsMap.set(receipt.idempotencyKey, receipt);
  }

  public getAppliedStoreCount(): number {
    return this.appliedDataStore.size;
  }

  public getReceipts(): IntegrationReceipt[] {
    return Array.from(this.receiptsMap.values());
  }

  public reset(): void {
    this.receiptsMap.clear();
    this.appliedDataStore.clear();
  }
}

// Global Singleton Instance for Dev Simulation
export const developmentMemoryAdapter = new DevelopmentMemoryProductionAdapter();

// ----------------------------------------------------------------------------
// CONTROLLED APPLY EXECUTION
// ----------------------------------------------------------------------------

export const applyIntegration = async (
  plan: ProductionIntegrationPlan,
  mode: IntegrationMode,
  options?: {
    failAtOperationIndex?: number; // Failure injection for testing atomic rollback
    adapter?: DevelopmentMemoryProductionAdapter;
  }
): Promise<{
  success: boolean;
  status: IntegrationStatus;
  receipt: IntegrationReceipt;
  error?: IntegrationError;
}> => {
  const startTime = new Date().toISOString();
  const adapter = options?.adapter || developmentMemoryAdapter;

  // 1. Guard Against REAL_APPLY Mode
  if (mode === 'REAL_APPLY') {
    const error: IntegrationError = {
      code: 'PRODUCTION_PERSISTENCE_NOT_CONFIGURED',
      message:
        'Production persistence adapter is not configured. REAL_APPLY is strictly disabled in Phase 10.6.',
    };
    const receipt: IntegrationReceipt = {
      integrationId: `rcpt_failed_${Date.now()}`,
      idempotencyKey: plan.idempotencyKey,
      source: plan.source,
      mode: 'REAL_APPLY',
      status: 'FAILED',
      operationCount: plan.operations.length,
      startedAt: startTime,
      completedAt: new Date().toISOString(),
      warnings: plan.validation.warnings || [],
      error,
    };
    return { success: false, status: 'FAILED', receipt, error };
  }

  // 2. Check Idempotency (Already Applied Guard)
  const existingReceipt = adapter.checkIdempotency(plan.idempotencyKey);
  if (existingReceipt) {
    const alreadyReceipt: IntegrationReceipt = {
      ...existingReceipt,
      mode,
      status: 'ALREADY_APPLIED',
      completedAt: new Date().toISOString(),
    };
    return {
      success: true,
      status: 'ALREADY_APPLIED',
      receipt: alreadyReceipt,
    };
  }

  // 3. Dry Run Mode Handling
  if (mode === 'DRY_RUN') {
    const dryRunRes = performDryRun(plan);
    return {
      success: dryRunRes.success,
      status: dryRunRes.receipt.status,
      receipt: dryRunRes.receipt,
      error: dryRunRes.errors[0],
    };
  }

  // 4. SIMULATED_APPLY Transaction Execution
  const planVal = validateIntegrationPlan(plan);
  if (!planVal.valid) {
    const error = planVal.errors[0];
    const receipt: IntegrationReceipt = {
      integrationId: `rcpt_failed_${Date.now()}`,
      idempotencyKey: plan.idempotencyKey,
      source: plan.source,
      mode: 'SIMULATED_APPLY',
      status: 'FAILED',
      operationCount: plan.operations.length,
      startedAt: startTime,
      completedAt: new Date().toISOString(),
      warnings: plan.validation.warnings || [],
      error,
    };
    return { success: false, status: 'FAILED', receipt, error };
  }

  // Begin Transaction
  const tx = adapter.beginTransaction({
    idempotencyKey: plan.idempotencyKey,
    planId: plan.idempotencyKey,
  });

  try {
    for (let i = 0; i < plan.operations.length; i++) {
      const op = plan.operations[i];

      // Failure Injection Check for Testing Rollback
      if (options?.failAtOperationIndex !== undefined && options.failAtOperationIndex === i) {
        throw new Error(`Injected simulated operation failure at index ${i} (${op.operationId})`);
      }

      adapter.applyOperation(tx, op);
    }

    // Commit Transaction
    adapter.commitTransaction(tx);
    const endTime = new Date().toISOString();

    const receipt: IntegrationReceipt = {
      integrationId: `rcpt_sim_${fnv1aHash(`${plan.idempotencyKey}:${endTime}`)}`,
      idempotencyKey: plan.idempotencyKey,
      source: plan.source,
      mode: 'SIMULATED_APPLY',
      status: 'SIMULATED_COMMITTED',
      operationCount: plan.operations.length,
      startedAt: startTime,
      completedAt: endTime,
      warnings: plan.validation.warnings || [],
    };

    adapter.recordIntegrationReceipt(receipt);
    return { success: true, status: 'SIMULATED_COMMITTED', receipt };
  } catch (err: any) {
    // Atomic Rollback
    adapter.rollbackTransaction(tx);
    const endTime = new Date().toISOString();

    const error: IntegrationError = {
      code: 'OPERATION_APPLY_FAILED',
      message: err.message || 'Simulated transaction operation failed. Rollback executed.',
    };

    const receipt: IntegrationReceipt = {
      integrationId: `rcpt_rollback_${fnv1aHash(`${plan.idempotencyKey}:${endTime}`)}`,
      idempotencyKey: plan.idempotencyKey,
      source: plan.source,
      mode: 'SIMULATED_APPLY',
      status: 'SIMULATED_ROLLED_BACK',
      operationCount: plan.operations.length,
      startedAt: startTime,
      completedAt: endTime,
      warnings: plan.validation.warnings || [],
      error,
    };

    adapter.recordIntegrationReceipt(receipt);
    return { success: false, status: 'SIMULATED_ROLLED_BACK', receipt, error };
  }
};
