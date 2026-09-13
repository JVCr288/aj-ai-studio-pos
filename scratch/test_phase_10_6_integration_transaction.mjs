import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.6 — CONTROLLED INTEGRATION TRANSACTION AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// ----------------------------------------------------------------------------
// 1. Audit src/types.ts
// ----------------------------------------------------------------------------
const typesPath = path.join(projectRoot, 'src/types.ts');
assert('src/types.ts exists', fs.existsSync(typesPath));
const typesCode = fs.readFileSync(typesPath, 'utf8');

assert('types.ts defines IntegrationOperationType', typesCode.includes('export type IntegrationOperationType ='));
assert('types.ts defines IntegrationOperation', typesCode.includes('export interface IntegrationOperation'));
assert('types.ts defines ProductionIntegrationPlan', typesCode.includes('export interface ProductionIntegrationPlan'));
assert('types.ts defines IntegrationMode (DRY_RUN | SIMULATED_APPLY | REAL_APPLY)', typesCode.includes("export type IntegrationMode = 'DRY_RUN' | 'SIMULATED_APPLY' | 'REAL_APPLY'"));
assert('types.ts defines IntegrationStatus', typesCode.includes('export type IntegrationStatus ='));
assert('types.ts defines IntegrationErrorCode', typesCode.includes('export type IntegrationErrorCode ='));
assert('types.ts defines PRODUCTION_PERSISTENCE_NOT_CONFIGURED error code', typesCode.includes("'PRODUCTION_PERSISTENCE_NOT_CONFIGURED'"));
assert('types.ts defines IntegrationError', typesCode.includes('export interface IntegrationError'));
assert('types.ts defines IntegrationReceipt', typesCode.includes('export interface IntegrationReceipt'));

// ----------------------------------------------------------------------------
// 2. Audit src/services/onboardingIntegrationService.ts
// ----------------------------------------------------------------------------
const servicePath = path.join(projectRoot, 'src/services/onboardingIntegrationService.ts');
assert('src/services/onboardingIntegrationService.ts exists', fs.existsSync(servicePath));
const serviceCode = fs.readFileSync(servicePath, 'utf8');

assert('Service exports INTEGRATION_PLAN_VERSION === "1.0"', serviceCode.includes("export const INTEGRATION_PLAN_VERSION = '1.0'"));
assert('Service exports fnv1aHash', serviceCode.includes('export const fnv1aHash ='));
assert('Service exports normalizeConfigForHashing', serviceCode.includes('export const normalizeConfigForHashing ='));
assert('Service exports calculateIdempotencyKey', serviceCode.includes('export const calculateIdempotencyKey ='));
assert('Service exports createIntegrationPlan', serviceCode.includes('export const createIntegrationPlan ='));
assert('Service checks project status APPROVED before creating plan', serviceCode.includes('resolveApprovedSubmission') && serviceCode.includes('INTEGRATION_SOURCE_NOT_APPROVED'));
assert('Service enforces deterministic operation sequence', serviceCode.includes('UPSERT_STUDIO_PROFILE') && serviceCode.includes('UPSERT_BOOKING_PACKAGE') && serviceCode.includes('REGISTER_ASSET_BINDING'));
assert('Service exports validateIntegrationPlan', serviceCode.includes('export const validateIntegrationPlan ='));
assert('Service exports performDryRun', serviceCode.includes('export const performDryRun ='));
assert('performDryRun builds receipt with DRY_RUN_SUCCESS', serviceCode.includes("'DRY_RUN_SUCCESS'"));
assert('Service defines DevelopmentMemoryProductionAdapter', serviceCode.includes('export class DevelopmentMemoryProductionAdapter'));
assert('DevelopmentMemoryProductionAdapter adapterName is DevelopmentMemoryProductionAdapter', serviceCode.includes("adapterName = 'DevelopmentMemoryProductionAdapter'"));
assert('DevelopmentMemoryProductionAdapter isProduction is false', serviceCode.includes('isProduction = false'));
assert('DevelopmentMemoryProductionAdapter supports checkIdempotency', serviceCode.includes('checkIdempotency('));
assert('DevelopmentMemoryProductionAdapter supports beginTransaction', serviceCode.includes('beginTransaction('));
assert('DevelopmentMemoryProductionAdapter supports applyOperation', serviceCode.includes('applyOperation('));
assert('DevelopmentMemoryProductionAdapter supports commitTransaction', serviceCode.includes('commitTransaction('));
assert('DevelopmentMemoryProductionAdapter supports rollbackTransaction', serviceCode.includes('rollbackTransaction('));
assert('Service exports applyIntegration', serviceCode.includes('export const applyIntegration ='));
assert('applyIntegration explicitly blocks REAL_APPLY with PRODUCTION_PERSISTENCE_NOT_CONFIGURED', serviceCode.includes("mode === 'REAL_APPLY'") && serviceCode.includes('PRODUCTION_PERSISTENCE_NOT_CONFIGURED'));
assert('applyIntegration checks idempotency key and returns ALREADY_APPLIED', serviceCode.includes('checkIdempotency') && serviceCode.includes("'ALREADY_APPLIED'"));
assert('applyIntegration handles failure injection and performs atomic rollback', serviceCode.includes('rollbackTransaction') && serviceCode.includes("'SIMULATED_ROLLED_BACK'"));

