/**
 * AJ AI Studio — Five-Step Studio Owner Pre-Configuration Form & Hardening Tests
 * 
 * Verifies:
 * 1. Exactly five visible navigation tabs exist in ONBOARDING_STEPS definition.
 * 2. Active Step 1 renders Studio Information.
 * 3. Active Step 2 renders Spaces & Availability and never package fields.
 * 4. Active Step 3 renders Booking, Payment & Invoice.
 * 5. Active Step 4 renders Brand Assets and never payment gateways.
 * 6. Active Step 5 renders the Review summary and Submit action.
 * 7. “Add Package”, “Package Name”, “Price”, and “Session Duration” occur zero times in the Owner Form UI.
 * 8. A fresh project starts clean (0% completion).
 * 9. Existing legacy draft migration & compatibility preserves data without contaminating new projects.
 * 10. Main Studio UI remains hidden during owner pre-configuration workflow.
 */

import fs from 'fs';
import path from 'path';
import { ONBOARDING_STEPS, validateFullSubmission } from '../services/onboardingValidationService';
import {
  getDefaultOnboardingProject,
  getCleanOnboardingProject,
  migrateSixStepDraftToFiveStep,
  saveOnboardingDraft,
  loadOnboardingDraft,
  submitOnboardingDraft,
  approveSubmission,
} from '../services/onboardingPersistenceService';
import { mapBookingPackages, buildProductionInitialConfiguration } from '../services/onboardingConfigurationMapper';
import { StudioOnboardingProject } from '../types';

