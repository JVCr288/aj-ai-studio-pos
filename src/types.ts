export type ScreenStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ThemePalette = 'midnight' | 'neon';
export type WorkspaceView = 'compact' | 'full';

export type AtmosphereTheme =
  | 'atelier-morning'
  | 'fog-chamber'
  | 'copper-dusk'
  | 'ice-nocturne'
  | 'pure-obsidian';

export interface AtmosphereOption {
  id: AtmosphereTheme;
  index: string;
  name: string;
  descriptor: string;
  swatchGradient: string;
}

export type EquipmentCategory =
  | 'camera'
  | 'lens'
  | 'lighting'
  | 'modifier'
  | 'grip_support'
  | 'backdrop'
  | 'tether_tech'
  | 'wardrobe';

export type EquipmentStatus = 'available' | 'in_use' | 'maintenance';

export type EquipmentCondition = 'mint' | 'excellent' | 'good';

export interface EquipmentItem {
  id: string;
  name: string;
  myanmarName?: string;
  category: EquipmentCategory;
  assetCode: string;
  serialNumber: string;
  status: EquipmentStatus;
  allocatedBay: string;
  condition: EquipmentCondition;
  quantity: number;
  imageUrl: string;
  specs: string[];
  notes?: string;
  lastChecked?: string;
  rentalRateMMK?: number;
}

export type PhotographyCategory =
  | 'PRE_BORN'
  | 'PRE_WEDDING'
  | 'FASHION'
  | 'SOLO'
  | 'PORTFOLIO'
  | 'PORTRAIT'
  | 'COMMERCIAL'
  | 'CREATIVE';

export interface PhotographyPackage {
  id: string;
  name: string;
  price: number;
  deposit: number;
  recommended?: boolean;
  description: string;
  suiteAllocation: string;
  features: string[];
  category?: PhotographyCategory | string;
  heroImage?: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  status: 'open' | 'booked' | 'selected';
}

export interface StudioBayTelemetry {
  bayId: string;
  bayName: string;
  stageName: string;
  allocatedPackageId: string;
  totalSlots: number;
  bookedSlots: number;
  occupancyPercent: number;
  status: 'available' | 'high_occupancy' | 'sold_out';
  activeSessionSlot?: string;
  lightingRig: string;
}

export interface RealtimeSlotTelemetry {
  id: string;
  time: string;
  status: 'open' | 'limited' | 'sold_out';
  availableBays: string[];
  occupiedBays: { bayId: string; bayName: string; sessionType: string }[];
  totalBays: number;
  highlightNotice?: string;
}

export interface DaySlot {
  date: number;
  dayName: string;
  isAvailable: boolean;
  isLineThrough?: boolean;
}

export type PaymentGateway = 'KBZPay' | 'WavePay' | 'AYA Pay' | 'CB / AYA';

export interface GatewayConfig {
  id: PaymentGateway;
  label: string;
  accountName: string;
  accountNumber: string;
  currencyRate: string; // e.g. "≈ 105,000 MMK"
  badge: string;
  appInstruction: string;
}

export interface BookingState {
  tenantId?: string;
  packageId: string;
  selectedPackage: PhotographyPackage;
  dateStr: string;
  monthStr: string;
  timeSlot: string;
  guestName: string;
  clientPhone: string;
  telegramHandle: string;
  gateway: PaymentGateway;
  manifestId: string;
  token: string;
  turnstileCode: string;
  depositPaid: boolean;
  depositAmount: number;
  totalAmount: number;
  bayAllocation: string;
  uploadedSlipName?: string;
  uploadedSlipSize?: string;
  uploadedSlipData?: string;
  briefingNotes?: string;
  telegramConnected?: boolean;
  telegramAutoNotify?: boolean;
  telegramLastNotified?: string;
}

export interface VerifySlipRequest {
  image: string;
  mime_type?: string;
  expected_amount_mmk: number;
  manifest_id?: string;
  gateway?: string;
}

