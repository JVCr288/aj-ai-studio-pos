import {
  StudioOnboardingProject,
  ProductionIntegrationPlan,
  IntegrationOperation,
  IntegrationReceipt,
  IntegrationError,
  IntegrationStatus,
} from '../types';
import { resolveApprovedSubmission } from './onboardingConfigurationMapper';

/**
 * PRODUCTION DATABASE ADAPTER (PHASE 10.7C)
 * Real server-side PostgreSQL persistence adapter enforcing atomic transactions,
 * database idempotency guarantees, approved-source revalidation, and audited operations.
 *
 * Rules:
 * - Server-only execution context (never import into frontend components)
 * - Single PostgreSQL transaction boundary via Drizzle ORM
 * - Revalidates approved submission status and provenance on server before write
 * - Idempotency key UNIQUE constraint on integration_runs table
 * - Resolves source asset IDs to asset_records.id (UUID FKs)
 * - Excludes raw credentials, storage_keys, or Base64 blobs from receipts
 * - Fails safely with DATABASE_NOT_CONFIGURED when DATABASE_URL is not set
 */

export interface DatabaseTransactionContext {
  idempotencyKey: string;
  planId: string;
  dbTx?: any; // Lazy reference to active Drizzle transaction
}

export class ProductionDatabaseAdapter {
  public readonly adapterName = 'ProductionDatabaseAdapter';
  public readonly isProduction = true;

