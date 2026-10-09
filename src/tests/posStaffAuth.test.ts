import assert from 'node:assert';
import { AddressInfo } from 'node:net';
import { createApp } from '../server/app.js';
import { posStaffService } from '../services/posStaffService.js';

async function runPosStaffAuthTests() {
  console.log('=== RUNNING MULTI-STAFF FAST PIN SWITCH & AUDIT ROLES TESTS ===\n');

  // Test 1: Staff Roster Integrity
  console.log('Testing Staff Roster & Role Integrity...');
  const staff = posStaffService.getAllStaff();
  assert.strictEqual(staff.length, 4, 'Must seed 4 active staff members');
  const aungKyaw = staff.find((s) => s.id === 'stf-01');
  const suMyat = staff.find((s) => s.id === 'stf-02');
  const koZin = staff.find((s) => s.id === 'stf-03');
  const dawKhin = staff.find((s) => s.id === 'stf-04');

  assert.ok(aungKyaw && aungKyaw.role === 'CASHIER');
  assert.ok(suMyat && suMyat.role === 'LEAD_CASHIER');
  assert.ok(koZin && koZin.role === 'STUDIO_MANAGER');
  assert.ok(dawKhin && dawKhin.role === 'OWNER');
  console.log('  ✅ Test 1: Staff roster and role definitions verified');

  // Start in-process server for server-side auth verification (Fixes R5)
  process.env.DEMO_MODE = 'true';
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const serverHost = `http://127.0.0.1:${port}`;

  try {
    // 0. Authenticate admin session for 'aj-ai-studio'
    const loginRes = await fetch(`${serverHost}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: 'aj-ai-studio',
        username: 'admin',
        password: 'admin123',
      }),
    });
    assert.strictEqual(loginRes.status, 200, 'Admin login should succeed');
    const loginData = await loginRes.json();
    const setCookie = loginRes.headers.get('set-cookie');
    const sessionCookie = setCookie ? setCookie.split(';')[0] : '';
    const csrfToken = loginData.csrfToken;
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'x-csrf-token': csrfToken,
    };

    // Test 2: Server PIN Authentication
    console.log('Testing 4-Digit Security PIN Server Authentication...');
    const authAungRes = await fetch(`${serverHost}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '1234', staffId: 'stf-01' }),
    });
    assert.strictEqual(authAungRes.status, 200);
    const authAungData = await authAungRes.json();
    assert.strictEqual(authAungData.staff?.name, 'Aung Kyaw');

    const failedPinRes = await fetch(`${serverHost}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '0000', staffId: 'stf-01' }),
    });
    assert.strictEqual(failedPinRes.status, 401, 'Incorrect PIN must return 401');

    const globalMatchRes = await fetch(`${serverHost}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '9999' }),
    });
    assert.strictEqual(globalMatchRes.status, 200);
    const globalMatchData = await globalMatchRes.json();
    assert.strictEqual(globalMatchData.staff?.name, 'Ko Zin', 'Global PIN search must resolve Ko Zin');
    console.log('  ✅ Test 2: Server PIN authentication and failure rejection verified');

    // Test 3: Barcode Badge Scan Server Verification
    console.log('Testing Barcode Badge Scan Verification...');
    const badgeMatchRes = await fetch(`${serverHost}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '1234', badgeBarcode: 'STAFF-AK-01' }),
    });
    assert.strictEqual(badgeMatchRes.status, 200);
    const badgeMatchData = await badgeMatchRes.json();
    assert.strictEqual(badgeMatchData.staff?.id, 'stf-01');

    const unknownBadgeRes = await fetch(`${serverHost}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '1234', badgeBarcode: 'STAFF-INVALID-99' }),
    });
    assert.strictEqual(unknownBadgeRes.status, 401);
    console.log('  ✅ Test 3: Server barcode badge scan authentication verified');

    // Test 4: Role-Based Capability Guardrails
    console.log('Testing Role Permission Matrix...');
    assert.strictEqual(posStaffService.canVoidCart('CASHIER'), false);
    assert.strictEqual(posStaffService.canVoidCart('LEAD_CASHIER'), true);
    assert.strictEqual(posStaffService.canVoidCart('STUDIO_MANAGER'), true);
    assert.strictEqual(posStaffService.canVoidCart('OWNER'), true);

    // Large Cash Drops (>50,000 MMK)
    assert.strictEqual(posStaffService.canPerformLargeCashDrop('CASHIER', 30000), true);
    assert.strictEqual(posStaffService.canPerformLargeCashDrop('CASHIER', 100000), false);
    assert.strictEqual(posStaffService.canPerformLargeCashDrop('STUDIO_MANAGER', 100000), true);

    // Shift Close
    assert.strictEqual(posStaffService.canCloseShift('CASHIER'), false);
    assert.strictEqual(posStaffService.canCloseShift('LEAD_CASHIER'), true);
    assert.strictEqual(posStaffService.canCloseShift('STUDIO_MANAGER'), true);
    console.log('  ✅ Test 4: Role capability guardrails verified');

    // Test 5: Server Manager Override Verification
    console.log('Testing Server Manager Override Verification...');
    // Manager PIN (9999) succeeds
    const mgrRes = await fetch(`${serverHost}/api/pos/staff/manager-override`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '9999', action: 'VOID_CART' }),
    });
    assert.strictEqual(mgrRes.status, 200);
    const mgrData = await mgrRes.json();
    assert.strictEqual(mgrData.authorized, true);
    assert.strictEqual(mgrData.manager?.name, 'Ko Zin');
    assert.ok(mgrData.overrideToken, 'Override token must be issued');

    // Owner PIN (8888) succeeds
    const ownerRes = await fetch(`${serverHost}/api/pos/staff/manager-override`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '8888', action: 'CASH_DROP' }),
    });
    assert.strictEqual(ownerRes.status, 200);
    const ownerData = await ownerRes.json();
    assert.strictEqual(ownerData.authorized, true);
    assert.strictEqual(ownerData.manager?.name, 'Daw Khin');

    // Cashier PIN (1234) rejected for elevated override
    const cashierRes = await fetch(`${serverHost}/api/pos/staff/manager-override`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '1234', action: 'CASH_DROP' }),
    });
    assert.strictEqual(cashierRes.status, 401);

    // Invalid PIN rejected
    const badRes = await fetch(`${serverHost}/api/pos/staff/manager-override`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ pin: '0000', action: 'CASH_DROP' }),
    });
    assert.strictEqual(badRes.status, 401);
    console.log('  ✅ Test 5: Server manager override verification verified');

    // Test 6: Terminal Lock & Unlock Lifecycle
    console.log('Testing Terminal Lock & Unlock Lifecycle...');
    posStaffService.lockTerminal();
    assert.strictEqual(posStaffService.isTerminalLocked(), true);

    posStaffService.unlockTerminal(suMyat!);
    assert.strictEqual(posStaffService.isTerminalLocked(), false);
    assert.strictEqual(posStaffService.getActiveStaff().name, 'Su Myat');

    // Reset to default
    posStaffService.setActiveStaff(aungKyaw!);
    assert.strictEqual(posStaffService.getActiveStaff().name, 'Aung Kyaw');
    console.log('  ✅ Test 6: Terminal lock and unlock lifecycle verified');

    console.log('\n🎉 ALL 6 MULTI-STAFF FAST PIN SWITCH & AUDIT TESTS PASSED!\n');
  } finally {
    server.close();
  }
}

runPosStaffAuthTests().catch((err) => {
  console.error('POS Staff Auth Test Failed:', err);
  process.exit(1);
});
