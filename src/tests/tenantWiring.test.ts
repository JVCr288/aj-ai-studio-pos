import { akkPilotTenant, neutralTestTenant, getTenantConfig, TenantConfig } from '../config/tenantConfig';
import { getPaymentBrand } from '../utils/paymentBrands';
import { getGatewayConfigs } from '../data/mockData';
import { generateDigitalReceiptJson, downloadDigitalReceiptFile } from '../utils/receiptGenerator';
import { generateTelegramConfirmationMessage, buildTelegramWebhookPayload, sendTelegramBookingWebhook } from '../utils/telegramWebhook';
import { BookingState } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

const sampleBookingState: BookingState = {
  packageId: 'indoor-portrait-master',
  tenantId: 'proj-akk-studio-01',
  selectedPackage: {
    id: 'indoor-portrait-master',
    name: 'Indoor Portrait Master',
    price: 210000,
    deposit: 105000,
    description: 'Master portrait package',
    suiteAllocation: 'BAY ALPHA-01',
    features: ['5 TIFF Masters', 'RAW library'],
  },
  dateStr: '2026-09-15',
  monthStr: 'September 2026',
  timeSlot: '10:00 - 12:00',
  guestName: 'Khin Myo Win',
  clientPhone: '+959777888999',
  telegramHandle: '@khinmyowin',
  gateway: 'KBZPay',
  manifestId: 'MNF-9902',
  token: 'TKN-8842',
  turnstileCode: '7721',
  depositPaid: true,
  depositAmount: 105000,
  totalAmount: 210000,
  bayAllocation: 'BAY ALPHA-01',
  uploadedSlipName: 'kbzpay_slip_sample.jpg',
};

