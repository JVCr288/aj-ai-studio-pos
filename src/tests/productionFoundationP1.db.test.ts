import assert from 'node:assert';
import { AddressInfo } from 'node:net';
import postgres from 'postgres';
import { createApp } from '../server/app';
import { getDb } from '../db/index';
import { productionStudios, adminUsers, posStaff } from '../db/schema/index';
import { hashWithScrypt } from '../server/utils/crypto';
import { checkDuplicateSlip, recordVerifiedSlip } from '../server/routes/ocr.routes';

console.log('=== RUNNING PRODUCTION FOUNDATION (PHASE 1) DATABASE REPRODUCTION TESTS ===\n');

async function runProductionFoundationDbTests() {
  process.env.NODE_ENV = 'production';
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgres://aj_dev:aj_dev_password@localhost:5432/aj_studio_dev';
  }

  const connectionString = process.env.DATABASE_URL;
  const sqlClient = postgres(connectionString);

  // Initialize DB instance
  const db = getDb();
  assert.ok(db, 'Database connection must be established');

  const REAL_TENANT = 'real-studio';
  const ADMIN_USER = 'real-admin';
  const ADMIN_PASS = 'RealAdminPass123!';
  const CASHIER_ID = 'cashier-01';
  const CASHIER_PIN = '4321';
  const MANAGER_ID = 'manager-01';
  const MANAGER_PIN = '5678';

  console.log('Setting up real tenant environment in PostgreSQL (tenant: real-studio)...');

  // Clean up any stale data for real-studio
  await sqlClient`DELETE FROM admin_sessions WHERE tenant_id = ${REAL_TENANT}`;
  await sqlClient`DELETE FROM pos_transactions WHERE tenant_id = ${REAL_TENANT}`;
  await sqlClient`DELETE FROM pos_shifts WHERE tenant_id = ${REAL_TENANT}`;
  await sqlClient`DELETE FROM pos_staff WHERE tenant_id = ${REAL_TENANT}`;
  await sqlClient`DELETE FROM admin_users WHERE tenant_id = ${REAL_TENANT}`;
  await sqlClient`DELETE FROM verified_slips WHERE tenant_id = ${REAL_TENANT}`;
  await sqlClient`DELETE FROM production_studios WHERE slug = ${REAL_TENANT}`;

  // 1. Seed Real Studio Tenant
  await db.insert(productionStudios).values({
    slug: REAL_TENANT,
    displayName: 'Real Studio Production',
    status: 'APPROVED',
  });

  // 2. Seed Admin User
  const adminPassHash = await hashWithScrypt(ADMIN_PASS);
  await db.insert(adminUsers).values({
    tenantId: REAL_TENANT,
    username: ADMIN_USER,
    passwordHash: adminPassHash,
    role: 'STUDIO_ADMIN',
    isActive: true,
  });

  // 3. Seed Cashier (PIN 4321)
  const cashierPinHash = await hashWithScrypt(CASHIER_PIN);
  await db.insert(posStaff).values({
    id: CASHIER_ID,
    tenantId: REAL_TENANT,
    name: 'Real Cashier',
    role: 'CASHIER',
    pinHash: cashierPinHash,
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
  });

  // 4. Seed Manager (PIN 5678)
  const managerPinHash = await hashWithScrypt(MANAGER_PIN);
  await db.insert(posStaff).values({
    id: MANAGER_ID,
    tenantId: REAL_TENANT,
    name: 'Real Manager',
    role: 'STUDIO_MANAGER',
    pinHash: managerPinHash,
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
  });

  // Start HTTP App
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Authenticate as real-studio admin to obtain valid session cookie & CSRF token
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: REAL_TENANT,
        username: ADMIN_USER,
        password: ADMIN_PASS,
      }),
    });
    assert.strictEqual(loginRes.status, 200, 'Admin login for real tenant must succeed');
    const adminCookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
    const csrfToken = (await loginRes.json()).csrfToken;

    // -------------------------------------------------------------------------
    // CASE 1: Real tenant + manager override with 9999 -> 401
    // -------------------------------------------------------------------------
    console.log('Case 1: Testing real tenant + manager override with 9999 -> 401...');
    const res1 = await fetch(`${baseUrl}/api/pos/staff/manager-override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ pin: '9999', action: 'CASH_DROP' }),
    });
    assert.strictEqual(res1.status, 401, 'Manager override with 9999 on real tenant must return 401');
    const json1 = await res1.json();
    assert.strictEqual(json1.authorized, false);
    console.log('  ✅ Case 1 Passed: Real tenant manager override with 9999 rejected with 401.');

    // -------------------------------------------------------------------------
    // CASE 2: Real tenant + verify-pin {pin:'8888', staffId:'stf-04'} -> 401
    // -------------------------------------------------------------------------
    console.log("Case 2: Testing real tenant + verify-pin {pin:'8888', staffId:'stf-04'} -> 401...");
    const res2 = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ pin: '8888', staffId: 'stf-04' }),
    });
    assert.strictEqual(res2.status, 401, 'verify-pin with 8888 / stf-04 on real tenant must return 401');
    const json2 = await res2.json();
    assert.strictEqual(json2.code, 'INVALID_PIN');
    console.log('  ✅ Case 2 Passed: Demo staffId stf-04 on real tenant rejected with 401.');

    // -------------------------------------------------------------------------
    // CASE 3: Real tenant + correct PIN 4321 -> 200; 5 wrong -> 423; correct during lock -> 423
    // -------------------------------------------------------------------------
    console.log('Case 3: Testing real tenant PIN 4321 (200), 5 wrong (423), and locked rejection (423)...');
    // 3a. Correct PIN 4321 -> 200
    const res3a = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ pin: CASHIER_PIN, staffId: CASHIER_ID }),
    });
    assert.strictEqual(res3a.status, 200, 'Correct PIN 4321 must return 200');
    const json3a = await res3a.json();
    assert.strictEqual(json3a.staff.id, CASHIER_ID);

    // 3b. 4 wrong attempts -> 401 (not locked yet)
    for (let i = 1; i <= 4; i++) {
      const res3Wrong = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ pin: '0000', staffId: CASHIER_ID }),
      });
      assert.strictEqual(res3Wrong.status, 401, `Failed attempt ${i} must return 401`);
      const wrongJson = await res3Wrong.json();
      assert.strictEqual(wrongJson.isLocked, false);
    }

    // 3c. 5th wrong attempt -> 423 Locked
    const res3Fifth = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ pin: '0000', staffId: CASHIER_ID }),
    });
    assert.strictEqual(res3Fifth.status, 423, '5th failed attempt must return 423 Locked');
    const fifthJson = await res3Fifth.json();
    assert.strictEqual(fifthJson.isLocked, true);

    // 3d. Correct PIN during lock period -> 423 Locked
    const res3Locked = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ pin: CASHIER_PIN, staffId: CASHIER_ID }),
    });
    assert.strictEqual(res3Locked.status, 423, 'Correct PIN during lock must still return 423 Locked');
    const lockedJson = await res3Locked.json();
    assert.strictEqual(lockedJson.isLocked, true);
    console.log('  ✅ Case 3 Passed: Correct PIN returns 200; 5 failures locks account (423); locked PIN rejected.');

    // -------------------------------------------------------------------------
    // CASE 4: POST transaction while table unavailable -> 503, nothing persisted
    // -------------------------------------------------------------------------
    console.log('Case 4: Testing POST transaction while table is unavailable -> 503...');
    const failTxId = `tx-fail-test-${Date.now()}`;
    // Temporarily rename table
    await sqlClient`ALTER TABLE pos_transactions RENAME TO pos_transactions_temp`;

    try {
      const res4 = await fetch(`${baseUrl}/api/pos/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          id: failTxId,
          orderReference: 'ORD-FAIL-01',
          tenantId: REAL_TENANT,
          lines: [{ quantity: 1, unitPriceMMK: 12000 }],
          discountMMK: 0,
          totalDueMMK: 12000,
        }),
      });
      assert.strictEqual(res4.status, 503, 'DB write failure must return 503');
      const json4 = await res4.json();
      assert.strictEqual(json4.code, 'STORAGE_UNAVAILABLE');
    } finally {
      // Restore table unconditionally
      await sqlClient`ALTER TABLE pos_transactions_temp RENAME TO pos_transactions`;
    }

    // Verify row was NOT persisted
    const checkFailedRows = await sqlClient`SELECT id FROM pos_transactions WHERE id = ${failTxId}`;
    assert.strictEqual(checkFailedRows.length, 0, 'Failed transaction must not be persisted in DB');
    console.log('  ✅ Case 4 Passed: Table failure returns 503 and nothing is reported persisted.');

    // -------------------------------------------------------------------------
    // CASE 5: Same transaction posted twice concurrently -> exactly 1 row
    // -------------------------------------------------------------------------
    console.log('Case 5: Testing concurrent transaction submission (Promise.all) -> exactly 1 row...');
    const concurrentTxId = `tx-concurrent-${Date.now()}`;
    const txPayload = {
      id: concurrentTxId,
      orderReference: 'ORD-CONC-01',
      tenantId: REAL_TENANT,
      lines: [{ quantity: 2, unitPriceMMK: 15000 }],
      discountMMK: 0,
      totalDueMMK: 30000,
    };

    const [postA, postB] = await Promise.all([
      fetch(`${baseUrl}/api/pos/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(txPayload),
      }),
      fetch(`${baseUrl}/api/pos/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(txPayload),
      }),
    ]);

    const statuses = [postA.status, postB.status];
    assert.ok(statuses.includes(201), 'One of the concurrent requests must return 201 Created');
    assert.ok(statuses.includes(200), 'One of the concurrent requests must return 200 for duplicate');

    const jsonA = await postA.json();
    const jsonB = await postB.json();
    const dups = [jsonA.duplicate, jsonB.duplicate];
    assert.ok(dups.includes(false), 'One of the concurrent requests must be newly persisted');
    assert.ok(dups.includes(true), 'One of the concurrent requests must be identified as duplicate');

    const concurrentRows = await sqlClient`SELECT id FROM pos_transactions WHERE id = ${concurrentTxId}`;
    assert.strictEqual(concurrentRows.length, 1, 'Database must contain exactly 1 row for the transaction ID');
    console.log('  ✅ Case 5 Passed: Concurrent POST requests resulted in exactly 1 persisted row.');

    // -------------------------------------------------------------------------
    // CASE 6: Shift with 900,000 cash drop and no override -> 403; with valid token -> 201; reuse -> 403
    // -------------------------------------------------------------------------
    console.log('Case 6: Testing shift with 900,000 cash drop override enforcement and single-use token...');
    const shiftReport = {
      shiftId: `sh-${Date.now()}`,
      reportId: `rep-large-drop-${Date.now()}`,
      terminalId: 'TERM-01',
      staffName: 'Real Cashier',
      status: 'CLOSED',
      openedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      closedAt: new Date().toISOString(),
      cashReconciliation: {
        startingCashMMK: 100000,
        cashSalesMMK: 1200000,
        totalCashDropsMMK: 900000,
        expectedCashMMK: 400000,
        actualCountedCashMMK: 400000,
        discrepancyMMK: 0,
      },
      cashMovements: [
        { type: 'CASH_DROP', amountMMK: 900000, reason: 'Safe Drop' },
      ],
    };

    // 6a. Post without override header -> 403 OVERRIDE_REQUIRED
    const res6NoOvr = await fetch(`${baseUrl}/api/pos/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(shiftReport),
    });
    assert.strictEqual(res6NoOvr.status, 403, 'Large cash drop shift without override must return 403');
    const json6NoOvr = await res6NoOvr.json();
    assert.strictEqual(json6NoOvr.code, 'OVERRIDE_REQUIRED');

    // 6b. Obtain manager override token for manager-01 (PIN 5678)
    const ovrRes = await fetch(`${baseUrl}/api/pos/staff/manager-override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ pin: MANAGER_PIN, action: 'CASH_DROP' }),
    });
    assert.strictEqual(ovrRes.status, 200, 'Valid manager override must return 200');
    const { overrideToken } = await ovrRes.json();
    assert.ok(overrideToken, 'Must issue override token');

    // 6c. Post with valid override token -> 201
    const res6WithOvr = await fetch(`${baseUrl}/api/pos/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
        'x-manager-override': overrideToken,
      },
      body: JSON.stringify(shiftReport),
    });
    assert.strictEqual(res6WithOvr.status, 201, 'Shift with valid override token must return 201');

    // 6d. Reuse of the same token on a new report -> 403 OVERRIDE_REQUIRED
    const shiftReport2 = {
      ...shiftReport,
      shiftId: `sh-2-${Date.now()}`,
      reportId: `rep-large-drop-2-${Date.now()}`,
    };
    const res6Reuse = await fetch(`${baseUrl}/api/pos/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'x-csrf-token': csrfToken,
        'x-manager-override': overrideToken,
      },
      body: JSON.stringify(shiftReport2),
    });
    assert.strictEqual(res6Reuse.status, 403, 'Reused override token must return 403');
    const json6Reuse = await res6Reuse.json();
    assert.strictEqual(json6Reuse.code, 'OVERRIDE_REQUIRED');
    console.log('  ✅ Case 6 Passed: Large cash drop requires override; token accepted and single-use enforced.');

    // -------------------------------------------------------------------------
    // CASE 7: Slip with same transaction ID but gateway KBZPay then kbzpay -> duplicate
    // -------------------------------------------------------------------------
    console.log('Case 7: Testing slip deduplication with case variants (KBZPay vs kbzpay)...');
    const slipTxId = `TRX-KBZ-${Date.now()}`;
    const initialCheck = await checkDuplicateSlip(REAL_TENANT, 'KBZPay', slipTxId);
    assert.strictEqual(initialCheck, false, 'Initial check must return false');

    const recorded = await recordVerifiedSlip(REAL_TENANT, 'booking-001', 'KBZPay', slipTxId, 50000);
    assert.strictEqual(recorded, true, 'First record must succeed');

    const secondCheck = await checkDuplicateSlip(REAL_TENANT, 'kbzpay', slipTxId);
    assert.strictEqual(secondCheck, true, 'Second check with lowercase gateway must detect duplicate');

    const recordAgain = await recordVerifiedSlip(REAL_TENANT, 'booking-002', 'kbzpay', slipTxId, 50000);
    assert.strictEqual(recordAgain, false, 'Duplicate record attempt must return false');

    const slipRows = await sqlClient`SELECT id, gateway FROM verified_slips WHERE transaction_id = ${slipTxId}`;
    assert.strictEqual(slipRows.length, 1, 'Database must have exactly 1 normalized slip row');
    assert.strictEqual(slipRows[0].gateway, 'KBZPAY', 'Gateway in DB must be normalized to KBZPAY');
    console.log('  ✅ Case 7 Passed: Gateway normalization prevents duplicate slip insertion across casing.');

    // -------------------------------------------------------------------------
    // CASE 8: Slip with no manifest_id -> needs_review, never verified
    // -------------------------------------------------------------------------
    console.log('Case 8: Testing slip verification without manifest_id -> needs_review, never verified...');
    const slipTxNoManifest = `TRX-NO-MAN-${Date.now()}`;
    const res8 = await fetch(`${baseUrl}/api/verify-slip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        simulated_transaction_id: slipTxNoManifest,
      }),
    });
    assert.strictEqual(res8.status, 200, 'Unlinked slip returns 200 with review status');
    const json8 = await res8.json();
    assert.strictEqual(json8.verification_status, 'needs_review', 'Must return needs_review status');
    assert.strictEqual(json8.is_valid_slip, false, 'is_valid_slip must be false');
    assert.strictEqual(json8.error, null, 'Error property must be null');

    // Confirm that the slip was NEVER persisted to the verified_slips table
    const dbSlips = await sqlClient`SELECT id FROM verified_slips WHERE transaction_id = ${slipTxNoManifest}`;
    assert.strictEqual(dbSlips.length, 0, 'Unlinked slip must never be written to verified_slips table');
    console.log('  ✅ Case 8 Passed: Slip without manifest_id returns needs_review and is never persisted.');

    console.log('\n🎉 ALL 8 DATABASE REPRODUCTION TEST CASES PASSED SUCCESSFULLY ON POSTGRESQL!\n');

    server.close();
    await sqlClient.end();
    process.exit(0);
  } catch (err: any) {
    console.error('Database test suite failed:', err);
    server.close();
    await sqlClient.end();
    process.exit(1);
  }
}

runProductionFoundationDbTests();
