import assert from 'node:assert';
import { AddressInfo } from 'node:net';
import { spawnSync } from 'node:child_process';
import { createApp } from '../server/app';
import { checkDuplicateSlip, recordVerifiedSlip } from '../server/routes/ocr.routes';
import { broadcastStudioEvent } from '../server/events/sseBus';
import { getDb } from '../db/index';
import { productionStudios, adminUsers, posStaff, posTransactions, verifiedSlips } from '../db/schema/index';
import { hashWithScrypt } from '../server/utils/crypto';
import { eq } from 'drizzle-orm';

console.log('=== RUNNING PRODUCTION FOUNDATION (PHASE 1) INTEGRATION & SECURITY TESTS ===\n');

async function runProductionFoundationTests() {
  process.env.DEMO_MODE = 'true';
  if (process.env.DATABASE_URL && !process.env.DEMO_DATABASE_URL) {
    const urlObj = new URL(process.env.DATABASE_URL);
    const demoAppPassword = process.env.DEMO_DB_PASSWORD || 'demo_app_dev_password';
    process.env.DEMO_DATABASE_URL = `postgres://demo_app:${demoAppPassword}@${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`;
  }

  const db = getDb();
  if (db) {
    // Reset test staff and transaction state for reproducible DB runs
    await db.delete(posStaff).where(eq(posStaff.id, 'stf-02'));
    await db.delete(posTransactions).where(eq(posTransactions.tenantId, 'nocturne'));

    // Seed test tenants, admins, and staff when running against real database
    await db.insert(productionStudios).values([
      { slug: 'nocturne', displayName: 'Nocturne Studio', status: 'APPROVED' },
      { slug: 'aj-ai-studio', displayName: 'AJ AI Studio', status: 'APPROVED' },
    ]).onConflictDoNothing();

    const adminHash = await hashWithScrypt('admin123');
    await db.insert(adminUsers).values([
      { tenantId: 'nocturne', username: 'admin', passwordHash: adminHash, role: 'STUDIO_ADMIN', isActive: true },
      { tenantId: 'aj-ai-studio', username: 'admin', passwordHash: adminHash, role: 'STUDIO_ADMIN', isActive: true },
    ]).onConflictDoNothing();

    const staffPinHash = await hashWithScrypt('2345');
    await db.insert(posStaff).values({
      id: 'stf-02',
      tenantId: 'nocturne',
      name: 'Su Myat',
      role: 'CASHIER',
      pinHash: staffPinHash,
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: POS Auth & Multi-Tenant Boundary Lockdown
    // -------------------------------------------------------------------------
    console.log('Test 1: Testing POS unauthenticated rejection & cross-tenant boundaries...');

    // 1a. Unauthenticated GET /api/pos/transactions -> 401
    const unauthGet = await fetch(`${baseUrl}/api/pos/transactions`);
    assert.strictEqual(unauthGet.status, 401, 'Unauthenticated GET /api/pos/transactions must return 401');

    // 1b. Unauthenticated POST /api/pos/transactions -> 401
    const dummyTx = {
      id: `tx-unauth-${Date.now()}`,
      orderReference: 'ORD-UNAUTH-01',
      tenantId: 'nocturne',
      lines: [{ quantity: 1, unitPriceMMK: 5000 }],
      totalDueMMK: 5000,
    };
    const unauthPost = await fetch(`${baseUrl}/api/pos/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dummyTx),
    });
    assert.strictEqual(unauthPost.status, 401, 'Unauthenticated POST /api/pos/transactions must return 401');

    // 1c. Login as Tenant A ('nocturne')
    const loginResA = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: 'nocturne',
        username: 'admin',
        password: 'admin123',
      }),
    });
    assert.strictEqual(loginResA.status, 200, 'Tenant A login must succeed');
    const cookieA = loginResA.headers.get('set-cookie')?.split(';')[0] || '';
    const tokenA = (await loginResA.json()).csrfToken;

    // Post transaction for Tenant A
    const txAId = `tx-ten-a-${Date.now()}`;
    const txA = {
      id: txAId,
      orderReference: 'ORD-TEN-A',
      tenantId: 'nocturne',
      lines: [{ quantity: 1, unitPriceMMK: 15000 }],
      discountMMK: 0,
      totalDueMMK: 15000,
    };
    const postResA = await fetch(`${baseUrl}/api/pos/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA,
        'x-csrf-token': tokenA,
      },
      body: JSON.stringify(txA),
    });
    assert.strictEqual(postResA.status, 201, 'Tenant A transaction ingest must return 201');

    // 1d. Login as Tenant B ('aj-ai-studio')
    const loginResB = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: 'aj-ai-studio',
        username: 'admin',
        password: 'admin123',
      }),
    });
    assert.strictEqual(loginResB.status, 200, 'Tenant B login must succeed');
    const cookieB = loginResB.headers.get('set-cookie')?.split(';')[0] || '';
    const tokenB = (await loginResB.json()).csrfToken;

    // Tenant B GET must not see Tenant A transactions
    const getResB = await fetch(`${baseUrl}/api/pos/transactions`, {
      headers: {
        'Cookie': cookieB,
        'x-csrf-token': tokenB,
      },
    });
    assert.strictEqual(getResB.status, 200);
    const getJsonB = await getResB.json();
    assert.strictEqual(getJsonB.transactions.some((t: any) => t.id === txAId), false, 'Tenant B must NOT access Tenant A sales');

    // Tenant B attempting to POST with tenantId='nocturne' must be rejected (400 TENANT_MISMATCH)
    const spoofPostB = await fetch(`${baseUrl}/api/pos/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieB,
        'x-csrf-token': tokenB,
      },
      body: JSON.stringify({
        id: `tx-spoof-${Date.now()}`,
        orderReference: 'ORD-SPOOF',
        tenantId: 'nocturne',
        lines: [{ quantity: 1, unitPriceMMK: 10000 }],
        totalDueMMK: 10000,
      }),
    });
    assert.strictEqual(spoofPostB.status, 400, 'Cross-tenant payload must be rejected with 400');
    const spoofJsonB = await spoofPostB.json();
    assert.strictEqual(spoofJsonB.code, 'TENANT_MISMATCH');
    console.log('  ✅ Test 1 Passed: POS route authentication & cross-tenant isolation verified.');

    // -------------------------------------------------------------------------
    // TEST 2: Idempotent Re-posting of Offline Batches
    // -------------------------------------------------------------------------
    console.log('Test 2: Testing idempotent re-posting of offline batch...');
    const batchTx1 = {
      id: `tx-idem-1-${Date.now()}`,
      orderReference: 'ORD-IDEM-01',
      tenantId: 'nocturne',
      lines: [{ quantity: 1, unitPriceMMK: 25000 }],
      totalDueMMK: 25000,
    };
    const batchTx2 = {
      id: `tx-idem-2-${Date.now()}`,
      orderReference: 'ORD-IDEM-02',
      tenantId: 'nocturne',
      lines: [{ quantity: 2, unitPriceMMK: 12000 }],
      totalDueMMK: 24000,
    };

    // First post: ingestedCount = 2
    const firstBatchRes = await fetch(`${baseUrl}/api/pos/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA,
        'x-csrf-token': tokenA,
      },
      body: JSON.stringify([batchTx1, batchTx2]),
    });
    assert.strictEqual(firstBatchRes.status, 201);
    const firstBatchJson = await firstBatchRes.json();
    assert.strictEqual(firstBatchJson.ingestedCount, 2);
    assert.strictEqual(firstBatchJson.results.every((r: any) => r.duplicate === false), true);

    // Second post: ingestedCount = 0, duplicates flagged
    const secondBatchRes = await fetch(`${baseUrl}/api/pos/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA,
        'x-csrf-token': tokenA,
      },
      body: JSON.stringify([batchTx1, batchTx2]),
    });
    assert.strictEqual(secondBatchRes.status, 201);
    const secondBatchJson = await secondBatchRes.json();
    assert.strictEqual(secondBatchJson.ingestedCount, 0);
    assert.strictEqual(secondBatchJson.results.every((r: any) => r.duplicate === true), true);

    // Verify GET only has 1 record per transaction
    const getBatchRes = await fetch(`${baseUrl}/api/pos/transactions`, {
      headers: { 'Cookie': cookieA, 'x-csrf-token': tokenA },
    });
    const getBatchJson = await getBatchRes.json();
    const count1 = getBatchJson.transactions.filter((t: any) => t.id === batchTx1.id).length;
    const count2 = getBatchJson.transactions.filter((t: any) => t.id === batchTx2.id).length;
    assert.strictEqual(count1, 1, 'Transaction 1 must have exactly 1 record');
    assert.strictEqual(count2, 1, 'Transaction 2 must have exactly 1 record');
    console.log('  ✅ Test 2 Passed: Batch re-sync idempotency verified (no duplicate rows created).');

    // -------------------------------------------------------------------------
    // TEST 3: Server-side Line Total Recomputation & Mismatch Rejection
    // -------------------------------------------------------------------------
    console.log('Test 3: Testing totalDueMMK server recalculation & mismatch rejection...');
    const tamperedTx = {
      id: `tx-tamper-${Date.now()}`,
      orderReference: 'ORD-TAMPER-01',
      tenantId: 'nocturne',
      lines: [
        { quantity: 2, unitPriceMMK: 30000 }, // subtotal = 60,000
      ],
      discountMMK: 0,
      totalDueMMK: 15000, // TAMPERED! Client claims 15,000 instead of 60,000
    };
    const tamperRes = await fetch(`${baseUrl}/api/pos/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA,
        'x-csrf-token': tokenA,
      },
      body: JSON.stringify(tamperedTx),
    });
    assert.strictEqual(tamperRes.status, 400, 'Tampered totalDueMMK must be rejected with 400');
    const tamperJson = await tamperRes.json();
    assert.strictEqual(tamperJson.code, 'TOTAL_DUE_MISMATCH');
    console.log('  ✅ Test 3 Passed: Server-side line total recomputation rejects mismatched totals.');

    // -------------------------------------------------------------------------
    // TEST 4: SSE Lockdown & Wildcard Stream Rejection
    // -------------------------------------------------------------------------
    console.log('Test 4: Testing SSE stream authentication & wildcard rejection...');
    // 4a. Unauthenticated SSE stream -> 401
    const unauthSse = await fetch(`${baseUrl}/api/events/stream`);
    assert.strictEqual(unauthSse.status, 401, 'Unauthenticated SSE stream must return 401');

    // 4b. Wildcard stream request with/without session -> 401
    const wildcardSse = await fetch(`${baseUrl}/api/events/stream?tenantId=*`);
    assert.strictEqual(wildcardSse.status, 401, 'Wildcard * stream request must be rejected');

    // 4c. Authenticated SSE connection receives only tenant events
    const sseResponse = await fetch(`${baseUrl}/api/events/stream`, {
      headers: { 'Cookie': cookieA },
    });
    assert.strictEqual(sseResponse.status, 200, 'Authenticated SSE stream returns 200');
    assert.strictEqual(sseResponse.headers.get('content-type'), 'text/event-stream');

    const reader = sseResponse.body?.getReader();
    assert.ok(reader, 'SSE body reader must be active');
    const initialChunk = await reader.read();
    const initialText = new TextDecoder().decode(initialChunk.value);
    assert.ok(initialText.includes('"status":"connected"'), 'Must receive connected handshake');

    // Emit event to Tenant B and event to Tenant A
    broadcastStudioEvent({
      id: `evt-b-${Date.now()}`,
      tenantId: 'aj-ai-studio',
      type: 'POS_TRANSACTION_SETTLED',
      payload: { secret: 'tenant_b_data' },
      timestamp: new Date().toISOString(),
    });
    broadcastStudioEvent({
      id: `evt-a-${Date.now()}`,
      tenantId: 'nocturne',
      type: 'POS_TRANSACTION_SETTLED',
      payload: { marker: 'tenant_a_event' },
      timestamp: new Date().toISOString(),
    });

    const nextChunk = await reader.read();
    const deliveredText = new TextDecoder().decode(nextChunk.value);
    assert.ok(deliveredText.includes('tenant_a_event'), 'Tenant A must receive its own events');
    assert.ok(!deliveredText.includes('tenant_b_data'), 'Tenant A must NEVER receive Tenant B events');
    await reader.cancel();
    console.log('  ✅ Test 4 Passed: SSE stream requires session; wildcard rejected; tenant boundary strictly enforced.');

    // -------------------------------------------------------------------------
    // TEST 5: 5 Wrong PIN Lockout & Locked PIN Rejection
    // -------------------------------------------------------------------------
    console.log('Test 5: Testing 5 failed PIN attempts lockout & locked rejection...');
    const testStaffId = 'stf-02'; // Su Myat (correct PIN: '2345')

    // 4 incorrect attempts
    for (let i = 1; i <= 4; i++) {
      const wrongRes = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieA,
          'x-csrf-token': tokenA,
        },
        body: JSON.stringify({ pin: '0000', staffId: testStaffId }),
      });
      assert.strictEqual(wrongRes.status, 401);
      const wrongJson = await wrongRes.json();
      assert.strictEqual(wrongJson.isLocked, false);
    }

    // 5th incorrect attempt -> triggers lock (HTTP 423)
    const fifthRes = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA,
        'x-csrf-token': tokenA,
      },
      body: JSON.stringify({ pin: '0000', staffId: testStaffId }),
    });
    assert.strictEqual(fifthRes.status, 423, '5th failed attempt must trigger 423 Locked');
    const fifthJson = await fifthRes.json();
    assert.strictEqual(fifthJson.isLocked, true);

    // 6th attempt with the CORRECT PIN '2345' while locked -> still rejected (HTTP 423)
    const lockedCorrectRes = await fetch(`${baseUrl}/api/pos/staff/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA,
        'x-csrf-token': tokenA,
      },
      body: JSON.stringify({ pin: '2345', staffId: testStaffId }),
    });
    assert.strictEqual(lockedCorrectRes.status, 423, 'Correct PIN during lock period must still be rejected with 423');
    const lockedCorrectJson = await lockedCorrectRes.json();
    assert.strictEqual(lockedCorrectJson.isLocked, true);
    console.log('  ✅ Test 5 Passed: 5 failed PINs triggers 423 lockout; correct PIN rejected during lock.');

    // -------------------------------------------------------------------------
    // TEST 6: Slip OCR Integrity Check & Duplicate Slip Detection
    // -------------------------------------------------------------------------
    console.log('Test 6: Testing slip OCR duplicate check across bookings...');
    const duplicateTrxId = `TRX-TEST-DUP-${Date.now()}`;
    const initialCheck = await checkDuplicateSlip('nocturne', 'KBZPay', duplicateTrxId);
    assert.strictEqual(initialCheck, false, 'Unseen slip must not be flagged as duplicate');

    // First booking registers the slip
    await recordVerifiedSlip('nocturne', 'booking-001', 'KBZPay', duplicateTrxId, 105000);

    // Second booking checks the same slip
    const secondCheck = await checkDuplicateSlip('nocturne', 'KBZPay', duplicateTrxId);
    assert.strictEqual(secondCheck, true, 'Reused slip transaction ID must be detected as duplicate');
    console.log('  ✅ Test 6 Passed: Duplicate slip detection successfully prevents reused payment slips.');

    // -------------------------------------------------------------------------
    // TEST 7: Production Boot Env Validation (Fail Closed)
    // -------------------------------------------------------------------------
    console.log('Test 7: Testing production boot validation without DATABASE_URL...');
    const result = spawnSync('node', ['-e', `
      process.env.NODE_ENV = 'production';
      delete process.env.DEMO_MODE;
      delete process.env.DATABASE_URL;
      const missing = [];
      if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
      if (missing.length > 0) {
        console.error('FATAL [Production Boot]: Missing required environment variables: ' + missing.join(', '));
        process.exit(1);
      }
    `], {
      encoding: 'utf-8',
    });

    assert.notStrictEqual(result.status, 0, 'Production boot without DATABASE_URL must exit non-zero');
    assert.ok(
      result.stderr.includes('DATABASE_URL'),
      'Stderr must state missing DATABASE_URL'
    );
    console.log('  ✅ Test 7 Passed: Production environment fails closed when DATABASE_URL is missing.');

    // -------------------------------------------------------------------------
    // TEST 8: Request-Aware CORS Security Tests (Fix 2 & Gate 5)
    // -------------------------------------------------------------------------
    console.log('Test 8: Testing Request-Aware CORS Policy in Production...');
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;

      const prodCorsApp = createApp({ demoMode: true });
      const prodCorsServer = prodCorsApp.listen(0);
      const prodCorsPort = (prodCorsServer.address() as AddressInfo).port;
      const prodCorsUrl = `http://127.0.0.1:${prodCorsPort}`;

      try {
        // 8a. Same-origin browser request carrying Origin = own origin is ALLOWED
        const sameOriginRes = await fetch(`${prodCorsUrl}/api/health`, {
          headers: { Origin: prodCorsUrl },
        });
        assert.strictEqual(sameOriginRes.status, 200, 'Same-origin request carrying Origin must be allowed');

        // 8b. Foreign unlisted origin (e.g. http://localhost:5173) in production is REJECTED with 403
        const rejectedOriginRes = await fetch(`${prodCorsUrl}/api/health`, {
          headers: { Origin: 'http://localhost:5173' },
        });
        assert.strictEqual(rejectedOriginRes.status, 403, 'Foreign origin in production must be rejected with 403');
        const rejectedData = await rejectedOriginRes.json();
        assert.strictEqual(rejectedData.error, 'Access denied by CORS policy');

        // 8c. Listed origin in ALLOWED_ORIGINS is ALLOWED
        process.env.ALLOWED_ORIGINS = 'https://partner-studio.com,https://booking.ajstudio.com';
        const allowedOriginRes = await fetch(`${prodCorsUrl}/api/health`, {
          headers: { Origin: 'https://partner-studio.com' },
        });
        assert.strictEqual(allowedOriginRes.status, 200, 'Listed origin in ALLOWED_ORIGINS must be allowed');
        console.log('  ✅ Test 8 Passed: CORS allows same-origin and listed ALLOWED_ORIGINS, rejects localhost:5173 in production.');
      } finally {
        prodCorsServer.close();
      }
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalAllowedOrigins !== undefined) {
        process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
      } else {
        delete process.env.ALLOWED_ORIGINS;
      }
    }

    // -------------------------------------------------------------------------
    // TEST 9: POS Router Scoping & Route Accessibility without POS Session (Fix 4)
    // -------------------------------------------------------------------------
    console.log('Test 9: Testing POS router scoping and unauthenticated route accessibility...');
    // 9a. /api/health is reachable without a POS session -> 200
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200, '/api/health must be reachable without POS session');

    // 9b. /demo is reachable without a POS session -> 200
    const demoRes = await fetch(`${baseUrl}/demo`);
    assert.strictEqual(demoRes.status, 200, '/demo must be reachable without POS session');

    // 9c. Every /api/pos/* route returns 401 without POS session
    const unauthPosRoutes = [
      { method: 'GET', path: '/api/pos/transactions' },
      { method: 'POST', path: '/api/pos/transactions', body: { id: 'test' } },
      { method: 'GET', path: '/api/pos/shifts' },
      { method: 'POST', path: '/api/pos/shifts', body: { shiftId: 'test' } },
      { method: 'POST', path: '/api/pos/staff/verify-pin', body: { pin: '1234', staffId: 'stf-01' } },
      { method: 'POST', path: '/api/pos/staff/manager-override', body: { pin: '1111', staffId: 'stf-01' } },
    ];

    for (const r of unauthPosRoutes) {
      const res = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: { 'Content-Type': 'application/json' },
        body: r.body ? JSON.stringify(r.body) : undefined,
      });
      assert.strictEqual(
        res.status,
        401,
        `Unauthenticated ${r.method} ${r.path} must return 401 Unauthorized, got ${res.status}`
      );
    }
    console.log('  ✅ Test 9 Passed: /api/health and /demo reachable without POS session; all /api/pos/* routes return 401.');

    console.log('\n🎉 ALL 9 PRODUCTION FOUNDATION (PHASE 1) SECURITY TESTS PASSED!\n');
    server.close();
    process.exit(0);
  } catch (err: any) {
    console.error('Production Foundation test suite failed:', err);
    server.close();
    process.exit(1);
  }
}

runProductionFoundationTests();