  /**
   * Checks if DATABASE_URL is available for live execution.
   */
  public isDatabaseConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
  }

  /**
   * Checks database idempotency table for existing run receipts.
   * Returns ALREADY_APPLIED receipt if a COMMITTED run exists for this key.
   */
  public async checkIdempotency(idempotencyKey: string): Promise<IntegrationReceipt | null> {
    if (!this.isDatabaseConfigured()) {
      return null;
    }

    try {
      const { db } = await import('../db');
      const { integrationRuns } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');

      const existingRuns = await db
        .select()
        .from(integrationRuns)
        .where(eq(integrationRuns.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingRuns.length > 0) {
        const run = existingRuns[0];
        if (run.status === 'COMMITTED') {
          return {
            integrationId: run.integrationId,
            idempotencyKey: run.idempotencyKey,
            source: {
              projectId: run.projectId,
              approvedSubmissionId: run.approvedSubmissionId,
              submissionVersion: run.submissionVersion,
              schemaVersion: run.schemaVersion as '1.0',
              mapperVersion: run.mapperVersion,
            },
            mode: 'REAL_APPLY',
            status: 'ALREADY_APPLIED',
            operationCount: run.operationCount,
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt?.toISOString() || run.createdAt.toISOString(),
            warnings: [],
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('⚠️ [ProductionDatabaseAdapter] Idempotency check database query failed:', err);
      return null;
    }
  }

  /**
   * Server-Side Revalidation of Approved Source Provenance.
   * Prevents stale, forged, or unapproved client plans from executing.
   */
  public validateApprovedSource(
    project: StudioOnboardingProject,
    plan: ProductionIntegrationPlan
  ): { valid: boolean; error?: IntegrationError } {
    if (project.project?.status !== 'APPROVED') {
      return {
        valid: false,
        error: {
          code: 'SOURCE_NOT_APPROVED',
          message: `Onboarding project status '${project.project?.status}' is not APPROVED. Persistence rejected.`,
        },
      };
    }

    const { snapshot, error: resolveErr } = resolveApprovedSubmission(project);
    if (resolveErr || !snapshot || snapshot.reviewStatus !== 'APPROVED' || !snapshot.approvedAt) {
      return {
        valid: false,
        error: {
          code: 'APPROVED_SUBMISSION_MISSING',
          message: resolveErr?.message || 'Approved submission snapshot is missing or invalid.',
        },
      };
    }

    if (snapshot.submissionId !== plan.source.approvedSubmissionId) {
      return {
        valid: false,
        error: {
          code: 'SOURCE_CHANGED',
          message: `Approved submission ID mismatch. Expected '${snapshot.submissionId}', plan had '${plan.source.approvedSubmissionId}'.`,
        },
      };
    }

    if (plan.validation.readinessState !== 'READY_FOR_INTEGRATION') {
      return {
        valid: false,
        error: {
          code: 'MAPPER_NOT_READY',
          message: 'Configuration mapper readiness state is NOT_READY. Integration rejected.',
        },
      };
    }

    return { valid: true };
  }

  /**
   * Executes a controlled REAL_APPLY database transaction within PostgreSQL.
   * Enforces atomic single-transaction execution, studio resolution, entity upserts,
   * asset FK resolution, idempotency recording, and audit operation logging.
   */
  public async applyRealTransaction(
    plan: ProductionIntegrationPlan,
    project: StudioOnboardingProject
  ): Promise<{
    success: boolean;
    status: IntegrationStatus;
    receipt: IntegrationReceipt;
    error?: IntegrationError;
  }> {
    const startTime = new Date().toISOString();

    // 1. Guard Database Availability
    if (!this.isDatabaseConfigured()) {
      const error: IntegrationError = {
        code: 'DATABASE_NOT_CONFIGURED',
        message: 'PostgreSQL database connection is not configured (DATABASE_URL missing).',
      };
      const receipt: IntegrationReceipt = {
        integrationId: `rcpt_unconfigured_${Date.now()}`,
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

    // 2. Revalidate Approved Source Provenance
    const sourceValidation = this.validateApprovedSource(project, plan);
    if (!sourceValidation.valid || sourceValidation.error) {
      const error = sourceValidation.error!;
      const receipt: IntegrationReceipt = {
        integrationId: `rcpt_rejected_${Date.now()}`,
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

    // 3. Idempotency Check
    const existingReceipt = await this.checkIdempotency(plan.idempotencyKey);
    if (existingReceipt) {
      return {
        success: true,
        status: 'ALREADY_APPLIED',
        receipt: existingReceipt,
      };
    }

    // 4. Single PostgreSQL Transaction Boundary
    try {
      const { db } = await import('../db');
      const {
        productionStudios,
        studioProfiles,
        bookingPackages,
        studioSpaces,
        studioSpaceAssets,
        paymentConfigurations,
        paymentMethods,
        bookingRules,
        invoiceProfiles,
        assetRecords,
        integrationRuns,
        integrationOperationRecords,
      } = await import('../db/schema');
      const { eq, and, or } = await import('drizzle-orm');

      const resultReceipt = await db.transaction(async (tx) => {
        // A. Insert integration_run (STARTED)
        const integrationRunId = crypto.randomUUID();
        const integrationId = `rcpt_db_${plan.idempotencyKey.replace('idemp_', '')}`;

        await tx.insert(integrationRuns).values({
          id: integrationRunId,
          integrationId,
          idempotencyKey: plan.idempotencyKey,
          projectId: plan.source.projectId,
          approvedSubmissionId: plan.source.approvedSubmissionId,
          submissionVersion: plan.source.submissionVersion,
          schemaVersion: plan.source.schemaVersion,
          mapperVersion: plan.source.mapperVersion,
          status: 'STARTED',
          operationCount: plan.operations.length,
          actorUserId: 'system_onboarding_integration',
          startedAt: new Date(startTime),
        });

        // Helper: Lookup Asset Record UUID by sourceAssetId
        const resolveAssetUuid = async (sourceAssetId?: string): Promise<string | undefined> => {
          if (!sourceAssetId) return undefined;
          const records = await tx
            .select({ id: assetRecords.id })
            .from(assetRecords)
            .where(eq(assetRecords.sourceAssetId, sourceAssetId))
            .limit(1);
          return records.length > 0 ? records[0].id : undefined;
        };

        // B. Upsert Studio Root (`production_studios`)
        const studioSlug = `studio-${plan.source.projectId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const legacyId = plan.source.projectId || 'nocturne';
        let studioId: string;

        const existingStudios = await tx
          .select({ id: productionStudios.id })
          .from(productionStudios)
          .where(
            or(
              eq(productionStudios.slug, studioSlug),
              eq(productionStudios.legacyStudioId, legacyId)
            )
          )
          .limit(1);

        if (existingStudios.length > 0) {
          studioId = existingStudios[0].id;
        } else {
          studioId = crypto.randomUUID();
          await tx.insert(productionStudios).values({
            id: studioId,
            legacyStudioId: legacyId,
            slug: studioSlug,
            displayName: project.studio?.name || 'AKK Photo Studio',
            status: 'APPROVED',
          });
        }

        // Link studioId to integration_run
        await tx
          .update(integrationRuns)
          .set({ studioId })
          .where(eq(integrationRuns.id, integrationRunId));

        // Execute Operations sequentially according to plan
        for (let i = 0; i < plan.operations.length; i++) {
          const op = plan.operations[i];
          const seq = i + 1;

          switch (op.type) {
            case 'UPSERT_STUDIO_PROFILE': {
              const p = op.payload;
              const logoAssetUuid = await resolveAssetUuid(p.logoAssetId);

              const existing = await tx
                .select({ id: studioProfiles.id })
                .from(studioProfiles)
                .where(eq(studioProfiles.studioId, studioId))
                .limit(1);

              if (existing.length > 0) {
                await tx
                  .update(studioProfiles)
                  .set({
                    name: p.name,
                    logoAssetId: logoAssetUuid || null,
                    address: p.address,
                    googleMapsUrl: p.googleMapsUrl || null,
                    phone: p.phone,
                    email: p.email,
                    facebookUrl: p.facebookUrl || null,
                    telegramContact: p.telegramContact || null,
                    otherContact: p.otherContact || null,
                    openingHours: p.openingHours || null,
                    closedDays: p.closedDays || [],
                    sourceProjectId: plan.source.projectId,
                    sourceSubmissionId: plan.source.approvedSubmissionId,
                    updatedAt: new Date(),
                  })
                  .where(eq(studioProfiles.id, existing[0].id));
              } else {
                await tx.insert(studioProfiles).values({
                  id: crypto.randomUUID(),
                  studioId,
                  name: p.name,
                  logoAssetId: logoAssetUuid || null,
                  address: p.address,
                  googleMapsUrl: p.googleMapsUrl || null,
                  phone: p.phone,
                  email: p.email,
                  facebookUrl: p.facebookUrl || null,
                  telegramContact: p.telegramContact || null,
                  otherContact: p.otherContact || null,
                  openingHours: p.openingHours || null,
                  closedDays: p.closedDays || [],
                  sourceProjectId: plan.source.projectId,
                  sourceSubmissionId: plan.source.approvedSubmissionId,
                });
              }
              break;
            }

            case 'UPSERT_BOOKING_PACKAGE': {
              const pkg = op.payload;
              const existing = await tx
                .select({ id: bookingPackages.id })
                .from(bookingPackages)
                .where(
                  and(
                    eq(bookingPackages.studioId, studioId),
                    eq(bookingPackages.sourcePackageId, pkg.packageId)
                  )
                )
                .limit(1);

              if (existing.length > 0) {
                await tx
                  .update(bookingPackages)
                  .set({
                    name: pkg.name,
                    price: pkg.price,
                    currency: pkg.currency || 'MMK',
                    depositType: pkg.depositRule.type,
                    depositValue: pkg.depositRule.value,
                    refundablePolicy: pkg.depositRule.refundablePolicy || null,
                    sessionDurationMinutes: pkg.sessionDurationMinutes,
                    includedItems: pkg.includedItems || [],
                    retouchedPhotoCount: pkg.retouchedPhotoCount || null,
                    description: pkg.description || null,
                    notes: pkg.notes || null,
                    enabled: pkg.enabled !== false,
                    sortOrder: pkg.sortOrder || 0,
                    sourceSubmissionId: plan.source.approvedSubmissionId,
                    updatedAt: new Date(),
                  })
                  .where(eq(bookingPackages.id, existing[0].id));
              } else {
                await tx.insert(bookingPackages).values({
                  id: crypto.randomUUID(),
                  studioId,
                  sourcePackageId: pkg.packageId,
                  name: pkg.name,
                  price: pkg.price,
                  currency: pkg.currency || 'MMK',
                  depositType: pkg.depositRule.type,
                  depositValue: pkg.depositRule.value,
                  refundablePolicy: pkg.depositRule.refundablePolicy || null,
                  sessionDurationMinutes: pkg.sessionDurationMinutes,
                  includedItems: pkg.includedItems || [],
                  retouchedPhotoCount: pkg.retouchedPhotoCount || null,
                  description: pkg.description || null,
                  notes: pkg.notes || null,
                  enabled: pkg.enabled !== false,
                  sortOrder: pkg.sortOrder || 0,
                  sourceSubmissionId: plan.source.approvedSubmissionId,
                });
              }
              break;
            }

            case 'UPSERT_STUDIO_SPACE': {
              const space = op.payload;
              const floorPlanUuid = await resolveAssetUuid(space.floorPlanAssetId);
              const sketchUuid = await resolveAssetUuid(space.sketchAssetId);

              const existing = await tx
                .select({ id: studioSpaces.id })
                .from(studioSpaces)
                .where(
                  and(
                    eq(studioSpaces.studioId, studioId),
                    eq(studioSpaces.sourceSpaceId, space.spaceId)
                  )
                )
                .limit(1);

              let spaceUuid: string;
              if (existing.length > 0) {
                spaceUuid = existing[0].id;
                await tx
                  .update(studioSpaces)
                  .set({
                    name: space.name,
                    primaryUse: space.primaryUse,
                    approximateSize: space.approximateSize || null,
                    floorPlanAssetId: floorPlanUuid || null,
                    sketchAssetId: sketchUuid || null,
                    notes: space.notes || null,
                    enabled: space.enabled !== false,
                    sortOrder: space.sortOrder || 0,
                    sourceSubmissionId: plan.source.approvedSubmissionId,
                    updatedAt: new Date(),
                  })
                  .where(eq(studioSpaces.id, spaceUuid));
              } else {
                spaceUuid = crypto.randomUUID();
                await tx.insert(studioSpaces).values({
                  id: spaceUuid,
                  studioId,
                  sourceSpaceId: space.spaceId,
                  name: space.name,
                  primaryUse: space.primaryUse,
                  approximateSize: space.approximateSize || null,
                  floorPlanAssetId: floorPlanUuid || null,
                  sketchAssetId: sketchUuid || null,
                  notes: space.notes || null,
                  enabled: space.enabled !== false,
                  sortOrder: space.sortOrder || 0,
                  sourceSubmissionId: plan.source.approvedSubmissionId,
                });
              }

              // Space Room Photos Sync
              if (space.roomPhotoAssetIds && Array.isArray(space.roomPhotoAssetIds)) {
                for (let idx = 0; idx < space.roomPhotoAssetIds.length; idx++) {
                  const photoSourceId = space.roomPhotoAssetIds[idx];
                  const photoUuid = await resolveAssetUuid(photoSourceId);
                  if (photoUuid) {
                    await tx
                      .insert(studioSpaceAssets)
                      .values({
                        id: crypto.randomUUID(),
                        spaceId: spaceUuid,
                        assetId: photoUuid,
                        role: 'ROOM_PHOTO',
                        sortOrder: idx,
                      })
                      .onConflictDoNothing();
                  }
                }
              }
              break;
            }

            case 'UPSERT_PAYMENT_CONFIGURATION': {
              const payConfig = op.payload;
              const existing = await tx
                .select({ id: paymentConfigurations.id })
                .from(paymentConfigurations)
                .where(eq(paymentConfigurations.studioId, studioId))
                .limit(1);

              let paymentConfigUuid: string;
              if (existing.length > 0) {
                paymentConfigUuid = existing[0].id;
                await tx
                  .update(paymentConfigurations)
                  .set({
                    defaultDepositType: payConfig.defaultDepositRule.type,
                    defaultDepositValue: payConfig.defaultDepositRule.value,
                    defaultRefundablePolicy: payConfig.defaultDepositRule.refundablePolicy || null,
                    remainingBalanceTiming: payConfig.remainingBalanceTiming,
                    sourceSubmissionId: plan.source.approvedSubmissionId,
                    updatedAt: new Date(),
                  })
                  .where(eq(paymentConfigurations.id, paymentConfigUuid));
              } else {
                paymentConfigUuid = crypto.randomUUID();
                await tx.insert(paymentConfigurations).values({
                  id: paymentConfigUuid,
                  studioId,
                  defaultDepositType: payConfig.defaultDepositRule.type,
                  defaultDepositValue: payConfig.defaultDepositRule.value,
                  defaultRefundablePolicy: payConfig.defaultDepositRule.refundablePolicy || null,
                  remainingBalanceTiming: payConfig.remainingBalanceTiming,
                  sourceSubmissionId: plan.source.approvedSubmissionId,
                });
              }

              // Payment Methods Upsert
              if (payConfig.methods && Array.isArray(payConfig.methods)) {
                for (const pm of payConfig.methods) {
                  const qrUuid = await resolveAssetUuid(pm.qrAssetId);
                  const existingPm = await tx
                    .select({ id: paymentMethods.id })
                    .from(paymentMethods)
                    .where(
                      and(
                        eq(paymentMethods.paymentConfigId, paymentConfigUuid),
                        eq(paymentMethods.sourcePaymentMethodId, pm.paymentMethodId)
                      )
                    )
                    .limit(1);

                  if (existingPm.length > 0) {
                    await tx
                      .update(paymentMethods)
                      .set({
                        provider: pm.provider,
                        enabled: pm.enabled !== false,
                        accountName: pm.accountName || null,
                        accountIdentifier: pm.accountIdentifier || null,
                        qrAssetId: qrUuid || null,
                        notes: pm.notes || null,
                        sourceSubmissionId: plan.source.approvedSubmissionId,
                        updatedAt: new Date(),
                      })
                      .where(eq(paymentMethods.id, existingPm[0].id));
                  } else {
                    await tx.insert(paymentMethods).values({
                      id: crypto.randomUUID(),
                      paymentConfigId: paymentConfigUuid,
                      sourcePaymentMethodId: pm.paymentMethodId,
                      provider: pm.provider,
                      enabled: pm.enabled !== false,
                      accountName: pm.accountName || null,
                      accountIdentifier: pm.accountIdentifier || null,
                      qrAssetId: qrUuid || null,
                      notes: pm.notes || null,
                      sourceSubmissionId: plan.source.approvedSubmissionId,
                    });
                  }
                }
              }
              break;
            }

            case 'UPSERT_BOOKING_RULES': {
              const rules = op.payload;
              const existing = await tx
                .select({ id: bookingRules.id })
                .from(bookingRules)
                .where(eq(bookingRules.studioId, studioId))
                .limit(1);

              if (existing.length > 0) {
                await tx
                  .update(bookingRules)
                  .set({
                    openingTime: rules.openingTime,
                    closingTime: rules.closingTime,
                    defaultSessionDurationMinutes: rules.defaultSessionDurationMinutes,
                    bufferMinutes: rules.bufferMinutes,
                    closedDays: rules.closedDays || [],
                    maxAdvanceBookingDays: rules.maxAdvanceBookingDays,
                    sameDayBooking: rules.sameDayBooking === true,
                    reschedulePolicy: rules.reschedulePolicy,
                    cancellationPolicy: rules.cancellationPolicy,
                    depositRefundPolicy: rules.depositRefundPolicy,
                    sourceSubmissionId: plan.source.approvedSubmissionId,
                    updatedAt: new Date(),
                  })
                  .where(eq(bookingRules.id, existing[0].id));
              } else {
                await tx.insert(bookingRules).values({
                  id: crypto.randomUUID(),
                  studioId,
                  openingTime: rules.openingTime,
                  closingTime: rules.closingTime,
                  defaultSessionDurationMinutes: rules.defaultSessionDurationMinutes,
                  bufferMinutes: rules.bufferMinutes,
                  closedDays: rules.closedDays || [],
                  maxAdvanceBookingDays: rules.maxAdvanceBookingDays,
                  sameDayBooking: rules.sameDayBooking === true,
                  reschedulePolicy: rules.reschedulePolicy,
                  cancellationPolicy: rules.cancellationPolicy,
                  depositRefundPolicy: rules.depositRefundPolicy,
                  sourceSubmissionId: plan.source.approvedSubmissionId,
                });
              }
              break;
            }

            case 'UPSERT_INVOICE_PROFILE': {
              const inv = op.payload;
              const logoAssetUuid = await resolveAssetUuid(inv.logoAssetId);

              const existing = await tx
                .select({ id: invoiceProfiles.id })
                .from(invoiceProfiles)
                .where(eq(invoiceProfiles.studioId, studioId))
                .limit(1);

              if (existing.length > 0) {
                await tx
                  .update(invoiceProfiles)
                  .set({
                    useStudioProfile: inv.useStudioProfile !== false,
                    studioName: inv.studioName,
                    address: inv.address,
                    phone: inv.phone,
                    logoAssetId: logoAssetUuid || null,
                    businessInfo: inv.businessInfo || null,
                    taxInfo: inv.taxInfo || null,
                    footerMessage: inv.footerMessage || null,
                    sourceSubmissionId: plan.source.approvedSubmissionId,
                    updatedAt: new Date(),
                  })
                  .where(eq(invoiceProfiles.id, existing[0].id));
              } else {
                await tx.insert(invoiceProfiles).values({
                  id: crypto.randomUUID(),
                  studioId,
                  useStudioProfile: inv.useStudioProfile !== false,
                  studioName: inv.studioName,
                  address: inv.address,
                  phone: inv.phone,
                  logoAssetId: logoAssetUuid || null,
                  businessInfo: inv.businessInfo || null,
                  taxInfo: inv.taxInfo || null,
                  footerMessage: inv.footerMessage || null,
                  sourceSubmissionId: plan.source.approvedSubmissionId,
                });
              }
              break;
            }

            case 'REGISTER_ASSET_BINDING': {
              const asset = op.payload;
              const existingAsset = await tx
                .select({ id: assetRecords.id })
                .from(assetRecords)
                .where(
                  and(
                    eq(assetRecords.studioId, studioId),
                    eq(assetRecords.sourceAssetId, asset.assetId)
                  )
                )
                .limit(1);

              if (existingAsset.length === 0) {
                await tx.insert(assetRecords).values({
                  id: crypto.randomUUID(),
                  studioId,
                  sourceAssetId: asset.assetId,
                  category: asset.category || 'OTHER',
                  mimeType: asset.mimeType || 'application/octet-stream',
                  fileSizeBytes: asset.fileSizeBytes || 0,
                  storageProvider: 'DEV_LOCAL',
                  storageKey: `assets/${studioId}/${asset.assetId}`,
                  uploadStatus: 'READY',
                  sourceProjectId: plan.source.projectId,
                  sourceSubmissionId: plan.source.approvedSubmissionId,
                });
              }
              break;
            }
          }

          // Record Operation Audit Entry
          await tx.insert(integrationOperationRecords).values({
            id: crypto.randomUUID(),
            integrationRunId,
            sequence: seq,
            operationId: op.operationId,
            operationType: op.type,
            targetKey: op.targetKey,
            sourceId: op.sourceId,
            status: 'APPLIED',
          });
        }

        // C. Update integration_run status to COMMITTED
        const completedTime = new Date();
        await tx
          .update(integrationRuns)
          .set({
            status: 'COMMITTED',
            completedAt: completedTime,
          })
          .where(eq(integrationRuns.id, integrationRunId));

        const receipt: IntegrationReceipt = {
          integrationId,
          idempotencyKey: plan.idempotencyKey,
          source: plan.source,
          mode: 'REAL_APPLY',
          status: 'REAL_COMMITTED' as IntegrationStatus,
          operationCount: plan.operations.length,
          startedAt: startTime,
          completedAt: completedTime.toISOString(),
          warnings: plan.validation.warnings || [],
        };

        return receipt;
      });

      return {
        success: true,
        status: resultReceipt.status,
        receipt: resultReceipt,
      };
    } catch (err: any) {
      console.error('❌ [ProductionDatabaseAdapter] Transaction failed and rolled back:', err);

      // Concurrency / Race Condition Guard: If unique constraint on idempotency key failed, re-query idempotency state
      if (err?.code === '23505' || err?.message?.includes('idempotency') || err?.message?.includes('unique')) {
        const recheckedReceipt = await this.checkIdempotency(plan.idempotencyKey);
        if (recheckedReceipt) {
          return {
            success: true,
            status: 'ALREADY_APPLIED',
            receipt: recheckedReceipt,
          };
        }
      }

      const error: IntegrationError = {
        code: 'TRANSACTION_FAILED',
        message: err?.message || 'PostgreSQL transaction failed. Complete rollback executed.',
      };
      const receipt: IntegrationReceipt = {
        integrationId: `rcpt_err_${Date.now()}`,
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
  }
}

// Global Singleton Instance for Server Database Adapter
export const productionDatabaseAdapter = new ProductionDatabaseAdapter();
