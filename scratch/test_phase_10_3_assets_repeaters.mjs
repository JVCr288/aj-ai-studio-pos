import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.3 — ASSET UPLOAD CONTRACT & REPEATABLE EDITORS AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Inspect onboardingAssetService.ts
const assetServicePath = path.join(projectRoot, 'src/services/onboardingAssetService.ts');
assert('onboardingAssetService.ts exists', fs.existsSync(assetServicePath));

const assetCode = fs.readFileSync(assetServicePath, 'utf8');
assert('onboardingAssetService exports createAssetReference', assetCode.includes('createAssetReference'));
assert('onboardingAssetService exports getAssetById', assetCode.includes('getAssetById'));
assert('onboardingAssetService exports filterAssetsByCategory', assetCode.includes('filterAssetsByCategory'));
assert('onboardingAssetService does not store raw base64 data', !assetCode.includes('data:image/') && !assetCode.includes('base64'));

// 2. Inspect StudioOnboardingScreen.tsx
const screenPath = path.join(projectRoot, 'src/components/StudioOnboardingScreen.tsx');
assert('StudioOnboardingScreen.tsx exists', fs.existsSync(screenPath));

const screenCode = fs.readFileSync(screenPath, 'utf8');
assert('StudioOnboardingScreen imports createAssetReference', screenCode.includes('createAssetReference'));
assert('StudioOnboardingScreen implements handleFileUpload helper', screenCode.includes('handleFileUpload'));
assert('StudioOnboardingScreen supports Studio Logo upload', screenCode.includes("handleFileUpload(e, 'STUDIO_LOGO'"));
assert('StudioOnboardingScreen supports Invoice Logo upload', screenCode.includes("handleFileUpload(e, 'INVOICE_LOGO'"));
assert('StudioOnboardingScreen supports Space Room Photo upload', screenCode.includes("handleFileUpload(e, 'ROOM_PHOTO'"));
assert('StudioOnboardingScreen supports Space Floor Plan upload', screenCode.includes("handleFileUpload(e, 'FLOOR_PLAN'"));
assert('StudioOnboardingScreen supports Space Rough Sketch upload', screenCode.includes("handleFileUpload(e, 'ROUGH_SKETCH'"));
assert('StudioOnboardingScreen supports Payment QR upload', screenCode.includes("handleFileUpload(e, 'PAYMENT_QR'"));

assert('StudioOnboardingScreen implements handleAddPackage', screenCode.includes('handleAddPackage'));
assert('StudioOnboardingScreen implements handleDeletePackage', screenCode.includes('handleDeletePackage'));
assert('StudioOnboardingScreen implements handleMovePackage', screenCode.includes('handleMovePackage'));
assert('StudioOnboardingScreen implements handleAddIncludedItem', screenCode.includes('handleAddIncludedItem'));
assert('StudioOnboardingScreen implements handleRemoveIncludedItem', screenCode.includes('handleRemoveIncludedItem'));

assert('StudioOnboardingScreen implements handleAddSpace', screenCode.includes('handleAddSpace'));
assert('StudioOnboardingScreen implements handleDeleteSpace', screenCode.includes('handleDeleteSpace'));
assert('StudioOnboardingScreen implements handleMoveSpace', screenCode.includes('handleMoveSpace'));

assert('StudioOnboardingScreen implements handleAddPaymentMethod', screenCode.includes('handleAddPaymentMethod'));

// 3. Inspect Architectural Constraints
const typesCode = fs.readFileSync(path.join(projectRoot, 'src/types.ts'), 'utf8');
assert('ScreenStep is strictly 1 | 2 | 3 | 4 | 5 | 6', typesCode.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6;'));

const navbarCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar.tsx has no Onboarding primary workflow item', !navbarCode.includes('label: \'Onboarding\''));

console.log(`\nAudit completed. Overall Result: ${allPassed ? 'ALL CHECKS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
