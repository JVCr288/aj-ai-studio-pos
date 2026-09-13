import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 10 — STUDIO ONBOARDING PORTAL V1 & CLIENT DATA FORM AUDIT ===\n');

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
assert('types.ts exports ScreenStep including 7', typesCode.includes('export type ScreenStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;'));
assert('types.ts exports ClientOnboardingDraft interface', typesCode.includes('export interface ClientOnboardingDraft'));

// 2. Inspect Navbar.tsx
const navbarCode = fs.readFileSync(path.join(projectRoot, 'src/components/Navbar.tsx'), 'utf8');
assert('Navbar.tsx contains Step 7 Onboarding item', navbarCode.includes('{ step: 7, label: \'Onboarding\', subLabel: \'ဧည့်သည်ဖောင်\' }'));

// 3. Inspect StudioOnboardingScreen.tsx
const onboardingPath = path.join(projectRoot, 'src/components/StudioOnboardingScreen.tsx');
assert('StudioOnboardingScreen.tsx component file exists', fs.existsSync(onboardingPath));

const onboardingCode = fs.readFileSync(onboardingPath, 'utf8');
assert('StudioOnboardingScreen defines storage key akk_studio_onboarding_draft_v1', onboardingCode.includes('akk_studio_onboarding_draft_v1'));
assert('StudioOnboardingScreen contains Client Personal Information section', onboardingCode.includes('Section A — Client Personal Information'));
assert('StudioOnboardingScreen contains Creative Brief & Production Specs section', onboardingCode.includes('Section B — Creative Brief &amp; Production Specs') || onboardingCode.includes('Creative Brief'));
assert('StudioOnboardingScreen contains Studio Service Contract section', onboardingCode.includes('Section C — Studio Service Contract'));
assert('StudioOnboardingScreen supports Save Draft Contract action', onboardingCode.includes('Save Draft Contract'));
assert('StudioOnboardingScreen supports Export to Booking action', onboardingCode.includes('Export to Booking'));

// 4. Inspect App.tsx
const appCode = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
assert('App.tsx imports StudioOnboardingScreen', appCode.includes('import { StudioOnboardingScreen } from \'./components/StudioOnboardingScreen\';'));
assert('App.tsx renders StudioOnboardingScreen for currentScreen === 7', appCode.includes('currentScreen === 7') && appCode.includes('<StudioOnboardingScreen'));

console.log(`\nAudit completed. Overall Result: ${allPassed ? 'ALL CHECKS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