export type VerificationSource = 'gemini' | 'mock' | 'unavailable';
export type VerificationStatus = 'ocr_extracted' | 'manual_review_required' | 'unverified';

export interface VerifySlipResponse {
  success: boolean;
  is_valid_slip: boolean;
  verification_source: VerificationSource;
  verification_status: VerificationStatus;
  transaction_id: string | null;
  amount_mmk: number | null;
  timestamp: string | null;
  payer_name: string | null;
  confidence: number;
  raw_text: string;
  warnings: string[];
  error: string | null;
}

export interface VaultAsset {
  id: string;
  frameNumber: string;
  filename: string;
  fileSize: string;
  resolution: string;
  dpi: number;
  lightingSetup: string;
  badge: string;
  imageUrl: string;
  exif: {
    camera: string;
    lens: string;
    shutter: string;
    aperture: string;
    iso: string;
  };
}

export type ClientProductCategory =
  | 'frames_canvas'
  | 'photo_albums'
  | 'storage_media'
  | 'film_supplies'
  | 'studio_merch'
  | 'apparel'
  | 'baby_accessories'
  | 'digital_products';

export type ProductAvailability = 'in_stock' | 'pre_order' | 'made_to_order' | 'out_of_stock';

export interface ClientProduct {
  id: string;
  name: string;
  myanmarName: string;
  category: ClientProductCategory;
  priceMMK: number;
  originalPriceMMK?: number;
  stockCount: number;
  availability: ProductAvailability;
  sku: string;
  description: string;
  myanmarDescription: string;
  features: string[];
  dimensions?: string;
  imageUrl: string;
  leadTime: string;
  isPopular?: boolean;
  badge?: string;
}

export interface ClientCartItem {
  product: ClientProduct;
  quantity: number;
  customNote?: string;
}

export interface InvoiceLineItem {
  id: string;
  equipmentId?: string;
  description: string;
  myanmarDescription?: string;
  category?: string;
  assetCode?: string;
  serialNumber?: string;
  quantity: number;
  unitPriceMMK: number;
  totalPriceMMK: number;
  isGear: boolean;
  notes?: string;
}

export interface ClientInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientPhone: string;
  bayAllocation: string;
  manifestToken: string;
  sessionTitle: string;
  paymentStatus: 'paid' | 'deposit_paid' | 'pending' | 'due';
  paymentMethod: PaymentGateway | 'Cash at Studio';
  includeSessionPackage: boolean;
  packagePriceMMK: number;
  items: InvoiceLineItem[];
  subtotalMMK: number;
  depositCreditedMMK: number;
  taxRatePercent: number;
  taxMMK: number;
  discountMMK: number;
  totalMMK: number;
  balanceDueMMK: number;
  studioNotes: string;
}

// ============================================================================
// STUDIO ONBOARDING PORTAL V1 CANONICAL SCHEMA CONTRACT (studio-onboarding-schema-v1)
// ============================================================================

export type OnboardingStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_CHANGES'
  | 'APPROVED'
  | 'INTEGRATED';

export type OnboardingStepIndex = 1 | 2 | 3 | 4 | 5;

export type CanonicalStepName =
  | 'STUDIO_INFORMATION'
  | 'SPACES_AND_AVAILABILITY'
  | 'BOOKING_PAYMENT_INVOICE'
  | 'BRAND_ASSETS'
  | 'REVIEW_SUBMIT'
  | 'BOOKING_PACKAGES'
  | 'STUDIO_SPACES'
  | 'PAYMENTS'
  | 'BOOKING_RULES'
  | 'INVOICE_PROFILE'
  | 'REVIEW';

export type AssetCategory =
  | 'STUDIO_LOGO'
  | 'ROOM_PHOTO'
  | 'FLOOR_PLAN'
  | 'ROUGH_SKETCH'
  | 'PAYMENT_QR'
  | 'INVOICE_LOGO'
  | 'OTHER';

