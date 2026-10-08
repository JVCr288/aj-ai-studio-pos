import assert from 'node:assert';
import { posStaffService, DEFAULT_POS_STAFF } from '../services/posStaffService';

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

  // Test 2: PIN Authentication
  console.log('Testing 4-Digit Security PIN Authentication...');
  const authAungKyaw = posStaffService.authenticateByPin('1234', 'stf-01');
  assert.strictEqual(authAungKyaw?.name, 'Aung Kyaw');

  const failedPin = posStaffService.authenticateByPin('0000', 'stf-01');
  assert.strictEqual(failedPin, null, 'Incorrect PIN must return null');

  const globalMatch = posStaffService.authenticateByPin('9999');
  assert.strictEqual(globalMatch?.name, 'Ko Zin', 'Global PIN search must resolve Ko Zin');
  console.log('  ✅ Test 2: PIN authentication and failure rejection verified');

  // Test 3: Barcode Badge Scan Authentication
  console.log('Testing Barcode Badge Scan Quick-Switch...');
  const badgeAung = posStaffService.authenticateByBadge('STAFF-AK-01');
  assert.strictEqual(badgeAung?.id, 'stf-01');

  // Case-insensitive test
  const badgeLower = posStaffService.authenticateByBadge('staff-sm-02');
  assert.strictEqual(badgeLower?.name, 'Su Myat');

  const unknownBadge = posStaffService.authenticateByBadge('STAFF-INVALID-99');
  assert.strictEqual(unknownBadge, null);
  console.log('  ✅ Test 3: Barcode badge scan authentication verified');

  // Test 4: Role-Based Capability Guardrails
  console.log('Testing Role Permission Matrix...');
  // Cart Voiding: CASHIER requires override, LEAD_CASHIER / MANAGER / OWNER can void directly
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

  // Test 5: Manager Override Verification
  console.log('Testing Manager Override Verification...');
  // Manager PIN (9999) succeeds
  const mgrOverride = posStaffService.verifyManagerOverride('9999');
  assert.strictEqual(mgrOverride.authorized, true);
  assert.strictEqual(mgrOverride.manager?.name, 'Ko Zin');

  // Owner PIN (8888) succeeds
  const ownerOverride = posStaffService.verifyManagerOverride('8888');
  assert.strictEqual(ownerOverride.authorized, true);
  assert.strictEqual(ownerOverride.manager?.name, 'Daw Khin');

  // Cashier PIN (1234) rejected for elevated override
  const cashierOverride = posStaffService.verifyManagerOverride('1234');
  assert.strictEqual(cashierOverride.authorized, false);
  assert.ok(cashierOverride.reason?.includes('Manager or Owner authority required'));

  // Invalid PIN rejected
  const badOverride = posStaffService.verifyManagerOverride('0000');
  assert.strictEqual(badOverride.authorized, false);
  assert.strictEqual(badOverride.reason, 'Invalid PIN entered.');
  console.log('  ✅ Test 5: Manager override verification verified');

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
}

runPosStaffAuthTests().catch((err) => {
  console.error('POS Staff Auth Test Failed:', err);
  process.exit(1);
});
