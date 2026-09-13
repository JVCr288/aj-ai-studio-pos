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

export const akkPilotTenant: TenantConfig = {
  id: 'proj-akk-studio-01',
  slug: 'akk-photo-studio-yangon',
  displayName: 'AKK Photo Studio',
  legalName: 'AKK Photo Studio & Atelier',
  ownerName: 'U Aung Kyaw',
  phone: '+95 9 792 108 421',
  email: 'onboarding@akkphotostudio.mm',
  address: 'No. 42 Strand Road, Botahtaung Township, Yangon',
  city: 'Yangon',
  country: 'Myanmar',
  registrationNumber: 'REG: AKK-MM-2026-YGN-091',
  taxIdentifier: 'TIN-98442109-MM',
  telegramBotUsername: 'AKK_Nocturne_Studio_Bot',
  telegramBotDisplayName: 'AKK Photo Studio Dispatch Bot',
  telegramContact: '@akkphotostudio',
  telegramNotificationHeading: 'RESERVATION DETAILS (SIMULATION)',
  telegramMessageFooter: 'Note: Slip details extracted via AI OCR. Final booking confirmation requires studio ledger review.',
  publicPassUrlBase: 'https://akkphotostudio.com/pass',
  publicVaultUrlBase: 'https://akkphotostudio.com/vault',
  supportContactHandle: '@akkphotostudio',
  websiteUrl: 'https://akkphotostudio.com',
  invoicePrefix: 'INV-AKK',
  receiptPrefix: 'RCP-AKK',
  receiptHeader: 'AKK PHOTO STUDIO // OFFICIAL INVOICE',
  invoiceTitle: 'AKK PHOTO STUDIO & ATELIER',
  invoiceSubtitle: 'YANGON PRODUCTION HOUSE // NO. 42 STRAND ROAD',
  invoiceFooterNote:
    'All optical equipment, prime lenses, and Profoto AirTTL monolights are factory calibrated (Delta-E < 0.8) and handed over in mint working condition. Includes 30-day lossless Vault cloud retention.',
  authorizedSignatureTitle: 'Studio Director & Master Colorist',
  remittanceAccount: '09 792 108 421 (AKK PHOTO STUDIO)',
  currency: 'MMK',
  paymentMethods: [
    {
      id: 'kpay',
      provider: 'KBZPay',
      name: 'KBZPay Direct Scan',
      accountNumber: '09 792 108 421',
      accountName: 'AKK PHOTO STUDIO (U AUNG KYAW)',
      badge: 'AKK KPay',
      instructions: 'Scan with KBZPay QuickPay App',
    },
    {
      id: 'wavepay',
      provider: 'WavePay',
      name: 'WavePay Remittance',
      accountNumber: '09 792 108 421',
      accountName: 'AKK PHOTO STUDIO (U AUNG KYAW)',
      badge: 'AKK Wave',
      instructions: 'Scan with WavePay QR Scanner',
    },
    {
      id: 'cbpay',
      provider: 'AYA Pay',
      name: 'AYA Pay Direct Transfer',
      accountNumber: '0092 1002 8847 2190',
      accountName: 'AKK PHOTO STUDIO (U AUNG KYAW)',
      badge: 'AKK AYA Pay',
      instructions: 'Scan with AYA Pay App or AYA Direct Pay',
    },
  ],
  spaces: [
    { id: 'bay-a1', name: 'Main Soundstage & Cyclorama', type: 'Indoor', capacity: 15 },
    { id: 'bay-b2', name: 'High-Key Commercial Bay', type: 'Indoor', capacity: 10 },
    { id: 'bay-c3', name: 'Portrait & Editorial Bay', type: 'Indoor', capacity: 8 },
  ],
  isPilotTenant: true,
  calendarProdId: '-//AKK Photo Studio//Nocturne Atelier//EN',
  calendarUidDomain: 'akkphotostudio.com',
  calendarSummary: 'AKK Photo Studio',
  calendarDescription: 'Atelier Portrait Session with Studio Crew',
  calendarLocation: 'No. 42 Strand Road, Botahtaung Township, Yangon',
  passDownloadFilename: 'AKK_Studio_Pass',
  qrFallbackCodePrefix: 'AKK-BAY-PASS',
  archiveManifestTitle: 'AKK Photo Studio - Master Archive Manifest',
  archiveExportFilenamePrefix: 'AKK',
  archiveAssetFilenamePrefix: 'AKK_RAW',
  archiveRepositoryLabel: 'Atelier Client Repository',
};

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

export const activeTenantConfig: TenantConfig = akkPilotTenant;

export function getTenantConfig(tenantId?: string): TenantConfig {
  if (!tenantId || tenantId === akkPilotTenant.id || tenantId === akkPilotTenant.slug) {
    return akkPilotTenant;
  }
  if (tenantId === neutralTestTenant.id || tenantId === neutralTestTenant.slug) {
    return neutralTestTenant;
  }
  return akkPilotTenant;
}
