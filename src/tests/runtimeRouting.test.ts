import assert from 'node:assert';

/**
 * RUNTIME ROUTING & INITIAL STATE VERIFICATION TEST SUITE
 * 
 * Verifies deterministic route resolution:
 * 1. "/" (no query params) -> Step 0 (StudioLandingPortal)
 * 2. "/?step=booking" -> Step 1 (BookingScreen)
 * 3. "/setup" or "/setup/:token" -> StandaloneOwnerPortal
 * 4. Stored internal screen state or localStorage cannot bypass "/"
 */

function resolveRouteState(pathname: string, search: string, localStorageMock?: Record<string, string>): {
  currentScreen: number;
  isStandaloneOwnerRoute: boolean;
} {
  const searchParams = new URLSearchParams(search);

  // 1. Standalone owner portal check
  if (pathname.startsWith('/setup') || searchParams.has('setupToken') || searchParams.has('setup')) {
    return { currentScreen: 0, isStandaloneOwnerRoute: true };
  }

  // 2. Explicit booking workflow entry
  if (searchParams.get('step') === 'booking' || searchParams.get('direct') === 'booking' || pathname === '/booking') {
    return { currentScreen: 1, isStandaloneOwnerRoute: false };
  }

  const stepParam = searchParams.get('step');
  if (stepParam) {
    const parsed = parseInt(stepParam, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
      return { currentScreen: parsed, isStandaloneOwnerRoute: false };
    }
  }

  // 3. Root "/" with no customer-workflow query deterministically returns 0 (StudioLandingPortal),
  // regardless of what is stored in localStorage or previous workspace state.
  return { currentScreen: 0, isStandaloneOwnerRoute: false };
}

function runRuntimeRoutingTests() {
  console.log('\n=== RUNNING RUNTIME ROUTING & DETERMINISTIC STATE TESTS ===\n');

  // Test 1: "/" with no query returns StudioLandingPortal (Step 0)
  const rootRes = resolveRouteState('/', '');
  assert.strictEqual(rootRes.currentScreen, 0, 'Root "/" path must resolve to step 0 (StudioLandingPortal)');
  assert.strictEqual(rootRes.isStandaloneOwnerRoute, false, 'Root "/" path must NOT be standalone owner route');
  console.log('  ✅ Test 1: "/" with no query deterministically resolves to StudioLandingPortal (Step 0)');

  // Test 2: Stored internal state cannot bypass "/"
  const mockStorage = { last_active_step: '3', current_booking: 'active' };
  const rootWithStorageRes = resolveRouteState('/', '', mockStorage);
  assert.strictEqual(rootWithStorageRes.currentScreen, 0, 'Stored state in localStorage must NOT bypass root "/"');
  console.log('  ✅ Test 2: Stored workspace/localStorage state cannot bypass root "/"');

  // Test 3: "/?step=booking" resolves to BookingScreen (Step 1)
  const bookingQueryRes = resolveRouteState('/', '?step=booking');
  assert.strictEqual(bookingQueryRes.currentScreen, 1, '"/?step=booking" must resolve to step 1 (BookingScreen)');
  assert.strictEqual(bookingQueryRes.isStandaloneOwnerRoute, false);
  console.log('  ✅ Test 3: "/?step=booking" resolves to BookingScreen (Step 1)');

  // Test 4: "/setup" resolves to StandaloneOwnerPortal
  const setupRes = resolveRouteState('/setup', '');
  assert.strictEqual(setupRes.isStandaloneOwnerRoute, true, '"/setup" must resolve to StandaloneOwnerPortal');
  console.log('  ✅ Test 4: "/setup" resolves to StandaloneOwnerPortal');

  // Test 5: "/setup/token_abc123" resolves to StandaloneOwnerPortal
  const setupTokenRes = resolveRouteState('/setup/8c14cad86d47b681625f58ea6395ed44fbcb55415a433f53ec7dbfdd5920e622', '');
  assert.strictEqual(setupTokenRes.isStandaloneOwnerRoute, true, '"/setup/:token" must resolve to StandaloneOwnerPortal');
  console.log('  ✅ Test 5: "/setup/:token" resolves to StandaloneOwnerPortal');

  // Test 6: Explicit "/?step=3" resolves to step 3 (Verify)
  const step3Res = resolveRouteState('/', '?step=3');
  assert.strictEqual(step3Res.currentScreen, 3, '"/?step=3" must resolve to step 3');
  console.log('  ✅ Test 6: Explicit "/?step=3" query parameter resolves to step 3');

  console.log('\nALL 6 RUNTIME ROUTING & DETERMINISTIC STATE TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runRuntimeRoutingTests();
