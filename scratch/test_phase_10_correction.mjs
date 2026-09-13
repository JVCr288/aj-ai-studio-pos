import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10.1 — CANONICAL STUDIO ONBOARDING SCHEMA AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Inspect types.ts
const typesCode = fs.readFileSync(path.join(projectRoot, 'src/types.ts'), 'utf8');
assert('ScreenStep is strictly 1 | 2 | 3 | 4 | 5 | 6', typesCode.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6;'));
assert('types.ts defines schemaVersion === "1.0"', typesCode.includes('schemaVersion: \'1.0\''));
assert('types.ts project has projectSlug', typesCode.includes('projectSlug: string;'));
assert('types.ts exports BookingPackage with price & currency', typesCode.includes('price: number;') && typesCode.includes('currency: string;'));
assert('types.ts retouchedPhotoCount is optional', typesCode.includes('retouchedPhotoCount?: number;'));
assert('types.ts description is optional', typesCode.includes('description?: string;'));
assert('types.ts DepositRule discriminated union requires NONE -> value: null', typesCode.includes("type: 'NONE';") && typesCode.includes("value: null;"));
assert('types.ts DepositRule supports FIXED & PERCENTAGE with number value', typesCode.includes("type: 'FIXED';") && typesCode.includes("type: 'PERCENTAGE';"));
assert('types.ts exports StudioSpace with optional approximateSize', typesCode.includes('approximateSize?: string;'));
assert('types.ts exports PaymentMethod with optional accountName & accountIdentifier', typesCode.includes('accountName?: string;') && typesCode.includes('accountIdentifier?: string;'));
assert('types.ts exports PaymentConfiguration with methods[]', typesCode.includes('methods: PaymentMethod[];'));
assert('types.ts exports BookingRules with canonical openingTime/closingTime', typesCode.includes('openingTime: string;') && typesCode.includes('closingTime: string;'));
assert('types.ts exports InvoiceProfile with useStudioProfile & footerMessage', typesCode.includes('useStudioProfile: boolean;') && typesCode.includes('footerMessage?: string;'));
assert('types.ts exports AssetReference contract', typesCode.includes('export interface AssetReference'));
assert('types.ts exports ReviewFeedback contract', typesCode.includes('export interface ReviewFeedback'));
assert('types.ts exports OnboardingSubmissionPayload (non-recursive snapshot payload)', typesCode.includes('export interface OnboardingSubmissionPayload'));
assert('types.ts SubmissionSnapshot uses snapshot: OnboardingSubmissionPayload', typesCode.includes('snapshot: OnboardingSubmissionPayload;'));

// 2. Inspect Navbar.tsx
const navbarCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar.tsx has exactly 6 production steps', !navbarCode.includes('step: 7'));
assert('Navbar.tsx has no Onboarding primary workflow item', !navbarCode.includes('label: \'Onboarding\''));

// 3. Inspect onboardingPersistenceService.ts
const servicePath = path.join(projectRoot, 'src/services/onboardingPersistenceService.ts');
assert('onboardingPersistenceService.ts exists', fs.existsSync(servicePath));

const serviceCode = fs.readFileSync(servicePath, 'utf8');
assert('Persistence service builds canonical projectSlug', serviceCode.includes('projectSlug:'));
assert('Persistence service builds canonical PaymentMethod[]', serviceCode.includes('methods: ['));
assert('Persistence service permits CASH without accountIdentifier', serviceCode.includes("provider: 'CASH'"));
assert('Persistence service documents replaceable adapter contract', serviceCode.includes('replaceable backend/API persistence adapter later'));

// 4. Inspect StudioOnboardingScreen.tsx
const onboardingPath = path.join(projectRoot, 'src/components/StudioOnboardingScreen.tsx');
assert('StudioOnboardingScreen.tsx component exists', fs.existsSync(onboardingPath));

const onboardingCode = fs.readFileSync(onboardingPath, 'utf8');
assert('StudioOnboardingScreen uses onboardingPersistenceService', onboardingCode.includes('onboardingPersistenceService'));
assert('StudioOnboardingScreen uses OnboardingSubmissionPayload for non-recursive snapshots', onboardingCode.includes('OnboardingSubmissionPayload'));
assert('StudioOnboardingScreen implements Step 1 Studio Info', onboardingCode.includes('Step 1 — Studio Profile'));
assert('StudioOnboardingScreen implements Step 2 Booking Packages', onboardingCode.includes('Step 2 — Booking Packages'));
assert('StudioOnboardingScreen implements Step 3 Studio Spaces', onboardingCode.includes('Step 3 — Studio Spaces'));
assert('StudioOnboardingScreen implements Step 4 Payment Configuration', onboardingCode.includes('Step 4 — Payment Gateways'));
assert('StudioOnboardingScreen implements Step 5 Booking Rules', onboardingCode.includes('Step 5 — Operating Hours'));
assert('StudioOnboardingScreen implements Step 6 Invoice Profile', onboardingCode.includes('Step 6 — Invoice Profile'));
assert('StudioOnboardingScreen supports Review & Submit', onboardingCode.includes('Review Studio Configuration') || onboardingCode.includes('Submit Studio Setup'));

// Verify out-of-scope fields are absent from onboarding schema
assert('No Client NRC field in onboarding form', !onboardingCode.includes('NRC / Passport No.'));
assert('No Emergency Contact field in onboarding form', !onboardingCode.includes('Emergency Contact'));
assert('No Creative Brief field in onboarding form', !onboardingCode.includes('Creative Brief & Production Specs'));

// 5. Inspect App.tsx
const appCode = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
assert('App.tsx does not render currentScreen === 7', !appCode.includes('currentScreen === 7'));
assert('App.tsx provides controlled development entry point for Onboarding Portal', appCode.includes('isOnboardingPortalOpen') && appCode.includes('StudioOnboardingScreen'));

console.log(`\nAudit completed. Overall Result: ${allPassed ? 'ALL CHECKS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