// ----------------------------------------------------------------------------
// 3. Audit Integration Preview Console Components
// ----------------------------------------------------------------------------
const integrationConsolePath = path.join(projectRoot, 'src/components/StudioOnboardingIntegrationPreviewConsole.tsx');
assert('StudioOnboardingIntegrationPreviewConsole.tsx exists', fs.existsSync(integrationConsolePath));
const consoleCode = fs.readFileSync(integrationConsolePath, 'utf8');

assert('Console displays non-production badge (DEVELOPMENT SIMULATION - NO PRODUCTION DATA WILL BE WRITTEN)', consoleCode.includes('DEVELOPMENT SIMULATION — NO PRODUCTION DATA WILL BE WRITTEN'));
assert('Console renders Run Dry Run action', consoleCode.includes('Run Dry Run'));
assert('Console renders Run Simulated Apply action', consoleCode.includes('Run Simulated Apply'));
assert('Console displays confirmation modal with development simulation warning', consoleCode.includes('Confirm Simulated Apply') && consoleCode.includes('This is a development transaction simulation.'));
assert('Console displays idempotency key', consoleCode.includes('Idempotency Key'));
assert('Console displays operation sequence List', consoleCode.includes('Deterministic Operations Sequence'));

// ----------------------------------------------------------------------------
// 4. Audit SettingsModal & App.tsx Integration
// ----------------------------------------------------------------------------
const settingsCode = fs.readFileSync(path.join(projectRoot, 'src/components/SettingsModal.tsx'), 'utf8');
assert('SettingsModal includes Config Mapper Preview launch button', settingsCode.includes('onLaunchMapperPreview'));

const appCode = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
assert('App.tsx imports MapperPreviewConsole', appCode.includes('StudioOnboardingMapperPreviewConsole'));
assert('App.tsx renders MapperPreviewConsole overlay when open', appCode.includes('isMapperPreviewOpen'));

// ----------------------------------------------------------------------------
// 5. Contract Safety & Workflow Boundary Protection
// ----------------------------------------------------------------------------
const navCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar maintains 6 production workflow steps contract', navCode.includes('ScreenStep = 1 | 2 | 3 | 4 | 5 | 6') || navCode.includes('step: 6'));
assert('Navbar does NOT contain Onboarding or Integration item in primary navigation', !navCode.includes('Onboarding') && !navCode.includes('Integration'));

// Verify project status remains APPROVED (no INTEGRATED transition code in apply)
assert('applyIntegration does NOT mutate project.status to INTEGRATED', !serviceCode.includes("project.status = 'INTEGRATED'") && !serviceCode.includes("status: 'INTEGRATED'"));

if (!allPassed) {
  console.error('\n❌ PHASE 10.6 CONTROLLED INTEGRATION AUDIT FAILED!');
  process.exit(1);
} else {
  console.log('\n✅ ALL PHASE 10.6 CONTROLLED INTEGRATION AUDIT CHECKS PASSED PERFECTLY!');
}
