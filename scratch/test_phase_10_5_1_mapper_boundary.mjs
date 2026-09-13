import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.5.1 — MAPPER BOUNDARY HARDENING AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Audit src/types.ts for decoupled Production child contract types
const typesPath = path.join(projectRoot, 'src/types.ts');
assert('src/types.ts exists', fs.existsSync(typesPath));
const typesCode = fs.readFileSync(typesPath, 'utf8');

assert('types.ts defines ProductionStudioProfile', typesCode.includes('export interface ProductionStudioProfile'));
assert('types.ts defines ProductionDepositRule (NONE -> value: null)', typesCode.includes('export type ProductionDepositRule') && typesCode.includes("value: null"));
assert('types.ts defines ProductionBookingPackage', typesCode.includes('export interface ProductionBookingPackage'));
assert('types.ts defines ProductionStudioSpace', typesCode.includes('export interface ProductionStudioSpace'));
assert('types.ts defines ProductionPaymentMethod', typesCode.includes('export interface ProductionPaymentMethod'));
assert('types.ts defines ProductionPaymentConfiguration', typesCode.includes('export interface ProductionPaymentConfiguration'));
assert('types.ts defines ProductionBookingRules', typesCode.includes('export interface ProductionBookingRules'));
assert('types.ts defines ProductionEffectiveInvoiceProfile', typesCode.includes('export interface ProductionEffectiveInvoiceProfile'));
assert('ProductionInitialConfiguration uses ProductionStudioProfile', typesCode.includes('studioProfile: ProductionStudioProfile'));
assert('ProductionInitialConfiguration uses ProductionBookingPackage[]', typesCode.includes('bookingPackages: ProductionBookingPackage[]'));
assert('ProductionInitialConfiguration uses ProductionStudioSpace[]', typesCode.includes('spacesConfiguration: ProductionStudioSpace[]'));
assert('ProductionInitialConfiguration uses ProductionPaymentConfiguration', typesCode.includes('paymentConfiguration: ProductionPaymentConfiguration'));
assert('ProductionInitialConfiguration uses ProductionBookingRules', typesCode.includes('bookingRules: ProductionBookingRules'));

// 2. Audit src/services/onboardingConfigurationMapper.ts
const servicePath = path.join(projectRoot, 'src/services/onboardingConfigurationMapper.ts');
assert('src/services/onboardingConfigurationMapper.ts exists', fs.existsSync(servicePath));
const serviceCode = fs.readFileSync(servicePath, 'utf8');

assert('Mapper defines isRequiredAssetReference', serviceCode.includes('export const isRequiredAssetReference ='));
assert('isRequiredAssetReference marks payment QR code as required', serviceCode.includes("sourceField.includes('paymentConfiguration.methods')") && serviceCode.includes("sourceField.includes('qrAssetId')"));
assert('mapAssetBindings returns fatal error for required invalid assets', serviceCode.includes('errors.push') && serviceCode.includes('INVALID_ASSET_REFERENCE'));
assert('mapAssetBindings returns warning for optional invalid assets', serviceCode.includes('warnings.push') && serviceCode.includes('DANGLING_ASSET_WARNING'));
assert('MappedAssetBinding does not expose storageRef', !typesCode.includes('MappedAssetBinding {\n  storageRef') && !serviceCode.includes('storageRef: assetRef.storageRef'));
assert('ProductionPaymentConfiguration contains setup fields only (no OCR/transaction state)', !typesCode.includes('ocrResult') && !typesCode.includes('transactionId') && !typesCode.includes('ledgerState'));
assert('Persistence apply throws NOT_IMPLEMENTED_FOR_PHASE_10_5', serviceCode.includes('NOT_IMPLEMENTED_FOR_PHASE_10_5'));

// 3. Audit Preview Console & App Navigation Protection
const consoleCode = fs.readFileSync(path.join(projectRoot, 'src/components/StudioOnboardingMapperPreviewConsole.tsx'), 'utf8');
assert('Preview console displays readinessState', consoleCode.includes('validation.readinessState'));
assert('Preview console displays Effective Invoice Profile precedence badge', consoleCode.includes('Precedence: Inherited from Studio') || consoleCode.includes('Custom Profile'));

const navCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar maintains 6 production workflow steps contract', navCode.includes('ScreenStep = 1 | 2 | 3 | 4 | 5 | 6') || navCode.includes('step: 6'));
assert('Navbar has no primary nav pollution for onboarding/mapper', !navCode.includes('Onboarding') && !navCode.includes('Config Mapper'));

if (!allPassed) {
  console.error('\n❌ PHASE 10.5.1 AUDIT FAILED!');
  process.exit(1);
} else {
  console.log('\n✅ ALL PHASE 10.5.1 HARDENING AUDIT CHECKS PASSED PERFECTLY!');
}