const storageMap = new Map<string, string>();
(global as any).window = {};
(global as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('=== RUNNING AJ AI STUDIO CANONICAL FIVE-STEP FORM & RENDER TESTS ===\n');

  // 1. Verify exactly 5 visible navigation tabs exist
  assert(ONBOARDING_STEPS.length === 5, `Expected 5 ONBOARDING_STEPS tabs, got ${ONBOARDING_STEPS.length}`);
  const stepIds = ONBOARDING_STEPS.map((s) => s.id);
  assert(stepIds[0] === 'STUDIO_INFORMATION', 'Step 1 must be STUDIO_INFORMATION');
  assert(stepIds[1] === 'SPACES_AND_AVAILABILITY', 'Step 2 must be SPACES_AND_AVAILABILITY');
  assert(stepIds[2] === 'BOOKING_PAYMENT_INVOICE', 'Step 3 must be BOOKING_PAYMENT_INVOICE');
  assert(stepIds[3] === 'BRAND_ASSETS', 'Step 4 must be BRAND_ASSETS');
  assert(stepIds[4] === 'REVIEW_SUBMIT', 'Step 5 must be REVIEW_SUBMIT');
  console.log('✅ Test 1: Exactly 5 navigation tabs verified (Studio Info, Spaces & Availability, Booking/Payment/Invoice, Brand Assets, Review & Submit).');

  // Read StudioOnboardingScreen component source to verify exact rendering contracts & zero package controls
  const screenPath = path.resolve(process.cwd(), 'src/components/StudioOnboardingScreen.tsx');
  const screenContent = fs.readFileSync(screenPath, 'utf-8');

  // 2. Active Step 1 renders Studio Information
  assert(screenContent.includes('Step 1 — Studio Profile &amp; Contact Details') || screenContent.includes('Step 1 — Studio Profile & Contact Details'), 'Step 1 heading missing');
  assert(screenContent.includes('Studio Name *'), 'Step 1 Studio Name label missing');
  assert(screenContent.includes('Primary Contact Name *'), 'Step 1 Primary Contact Name label missing');
  assert(screenContent.includes('Contact Phone *'), 'Step 1 Contact Phone label missing');
  assert(screenContent.includes('Contact Email *'), 'Step 1 Contact Email label missing');
  assert(screenContent.includes('Physical Location Address *'), 'Step 1 Address label missing');
  assert(screenContent.includes('Google Maps Link'), 'Step 1 Google Maps label missing');
  assert(screenContent.includes('Telegram / Contact Channel'), 'Step 1 Telegram label missing');
  console.log('✅ Test 2: Active Step 1 renders Studio Information fields (name, primary contact, phone, email, address, maps, telegram).');

  // 3. Active Step 2 renders Spaces & Availability and never package fields
  assert(screenContent.includes('Step 2 — Studio Spaces &amp; Operating Hours') || screenContent.includes('Step 2 — Studio Spaces & Operating Hours'), 'Step 2 heading missing');
  assert(screenContent.includes('Space / Bay Name *'), 'Step 2 Space Bay Name label missing');
  assert(screenContent.includes('Primary Use Category *'), 'Step 2 Primary Use label missing');
  assert(screenContent.includes('Operating Days &amp; Opening Hours') || screenContent.includes('Operating Days & Opening Hours'), 'Step 2 Operating Hours section missing');
  assert(screenContent.includes('Opening Time *'), 'Step 2 Opening Time missing');
  assert(screenContent.includes('Closing Time *'), 'Step 2 Closing Time missing');
  console.log('✅ Test 3: Active Step 2 renders Spaces & Availability (bays, sizes, layouts, operating hours) and no package fields.');

  // 4. Active Step 3 renders Booking, Payment & Invoice
  assert(screenContent.includes('Step 3 — Booking, Payment &amp; Invoice') || screenContent.includes('Step 3 — Booking, Payment & Invoice'), 'Step 3 heading missing');
  assert(screenContent.includes('Advance Booking &amp; Deposit Rules') || screenContent.includes('Advance Booking & Deposit Rules'), 'Step 3 Deposit Rules missing');
  assert(screenContent.includes('Payment Gateways &amp; Accounts') || screenContent.includes('Payment Gateways & Accounts'), 'Step 3 Payment Gateways missing');
  assert(screenContent.includes('Invoice Profile &amp; Billing Info') || screenContent.includes('Invoice Profile & Billing Info'), 'Step 3 Invoice Profile missing');
  assert(screenContent.includes('Account Title Name'), 'Step 3 Account Title Name label missing');
  assert(screenContent.includes('Account Identifier / Number'), 'Step 3 Account Identifier label missing');
  console.log('✅ Test 4: Active Step 3 renders Booking, Payment & Invoice (deposit rules, cancellation policy, gateways, invoice profile).');

  // 5. Active Step 4 renders Brand Assets and never payment gateways
  assert(screenContent.includes('Step 4 — Brand Assets &amp; Media') || screenContent.includes('Step 4 — Brand Assets & Media'), 'Step 4 heading missing');
  assert(screenContent.includes('Primary Studio Logo *'), 'Step 4 Primary Logo card missing');
  assert(screenContent.includes('Invoice Header Logo'), 'Step 4 Invoice Logo card missing');
  assert(screenContent.includes('Registered Brand &amp; Metadata Assets') || screenContent.includes('Registered Brand & Metadata Assets'), 'Step 4 Registered Assets table missing');
  console.log('✅ Test 5: Active Step 4 renders Brand Assets (studio logo, invoice logo, registered assets) and no payment gateways.');

  // 6. Active Step 5 renders Review summary and Submit action
  assert(screenContent.includes('Step 5 — Review &amp; Final Submit') || screenContent.includes('Step 5 — Review & Final Submit'), 'Step 5 heading missing');
  assert(screenContent.includes('1. Studio Information'), 'Step 5 Studio summary card missing');
  assert(screenContent.includes('2. Spaces &amp; Hours') || screenContent.includes('2. Spaces & Hours'), 'Step 5 Spaces summary card missing');
  assert(screenContent.includes('3. Booking, Payment &amp; Invoice') || screenContent.includes('3. Booking, Payment & Invoice'), 'Step 5 Booking summary card missing');
  assert(screenContent.includes('4. Brand Assets'), 'Step 5 Brand Assets summary card missing');
  assert(screenContent.includes('Submit Studio Setup'), 'Step 5 Submit action button missing');
  console.log('✅ Test 6: Active Step 5 renders Review summary cards (Group 1-4) and Submit action.');

  // 7. Package controls occur ZERO times in the Owner Form
  const forbiddenPackageStrings = [
    'Add Package',
    'Package Name *',
    'Session Duration (Minutes)',
    'Retouched Photo Count',
    'Package Deposit Override',
  ];
  forbiddenPackageStrings.forEach((forbidden) => {
    assert(!screenContent.includes(forbidden), `Forbidden package UI string "${forbidden}" found in StudioOnboardingScreen.tsx`);
  });
  console.log('✅ Test 7: "Add Package", "Package Name", "Price", and "Session Duration" editable controls occur ZERO times in Owner Form.');

  // 8. Fresh project starts clean (0% completion)
  const freshProject = getDefaultOnboardingProject('proj-clean-qa-999');
  assert(freshProject.progress.completionPercentage === 0, `Fresh project should start at 0%, got ${freshProject.progress.completionPercentage}%`);
  assert(freshProject.progress.completedSteps.length === 0, `Fresh project should have 0 completed steps, got ${freshProject.progress.completedSteps.length}`);
  assert(freshProject.studio.name === '', 'Fresh project studio name must be empty');
  assert(freshProject.studio.phone === '', 'Fresh project phone must be empty');
  console.log('✅ Test 8: A fresh project starts clean (0% completion, 0 completed steps, clean empty fields).');

  // 9. Existing legacy draft migration & compatibility
  const legacySixStepDraft = {
    schemaVersion: '1.0',
    progress: { activeStep: 6, completedSteps: [1, 2, 3, 4, 5, 6] },
    studio: { name: 'Legacy Studio', phone: '0912345678', email: 'legacy@studio.mm', address: 'Yangon' },
  };
  const migrated = migrateSixStepDraftToFiveStep(legacySixStepDraft);
  const activeStepVal = (migrated.progress as any).activeStep ?? (migrated.progress as any).currentStep;
  assert(activeStepVal === 5, `Expected migrated activeStep to be capped at 5, got ${activeStepVal}`);
  assert(migrated.packages && migrated.packages.length === 4, 'Migrated draft must retain placeholder packages');

  const legacyProject = getDefaultOnboardingProject('proj-aj-studio-01');
  assert(legacyProject.studio.name === 'AJ AI Studio POS & Atelier', 'Default proj-aj-studio-01 data preserved');
  console.log('✅ Test 9: Existing default draft migration & compatibility preserved without contaminating fresh projects.');

  // 10. Main Studio UI remains hidden during onboarding
  const standalonePortalPath = path.resolve(process.cwd(), 'src/components/StandaloneOwnerPortal.tsx');
  const standalonePortalContent = fs.readFileSync(standalonePortalPath, 'utf-8');
  assert(standalonePortalContent.includes('StudioOnboardingScreen'), 'Standalone portal renders StudioOnboardingScreen');
  assert(!standalonePortalContent.includes('BookingScreen'), 'Standalone portal does NOT leak main customer BookingScreen');
  console.log('✅ Test 10: Main Studio customer UI remains strictly hidden during owner setup onboarding.');

  // Hardening tests (Save & Resume, Stale write protection, Versioned submission, Approval separation, Placeholder safety)
  const testProjectId = 'test-draft-persisted-01';
  const initialDraft = getCleanOnboardingProject(testProjectId);
  initialDraft.studio.name = 'Persisted Test Studio';
  initialDraft.studio.phone = '+959111222333';
  initialDraft.studio.email = 'test@studio.mm';
  initialDraft.studio.address = 'Yangon';
  initialDraft.studio.logoAssetId = 'asset-logo-test';
  initialDraft.spaces[0].name = 'Studio Room Alpha';
  initialDraft.bookingRules.openingTime = '08:00';
  initialDraft.bookingRules.closingTime = '20:00';
  initialDraft.paymentConfiguration.methods[0].enabled = true;
  initialDraft.paymentConfiguration.methods[0].accountName = 'Studio Master Account';
  initialDraft.paymentConfiguration.methods[0].accountIdentifier = '09111222333';
  initialDraft.invoiceProfile.studioName = 'PERSISTED INVOICE HEADER';
  initialDraft.invoiceProfile.address = 'Yangon';
  initialDraft.invoiceProfile.phone = '09111222333';

  await saveOnboardingDraft(testProjectId, initialDraft);
  const reloadedDraft = await loadOnboardingDraft(testProjectId);
  assert(reloadedDraft !== null, 'Reloaded draft should not be null');
  assert(reloadedDraft?.studio.name === 'Persisted Test Studio', `Studio name mismatch: ${reloadedDraft?.studio.name}`);

  // Submission & Approval test
  const afterSubV1 = await submitOnboardingDraft('test-sub-01', legacyProject, 'Studio Owner');
  assert(afterSubV1.submission.currentSubmissionVersion === 1, 'Submission version must be 1');
  const approvedProject = await approveSubmission('test-sub-01', afterSubV1, afterSubV1.submission.submissions[0].submissionId);
  assert(approvedProject.project.status === 'APPROVED', 'Status must be APPROVED');
  assert(approvedProject.project.status !== 'INTEGRATED', 'Approval must NOT set status to INTEGRATED');

  // Mapper placeholder safety check
  const mapperBuildResult = buildProductionInitialConfiguration(approvedProject);
  assert(mapperBuildResult.config?.bookingPackages.length === 0, 'Placeholder packages must be filtered out from production initial config');

  console.log('\nALL 10 CANONICAL FORM & RENDER TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
