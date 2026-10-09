import assert from 'node:assert';
import { AddressInfo } from 'node:net';
import postgres from 'postgres';
import { createApp } from '../server/app.js';
import { getDb, closeDb, assertDemoIsolation } from '../db/index.js';
import { cleanupIdleSandboxes } from '../server/services/demoProvisioningService.js';

console.log('=== RUNNING PUBLIC DEMO & TENANT ISOLATION DATABASE TESTS (GATES 3 & 4) ===\n');

async function runDemoIsolationDbTests() {
  process.env.DEMO_MODE = 'true';
  process.env.ADMIN_API_KEY = 'test-founder-ops-key-2026';
  process.env.NODE_ENV = 'test';

  const ownerDbUrl = process.env.DATABASE_URL || 'postgres://aj_dev:aj_dev_password@localhost:5432/aj_studio_dev';
  process.env.DATABASE_URL = ownerDbUrl;

  const urlObj = new URL(ownerDbUrl);
  const demoAppPassword = process.env.DEMO_DB_PASSWORD || 'demo_app_dev_password';
  const demoAppUrl = process.env.DEMO_DATABASE_URL || `postgres://demo_app:${demoAppPassword}@${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`;
  process.env.DEMO_DATABASE_URL = demoAppUrl;

  const ownerClient = postgres(ownerDbUrl, { max: 2 });
  const demoClient = postgres(demoAppUrl, { max: 2 });

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Direct PostgreSQL Permission & Search Path Verification
    // -------------------------------------------------------------------------
    console.log('Step 1: Testing demo_app PostgreSQL schema permissions & search_path...');

    // 1a. demo_app can query demo tables
    const leadsRes = await demoClient`SELECT count(*)::int as count FROM demo.demo_leads`;
    assert.ok(leadsRes.length > 0, 'demo_app must be able to query demo.demo_leads');
    console.log('  ✅ demo_app can query demo.demo_leads (count:', leadsRes[0].count, ')');

    const boxRes = await demoClient`SELECT count(*)::int as count FROM demo.demo_sandboxes`;
    assert.ok(boxRes.length > 0, 'demo_app must be able to query demo.demo_sandboxes');
    console.log('  ✅ demo_app can query demo.demo_sandboxes (count:', boxRes[0].count, ')');

    // 1b. demo_app CANNOT access public.* tables (must throw 42501 permission denied)
    const tablesToTest = ['production_studios', 'customer_bookings', 'pos_transactions', 'admin_users'];
    for (const tbl of tablesToTest) {
      let denied = false;
      try {
        await demoClient.unsafe(`SELECT * FROM public.${tbl} LIMIT 1`);
      } catch (err: any) {
        if (err.message?.includes('permission denied') || err.code === '42501') {
          denied = true;
        } else {
          throw err;
        }
      }
      assert.strictEqual(
        denied,
        true,
        `demo_app MUST be denied permission to SELECT from public.${tbl}`
      );
      console.log(`  ✅ demo_app rejected with permission denied on public.${tbl}`);
    }

    // -------------------------------------------------------------------------
    // FIX A TESTS: Missing DEMO_DATABASE_URL & Owner Role as DEMO_DATABASE_URL
    // -------------------------------------------------------------------------
    console.log('\nTesting Fix A: DEMO_MODE without DEMO_DATABASE_URL refuses to start...');
    const savedDemoUrl = process.env.DEMO_DATABASE_URL;
    try {
      delete process.env.DEMO_DATABASE_URL;
      assert.throws(() => {
        createApp({ demoMode: true });
      }, /DEMO_DATABASE_URL_REQUIRED/, 'createApp must throw DEMO_DATABASE_URL_REQUIRED');
      console.log('  ✅ Confirmed: createApp refuses to start without DEMO_DATABASE_URL');
    } finally {
      process.env.DEMO_DATABASE_URL = savedDemoUrl;
    }

    console.log('Testing Fix A: DEMO_MODE with owner URL as DEMO_DATABASE_URL does not mount demo routes...');
    const ownerCheck = await assertDemoIsolation(ownerDbUrl);
    assert.strictEqual(ownerCheck.isolated, false, 'assertDemoIsolation must reject owner URL');
    console.log(`  ✅ assertDemoIsolation rejected owner connection: ${ownerCheck.reason}`);

    process.env.DEMO_DATABASE_URL = ownerDbUrl;
    await closeDb();
    const wrongRoleApp = createApp({ demoMode: true });
    const wrongRoleServer = wrongRoleApp.listen(0);
    const wrongRolePort = (wrongRoleServer.address() as AddressInfo).port;
    try {
      const wrongRoleRes = await fetch(`http://127.0.0.1:${wrongRolePort}/api/demo/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', phone: '09123456789', studioName: 'Test' }),
      });
      assert.strictEqual(wrongRoleRes.status, 404, 'Demo routes must not be mounted when connected as owner role');
      console.log('  ✅ Confirmed: Demo routes return 404 when DEMO_DATABASE_URL is owner role');
    } finally {
      wrongRoleServer.close();
      process.env.DEMO_DATABASE_URL = demoAppUrl;
      await closeDb();
    }

    const demoRoleCheck = await assertDemoIsolation(demoAppUrl);
    assert.strictEqual(demoRoleCheck.isolated, true, 'assertDemoIsolation must approve demo_app URL');
    console.log('  ✅ assertDemoIsolation confirmed demo_app URL is isolated.');

    // -------------------------------------------------------------------------
    // GATE 3: Isolation Gate (App connected as demo_app via DEMO_DATABASE_URL)
    // -------------------------------------------------------------------------
    console.log('\nGate 3: Testing Isolation Gate (HTTP operations as demo_app leave public tables unchanged)...');

    // Baseline row counts in public tables before visitor activity
    const [initStudios] = await ownerClient`SELECT count(*)::int as count FROM public.production_studios`;
    const [initBookings] = await ownerClient`SELECT count(*)::int as count FROM public.customer_bookings`;
    const [initPosTx] = await ownerClient`SELECT count(*)::int as count FROM public.pos_transactions`;
    console.log(`  Baseline public counts: studios=${initStudios.count}, bookings=${initBookings.count}, posTx=${initPosTx.count}`);

    // Ensure Drizzle connection pool initializes with DEMO_DATABASE_URL
    await closeDb();

    const app = createApp({ demoMode: true });
    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    let visitorSandboxId = '';
    let visitorLeadId = '';

    try {
      // 3a. Visitor signs up via HTTP
      const uniqueSuffix = `${Date.now()}`.slice(-6);
      const visitorPhone = `09 952 ${uniqueSuffix.slice(0, 3)} ${uniqueSuffix.slice(3)}`;
      const signupRes = await fetch(`${baseUrl}/api/demo/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ko Min Min',
          phone: visitorPhone,
          studioName: 'Atelier Min Isolation',
          city: 'Yangon',
          preferredChannel: 'TELEGRAM',
        }),
      });
      assert.strictEqual(signupRes.status, 200, 'Demo visitor sign-up must succeed');
      const signupData = await signupRes.json();
      assert.strictEqual(signupData.success, true);
      visitorSandboxId = signupData.sandboxId;
      visitorLeadId = signupData.leadId;
      assert.ok(visitorSandboxId.startsWith('demo-'), 'Sandbox ID must start with demo-');
      console.log(`  ✅ Demo sandbox provisioned via HTTP: ${visitorSandboxId}`);

      // 3b. Visitor makes a customer booking via HTTP
      const bookingRef = `BK-ISOL-${uniqueSuffix}`;
      const bookingRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: visitorSandboxId,
          idempotencyKey: `idemp-${bookingRef}`,
          guestName: 'Ko Tun Tun',
          clientPhone: '+959123456789',
          dateStr: '2026-11-25',
          timeSlot: '11:00 AM',
          totalAmount: 250000,
          depositAmount: 100000,
        }),
      });
      assert.strictEqual(bookingRes.status, 201, 'Customer booking creation must succeed');
      console.log(`  ✅ Booking created via HTTP in sandbox: ${bookingRef}`);

      // 3c. Visitor logs into admin & makes a POS sale via HTTP
      const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: visitorSandboxId,
          username: signupData.adminCredentials.username,
          password: signupData.adminCredentials.password,
        }),
      });
      assert.strictEqual(loginRes.status, 200, 'Admin login to sandbox must succeed');
      const loginData = await loginRes.json();
      const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
      const csrfToken = loginData.csrfToken;

      const posTxId = `tx-demo-isol-${uniqueSuffix}`;
      const posRes = await fetch(`${baseUrl}/api/pos/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          id: posTxId,
          orderReference: `ORD-ISOL-${uniqueSuffix}`,
          tenantId: visitorSandboxId,
          terminalId: 'TERM-DEMO-01',
          staffId: 'stf-01',
          lines: [{ title: 'Photo Frame Luxury', quantity: 1, unitPriceMMK: 45000 }],
          subtotalMMK: 45000,
          discountMMK: 0,
          totalDueMMK: 45000,
          payments: [{ method: 'CASH', amountMMK: 45000, status: 'COMPLETED' }],
        }),
      });
      assert.strictEqual(posRes.status, 201, 'POS sale transaction must succeed');
      console.log(`  ✅ POS transaction created via HTTP: ${posTxId}`);

      // 3d. Check as the OWNER role: public tables MUST be strictly UNCHANGED!
      const [afterStudios] = await ownerClient`SELECT count(*)::int as count FROM public.production_studios`;
      const [afterBookings] = await ownerClient`SELECT count(*)::int as count FROM public.customer_bookings`;
      const [afterPosTx] = await ownerClient`SELECT count(*)::int as count FROM public.pos_transactions`;

      assert.strictEqual(
        afterStudios.count,
        initStudios.count,
        `public.production_studios row count must be unchanged (before: ${initStudios.count}, after: ${afterStudios.count})`
      );
      assert.strictEqual(
        afterBookings.count,
        initBookings.count,
        `public.customer_bookings row count must be unchanged (before: ${initBookings.count}, after: ${afterBookings.count})`
      );
      assert.strictEqual(
        afterPosTx.count,
        initPosTx.count,
        `public.pos_transactions row count must be unchanged (before: ${initPosTx.count}, after: ${afterPosTx.count})`
      );
      console.log('  ✅ Public table row counts strictly UNCHANGED (0 rows leaked into public schema).');

      // 3e. Check that the new records really exist in schema DEMO
      const [demoStudio] = await ownerClient`SELECT count(*)::int as count FROM demo.production_studios WHERE slug = ${visitorSandboxId}`;
      assert.strictEqual(demoStudio.count, 1, 'Sandbox studio must exist in demo.production_studios');

      const [demoBooking] = await ownerClient`SELECT count(*)::int as count FROM demo.customer_bookings WHERE tenant_id = ${visitorSandboxId}`;
      assert.ok(demoBooking.count >= 1, 'Booking must exist in demo.customer_bookings');

      const [demoTx] = await ownerClient`SELECT count(*)::int as count FROM demo.pos_transactions WHERE tenant_id = ${visitorSandboxId}`;
      assert.ok(demoTx.count >= 1, 'POS transaction must exist in demo.pos_transactions');

      const [demoBox] = await ownerClient`SELECT count(*)::int as count FROM demo.demo_sandboxes WHERE sandbox_id = ${visitorSandboxId}`;
      assert.strictEqual(demoBox.count, 1, 'Sandbox record must exist in demo.demo_sandboxes');
      console.log('  ✅ New rows successfully verified inside schema "demo".');

      console.log('  ✅ Gate 3 Passed: Isolation Gate verified end-to-end.\n');
    } finally {
      server.close();
    }

    // -------------------------------------------------------------------------
    // GATE 4: Restart Gate (Restart server, run cleanup threshold 0)
    // -------------------------------------------------------------------------
    console.log('Gate 4: Testing Restart Gate (Server restart + cleanup threshold 0)...');

    // Simulate server restart: close connection pool and create fresh app
    await closeDb();

    const restartedApp = createApp({ demoMode: true });
    const restartedServer = restartedApp.listen(0);

    try {
      // Run cleanup with threshold 0 (forces idle cleanup of all dynamic sandboxes)
      const cleanupStats = await cleanupIdleSandboxes(0);
      assert.ok(cleanupStats.deletedSandboxes >= 1, 'Cleanup must delete at least 1 sandbox');
      console.log(`  Cleanup deleted ${cleanupStats.deletedSandboxes} sandbox(es).`);

      // Verify as OWNER role: all sandbox rows in schema demo are GONE
      const [cleanBk] = await ownerClient`SELECT count(*)::int as count FROM demo.customer_bookings WHERE tenant_id = ${visitorSandboxId}`;
      const [cleanEvents] = await ownerClient`SELECT count(*)::int as count FROM demo.booking_events WHERE tenant_id = ${visitorSandboxId}`;
      const [cleanTx] = await ownerClient`SELECT count(*)::int as count FROM demo.pos_transactions WHERE tenant_id = ${visitorSandboxId}`;
      const [cleanShifts] = await ownerClient`SELECT count(*)::int as count FROM demo.pos_shifts WHERE tenant_id = ${visitorSandboxId}`;
      const [cleanStaff] = await ownerClient`SELECT count(*)::int as count FROM demo.pos_staff WHERE tenant_id = ${visitorSandboxId}`;
      const [cleanAdmins] = await ownerClient`SELECT count(*)::int as count FROM demo.admin_users WHERE tenant_id = ${visitorSandboxId}`;
      const [cleanStudios] = await ownerClient`SELECT count(*)::int as count FROM demo.production_studios WHERE slug = ${visitorSandboxId}`;
      const [cleanBoxes] = await ownerClient`SELECT count(*)::int as count FROM demo.demo_sandboxes WHERE sandbox_id = ${visitorSandboxId}`;

      assert.strictEqual(cleanBk.count, 0, 'Sandbox customer_bookings must be completely deleted');
      assert.strictEqual(cleanEvents.count, 0, 'Sandbox booking_events must be completely deleted');
      assert.strictEqual(cleanTx.count, 0, 'Sandbox pos_transactions must be completely deleted');
      assert.strictEqual(cleanShifts.count, 0, 'Sandbox pos_shifts must be completely deleted');
      assert.strictEqual(cleanStaff.count, 0, 'Sandbox pos_staff must be completely deleted');
      assert.strictEqual(cleanAdmins.count, 0, 'Sandbox admin_users must be completely deleted');
      assert.strictEqual(cleanStudios.count, 0, 'Sandbox production_studios must be completely deleted');
      assert.strictEqual(cleanBoxes.count, 0, 'Sandbox record in demo_sandboxes must be completely deleted');
      console.log('  ✅ Sandbox rows (including booking_events & demo_sandboxes) successfully deleted.');

      // Verify that lead row in demo.demo_leads PERMANENTLY REMAINS
      const [leadRow] = await ownerClient`SELECT count(*)::int as count FROM demo.demo_leads WHERE id = ${visitorLeadId}`;
      assert.strictEqual(leadRow.count, 1, 'Lead row in demo.demo_leads MUST permanently persist');
      console.log('  ✅ Lead row in demo.demo_leads permanently preserved.');

      console.log('  ✅ Gate 4 Passed: Restart Gate verified.\n');
    } finally {
      restartedServer.close();
    }

    console.log('🎉 ALL DATABASE DEMO ISOLATION TESTS (GATES 3 & 4) PASSED SUCCESSFULLY!\n');
    await closeDb();
    await demoClient.end();
    await ownerClient.end();
    process.exit(0);
  } catch (err) {
    console.error('Database demo isolation test suite failed:', err);
    await closeDb();
    await demoClient.end();
    await ownerClient.end();
    process.exit(1);
  }
}

runDemoIsolationDbTests();