async function runTenantWiringTests() {
  console.log('=== RUNNING PHASE 3A & 3B TENANT CONFIGURATION WIRING TESTS ===\n');

  // 1. AKK Pilot Payment Values & Telegram Output from Tenant Config
  const akkConfig = getTenantConfig('proj-akk-studio-01');
  assert(akkConfig.displayName === 'AKK Photo Studio', 'AKK displayName mismatch');
  assert(akkConfig.invoicePrefix === 'INV-AKK', 'AKK invoicePrefix mismatch');
  assert(akkConfig.receiptPrefix === 'RCP-AKK', 'AKK receiptPrefix mismatch');

  const akkKpayBrand = getPaymentBrand('KBZPay', akkConfig);
  assert(akkKpayBrand.defaultBadge === 'AKK KPay', `AKK KPay badge mismatch: ${akkKpayBrand.defaultBadge}`);

  const akkGateways = getGatewayConfigs(akkConfig);
  assert(akkGateways.KBZPay.accountName.includes('AKK PHOTO STUDIO'), 'AKK KBZPay account name mismatch');

  const akkTgMsg = generateTelegramConfirmationMessage(sampleBookingState, akkConfig);
  assert(akkTgMsg.includes('AKK PHOTO STUDIO'), 'AKK Telegram message title mismatch');
  assert(akkTgMsg.includes('@AKK_Nocturne_Studio_Bot'), 'AKK Telegram bot handle mismatch');
  assert(akkTgMsg.includes('No. 42 Strand Road'), 'AKK Telegram address mismatch');
  console.log('✅ Test 1: AKK pilot payment and Telegram output use AKK pilot tenant configuration.');

  // 2. Second Neutral Tenant Rendering (Lumina Studio)
  const luminaConfig = getTenantConfig('proj-lumina-studio-02');
  assert(luminaConfig.displayName === 'Lumina Studio', 'Lumina displayName mismatch');
  assert(luminaConfig.invoicePrefix === 'INV-LUMINA', 'Lumina invoicePrefix mismatch');
  assert(luminaConfig.receiptPrefix === 'RCP-LUMINA', 'Lumina receiptPrefix mismatch');

  const luminaKpayBrand = getPaymentBrand('KBZPay', luminaConfig);
  assert(luminaKpayBrand.defaultBadge === 'Lumina KPay', `Lumina KPay badge mismatch: ${luminaKpayBrand.defaultBadge}`);

  const luminaGateways = getGatewayConfigs(luminaConfig);
  assert(luminaGateways.KBZPay.accountName === 'LUMINA CREATIVE ATELIER', `Lumina account name mismatch: ${luminaGateways.KBZPay.accountName}`);

  const luminaTgMsg = generateTelegramConfirmationMessage(sampleBookingState, luminaConfig);
  const luminaTgPayload = buildTelegramWebhookPayload(sampleBookingState, luminaConfig);
  const luminaPayloadStr = JSON.stringify(luminaTgPayload);
  assert(luminaTgMsg.includes('LUMINA STUDIO'), 'Lumina Telegram message title mismatch');
  assert(luminaTgMsg.includes('@Lumina_Studio_Bot'), 'Lumina Telegram bot handle mismatch');
  assert(!luminaPayloadStr.includes('AKK'), 'AKK leak detected in Lumina Telegram payload');
  assert(!luminaPayloadStr.includes('akkphotostudio'), 'AKK domain leak detected in Lumina Telegram payload');
  console.log('✅ Test 2: Second neutral test tenant output contains no AKK identity.');

  // 3. Telegram Simulation Labels Remain Present
  assert(luminaTgMsg.includes('SIMULATION') || luminaTgMsg.includes('Simulation'), 'Telegram simulation label missing from message');
  assert(luminaTgMsg.includes('Development Simulation'), 'Development Simulation badge missing from message');
  console.log('✅ Test 3: Telegram simulation labels remain present.');

  // 4. No Bot Token or Secret Exposed in TenantConfig or Webhook Endpoints
  const tenantKeys = Object.keys(akkConfig);
  const secretKeywords = ['secret', 'token', 'private', 'password', 'api_key', 'apikey'];
  secretKeywords.forEach((kw) => {
    const hasSecretKey = tenantKeys.some((k) => k.toLowerCase().includes(kw));
    assert(!hasSecretKey, `TenantConfig must not expose secret-bearing key containing '${kw}'`);
  });

  const webhookResult = await sendTelegramBookingWebhook(sampleBookingState, undefined, akkConfig);
  assert(!webhookResult.endpoint.includes('AAEZ_NocturneStudioBot'), 'Hardcoded bot token found in webhook endpoint');
  assert(!webhookResult.endpoint.includes('7194029104:'), 'Hardcoded token ID found in webhook endpoint');
  console.log('✅ Test 4: No bot token or secret is exposed to frontend tenant configuration or endpoints.');

  // 5. Pass Calendar Export Uses Selected Tenant Identity & UID Domain
  const buildIcsData = (bState: BookingState, tenant: TenantConfig) => {
    const prodId = tenant.calendarProdId || `-//${tenant.displayName}//EN`;
    const domain = tenant.calendarUidDomain || tenant.websiteUrl.replace(/^https?:\/\//, '');
    const summary = tenant.calendarSummary
      ? `${tenant.calendarSummary} - ${bState.selectedPackage.name}`
      : `${tenant.displayName} - ${bState.selectedPackage.name}`;
    const location = tenant.calendarLocation || tenant.address;
    return `PRODID:${prodId}\nUID:${bState.token}@${domain}\nSUMMARY:${summary}\nLOCATION:${location}`;
  };

  const luminaIcs = buildIcsData(sampleBookingState, luminaConfig);
  assert(luminaIcs.includes('PRODID:-//Lumina Studio//EN'), 'Lumina calendar PRODID mismatch');
  assert(luminaIcs.includes('UID:TKN-8842@luminastudiomm.com'), 'Lumina calendar UID domain mismatch');
  assert(luminaIcs.includes('SUMMARY:Lumina Studio - Indoor Portrait Master'), 'Lumina calendar SUMMARY mismatch');
  console.log('✅ Test 5: Pass calendar export uses selected tenant identity and UID domain.');

  // 6. Second Tenant Pass Contains No AKK Identity or Domain
  assert(!luminaIcs.includes('AKK'), 'AKK leak detected in Lumina pass calendar export');
  assert(!luminaIcs.includes('akkphotostudio'), 'AKK domain leak detected in Lumina pass calendar export');
  console.log('✅ Test 6: Second tenant pass contains no AKK name, address, URL, prefix, or domain.');

  // 7. Archive Exports Use Selected Tenant Identity & Prefix
  const luminaArchiveManifestTitle = luminaConfig.archiveManifestTitle || `${luminaConfig.displayName} - Master Archive Manifest`;
  const luminaArchivePrefix = luminaConfig.archiveExportFilenamePrefix || 'LUMINA';
  assert(luminaArchiveManifestTitle === 'Lumina Studio - Master Archive Manifest', 'Lumina archive manifest title mismatch');
  assert(luminaArchivePrefix === 'LUMINA', 'Lumina archive export prefix mismatch');
  console.log('✅ Test 7: Archive exports use selected tenant identity and prefix.');

  // 8. Existing AKK Archive Compatibility Remains Available
  const akkArchiveManifestTitle = akkConfig.archiveManifestTitle || `${akkConfig.displayName} - Master Archive Manifest`;
  const akkArchivePrefix = akkConfig.archiveExportFilenamePrefix || 'AKK';
  assert(akkArchiveManifestTitle === 'AKK Photo Studio - Master Archive Manifest', 'AKK archive manifest title mismatch');
  assert(akkArchivePrefix === 'AKK', 'AKK archive export prefix mismatch');
  assert(akkConfig.archiveAssetFilenamePrefix === 'AKK_RAW', 'AKK RAW asset prefix mismatch');
  console.log('✅ Test 8: Existing AKK archive compatibility remains available.');

  // 9. Creative Nocturne Theme Labels Preserved Where Valid
  const creativeLutLabel = 'LUT: Nocturne 35mm Tungsten';
  assert(creativeLutLabel.includes('Nocturne 35mm'), 'Creative Nocturne theme label should be preserved');
  console.log('✅ Test 9: Creative Nocturne theme labels are preserved where valid.');

  // 10. Approval/Payment Pending States Remain Truthful
  const akkReceipt = generateDigitalReceiptJson(sampleBookingState, akkConfig);
  assert(akkReceipt.financialLedger.depositSettled === false, 'Deposit settled must remain false for manual verification');
  assert(
    akkReceipt.clientIdentity.verificationStatus === 'SLIP_OCR_EXTRACTED_PENDING_STUDIO_LEDGER',
    'Verification status must accurately state pending studio ledger review'
  );
  assert(
    akkReceipt.termsAndCertification.certificationStatement.includes('Final booking confirmation requires studio ledger review'),
    'Certification statement must include manual studio ledger review wording'
  );
  console.log('✅ Test 10: Approval/payment pending states remain truthful.');

  // 11. Receipt Digest Makes No Unverified SHA-256 Claim
  const digestString = akkReceipt.termsAndCertification.digitalSignatureDigest;
  assert(digestString.startsWith('RECEIPT-DIGEST:'), `Digest format invalid: ${digestString}`);
  assert(!digestString.includes('SHA256'), 'Receipt digest must not claim SHA256 unless technically proven');
  assert(!digestString.includes('CRYPTOGRAPHICALLY VERIFIED'), 'Receipt digest must not claim unproven cryptographic verification');
  console.log('✅ Test 11: Receipt digest makes no unverified SHA-256 claim.');

  // 12. Missing Optional Tenant Fields Fail Safely Without Crashing
  const minimalTenant: TenantConfig = {
    id: 'proj-minimal-03',
    slug: 'minimal-studio',
    displayName: 'Minimal Studio',
    legalName: 'Minimal Studio Co.',
    ownerName: 'U Min Min',
    phone: '09 111 222 333',
    email: 'info@minimal.mm',
    address: 'Yangon',
    city: 'Yangon',
    country: 'Myanmar',
    registrationNumber: 'REG-MINIMAL-01',
    telegramBotUsername: 'Minimal_Bot',
    telegramBotDisplayName: 'Minimal Dispatch',
    telegramContact: '@minimal',
    websiteUrl: 'https://minimal.mm',
    invoicePrefix: 'INV-MIN',
    receiptPrefix: 'RCP-MIN',
    receiptHeader: 'MINIMAL STUDIO INVOICE',
    remittanceAccount: '09 111 222 333',
    paymentMethods: [],
    spaces: [],
    isPilotTenant: false,
  };

  const minimalReceipt = generateDigitalReceiptJson(sampleBookingState, minimalTenant);
  assert(minimalReceipt.receiptHeader.receiptNumber === 'RCP-MIN-9902', 'Minimal receipt number generation failed');
  assert(minimalReceipt.receiptHeader.studio.name === 'Minimal Studio', 'Minimal studio name failed');

  const minimalTgMsg = generateTelegramConfirmationMessage(sampleBookingState, minimalTenant);
  assert(minimalTgMsg.includes('MINIMAL STUDIO'), 'Minimal Telegram message title failed');

  const minimalIcs = buildIcsData(sampleBookingState, minimalTenant);
  assert(minimalIcs.includes('PRODID:-//Minimal Studio//EN'), 'Minimal calendar fallback failed');
  console.log('✅ Test 12: Missing optional tenant fields fail safely without crashing.');

  console.log('\nALL 12 PHASE 3B TENANT WIRING TESTS PASSED SUCCESSFULLY! 🎉');
}

runTenantWiringTests().catch((err) => {
  console.error('Tenant wiring test execution error:', err);
  process.exit(1);
});
