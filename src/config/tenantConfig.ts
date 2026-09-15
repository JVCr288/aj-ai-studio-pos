/**
 * Tenant Configuration & Pilot Tenant Data Layer
 * 
 * Parameterizes studio-owned identity, contact details, payment configurations,
 * invoice profiles, telegram integration, and asset metadata for multi-tenant operation.
 */

export interface TenantPaymentMethod {
  id: string;
  provider?: string;
  name: string;
  accountNumber: string;
  accountName: string;
  badge: string;
  qrCodeUrl?: string;
  instructions?: string;
}

export interface TenantSpace {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  notes?: string;
}

export interface TenantConfig {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  registrationNumber: string;
  taxIdentifier?: string;
  telegramBotUsername: string;
  telegramBotDisplayName: string;
  telegramContact: string;
  telegramNotificationHeading?: string;
  telegramMessageFooter?: string;
  publicPassUrlBase?: string;
  publicVaultUrlBase?: string;
  supportContactHandle?: string;
  websiteUrl: string;
  invoicePrefix: string;
  receiptPrefix: string;
  receiptHeader: string;
  invoiceTitle?: string;
  invoiceSubtitle?: string;
  invoiceFooterNote?: string;
  authorizedSignatureTitle?: string;
  remittanceAccount: string;
  currency?: string;
  paymentMethods: TenantPaymentMethod[];
  spaces: TenantSpace[];
  isPilotTenant: boolean;
  // Digital Pass & Calendar
  calendarProdId?: string;
  calendarUidDomain?: string;
  calendarSummary?: string;
  calendarDescription?: string;
  calendarLocation?: string;
  passDownloadFilename?: string;
  qrFallbackCodePrefix?: string;
  // Archive Vault
  archiveManifestTitle?: string;
  archiveExportFilenamePrefix?: string;
  archiveAssetFilenamePrefix?: string;
  archiveRepositoryLabel?: string;
}

export const defaultStudioTenant: TenantConfig = {
  id: 'proj-aj-studio-01',
  slug: 'aj-ai-studio-yangon',
  displayName: 'AJ AI Studio',
  legalName: 'AJ AI Studio POS & Atelier',
  ownerName: 'AJ AI Studio Master',
  phone: '+95 9 792 108 421',
  email: 'contact@ajaistudio.com',
  address: 'No. 42 Strand Road, Botahtaung Township, Yangon',
  city: 'Yangon',
  country: 'Myanmar',
  registrationNumber: 'REG: AJ-AI-STUDIO-2026',
  taxIdentifier: 'TIN-98442109-MM',
  telegramBotUsername: 'AJ_AI_Studio_Bot',
  telegramBotDisplayName: 'AJ AI Studio Dispatch Bot',
  telegramContact: '@ajaistudio',
  telegramNotificationHeading: 'RESERVATION DETAILS (SIMULATION)',
  telegramMessageFooter: 'Note: Slip details extracted via AI OCR. Final booking confirmation requires studio ledger review.',
  publicPassUrlBase: 'https://ajaistudio.com/pass',
  publicVaultUrlBase: 'https://ajaistudio.com/vault',
  supportContactHandle: '@ajaistudio',
  websiteUrl: 'https://ajaistudio.com',
  invoicePrefix: 'INV-AJ',
  receiptPrefix: 'RCP-AJ',
  receiptHeader: 'AJ AI STUDIO POS // OFFICIAL INVOICE',
  invoiceTitle: 'AJ AI STUDIO POS & ATELIER',
  invoiceSubtitle: 'YANGON PRODUCTION HOUSE // NO. 42 STRAND ROAD',
  invoiceFooterNote:
    'All optical equipment, prime lenses, and Profoto AirTTL monolights are factory calibrated (Delta-E < 0.8) and handed over in mint working condition. Includes 30-day lossless Vault cloud retention.',
  authorizedSignatureTitle: 'Studio Director & Master Colorist',
  remittanceAccount: '09 792 108 421 (AJ AI STUDIO POS)',
  currency: 'MMK',
  paymentMethods: [
    {
      id: 'kpay',
      provider: 'KBZPay',
      name: 'KBZPay Direct Scan',
      accountNumber: '09 792 108 421',
      accountName: 'AJ AI STUDIO POS',
      badge: 'AJ KPay',
      instructions: 'Scan with KBZPay QuickPay App',
    },
    {
      id: 'wavepay',
      provider: 'WavePay',
      name: 'WavePay Remittance',
      accountNumber: '09 792 108 421',
      accountName: 'AJ AI STUDIO POS',
      badge: 'AJ Wave',
      instructions: 'Scan with WavePay QR Scanner',
    },
    {
      id: 'cbpay',
      provider: 'AYA Pay',
      name: 'AYA Pay Direct Transfer',
      accountNumber: '0092 1002 8847 2190',
      accountName: 'AJ AI STUDIO POS',
      badge: 'AJ AYA Pay',
      instructions: 'Scan with AYA Pay App or AYA Direct Pay',
    },
  ],
  spaces: [
    { id: 'bay-a1', name: 'Main Soundstage & Cyclorama', type: 'Indoor', capacity: 15 },
    { id: 'bay-b2', name: 'High-Key Commercial Bay', type: 'Indoor', capacity: 10 },
    { id: 'bay-c3', name: 'Portrait & Editorial Bay', type: 'Indoor', capacity: 8 },
  ],
  isPilotTenant: true,
  calendarProdId: '-//AJ AI Studio//Nocturne Atelier//EN',
  calendarUidDomain: 'ajaistudio.com',
  calendarSummary: 'AJ AI Studio',
  calendarDescription: 'Atelier Portrait Session with Studio Crew',
  calendarLocation: 'No. 42 Strand Road, Botahtaung Township, Yangon',
  passDownloadFilename: 'AJ_Studio_Pass',
  qrFallbackCodePrefix: 'AJ-BAY-PASS',
  archiveManifestTitle: 'AJ AI Studio - Master Archive Manifest',
  archiveExportFilenamePrefix: 'AJ',
  archiveAssetFilenamePrefix: 'AJ_RAW',
  archiveRepositoryLabel: 'Atelier Client Repository',
};