export type UploadStatus = 'PENDING' | 'UPLOADING' | 'READY' | 'FAILED' | 'REMOVED';

export interface AssetReference {
  assetId: string;
  projectId: string;
  category: AssetCategory;
  provider: string; // e.g. "DEV_LOCAL"
  storageRef: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  uploadStatus: UploadStatus;
  uploadedAt: string;
  metadata?: Record<string, string>;
}

export type DepositRuleType = 'NONE' | 'FIXED' | 'PERCENTAGE';

export type DepositRule =
  | {
      type: 'NONE';
      value: null;
      refundablePolicy?: string;
    }
  | {
      type: 'FIXED';
      value: number;
      refundablePolicy?: string;
    }
  | {
      type: 'PERCENTAGE';
      value: number;
      refundablePolicy?: string;
    };

export interface BookingPackage {
  packageId: string;
  name: string;
  price: number | null;
  currency: string; // e.g. "MMK"
  depositOverride?: DepositRule;
  sessionDurationMinutes: number | null;
  includedItems: string[];
  retouchedPhotoCount?: number;
  description?: string;
  notes?: string;
  enabled: boolean;
  sortOrder: number;
  status?: 'PLACEHOLDER' | 'ACTIVE' | 'DRAFT';
  source?: 'SYSTEM_SEED' | 'OWNER_INPUT';
}

export interface StudioSpace {
  spaceId: string;
  name: string;
  primaryUse: string; // e.g. "COMMERCIAL", "PORTRAIT", "CYCLORAMA"
  approximateSize?: string;
  photoAssetIds: string[];
  floorPlanAssetId?: string;
  sketchAssetId?: string;
  notes?: string;
  enabled: boolean;
  sortOrder: number;
}

export type PaymentProvider =
  | 'KBZPAY'
  | 'WAVEPAY'
  | 'AYA_PAY'
  | 'BANK_TRANSFER'
  | 'CASH'
  | 'OTHER';

export interface PaymentMethod {
  paymentMethodId: string;
  provider: PaymentProvider;
  enabled: boolean;
  accountName?: string;
  accountIdentifier?: string;
  qrAssetId?: string;
  notes?: string;
}

export interface PaymentConfiguration {
  methods: PaymentMethod[];
  defaultDepositRule: DepositRule;
  remainingBalanceTiming?: 'UPON_SESSION_START' | 'PRIOR_TO_DELIVERY' | 'WITHIN_7_DAYS';
}

export interface BookingRules {
  openingTime: string;
  closingTime: string;
  defaultSessionDurationMinutes: number;
  bufferMinutes: number;
  closedDays: string[];
  maxAdvanceBookingDays: number;
  sameDayBooking: boolean;
  reschedulePolicy: string;
  cancellationPolicy: string;
  depositRefundPolicy: string;
}

export interface InvoiceProfile {
  useStudioProfile: boolean;
  studioName: string;
  address: string;
  phone: string;
  logoAssetId?: string;
  businessInfo?: string;
  taxInfo?: string;
  footerMessage?: string;
}

export interface OnboardingProjectInfo {
  projectId: string;
  projectSlug: string;
  displayName: string;
  clientType: 'STUDIO_OWNER' | 'INDEPENDENT_CREATIVE' | 'PRODUCTION_HOUSE' | 'AGENCY';
  status: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
  access?: {
    ownerUserId?: string;
    invitedEmails?: string[];
  };
}

export interface StudioProfile {
  name: string;
  primaryContactName?: string;
  logoAssetId?: string;
  address: string;
  googleMapsUrl?: string;
  phone: string;
  email: string;
  facebookUrl?: string;
  telegramContact?: string;
  otherContact?: string;
  openingHours?: string;
  closedDays?: string[];
}

export interface OnboardingProgress {
  currentStep: OnboardingStepIndex;
  completedSteps: OnboardingStepIndex[];
  completionPercentage: number;
  lastSavedAt: string;
  lastSavedBy?: string;
  draftRevision?: number;
}

