import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.4 — DEVELOPER REVIEW CONSOLE & FEEDBACK UI AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Inspect onboardingReviewService.ts
const servicePath = path.join(projectRoot, 'src/services/onboardingReviewService.ts');
assert('onboardingReviewService.ts exists', fs.existsSync(servicePath));

const serviceCode = fs.readFileSync(servicePath, 'utf8');
assert('onboardingReviewService exports canTransition', serviceCode.includes('export const canTransition'));
assert('onboardingReviewService exports getLatestSubmissionSnapshot', serviceCode.includes('export const getLatestSubmissionSnapshot'));
assert('onboardingReviewService exports startReview', serviceCode.includes('export const startReview'));
assert('onboardingReviewService exports addFeedbackItem', serviceCode.includes('export const addFeedbackItem'));
assert('onboardingReviewService exports updateFeedbackItem', serviceCode.includes('export const updateFeedbackItem'));
assert('onboardingReviewService exports deleteFeedbackItem', serviceCode.includes('export const deleteFeedbackItem'));
assert('onboardingReviewService exports requestChanges', serviceCode.includes('export const requestChanges'));
assert('onboardingReviewService exports approveSubmission', serviceCode.includes('export const approveSubmission'));

assert('startReview sets status UNDER_REVIEW', serviceCode.includes("status: 'UNDER_REVIEW'"));
assert('requestChanges requires unresolved CHANGE_REQUIRED feedback', serviceCode.includes('CHANGE_REQUIRED') && serviceCode.includes('unresolvedChangeRequired.length === 0'));
assert('requestChanges sets status NEEDS_CHANGES', serviceCode.includes("status: 'NEEDS_CHANGES'"));
assert('requestChanges copies snapshot payload to draft state for client correction', serviceCode.includes('snapshotData = latestSnapshot.snapshot'));
assert('approveSubmission requires status UNDER_REVIEW and zero unresolved CHANGE_REQUIRED items', serviceCode.includes('unresolvedChangeRequired.length > 0') && serviceCode.includes("status: 'APPROVED'"));
assert('approveSubmission sets approvedSubmissionId', serviceCode.includes('approvedSubmissionId: latestSnapshot.submissionId'));

// 2. Inspect StudioOnboardingReviewConsole.tsx
const consolePath = path.join(projectRoot, 'src/components/StudioOnboardingReviewConsole.tsx');
assert('StudioOnboardingReviewConsole.tsx exists', fs.existsSync(consolePath));

const consoleCode = fs.readFileSync(consolePath, 'utf8');
assert('Review console uses onboardingReviewService', consoleCode.includes('onboardingReviewService'));
assert('Review console supports Start Review action', consoleCode.includes('handleStartReview'));
assert('Review console supports Add Feedback action', consoleCode.includes('handleCreateFeedback'));
assert('Review console supports Request Changes action', consoleCode.includes('handleConfirmRequestChanges'));
assert('Review console supports Approve Setup action', consoleCode.includes('handleConfirmApprove'));
assert('Review console presents snapshot version selector history', consoleCode.includes('submissions.map'));
assert('Review console does not expose raw storageRef in UI', !consoleCode.includes('storageRef'));

// 3. Inspect SettingsModal.tsx & App.tsx
const settingsCode = fs.readFileSync(path.join(projectRoot, 'src/components/SettingsModal.tsx'), 'utf8');
assert('SettingsModal includes onLaunchDeveloperReview entry point', settingsCode.includes('onLaunchDeveloperReview'));
assert('SettingsModal renders Review Console launcher button', settingsCode.includes('Review Console'));

const appCode = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
assert('App.tsx imports StudioOnboardingReviewConsole', appCode.includes('StudioOnboardingReviewConsole'));
assert('App.tsx renders Developer Review Console overlay', appCode.includes('isDeveloperReviewOpen'));

// 4. Verify Architectural Constraints
const typesCode = fs.readFileSync(path.join(projectRoot, 'src/types.ts'), 'utf8');
assert('ScreenStep is strictly 1 | 2 | 3 | 4 | 5 | 6', typesCode.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6;'));

const navbarCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar.tsx has no Onboarding primary workflow item', !navbarCode.includes('label: \'Onboarding\''));

console.log(`\nAudit completed. Overall Result: ${allPassed ? 'ALL CHECKS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
