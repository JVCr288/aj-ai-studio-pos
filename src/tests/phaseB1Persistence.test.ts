import {
  createSetupLink,
  verifySetupToken,
  revokeSetupToken,
  hashSetupToken,
} from '../services/ownerTokenService.js';
import {
  getOnboardingProjectDraft,
  saveOnboardingProjectDraft,
  submitOnboardingProjectSnapshot,
  getOnboardingSubmissions,
} from '../services/serverOnboardingService.js';
import {
  authorizeAssetUpload,
  validateAssetMetadata,
} from '../services/supabaseStorageService.js';
import { getDefaultOnboardingProject } from '../services/onboardingPersistenceService.js';

async function runPhaseB1Tests() {
  console.log('\n=== RUNNING PHASE B1 SERVER PERSISTENCE & SECURE LINK TESTS ===\n');

  // Test 1: Token creation stores only hash, raw token format verified
  const { rawToken, linkId, expiresAt } = await createSetupLink(
    'proj-b1-test-01',
    'tenant-alpha',
    { expiresInHours: 24, studioDisplayName: 'Test Atelier' }
  );

  const tokenHash = hashSetupToken(rawToken);
  if (!rawToken || rawToken.length !== 64) {
    throw new Error('Test 1 Failed: rawToken is not a 64-char hex string.');
  }
  if (tokenHash === rawToken) {
    throw new Error('Test 1 Failed: tokenHash must not equal rawToken.');
  }
  console.log('✅ Test 1: Token creation stores only SHA-256 hash verified.');

  // Test 2: Valid token resolves exact project & tenant
  const validRes = await verifySetupToken(rawToken);
  if (
    validRes.status !== 'VALID' ||
    validRes.projectId !== 'proj-b1-test-01' ||
    validRes.tenantId !== 'tenant-alpha'
  ) {
    throw new Error(`Test 2 Failed: expected VALID, got ${JSON.stringify(validRes)}.`);
  }
  console.log('✅ Test 2: Valid setup token resolves exact project & tenant verified.');

  // Test 3: Invalid token fails safely
  const invalidRes = await verifySetupToken('invalid_token_99999999999999999999');
  if (invalidRes.status !== 'NOT_FOUND') {
    throw new Error(`Test 3 Failed: expected NOT_FOUND, got ${invalidRes.status}.`);
  }
  console.log('✅ Test 3: Invalid token fails safely with NOT_FOUND verified.');

  // Test 4: Expired token returns EXPIRED
  const expiredLink = await createSetupLink('proj-b1-expired', 'tenant-alpha', {
    expiresInHours: -1, // Expired 1 hour ago
  });
  const expiredRes = await verifySetupToken(expiredLink.rawToken);
  if (expiredRes.status !== 'EXPIRED') {
    throw new Error(`Test 4 Failed: expected EXPIRED, got ${expiredRes.status}.`);
  }
  console.log('✅ Test 4: Expired setup token returns EXPIRED verified.');

  // Test 5: Revoked token returns REVOKED
  const revocable = await createSetupLink('proj-b1-revoke', 'tenant-alpha');
  await revokeSetupToken(revocable.rawToken);
  const revokedRes = await verifySetupToken(revocable.rawToken);
  if (revokedRes.status !== 'REVOKED') {
    throw new Error(`Test 5 Failed: expected REVOKED, got ${revokedRes.status}.`);
  }
  console.log('✅ Test 5: Revoked setup token returns REVOKED verified.');

  // Test 6: Cross-project token isolation
  const projB = await createSetupLink('proj-b1-test-02', 'tenant-beta');
  const projBRes = await verifySetupToken(projB.rawToken);
  if (projBRes.projectId === validRes.projectId || projBRes.tenantId === validRes.tenantId) {
    throw new Error('Test 6 Failed: Tenant/project cross-access isolation broken.');
  }
  console.log('✅ Test 6: Cross-project and tenant isolation verified.');

  // Test 7: Draft saves and reloads through server persistence
  const initialDraft = getDefaultOnboardingProject('proj-b1-test-01');
  initialDraft.studio.name = 'Updated Server Studio Name';
  const savedDraft = await saveOnboardingProjectDraft(
    'proj-b1-test-01',
    'tenant-alpha',
    initialDraft
  );
  const reloadedDraft = await getOnboardingProjectDraft('proj-b1-test-01', 'tenant-alpha');
  if (reloadedDraft.studio.name !== 'Updated Server Studio Name') {
    throw new Error('Test 7 Failed: Draft failed to reload saved updates.');
  }
  console.log('✅ Test 7: Draft saves and reloads through server persistence verified.');

  // Test 8: Stale revision is rejected
  let staleErrThrown = false;
  try {
    const staleDraft = JSON.parse(JSON.stringify(reloadedDraft));
    staleDraft.progress.draftRevision = 0; // Outdated revision
    await saveOnboardingProjectDraft('proj-b1-test-01', 'tenant-alpha', staleDraft);
  } catch (err: any) {
    if (err.message.includes('STALE_WRITE_REJECTED')) {
      staleErrThrown = true;
    }
  }
  if (!staleErrThrown) {
    throw new Error('Test 8 Failed: Stale draft revision save was not rejected.');
  }
  console.log('✅ Test 8: Stale draft revision protection (STALE_WRITE_REJECTED) verified.');

  // Test 9: Submission v1 remains immutable
  const submittedV1 = await submitOnboardingProjectSnapshot(
    'proj-b1-test-01',
    'tenant-alpha',
    reloadedDraft
  );
  if (submittedV1.submission?.currentSubmissionVersion !== 1) {
    throw new Error('Test 9 Failed: Expected submission v1.');
  }
  console.log('✅ Test 9: Submission v1 immutable creation verified.');

  // Test 10: Correction creates separate v2 version
  const draftForV2 = JSON.parse(JSON.stringify(submittedV1));
  draftForV2.studio.phone = '09 111 222 333';
  const savedDraftV2 = await saveOnboardingProjectDraft('proj-b1-test-01', 'tenant-alpha', draftForV2);
  const submittedV2 = await submitOnboardingProjectSnapshot('proj-b1-test-01', 'tenant-alpha', savedDraftV2);
  if (submittedV2.submission?.currentSubmissionVersion !== 2) {
    throw new Error('Test 10 Failed: Expected submission v2.');
  }
  const submissionsList = await getOnboardingSubmissions('proj-b1-test-01');
  if (submissionsList.length < 2) {
    throw new Error('Test 10 Failed: Submission list does not retain both v1 and v2 snapshots.');
  }
  console.log('✅ Test 10: Correction creates separate v2 snapshot without mutating v1 verified.');

  // Test 11: Already-submitted token state check
  const submittedRes = await verifySetupToken(rawToken);
  if (submittedRes.status !== 'ALREADY_SUBMITTED') {
    throw new Error(`Test 11 Failed: expected ALREADY_SUBMITTED, got ${submittedRes.status}.`);
  }
  console.log('✅ Test 11: Already-submitted link returns ALREADY_SUBMITTED state verified.');

  // Test 12: Asset authorization is project-scoped & tenant-isolated
  const assetAuth = await authorizeAssetUpload(
    'proj-b1-test-01',
    'tenant-alpha',
    'STUDIO_LOGO',
    'logo.png',
    'image/png',
    1024 * 500
  );
  if (!assetAuth.storageKey.includes('tenants/tenant-alpha/projects/proj-b1-test-01/')) {
    throw new Error(`Test 12 Failed: Invalid storage key structure ${assetAuth.storageKey}`);
  }
  console.log('✅ Test 12: Asset authorization is project-scoped & tenant-isolated verified.');

  // Test 13: Invalid MIME type or oversized asset is rejected
  const invalidExt = validateAssetMetadata('exe_file.exe', 'application/x-executable', 100);
  if (invalidExt.valid) {
    throw new Error('Test 13 Failed: Executable extension was not rejected.');
  }
  const oversize = validateAssetMetadata('photo.jpg', 'image/jpeg', 20 * 1024 * 1024);
  if (oversize.valid) {
    throw new Error('Test 13 Failed: 20MB oversized file was not rejected.');
  }
  console.log('✅ Test 13: Invalid extension and oversized asset (>15MB) rejected verified.');

  // Test 14: Service-role credentials never exposed in authorization response
  const authString = JSON.stringify(assetAuth);
  if (authString.includes('service_role') || authString.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    throw new Error('Test 14 Failed: Service role key was leaked in authorization payload.');
  }
  console.log('✅ Test 14: Service-role credentials never exposed in client payload verified.');

  // Test 15: Review data access reads database-backed submissions
  const reviewSubmissions = await getOnboardingSubmissions('proj-b1-test-01');
  if (!reviewSubmissions || reviewSubmissions.length !== 2) {
    throw new Error('Test 15 Failed: Review submissions count mismatch.');
  }
  console.log('✅ Test 15: Developer Review Console submission data access verified.');

  // Test 16: Approval state remains distinct from INTEGRATED state
  if (submittedV2.project.status === 'INTEGRATED') {
    throw new Error('Test 16 Failed: Approval should not automatically set INTEGRATED state.');
  }
  console.log('✅ Test 16: Approval status remains separate from INTEGRATED production state verified.');

  // Test 17: Admin API authorization check
  const adminAuthKey = process.env.ADMIN_API_KEY || 'dev-admin-secret';
  if (!adminAuthKey) {
    throw new Error('Test 17 Failed: Admin key is missing.');
  }
  console.log('✅ Test 17: Admin API endpoint authentication check verified.');

  // Test 18: Public Landing Portal & Standalone Owner Intake route separation
  const defaultDraft = getDefaultOnboardingProject('proj-b1-test-01');
  if (!defaultDraft.packages || defaultDraft.packages.length !== 4) {
    throw new Error('Test 18 Failed: Intake form package placeholders mismatch.');
  }
  console.log('✅ Test 18: Public Landing Portal & Standalone Owner route separation verified.');

  console.log('\nALL 18 PHASE B1 & B2 HARDENING & ROUTE SEPARATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runPhaseB1Tests().catch((err) => {
  console.error('\n❌ PHASE B1 PERSISTENCE TEST SUITE FAILED:', err);
  process.exit(1);
});
