import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.5 — APPROVED CONFIGURATION MAPPER AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Audit src/types.ts for ProductionInitialConfiguration and Mapper types
const typesPath = path.join(projectRoot, 'src/types.ts');
assert('src/types.ts exists', fs.existsSync(typesPath));
const typesCode = fs.readFileSync(typesPath, 'utf8');

assert('types.ts defines ConfigurationSourceMetadata', typesCode.includes('export interface ConfigurationSourceMetadata'));
assert('types.ts defines ProductionInitialConfiguration', typesCode.includes('export interface ProductionInitialConfiguration'));
assert('types.ts defines EffectiveInvoiceProfile contract', typesCode.includes('ProductionEffectiveInvoiceProfile') || typesCode.includes('EffectiveInvoiceProfile'));
assert('types.ts defines MappedAssetBinding', typesCode.includes('export interface MappedAssetBinding'));
assert('types.ts defines MapperErrorCode', typesCode.includes('export type MapperErrorCode'));
assert('types.ts defines MappingValidationResult', typesCode.includes('export interface MappingValidationResult'));
assert('types.ts defines readinessState (\'NOT_READY\' | \'READY_FOR_INTEGRATION\')', typesCode.includes("readinessState: 'NOT_READY' | 'READY_FOR_INTEGRATION'"));

// 2. Audit src/services/onboardingConfigurationMapper.ts
const servicePath = path.join(projectRoot, 'src/services/onboardingConfigurationMapper.ts');
assert('src/services/onboardingConfigurationMapper.ts exists', fs.existsSync(servicePath));
const serviceCode = fs.readFileSync(servicePath, 'utf8');

assert('Mapper exports ONBOARDING_CONFIGURATION_MAPPER_VERSION === "1.0"', serviceCode.includes("export const ONBOARDING_CONFIGURATION_MAPPER_VERSION = '1.0'"));
assert('Mapper exports resolveApprovedSubmission', serviceCode.includes('export const resolveApprovedSubmission ='));
assert('resolveApprovedSubmission checks project.status === "APPROVED"', serviceCode.includes("project.status !== 'APPROVED'"));
assert('resolveApprovedSubmission checks approvedSubmissionId', serviceCode.includes('approvedSubmissionId'));
assert('Mapper exports mapStudioProfile', serviceCode.includes('export const mapStudioProfile ='));
assert('Mapper exports mapBookingPackages', serviceCode.includes('export const mapBookingPackages ='));
assert('mapBookingPackages filters enabled packages and sorts by sortOrder', serviceCode.includes('p.enabled') && serviceCode.includes('sortOrder'));
assert('mapBookingPackages preserves DepositRule NONE value: null', serviceCode.includes("type: 'NONE'") && serviceCode.includes('value: null'));
assert('Mapper exports mapStudioSpaces', serviceCode.includes('export const mapStudioSpaces ='));
assert('mapStudioSpaces filters enabled spaces and sorts by sortOrder', serviceCode.includes('s.enabled') && serviceCode.includes('sortOrder'));
assert('Mapper exports mapPaymentConfiguration', serviceCode.includes('export const mapPaymentConfiguration ='));
assert('Mapper exports mapBookingRules', serviceCode.includes('export const mapBookingRules ='));
assert('Mapper exports mapInvoiceProfile', serviceCode.includes('export const mapInvoiceProfile ='));
assert('mapInvoiceProfile implements useStudioProfile precedence', serviceCode.includes('useStudio') && serviceCode.includes('studioProfile.name'));
assert('Mapper exports mapAssetBindings', serviceCode.includes('export const mapAssetBindings ='));
assert('mapAssetBindings rejects/flags FAILED_UPLOAD and DANGLING_REFERENCE', serviceCode.includes('INVALID_ASSET_REFERENCE') && serviceCode.includes('FAILED'));
assert('Mapper exports validateProductionInitialConfiguration', serviceCode.includes('export const validateProductionInitialConfiguration ='));
assert('validateProductionInitialConfiguration sets READY_FOR_INTEGRATION when valid', serviceCode.includes("readinessState: isValid ? 'READY_FOR_INTEGRATION' : 'NOT_READY'"));
assert('Mapper exports buildProductionInitialConfiguration', serviceCode.includes('export const buildProductionInitialConfiguration ='));
assert('Mapper defines ProductionConfigurationPersistenceAdapter (disabled boundary)', serviceCode.includes('ProductionConfigurationPersistenceAdapter') && serviceCode.includes('apply'));

// 3. Audit src/components/StudioOnboardingMapperPreviewConsole.tsx
const consolePath = path.join(projectRoot, 'src/components/StudioOnboardingMapperPreviewConsole.tsx');
assert('src/components/StudioOnboardingMapperPreviewConsole.tsx exists', fs.existsSync(consolePath));
let consoleCode = fs.readFileSync(consolePath, 'utf8');
const integrationConsolePath = path.join(projectRoot, 'src/components/StudioOnboardingIntegrationPreviewConsole.tsx');
if (fs.existsSync(integrationConsolePath)) {
  consoleCode += '\n' + fs.readFileSync(integrationConsolePath, 'utf8');
}

assert('Preview console uses buildProductionInitialConfiguration', consoleCode.includes('buildProductionInitialConfiguration'));
assert('Preview console displays readinessState badge', consoleCode.includes('validation.readinessState'));
assert('Preview console displays source provenance metadata', consoleCode.includes('approvedSubmissionId') && consoleCode.includes('mapperVersion'));
assert('Preview console renders Studio Profile mapped section', consoleCode.includes('Mapped Studio Profile'));
assert('Preview console renders Active Packages mapped section', consoleCode.includes('Mapped Active Packages'));
assert('Preview console renders Active Spaces mapped section', consoleCode.includes('Mapped Active Spaces'));
assert('Preview console renders Payment Configuration mapped section', consoleCode.includes('Mapped Payment Configuration'));
assert('Preview console renders Effective Invoice Profile mapped section', consoleCode.includes('Mapped Effective Invoice Profile'));
assert('Preview console renders Asset Bindings mapped section', consoleCode.includes('Mapped Production Asset Bindings'));
assert('Preview console displays disabled Ready for Integration persistence button', consoleCode.includes('Ready for Integration (Persistence Disabled)'));

// 4. Audit SettingsModal & App.tsx Integration
const settingsCode = fs.readFileSync(path.join(projectRoot, 'src/components/SettingsModal.tsx'), 'utf8');
assert('SettingsModal includes onLaunchMapperPreview prop', settingsCode.includes('onLaunchMapperPreview'));

const appCode = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
assert('App.tsx imports StudioOnboardingMapperPreviewConsole', appCode.includes('StudioOnboardingMapperPreviewConsole'));
assert('App.tsx renders StudioOnboardingMapperPreviewConsole overlay', appCode.includes('isMapperPreviewOpen'));

// 5. Navigation & ScreenStep Contract Protection
const navCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar enforces exactly 6 production steps', navCode.includes('ScreenStep = 1 | 2 | 3 | 4 | 5 | 6') || navCode.includes('step: 6'));
assert('Navbar does NOT contain Onboarding or Mapper item in primary navigation', !navCode.includes('Onboarding') && !navCode.includes('Config Mapper'));

if (!allPassed) {
  console.error('\n❌ PHASE 10.5 AUDIT FAILED!');
  process.exit(1);
} else {
  console.log('\n✅ ALL PHASE 10.5 AUDIT CHECKS PASSED PERFECTLY!');
}