export const akkPilotTenant: TenantConfig = defaultStudioTenant;

export const neutralTestTenant: TenantConfig = {
  id: 'proj-lumina-studio-02',
  slug: 'lumina-creative-atelier',
  displayName: 'Lumina Studio',
  legalName: 'Lumina Creative Atelier Ltd.',
  ownerName: 'Daw May Thazin',
  phone: '+95 9 443 001 992',
  email: 'hello@luminastudiomm.com',
  address: 'Building 14, Pyay Road, Mayangone Township, Yangon',
  city: 'Yangon',
  country: 'Myanmar',
  registrationNumber: 'REG: LUMINA-MM-2026-042',
  taxIdentifier: 'TIN-44019283-MM',
  telegramBotUsername: 'Lumina_Studio_Bot',
  telegramBotDisplayName: 'Lumina Studio Dispatch',
  telegramContact: '@luminastudiomm',
  telegramNotificationHeading: 'RESERVATION CONFIRMED (SIMULATION)',
  telegramMessageFooter: 'Note: Booking details registered. Studio review pending.',
  publicPassUrlBase: 'https://luminastudiomm.com/pass',
  publicVaultUrlBase: 'https://luminastudiomm.com/vault',
  supportContactHandle: '@luminastudiomm',
  websiteUrl: 'https://luminastudiomm.com',
  invoicePrefix: 'INV-LUMINA',
  receiptPrefix: 'RCP-LUMINA',
  receiptHeader: 'LUMINA STUDIO // OFFICIAL INVOICE',
  invoiceTitle: 'LUMINA CREATIVE ATELIER',
  invoiceSubtitle: 'MAYANGONE PRODUCTION HUB // PYAY ROAD',
  invoiceFooterNote:
    'Equipment delivered pre-inspected. High-resolution color-graded masters backed up for 14 days.',
  authorizedSignatureTitle: 'Managing Director',
  remittanceAccount: '09 443 001 992 (LUMINA CREATIVE ATELIER)',
  currency: 'MMK',
  paymentMethods: [
    {
      id: 'kpay',
      provider: 'KBZPay',
      name: 'KBZPay Business Scan',
      accountNumber: '09 443 001 992',
      accountName: 'LUMINA CREATIVE ATELIER',
      badge: 'Lumina KPay',
      instructions: 'Scan via KBZPay App',
    },
    {
      id: 'wavepay',
      provider: 'WavePay',
      name: 'WavePay Merchant',
      accountNumber: '09 443 001 992',
      accountName: 'LUMINA CREATIVE ATELIER',
      badge: 'Lumina Wave',
      instructions: 'Pay to Lumina Merchant account',
    },
  ],
  spaces: [
    { id: 'bay-sunlight', name: 'Sunlight Glasshouse Loft', type: 'Indoor', capacity: 12 },
  ],
  isPilotTenant: false,
  calendarProdId: '-//Lumina Studio//EN',
  calendarUidDomain: 'luminastudiomm.com',
  calendarSummary: 'Lumina Studio',
  calendarDescription: 'Photography Session at Lumina Studio',
  calendarLocation: 'Building 14, Pyay Road, Mayangone Township, Yangon',
  passDownloadFilename: 'LUMINA_Studio_Pass',
  qrFallbackCodePrefix: 'LUMINA-BAY-PASS',
  archiveManifestTitle: 'Lumina Studio - Master Archive Manifest',
  archiveExportFilenamePrefix: 'LUMINA',
  archiveAssetFilenamePrefix: 'LUMINA_RAW',
  archiveRepositoryLabel: 'Lumina Client Repository',
};

export const activeTenantConfig: TenantConfig = defaultStudioTenant;

export function getTenantConfig(tenantId?: string): TenantConfig {
  if (tenantId === neutralTestTenant.id || tenantId === neutralTestTenant.slug) {
    return neutralTestTenant;
  }
  return defaultStudioTenant;
}