export type FeedbackSeverity = 'INFO' | 'CHANGE_REQUIRED';

export interface ReviewFeedback {
  feedbackId: string;
  submissionId: string;
  section: CanonicalStepName;
  fieldPath?: string;
  severity: FeedbackSeverity;
  message: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface OnboardingSubmissionPayload {
  schemaVersion: '1.0';
  project: OnboardingProjectInfo;
  studio: StudioProfile;
  packages: BookingPackage[];
  spaces: StudioSpace[];
  paymentConfiguration: PaymentConfiguration;
  bookingRules: BookingRules;
  invoiceProfile: InvoiceProfile;
  assets: AssetReference[];
}

export interface SubmissionSnapshot {
  submissionId: string;
  version: number;
  schemaVersion: '1.0';
  snapshot: OnboardingSubmissionPayload;
  submittedAt: string;
  submittedBy: string;
  reviewStatus: OnboardingStatus;
  reviewStartedAt?: string;
  reviewerId?: string;
  feedback: ReviewFeedback[];
  approvedAt?: string;
  integratedAt?: string;
}

export interface SubmissionState {
  currentSubmissionVersion: number;
  approvedSubmissionId?: string;
  submissions: SubmissionSnapshot[];
}

export interface StudioOnboardingProject {
  schemaVersion: '1.0';
  project: OnboardingProjectInfo;
  studio: StudioProfile;
  packages: BookingPackage[];
  spaces: StudioSpace[];
  paymentConfiguration: PaymentConfiguration;
  bookingRules: BookingRules;
  invoiceProfile: InvoiceProfile;
  assets: AssetReference[];
  progress: OnboardingProgress;
  submission: SubmissionState;
}

// ----------------------------------------------------------------------------
// PRODUCTION INITIAL CONFIGURATION DOMAIN CONTRACTS (PHASE 10.5.1 HARDENED)
// ----------------------------------------------------------------------------

export interface ProductionStudioProfile {
  name: string;
  logoAssetId?: string;
  address: string;
  googleMapsUrl?: string;
  phone: string;
  email: string;
  facebookUrl?: string;
  telegramContact?: string;
  otherContact?: string;
  openingHours?: string;
  closedDays?: string[];
}

export type ProductionDepositRule =
  | {
      type: 'NONE';
      value: null;
      refundablePolicy?: string;
    }
  | {
      type: 'FIXED';
      value: number;
      refundablePolicy?: string;
    }
  | {
      type: 'PERCENTAGE';
      value: number;
      refundablePolicy?: string;
    };

export interface ProductionBookingPackage {
  packageId: string;
  name: string;
  price: number;
  currency: string;
  depositOverride?: ProductionDepositRule;
  sessionDurationMinutes: number;
  includedItems: string[];
  retouchedPhotoCount?: number;
  description?: string;
  notes?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ProductionStudioSpace {
  spaceId: string;
  name: string;
  primaryUse: string;
  approximateSize?: string;
  photoAssetIds: string[];
  floorPlanAssetId?: string;
  sketchAssetId?: string;
  notes?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ProductionPaymentMethod {
  paymentMethodId: string;
  provider: PaymentProvider;
  enabled: boolean;
  accountName?: string;
  accountIdentifier?: string;
  qrAssetId?: string;
  notes?: string;
}

export interface ProductionPaymentConfiguration {
  methods: ProductionPaymentMethod[];
  defaultDepositRule: ProductionDepositRule;
  remainingBalanceTiming?: 'UPON_SESSION_START' | 'PRIOR_TO_DELIVERY' | 'WITHIN_7_DAYS';
}

export interface ProductionBookingRules {
  openingTime: string;
  closingTime: string;
  defaultSessionDurationMinutes: number;
  bufferMinutes: number;
  closedDays: string[];
  maxAdvanceBookingDays: number;
  sameDayBooking: boolean;
  reschedulePolicy: string;
  cancellationPolicy: string;
  depositRefundPolicy: string;
}

export interface ProductionEffectiveInvoiceProfile {
  useStudioProfile: boolean;
  effectiveStudioName: string;
  effectiveAddress: string;
  effectivePhone: string;
  effectiveLogoAssetId?: string;
  businessInfo?: string;
  taxInfo?: string;
  footerMessage?: string;
}

export interface ConfigurationSourceMetadata {
  projectId: string;
  approvedSubmissionId: string;
  submissionVersion: number;
  schemaVersion: '1.0';
  approvedAt: string;
  mappedAt: string;
  mapperVersion: string;
}

export interface MappedAssetBinding {
  assetId: string;
  category: AssetCategory;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sourceField: string;
  status: UploadStatus;
}

export interface ProductionInitialConfiguration {
  source: ConfigurationSourceMetadata;
  studioProfile: ProductionStudioProfile;
  bookingPackages: ProductionBookingPackage[];
  spacesConfiguration: ProductionStudioSpace[];
  paymentConfiguration: ProductionPaymentConfiguration;
  bookingRules: ProductionBookingRules;
  invoiceProfile: ProductionEffectiveInvoiceProfile;
  assetBindings: MappedAssetBinding[];
}

export type MapperErrorCode =
  | 'APPROVED_SUBMISSION_MISSING'
  | 'APPROVED_SUBMISSION_NOT_FOUND'
  | 'APPROVED_STATUS_MISMATCH'
  | 'NO_ACTIVE_PACKAGE'
  | 'NO_ACTIVE_SPACE'
  | 'INVALID_PAYMENT_CONFIGURATION'
  | 'INVALID_INVOICE_PROFILE'
  | 'INVALID_ASSET_REFERENCE';

export interface MappingError {
  code: MapperErrorCode;
  message: string;
  fieldPath?: string;
}

export interface MappingWarning {
  code: string;
  message: string;
  fieldPath?: string;
}

export interface MappingValidationResult {
  valid: boolean;
  errors: MappingError[];
  warnings: MappingWarning[];
  readinessState: 'NOT_READY' | 'READY_FOR_INTEGRATION';
}

export interface ProductionConfigurationResult {
  success: boolean;
  config?: ProductionInitialConfiguration;
  validation: MappingValidationResult;
}

// ----------------------------------------------------------------------------
// CONTROLLED INTEGRATION TRANSACTION CONTRACTS (PHASE 10.6)
// ----------------------------------------------------------------------------

export type IntegrationOperationType =
  | 'UPSERT_STUDIO_PROFILE'
  | 'UPSERT_BOOKING_PACKAGE'
  | 'UPSERT_STUDIO_SPACE'
  | 'UPSERT_PAYMENT_CONFIGURATION'
  | 'UPSERT_BOOKING_RULES'
  | 'UPSERT_INVOICE_PROFILE'
  | 'REGISTER_ASSET_BINDING';

export interface IntegrationOperation {
  operationId: string;
  type: IntegrationOperationType;
  targetKey: string;
  sourceId: string;
  payload: Record<string, any>;
  sequence: number;
}

export interface ProductionIntegrationPlan {
  planVersion: string;
  idempotencyKey: string;
  source: {
    projectId: string;
    approvedSubmissionId: string;
    submissionVersion: number;
    schemaVersion: '1.0';
    mapperVersion: string;
  };
  operations: IntegrationOperation[];
  validation: MappingValidationResult;
  createdAt: string;
}

export type IntegrationMode = 'DRY_RUN' | 'SIMULATED_APPLY' | 'REAL_APPLY';

export type IntegrationStatus =
  | 'DRY_RUN_SUCCESS'
  | 'SIMULATED_COMMITTED'
  | 'SIMULATED_ROLLED_BACK'
  | 'REAL_COMMITTED'
  | 'ALREADY_APPLIED'
  | 'FAILED';

export type IntegrationErrorCode =
  | 'INTEGRATION_SOURCE_NOT_APPROVED'
  | 'SOURCE_NOT_APPROVED'
  | 'APPROVED_SUBMISSION_MISSING'
  | 'SOURCE_CHANGED'
  | 'MAPPER_NOT_READY'
  | 'INVALID_INTEGRATION_PLAN'
  | 'INVALID_REQUIRED_ASSET'
  | 'DUPLICATE_TARGET'
  | 'UNSUPPORTED_OPERATION'
  | 'ALREADY_APPLIED'
  | 'TRANSACTION_BEGIN_FAILED'
  | 'OPERATION_APPLY_FAILED'
  | 'TRANSACTION_ROLLBACK_FAILED'
  | 'TRANSACTION_FAILED'
  | 'DATABASE_NOT_CONFIGURED'
  | 'DATABASE_UNREACHABLE'
  | 'PRODUCTION_PERSISTENCE_NOT_CONFIGURED';

export interface IntegrationError {
  code: IntegrationErrorCode;
  message: string;
  fieldPath?: string;
  operationId?: string;
}

export interface IntegrationReceipt {
  integrationId: string;
  idempotencyKey: string;
  source: {
    projectId: string;
    approvedSubmissionId: string;
    submissionVersion: number;
    schemaVersion: '1.0';
    mapperVersion: string;
  };
  mode: IntegrationMode;
  status: IntegrationStatus;
  operationCount: number;
  startedAt: string;
  completedAt: string;
  warnings: MappingWarning[];
  error?: IntegrationError;
}

// ============================================================================
// AJ AI STUDIO — STUDIO POS DESK DATA CONTRACTS
// ============================================================================

export type PosItemCategory =
  | 'BOOKING_BALANCE'
  | 'WALK_IN_PACKAGE'
  | 'OVERTIME'
  | 'ADDON_SERVICE'
  | 'GEAR_RENTAL'
  | 'RETAIL_PRODUCT';

export interface PosCartLineItem {
  id: string;
  category: PosItemCategory;
  title: string;
  myanmarTitle?: string;
  unitPriceMMK: number;
  quantity: number;
  referenceId?: string; // packageId, gearId, productId, or bookingRef
  notes?: string;
  bayAllocation?: string;
}

export type PosPaymentMethod =
  | 'CASH'
  | 'KBZPAY'
  | 'WAVEPAY'
  | 'AYA_PAY'
  | 'SPLIT';

export interface PosSplitBreakdown {
  cashAmountMMK: number;
  digitalAmountMMK: number;
  digitalGateway: 'KBZPay' | 'WavePay' | 'AYA Pay';
}

export interface PosTransaction {
  id: string;
  orderReference: string;
  tenantId: string;
  bookingReference?: string;
  customerName: string;
  customerPhone: string;
  bayAllocation?: string;
  items: PosCartLineItem[];
  subtotalMMK: number;
  depositCreditedMMK: number;
  discountMMK: number;
  taxMMK: number;
  totalDueMMK: number;
  tenderedCashMMK?: number;
  changeDueMMK?: number;
  paymentMethod: PosPaymentMethod;
  splitDetails?: PosSplitBreakdown;
  transactionStatus: 'PAID' | 'COMPLETED' | 'REFUNDED';
  receiptNumber: string;
  cashierName: string;
  terminalId: string;
  timestamp: string;
  notes?: string;
  slipVerificationStatus?: 'ocr_extracted' | 'manual_review_required' | 'unverified';
}

export interface PosShiftRecord {
  shiftId: string;
  terminalId: string;
  staffName: string;
  openedAt: string;
  closedAt?: string;
  startingCashMMK: number;
  cashInDrawerMMK: number;
  totalCashSalesMMK: number;
  totalDigitalSalesMMK: number;
  totalTransactionsCount: number;
  status: 'OPEN' | 'CLOSED';
}
