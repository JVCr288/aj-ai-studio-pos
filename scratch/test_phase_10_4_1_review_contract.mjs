import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.4.1 — CANONICAL REVIEW CONTRACT AUDIT & VERIFICATION ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Audit src/types.ts
const typesPath = path.join(projectRoot, 'src/types.ts');
assert('src/types.ts exists', fs.existsSync(typesPath));
const typesCode = fs.readFileSync(typesPath, 'utf8');

assert('ReviewFeedback uses feedbackId (not id)', typesCode.includes('feedbackId: string'));
assert('ReviewFeedback includes submissionId', typesCode.includes('submissionId: string'));
assert('SubmissionSnapshot uses submissionId (not id)', typesCode.includes('submissionId: string'));
assert('SubmissionState contains approvedSubmissionId', typesCode.includes('approvedSubmissionId?: string'));
assert('StudioProfile contains canonical fields only', typesCode.includes('logoAssetId?: string') && typesCode.includes('googleMapsUrl?: string'));
assert('BookingPackage contains canonical fields only', typesCode.includes('packageId: string') && typesCode.includes('sessionDurationMinutes: number'));
assert('StudioSpace contains canonical fields only', typesCode.includes('spaceId: string') && typesCode.includes('floorPlanAssetId?: string'));
assert('PaymentConfiguration contains canonical fields only', typesCode.includes('defaultDepositRule: DepositRule'));
assert('BookingRules contains canonical fields only', typesCode.includes('reschedulePolicy: string') && typesCode.includes('cancellationPolicy: string'));
assert('InvoiceProfile contains canonical fields only', typesCode.includes('useStudioProfile: boolean') && typesCode.includes('footerMessage?: string'));

// 2. Audit src/services/onboardingReviewService.ts
const servicePath = path.join(projectRoot, 'src/services/onboardingReviewService.ts');
assert('src/services/onboardingReviewService.ts exists', fs.existsSync(servicePath));
const serviceCode = fs.readFileSync(servicePath, 'utf8');

assert('onboardingReviewService defines DEV_REVIEWER_PLACEHOLDER_ID', serviceCode.includes("export const DEV_REVIEWER_PLACEHOLDER_ID = 'DEV_ADMIN_PLACEHOLDER'"));
assert('onboardingReviewService exports analyzeSnapshotAssets', serviceCode.includes('export const analyzeSnapshotAssets ='));
assert('analyzeSnapshotAssets distinguishes DANGLING_REFERENCE', serviceCode.includes("diagnosticStatus: 'DANGLING_REFERENCE'"));
assert('analyzeSnapshotAssets distinguishes REMOVED_REFERENCE', serviceCode.includes("diagnosticStatus: 'REMOVED_REFERENCE'"));
assert('analyzeSnapshotAssets distinguishes FAILED_UPLOAD', serviceCode.includes("diagnosticStatus: 'FAILED_UPLOAD'"));
assert('analyzeSnapshotAssets distinguishes READY', serviceCode.includes("diagnosticStatus: 'READY'"));
assert('getLatestSubmissionSnapshot sorts by version to avoid array order dependency', serviceCode.includes('.sort((a, b) => b.version - a.version)'));
assert('approveSubmission assigns approvedSubmissionId to submissionId', serviceCode.includes('approvedSubmissionId: latestSnapshot.submissionId'));

// 3. Audit src/components/StudioOnboardingReviewConsole.tsx
const consolePath = path.join(projectRoot, 'src/components/StudioOnboardingReviewConsole.tsx');
assert('src/components/StudioOnboardingReviewConsole.tsx exists', fs.existsSync(consolePath));
const consoleCode = fs.readFileSync(consolePath, 'utf8');

assert('Review console uses analyzeSnapshotAssets for asset review', consoleCode.includes('analyzeSnapshotAssets(snapshotData)'));
assert('Review console displays DEV_REVIEWER_PLACEHOLDER_ID placeholder context badge', consoleCode.includes('DEV_REVIEWER_PLACEHOLDER_ID'));
assert('Review console renders Studio Information canonical section', consoleCode.includes('1. Studio Information'));
assert('Review console renders Booking Packages canonical section', consoleCode.includes('2. Booking Packages'));
assert('Review console renders Studio Spaces canonical section', consoleCode.includes('3. Studio Spaces'));
assert('Review console renders Payment Configuration canonical section', consoleCode.includes('4. Payment Configuration'));
assert('Review console renders Booking Rules canonical section', consoleCode.includes('5. Booking Rules'));
assert('Review console renders Invoice Profile canonical section', consoleCode.includes('6. Invoice Profile'));
assert('Review console renders Asset Reference Diagnostics section', consoleCode.includes('7. Asset Reference Diagnostics'));
assert('Review console does NOT expose internal storageRef', !consoleCode.includes('storageRef'));

// 4. Audit Navigation Contract & ScreenStep (Must remain 1-6)
const navPath = path.join(projectRoot, 'src/components/Navigation.tsx');
const navCode = fs.existsSync(navPath) ? fs.readFileSync(navPath, 'utf8') : '';
assert('Navigation bar does NOT contain Onboarding or Review production step item', !navCode.includes('Onboarding') && !navCode.includes('Developer Review'));

if (!allPassed) {
  console.error('\n❌ PHASE 10.4.1 AUDIT FAILED!');
  process.exit(1);
} else {
  console.log('\n✅ ALL PHASE 10.4.1 AUDIT CHECKS PASSED PERFECTLY!');
}
