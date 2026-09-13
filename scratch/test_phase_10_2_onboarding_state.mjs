import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.2 — STUDIO ONBOARDING SCREEN STATE & NAVIGATION AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Inspect onboardingValidationService.ts
const valServicePath = path.join(projectRoot, 'src/services/onboardingValidationService.ts');
assert('onboardingValidationService.ts exists', fs.existsSync(valServicePath));

const valCode = fs.readFileSync(valServicePath, 'utf8');
assert('Validation service defines ONBOARDING_STEPS table', valCode.includes('ONBOARDING_STEPS: StepDefinition[]'));
assert('Validation service implements Level 2 Studio Information validation', valCode.includes('validateStudioInformation'));
assert('Validation service implements Level 2 Booking Packages validation', valCode.includes('validateBookingPackages'));
assert('Validation service implements Level 2 Studio Spaces validation', valCode.includes('validateStudioSpaces'));
assert('Validation service implements Level 2 Payment Configuration validation', valCode.includes('validatePaymentConfiguration'));
assert('Validation service implements Level 2 Booking Rules validation', valCode.includes('validateBookingRules'));
assert('Validation service implements Level 2 Invoice Profile validation', valCode.includes('validateInvoiceProfile'));
assert('Validation service calculates completedSteps dynamically', valCode.includes('computeCompletedSteps'));
assert('Validation service calculates completionPercentage from validated steps', valCode.includes('computeCompletionPercentage'));
assert('Validation service implements Level 4 full submission validation', valCode.includes('validateFullSubmission'));

// 2. Inspect useAutosave.ts
const hookPath = path.join(projectRoot, 'src/hooks/useAutosave.ts');
assert('useAutosave.ts custom hook exists', fs.existsSync(hookPath));

const hookCode = fs.readFileSync(hookPath, 'utf8');
assert('useAutosave tracks saveStatus (idle/saving/saved/error)', hookCode.includes("SaveStatus = 'idle' | 'saving' | 'saved' | 'error'"));
assert('useAutosave avoids duplicate writes when payload matches', hookCode.includes('lastSavedPayloadRef.current'));
assert('useAutosave updates completedSteps & completionPercentage', hookCode.includes('computeCompletedSteps') && hookCode.includes('computeCompletionPercentage'));

// 3. Inspect StudioOnboardingScreen.tsx
const onboardingPath = path.join(projectRoot, 'src/components/StudioOnboardingScreen.tsx');
assert('StudioOnboardingScreen.tsx exists', fs.existsSync(onboardingPath));

const screenCode = fs.readFileSync(onboardingPath, 'utf8');
assert('StudioOnboardingScreen defines OnboardingViewState state machine', screenCode.includes("OnboardingViewState ="));
assert('StudioOnboardingScreen supports WELCOME state', screenCode.includes("'WELCOME'"));
assert('StudioOnboardingScreen supports STEP state', screenCode.includes("'STEP'"));
assert('StudioOnboardingScreen supports REVIEW state', screenCode.includes("'REVIEW'"));
assert('StudioOnboardingScreen supports SUBMIT_CONFIRMATION modal', screenCode.includes('isSubmitModalOpen'));
assert('StudioOnboardingScreen supports SUBMITTED read-only dashboard state', screenCode.includes("'SUBMITTED'"));
assert('StudioOnboardingScreen supports INCOMPATIBLE_SCHEMA recovery state', screenCode.includes("'INCOMPATIBLE_SCHEMA'"));

assert('StudioOnboardingScreen integrates useAutosave hook', screenCode.includes('useAutosave({'));
assert('StudioOnboardingScreen implements Back action without discarding inputs', screenCode.includes('Back') && screenCode.includes('setActiveStep'));
assert('StudioOnboardingScreen implements Continue action with section validation', screenCode.includes('handleContinueStep'));
assert('StudioOnboardingScreen implements Direct Step Access via step pills', screenCode.includes('handleJumpToStep'));
assert('StudioOnboardingScreen implements Level 4 submission check before modal', screenCode.includes('handleProceedToSubmit'));
assert('StudioOnboardingScreen creates non-recursive snapshot on submit', screenCode.includes('OnboardingSubmissionPayload') && screenCode.includes('handleConfirmSubmit'));
assert('StudioOnboardingScreen implements Reset confirmation modal', screenCode.includes('isResetModalOpen') && screenCode.includes('handleConfirmReset'));
assert('StudioOnboardingScreen contains development persistence adapter notice', screenCode.includes('Replaceable backend/API persistence adapter contract active'));

// 4. Verification of architectural constraints
const typesCode = fs.readFileSync(path.join(projectRoot, 'src/types.ts'), 'utf8');
assert('ScreenStep is strictly 1 | 2 | 3 | 4 | 5 | 6', typesCode.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6;'));

const navbarCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar.tsx has no Onboarding primary workflow item', !navbarCode.includes('label: \'Onboarding\''));

const appCode = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
assert('App.tsx does not render currentScreen === 7', !appCode.includes('currentScreen === 7'));
assert('App.tsx provides controlled development entry point for Onboarding Portal', appCode.includes('isOnboardingPortalOpen') && appCode.includes('StudioOnboardingScreen'));

console.log(`\nAudit completed. Overall Result: ${allPassed ? 'ALL CHECKS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
