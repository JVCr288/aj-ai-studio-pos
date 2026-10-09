import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * DRIZZLE ORM DATABASE SCHEMAS (PHASE 10.7C.4.2 ADDITIVE COMPATIBILITY MIGRATION)
 * Server-side relational tables for studio configuration, asset metadata,
 * integration runs, idempotency constraints, and operation records.
 *
 * Rules:
 * - Server-side authority only (NEVER import into client React components)
 * - Root studio table is production_studios (UUID PK) to preserve legacy public.studios untouched
 * - All new Phase 10.7 configuration tables reference production_studios.id (UUID FK)
 * - Money amounts (MMK) stored as bigint base units (mode: 'number')
 * - System timestamps use timestamptz
 * - Unique index on idempotency_key for database-level concurrency protection
 * - Internal asset references explicitly link to asset_records.id (UUID FK)
 * - Explicit CHECK constraints for critical string unions
 * - No raw Base64 stored in database; storage_key is backend-only
 */

// ----------------------------------------------------------------------------
// 1. PRODUCTION STUDIOS (Root Production Studio Entity - Additive Only)
// ----------------------------------------------------------------------------
export const productionStudios = pgTable('production_studios', {
  id: uuid('id').primaryKey().defaultRandom(),
  legacyStudioId: text('legacy_studio_id').unique(), // Bridges legacy text key e.g. 'nocturne'
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  status: text('status').notNull().default('APPROVED'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 2. ASSET RECORDS (Metadata & Storage Provider Boundary)
// ----------------------------------------------------------------------------
export const assetRecords = pgTable(
  'asset_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studioId: uuid('studio_id').notNull().references(() => productionStudios.id, { onDelete: 'restrict' }),
    sourceAssetId: text('source_asset_id').notNull(),
    category: text('category').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(), // Storage size in bytes
    width: integer('width'),
    height: integer('height'),
    storageProvider: text('storage_provider').notNull().default('DEV_LOCAL'),
    storageKey: text('storage_key').notNull(), // Backend-only key
    uploadStatus: text('upload_status').notNull().default('READY'),
    sourceProjectId: text('source_project_id').notNull(),
    sourceSubmissionId: text('source_submission_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('asset_records_studio_source_asset_idx').on(table.studioId, table.sourceAssetId),
    check('ar_upload_status_check', sql`"upload_status" IN ('READY', 'PENDING', 'FAILED')`),
  ]
);

// ----------------------------------------------------------------------------
// 3. STUDIO PROFILES
// ----------------------------------------------------------------------------
export const studioProfiles = pgTable('studio_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  studioId: uuid('studio_id').notNull().unique().references(() => productionStudios.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  logoAssetId: uuid('logo_asset_id').references(() => assetRecords.id, { onDelete: 'set null' }),
  address: text('address').notNull(),
  googleMapsUrl: text('google_maps_url'),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  facebookUrl: text('facebook_url'),
  telegramContact: text('telegram_contact'),
  otherContact: text('other_contact'),
  openingHours: text('opening_hours'),
  closedDays: jsonb('closed_days').$type<string[]>().default([]).notNull(),
  sourceProjectId: text('source_project_id').notNull(),
  sourceSubmissionId: text('source_submission_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 4. BOOKING PACKAGES
// ----------------------------------------------------------------------------
export const bookingPackages = pgTable(
  'booking_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studioId: uuid('studio_id').notNull().references(() => productionStudios.id, { onDelete: 'restrict' }),
    sourcePackageId: text('source_package_id').notNull(),
    name: text('name').notNull(),
    price: bigint('price', { mode: 'number' }).notNull(), // Whole integer MMK monetary amount
    currency: text('currency').notNull().default('MMK'),
    depositType: text('deposit_type').notNull(), // 'NONE' | 'FIXED' | 'PERCENTAGE'
    depositValue: bigint('deposit_value', { mode: 'number' }),
    refundablePolicy: text('refundable_policy'),
    sessionDurationMinutes: integer('session_duration_minutes').notNull(),
    includedItems: jsonb('included_items').$type<string[]>().default([]).notNull(),
    retouchedPhotoCount: integer('retouched_photo_count'),
    description: text('description'),
    notes: text('notes'),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    sourceSubmissionId: text('source_submission_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('booking_packages_studio_source_pkg_idx').on(table.studioId, table.sourcePackageId),
    check('bp_deposit_type_check', sql`"deposit_type" IN ('NONE', 'FIXED', 'PERCENTAGE')`),
  ]
);

// ----------------------------------------------------------------------------
// 5. STUDIO SPACES
// ----------------------------------------------------------------------------
export const studioSpaces = pgTable(
  'studio_spaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studioId: uuid('studio_id').notNull().references(() => productionStudios.id, { onDelete: 'restrict' }),
    sourceSpaceId: text('source_space_id').notNull(),
    name: text('name').notNull(),
    primaryUse: text('primary_use').notNull(),
    approximateSize: text('approximate_size'),
    floorPlanAssetId: uuid('floor_plan_asset_id').references(() => assetRecords.id, { onDelete: 'set null' }),
    sketchAssetId: uuid('sketch_asset_id').references(() => assetRecords.id, { onDelete: 'set null' }),
    notes: text('notes'),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    sourceSubmissionId: text('source_submission_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('studio_spaces_studio_source_space_idx').on(table.studioId, table.sourceSpaceId),
  ]
);

// ----------------------------------------------------------------------------
// 6. STUDIO SPACE ASSETS (Explicit Junction Relation Table)
// ----------------------------------------------------------------------------
export const studioSpaceAssets = pgTable(
  'studio_space_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id').notNull().references(() => studioSpaces.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id').notNull().references(() => assetRecords.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'ROOM_PHOTO' | 'FLOOR_PLAN' | 'ROUGH_SKETCH'
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('studio_space_assets_space_asset_role_idx').on(table.spaceId, table.assetId, table.role),
    check('ssa_role_check', sql`"role" IN ('ROOM_PHOTO', 'FLOOR_PLAN', 'ROUGH_SKETCH')`),
  ]
);

// ----------------------------------------------------------------------------
// 7. PAYMENT CONFIGURATION
// ----------------------------------------------------------------------------
export const paymentConfigurations = pgTable('payment_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  studioId: uuid('studio_id').notNull().unique().references(() => productionStudios.id, { onDelete: 'restrict' }),
  defaultDepositType: text('default_deposit_type').notNull(),
  defaultDepositValue: bigint('default_deposit_value', { mode: 'number' }),
  defaultRefundablePolicy: text('default_refundable_policy'),
  remainingBalanceTiming: text('remaining_balance_timing').notNull().default('UPON_SESSION_START'),
  sourceSubmissionId: text('source_submission_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 8. PAYMENT METHODS
// ----------------------------------------------------------------------------
export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentConfigId: uuid('payment_config_id').notNull().references(() => paymentConfigurations.id, { onDelete: 'cascade' }),
    sourcePaymentMethodId: text('source_payment_method_id').notNull(),
    provider: text('provider').notNull(), // 'KBZPAY' | 'WAVEPAY' | 'AYA_PAY' | 'BANK_TRANSFER' | 'CASH' | 'OTHER'
    enabled: boolean('enabled').notNull().default(true),
    accountName: text('account_name'),
    accountIdentifier: text('account_identifier'),
    qrAssetId: uuid('qr_asset_id').references(() => assetRecords.id, { onDelete: 'set null' }),
    notes: text('notes'),
    sourceSubmissionId: text('source_submission_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payment_methods_config_source_pm_idx').on(table.paymentConfigId, table.sourcePaymentMethodId),
    check('pm_provider_check', sql`"provider" IN ('KBZPAY', 'WAVEPAY', 'AYA_PAY', 'BANK_TRANSFER', 'CASH', 'OTHER')`),
  ]
);

// ----------------------------------------------------------------------------
// 9. BOOKING RULES
// ----------------------------------------------------------------------------
export const bookingRules = pgTable('booking_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  studioId: uuid('studio_id').notNull().unique().references(() => productionStudios.id, { onDelete: 'restrict' }),
  openingTime: text('opening_time').notNull(), // Wall-clock time e.g. "09:00"
  closingTime: text('closing_time').notNull(), // Wall-clock time e.g. "19:00"
  defaultSessionDurationMinutes: integer('default_session_duration_minutes').notNull(),
  bufferMinutes: integer('buffer_minutes').notNull(),
  closedDays: jsonb('closed_days').$type<string[]>().default([]).notNull(),
  maxAdvanceBookingDays: integer('max_advance_booking_days').notNull(),
  sameDayBooking: boolean('same_day_booking').notNull().default(false),
  reschedulePolicy: text('reschedule_policy').notNull(),
  cancellationPolicy: text('cancellation_policy').notNull(),
  depositRefundPolicy: text('deposit_refund_policy').notNull(),
  sourceSubmissionId: text('source_submission_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 10. INVOICE PROFILE
// ----------------------------------------------------------------------------
export const invoiceProfiles = pgTable('invoice_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  studioId: uuid('studio_id').notNull().unique().references(() => productionStudios.id, { onDelete: 'restrict' }),
  useStudioProfile: boolean('use_studio_profile').notNull().default(true),
  studioName: text('studio_name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  logoAssetId: uuid('logo_asset_id').references(() => assetRecords.id, { onDelete: 'set null' }),
  businessInfo: text('business_info'),
  taxInfo: text('tax_info'),
  footerMessage: text('footer_message'),
  sourceSubmissionId: text('source_submission_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 11. INTEGRATION RUNS (Audit & Idempotency Uniqueness)
// ----------------------------------------------------------------------------
export const integrationRuns = pgTable(
  'integration_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    integrationId: text('integration_id').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    studioId: uuid('studio_id').references(() => productionStudios.id, { onDelete: 'restrict' }),
    projectId: text('project_id').notNull(),
    approvedSubmissionId: text('approved_submission_id').notNull(),
    submissionVersion: integer('submission_version').notNull(),
    schemaVersion: text('schema_version').notNull(),
    mapperVersion: text('mapper_version').notNull(),
    status: text('status').notNull(), // 'STARTED' | 'COMMITTED' | 'ROLLED_BACK' | 'FAILED'
    operationCount: integer('operation_count').notNull(),
    actorUserId: text('actor_user_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('integration_runs_idempotency_idx').on(table.idempotencyKey),
    check('ir_status_check', sql`"status" IN ('STARTED', 'COMMITTED', 'ROLLED_BACK', 'FAILED')`),
  ]
);

// ----------------------------------------------------------------------------
// 12. INTEGRATION OPERATION RECORDS
// ----------------------------------------------------------------------------
export const integrationOperationRecords = pgTable(
  'integration_operation_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    integrationRunId: uuid('integration_run_id').notNull().references(() => integrationRuns.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    operationId: text('operation_id').notNull(),
    operationType: text('operation_type').notNull(),
    targetKey: text('target_key').notNull(),
    sourceId: text('source_id').notNull(),
    status: text('status').notNull().default('STAGED'), // 'STAGED' | 'APPLIED' | 'FAILED'
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('integration_op_records_run_seq_idx').on(table.integrationRunId, table.sequence),
    check('ior_status_check', sql`"status" IN ('STAGED', 'APPLIED', 'FAILED')`),
  ]
);

// ----------------------------------------------------------------------------
// 13. ONBOARDING PROJECTS
// ----------------------------------------------------------------------------
export const onboardingProjects = pgTable(
  'onboarding_projects',
  {
    id: text('id').primaryKey(), // e.g. 'proj-aj-studio-01'
    tenantId: text('tenant_id').notNull(),
    schemaId: text('schema_id').notNull().default('photo-studio-v1'),
    schemaVersion: text('schema_version').notNull().default('1.0'),
    status: text('status').notNull().default('DRAFT'), // 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'INTEGRATED'
    studioDisplayName: text('studio_display_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'op_status_check',
      sql`"status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'INTEGRATED')`
    ),
  ]
);

// ----------------------------------------------------------------------------
// 14. OWNER ACCESS LINKS (Token Hash & Expiry Foundation)
// ----------------------------------------------------------------------------
export const ownerAccessLinks = pgTable(
  'owner_access_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: text('project_id')
      .notNull()
      .references(() => onboardingProjects.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    status: text('status').notNull().default('VALID'), // 'VALID' | 'EXPIRED' | 'REVOKED' | 'ALREADY_SUBMITTED'
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('owner_access_links_token_hash_idx').on(table.tokenHash),
    check(
      'oal_status_check',
      sql`"status" IN ('VALID', 'EXPIRED', 'REVOKED', 'ALREADY_SUBMITTED')`
    ),
  ]
);

// ----------------------------------------------------------------------------
// 15. ONBOARDING DRAFTS (Revision-Tracked Mutable Payload)
// ----------------------------------------------------------------------------
export const onboardingDrafts = pgTable(
  'onboarding_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: text('project_id')
      .notNull()
      .unique()
      .references(() => onboardingProjects.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    draftRevision: integer('draft_revision').notNull().default(1),
    payload: jsonb('payload').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('onboarding_drafts_project_idx').on(table.projectId),
  ]
);

// ----------------------------------------------------------------------------
// 16. ONBOARDING SUBMISSIONS (Monotonic Immutable Snapshots)
// ----------------------------------------------------------------------------
export const onboardingSubmissions = pgTable(
  'onboarding_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: text('project_id')
      .notNull()
      .references(() => onboardingProjects.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    version: integer('version').notNull(), // 1, 2, 3...
    sourceDraftRevision: integer('source_draft_revision').notNull(),
    immutableSnapshot: jsonb('immutable_snapshot').notNull(),
    status: text('status').notNull().default('SUBMITTED'), // 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'INTEGRATED'
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('onboarding_submissions_proj_ver_idx').on(table.projectId, table.version),
    check(
      'os_status_check',
      sql`"status" IN ('SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'INTEGRATED')`
    ),
  ]
);

// ----------------------------------------------------------------------------
// 17. ONBOARDING ASSETS (Project & Storage Provider Boundary)
// ----------------------------------------------------------------------------
export const onboardingAssets = pgTable(
  'onboarding_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: text('asset_id').notNull(),
    projectId: text('project_id')
      .notNull()
      .references(() => onboardingProjects.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    role: text('role').notNull(), // 'STUDIO_LOGO' | 'PRIMARY_LOGO' | 'COVER_IMAGE' | 'PAYMENT_QR' | etc.
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    storageBucket: text('storage_bucket').notNull().default('onboarding-assets'),
    storageKey: text('storage_key').notNull(),
    checksum: text('checksum'),
    uploadStatus: text('upload_status').notNull().default('PENDING'), // 'PENDING' | 'READY' | 'FAILED' | 'REMOVED'
  }
);
// ----------------------------------------------------------------------------
// 18. CUSTOMER BOOKINGS (Canonical Booking Records)
// ----------------------------------------------------------------------------
export const customerBookings = pgTable(
  'customer_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingReference: varchar('booking_reference', { length: 100 }).notNull(),
    tenantId: text('tenant_id').notNull().default('aj-ai-studio'),
    studioId: uuid('studio_id').references(() => productionStudios.id, { onDelete: 'set null' }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    customerEmail: text('customer_email'),
    telegramHandle: text('telegram_handle'),
    packageSnapshot: jsonb('package_snapshot').notNull(),
    spaceSnapshot: jsonb('space_snapshot').notNull(),
    startDate: text('start_date').notNull(), // '18 NOV 2026' or '2026-11-18'
    timeSlot: text('time_slot').notNull(), // '11:00 AM'
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
    depositAmount: bigint('deposit_amount', { mode: 'number' }).notNull(),
    verifiedPaidAmount: bigint('verified_paid_amount', { mode: 'number' }).notNull().default(0),
    outstandingBalance: bigint('outstanding_balance', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('MMK'),
    bookingStatus: text('booking_status').notNull().default('AWAITING_PAYMENT_REVIEW'), // 'SUBMITTED' | 'AWAITING_PAYMENT_REVIEW' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
    paymentStatus: text('payment_status').notNull().default('EVIDENCE_RECEIVED'), // 'NOT_REQUIRED' | 'PENDING' | 'EVIDENCE_RECEIVED' | 'VERIFIED' | 'REJECTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    paymentMethod: text('payment_method').notNull().default('KBZPay'),
    uploadedSlipName: text('uploaded_slip_name'),
    uploadedSlipSize: text('uploaded_slip_size'),
    paymentEvidenceAssetId: text('payment_evidence_asset_id'),
    customerNotes: text('customer_notes'),
    privateAdminNotes: text('private_admin_notes'),
    sourceChannel: text('source_channel').notNull().default('WEB_CUSTOMER_PORTAL'),
    revision: integer('revision').notNull().default(1),
    cancellationReason: text('cancellation_reason'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('customer_bookings_tenant_ref_idx').on(table.tenantId, table.bookingReference),
    uniqueIndex('customer_bookings_idempotency_idx').on(table.idempotencyKey),
    check(
      'cb_booking_status_check',
      sql`"booking_status" IN ('SUBMITTED', 'AWAITING_PAYMENT_REVIEW', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')`
    ),
    check(
      'cb_payment_status_check',
      sql`"payment_status" IN ('NOT_REQUIRED', 'PENDING', 'EVIDENCE_RECEIVED', 'VERIFIED', 'REJECTED', 'REFUNDED', 'PARTIALLY_REFUNDED')`
    ),
  ]
);

// ----------------------------------------------------------------------------
// 19. BOOKING EVENTS (Immutable Audit History Log)
// ----------------------------------------------------------------------------
export const bookingEvents = pgTable(
  'booking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull().references(() => customerBookings.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    eventType: text('event_type').notNull(), // 'SUBMITTED' | 'PAYMENT_EVIDENCE_ATTACHED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED' | 'CONFIRMED' | 'RESCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'NOTE_ADDED'
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    actorId: text('actor_id').notNull(),
    actorRole: text('actor_role').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ----------------------------------------------------------------------------
// 20. POS TRANSACTIONS (Persistent Point-of-Sale Register Records)
// ----------------------------------------------------------------------------
export const posTransactions = pgTable(
  'pos_transactions',
  {
    id: text('id').primaryKey(), // Client UUID
    tenantId: text('tenant_id').notNull(),
    terminalId: text('terminal_id').notNull(),
    staffId: text('staff_id').notNull(),
    orderReference: text('order_reference').notNull(),
    lines: jsonb('lines').notNull(),
    subtotalMmk: integer('subtotal_mmk').notNull(),
    discountMmk: integer('discount_mmk').notNull().default(0),
    totalDueMmk: integer('total_due_mmk').notNull(),
    payments: jsonb('payments').notNull(),
    status: text('status').notNull().default('COMPLETED'),
    clientCreatedAt: timestamp('client_created_at', { withTimezone: true }),
    serverReceivedAt: timestamp('server_received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('pos_transactions_tenant_id_idx').on(table.tenantId, table.id),
  ]
);

// ----------------------------------------------------------------------------
// 21. POS SHIFTS (Shift Lifecycle, Cash Float & Z-Report Audit Snapshots)
// ----------------------------------------------------------------------------
export const posShifts = pgTable(
  'pos_shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id').notNull(),
    shiftId: text('shift_id').notNull(),
    reportId: text('report_id').notNull(),
    terminalId: text('terminal_id').notNull(),
    staffId: text('staff_id'),
    staffName: text('staff_name').notNull(),
    status: text('status').notNull().default('CLOSED'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    startingFloatMmk: integer('starting_float_mmk').notNull().default(0),
    cashSalesMmk: integer('cash_sales_mmk').notNull().default(0),
    expectedCashMmk: integer('expected_cash_mmk').notNull().default(0),
    actualCountedCashMmk: integer('actual_counted_cash_mmk'),
    discrepancyMmk: integer('discrepancy_mmk').notNull().default(0),
    discrepancyType: text('discrepancy_type'),
    cashMovements: jsonb('cash_movements'),
    zReportSnapshot: jsonb('z_report_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('pos_shifts_tenant_report_idx').on(table.tenantId, table.reportId),
  ]
);

// ----------------------------------------------------------------------------
// 22. POS STAFF (Hashed PINs, Roles, and Lockout Tracking)
// ----------------------------------------------------------------------------
export const posStaff = pgTable(
  'pos_staff',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    name: text('name').notNull(),
    myanmarName: text('myanmar_name'),
    role: text('role').notNull(), // 'CASHIER' | 'LEAD_CASHIER' | 'STUDIO_MANAGER' | 'OWNER'
    pinHash: text('pin_hash').notNull(),
    badgeBarcodeHash: text('badge_barcode_hash'),
    avatarColor: text('avatar_color'),
    isActive: boolean('is_active').notNull().default(true),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('pos_staff_tenant_id_idx').on(table.tenantId, table.id),
  ]
);

// ----------------------------------------------------------------------------
// 23. ADMIN USERS (Per-Tenant Studio Administrator Accounts)
// ----------------------------------------------------------------------------
export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id').notNull(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('STUDIO_ADMIN'), // 'STUDIO_OWNER' | 'STUDIO_ADMIN' | 'STUDIO_STAFF' | 'VIEWER'
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('admin_users_tenant_username_idx').on(table.tenantId, table.username),
  ]
);

// ----------------------------------------------------------------------------
// 24. ADMIN SESSIONS (Persistent Database-Backed Admin Session Storage)
// ----------------------------------------------------------------------------
export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionTokenHash: text('session_token_hash').notNull().unique(),
    tenantId: text('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    username: text('username').notNull(),
    role: text('role').notNull(),
    csrfToken: text('csrf_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ----------------------------------------------------------------------------
// 25. VERIFIED SLIPS (Slip OCR Idempotency & Duplicate-Slip Prevention)
// ----------------------------------------------------------------------------
export const verifiedSlips = pgTable(
  'verified_slips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id').notNull(),
    bookingId: text('booking_id').notNull(),
    gateway: text('gateway').notNull(),
    transactionId: text('transaction_id').notNull(),
    amountMmk: integer('amount_mmk').notNull(),
    transferredAt: timestamp('transferred_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('verified_slips_tenant_gw_tx_idx').on(table.tenantId, table.gateway, table.transactionId),
  ]
);



