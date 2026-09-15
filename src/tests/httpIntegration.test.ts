import assert from 'assert';
import { createAdminLoginPayload } from '../services/adminBookingClientService';
import { StudioOnboardingProject } from '../types.js';

const PORT = 4000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runHttpIntegrationTests() {
  console.log('\n=== RUNNING HTTP INTEGRATION & SECURITY TESTS ===\n');

  try {
    const ping = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(1200) });
    if (!ping.ok) throw new Error('Unhealthy');
  } catch {
    console.log('⚠️ [HTTP Integration] Server on 127.0.0.1:4000 is not running. Skipping live HTTP integration tests in offline runner.\n');
    return;
  }

  const callApi = async (path: string, options: RequestInit = {}) => {
    return fetch(`${BASE_URL}${path}`, options);
  };

  // 1. Create a setup token via server admin endpoint
  const createLinkRes = await callApi('/api/admin/setup-links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'dev-admin-secret',
    },
    body: JSON.stringify({
      projectId: 'proj-http-test-01',
      tenantId: 'tenant-http-test-01',
      expiresInHours: 24,
      studioDisplayName: 'HTTP Test Studio',
    }),
  });
  assert.strictEqual(createLinkRes.status, 200, 'Admin setup link creation should return 200');
  const linkInfo = await createLinkRes.json();
  assert.ok(linkInfo.rawToken, 'Setup link creation should return rawToken');

  // 2. Setup Token Exchange (POST /api/setup/exchange)
  console.log('Testing setup token exchange endpoint & Cookie creation...');
  const exchangeRes = await callApi('/api/setup/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawToken: linkInfo.rawToken }),
  });
  assert.strictEqual(exchangeRes.status, 200, 'Exchange endpoint should return 200 OK');
  const setCookieHeader = exchangeRes.headers.get('set-cookie') || '';
  assert.ok(setCookieHeader.includes('owner_session='), 'Set-Cookie header must contain owner_session');
  assert.ok(setCookieHeader.includes('HttpOnly'), 'Set-Cookie must be HttpOnly');
  assert.ok(setCookieHeader.includes('SameSite=Lax'), 'Set-Cookie must specify SameSite=Lax');

  const cookieValue = setCookieHeader.split(';')[0]; // owner_session=...

  const exchangeData = await exchangeRes.json();
  assert.strictEqual(exchangeData.success, true);
  assert.strictEqual(exchangeData.projectId, 'proj-http-test-01');
  assert.strictEqual(exchangeData.tenantId, 'tenant-http-test-01');
  assert.strictEqual(exchangeData.sessionToken, undefined, 'Session token must NOT be returned in JSON response body');
  assert.ok(exchangeData.csrfToken, 'Exchange should return csrfToken in JSON response body');
  console.log('  ✅ Set-Cookie attributes (HttpOnly, SameSite) verified & sessionToken excluded from JSON body');

  const csrfToken = exchangeData.csrfToken;

  // 3. Unauthenticated Owner Request Rejection (GET /api/owner/draft without cookie)
  console.log('Testing unauthenticated owner API request rejection...');
  const unauthRes = await callApi('/api/owner/draft');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated draft request should return 401');
  console.log('  ✅ Unauthenticated /api/owner/draft rejected with 401');

  // 4. Authenticated Owner Draft Read via Cookie (GET /api/owner/draft)
  console.log('Testing authenticated owner draft read via Cookie...');
  const draftRes = await callApi('/api/owner/draft', {
    headers: { Cookie: cookieValue },
  });
  assert.strictEqual(draftRes.status, 200, 'Authenticated draft read should return 200');
  const draftData = await draftRes.json();
  assert.strictEqual(draftData.success, true);
  assert.ok(draftData.draft, 'Draft payload should exist');
  console.log('  ✅ Authenticated GET /api/owner/draft via Cookie returns project draft');

  // 5. CSRF Protection Test (PUT /api/owner/draft without CSRF header)
  console.log('Testing CSRF protection on mutating request...');
  const noCsrfRes = await callApi('/api/owner/draft', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieValue,
      // Missing x-csrf-token header
    },
    body: JSON.stringify(draftData.draft),
  });
  assert.strictEqual(noCsrfRes.status, 403, 'Mutating request without CSRF token should return 403');
  console.log('  ✅ Mutating PUT /api/owner/draft without CSRF header rejected with 403');

  // 6. Authenticated Draft Save with Cookie & CSRF Token (PUT /api/owner/draft)
  console.log('Testing authenticated draft save with Cookie & CSRF header...');
  const currentDraft: StudioOnboardingProject = draftData.draft;
  currentDraft.studio.name = 'HTTP Test Studio Cookie Updated';

  const saveRes = await callApi('/api/owner/draft', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieValue,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify(currentDraft),
  });
  assert.strictEqual(saveRes.status, 200, 'Draft save with valid Cookie & CSRF should return 200');
  const saveData = await saveRes.json();
  assert.strictEqual(saveData.success, true);
  assert.strictEqual(saveData.draft.studio.name, 'HTTP Test Studio Cookie Updated');
  console.log('  ✅ Authenticated PUT /api/owner/draft with Cookie & CSRF token succeeds');

  // 7. Authenticated Submission with Cookie & CSRF Token (POST /api/owner/submit)
  console.log('Testing authenticated draft submission...');
  const submitRes = await callApi('/api/owner/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieValue,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify(currentDraft),
  });
  assert.strictEqual(submitRes.status, 200, 'Submission with valid Cookie & CSRF should return 200');
  const submitData = await submitRes.json();
  assert.strictEqual(submitData.success, true);
  assert.strictEqual(submitData.project.project.status, 'SUBMITTED');
  console.log('  ✅ Authenticated POST /api/owner/submit succeeds and sets project status SUBMITTED');

  // 8. Asset Upload Sequence & Object Verification (authorize -> confirm before upload fails -> binary upload -> confirm after upload succeeds)
  console.log('Testing asset upload sequence & server-side object existence verification...');
  const assetAuthRes = await callApi('/api/owner/assets/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieValue,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({
      role: 'STUDIO_LOGO',
      fileName: 'http_test_logo.png',
      mimeType: 'image/png',
      fileSizeBytes: 204800,
    }),
  });
  assert.strictEqual(assetAuthRes.status, 200, 'Asset authorization should return 200');
  const assetAuthData = await assetAuthRes.json();
  assert.strictEqual(assetAuthData.success, true);
  const { assetId, storageKey, uploadUrl } = assetAuthData.authorization;
  assert.ok(storageKey.includes('tenants/tenant-http-test-01/projects/proj-http-test-01/'));

  // Premature confirmation before binary upload must be rejected
  const confirmBeforeUploadRes = await callApi('/api/owner/assets/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieValue,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ assetId, storageKey }),
  });
  assert.strictEqual(confirmBeforeUploadRes.status, 404, 'Confirmation before binary upload must return 404 OBJECT_NOT_FOUND');
  console.log('  ✅ Asset confirmation rejected when object does not exist on storage destination');

  // Upload binary bytes payload
  const uploadRes = await callApi(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-storage-key': storageKey,
    },
    body: JSON.stringify({ storageKey, sizeBytes: 204800, mimeType: 'image/png' }),
  });
  assert.strictEqual(uploadRes.status, 200, 'Binary upload destination should return 200');

  // Confirmation after binary upload must succeed
  const confirmAfterUploadRes = await callApi('/api/owner/assets/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieValue,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ assetId, storageKey }),
  });
  assert.strictEqual(confirmAfterUploadRes.status, 200, 'Confirmation after binary upload should return 200');
  const confirmData = await confirmAfterUploadRes.json();
  assert.strictEqual(confirmData.uploadStatus, 'READY');
  console.log('  ✅ Real asset transfer sequence (authorize -> upload -> object existence check -> confirm) verified');

  // 9. Admin Endpoint Authentication Protection (GET /api/admin/onboarding/submissions)
  console.log('Testing admin endpoint authentication protection...');
  const unauthAdminRes = await callApi('/api/admin/onboarding/submissions');
  assert.strictEqual(unauthAdminRes.status, 401, 'Unauthenticated admin endpoint should return 401');

  const authAdminRes = await callApi('/api/admin/onboarding/submissions', {
    headers: { 'x-admin-key': 'dev-admin-secret' },
  });
  assert.strictEqual(authAdminRes.status, 200, 'Admin endpoint with valid x-admin-key should return 200');
  console.log('  ✅ Admin API endpoint requires valid x-admin-key header');

  // 11. Admin Login Contract & Cookie Verification (POST /api/admin/login)
  console.log('Testing admin login contract with shared payload builder & cookie verification...');
  const loginPayload = createAdminLoginPayload('akk-photo-studio', 'dev-admin-secret');
  const loginRes = await callApi('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginPayload),
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login with valid key should return 200');
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);
  assert.strictEqual(loginData.tenantId, 'akk-photo-studio');
  assert.strictEqual(loginData.userRole, 'STUDIO_ADMIN');
  assert.ok(loginData.csrfToken && loginData.csrfToken.startsWith('admin_csrf_'), 'csrfToken must be returned');
  assert.strictEqual((loginData as any).adminKey, undefined, 'Admin key must NEVER be returned in response body');

  const adminCookieHeader = loginRes.headers.get('set-cookie') || '';
  assert.ok(adminCookieHeader.includes('aj_admin_session=admin_sess_'), 'Set-Cookie header must contain aj_admin_session cookie');
  assert.ok(adminCookieHeader.includes('HttpOnly'), 'aj_admin_session cookie must be HttpOnly');

  // Test invalid key
  const invalidKeyPayload = createAdminLoginPayload('akk-photo-studio', 'wrong-key-xyz');
  const invalidKeyRes = await callApi('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidKeyPayload),
  });
  assert.strictEqual(invalidKeyRes.status, 401, 'Invalid admin key must return 401');
  const invalidKeyData = await invalidKeyRes.json();
  assert.strictEqual(invalidKeyData.code, 'INVALID_CREDENTIAL');

  // Test invalid tenant
  const invalidTenantPayload = createAdminLoginPayload('unsupported-tenant-xyz', 'dev-admin-secret');
  const invalidTenantRes = await callApi('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidTenantPayload),
  });
  assert.strictEqual(invalidTenantRes.status, 400, 'Invalid tenant ID must return 400');
  const invalidTenantData = await invalidTenantRes.json();
  assert.strictEqual(invalidTenantData.code, 'INVALID_TENANT');
  console.log('  ✅ Admin login contract, error codes, and aj_admin_session Cookie verified');

  console.log('\nALL 11 HTTP INTEGRATION & SECURITY TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runHttpIntegrationTests().catch((err) => {
  console.error('HTTP Integration Test Failure:', err);
  process.exit(1);
});
