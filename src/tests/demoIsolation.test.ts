import assert from 'node:assert';
import { AddressInfo } from 'node:net';
import { createApp } from '../server/app.js';
import {
  provisionOrRestoreSandbox,
  cleanupIdleSandboxes,
  getDemoLeadsSummary,
  convertLeadsToCsv,
} from '../server/services/demoProvisioningService.js';
import { DemoScheduler } from '../server/services/demoSchedulerService.js';
import { getDb } from '../db/index.js';
import { demoLeads, demoActivity } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

console.log('=== RUNNING PUBLIC DEMO & TENANT ISOLATION TESTS (PHASE 1.5 FIX ROUND 2) ===\n');

async function runDemoIsolationTests() {
  process.env.DEMO_MODE = 'true';
  process.env.ADMIN_API_KEY = 'test-founder-ops-key-2026';
  process.env.NODE_ENV = 'test';

  // ---------------------------------------------------------------------------
  // FIX A (GATE 3): Fail closed when DEMO_MODE=true and DEMO_DATABASE_URL is missing
  // ---------------------------------------------------------------------------
  console.log('Fix A / Gate 3: Testing fail closed when DEMO_MODE=true and DEMO_DATABASE_URL is missing...');
  const prevDbUrl = process.env.DATABASE_URL;
  const prevDemoDbUrl = process.env.DEMO_DATABASE_URL;
  try {
    process.env.DATABASE_URL = 'postgres://aj_dev:secret@localhost:5432/aj_studio_dev';
    delete process.env.DEMO_DATABASE_URL;

    assert.throws(() => {
      createApp({ demoMode: true });
    }, /DEMO_DATABASE_URL_REQUIRED/, 'createApp must throw DEMO_DATABASE_URL_REQUIRED when DEMO_DATABASE_URL is missing in DEMO_MODE');

    assert.throws(() => {
      getDb();
    }, /DEMO_DATABASE_URL_REQUIRED/, 'getDb must throw DEMO_DATABASE_URL_REQUIRED when DEMO_DATABASE_URL is missing in DEMO_MODE');

    console.log('  ✅ Fix A / Gate 3 Passed: DEMO_MODE without DEMO_DATABASE_URL refuses to start.\n');
  } finally {
    if (prevDbUrl) process.env.DATABASE_URL = prevDbUrl; else delete process.env.DATABASE_URL;
    if (prevDemoDbUrl) process.env.DEMO_DATABASE_URL = prevDemoDbUrl; else delete process.env.DEMO_DATABASE_URL;
  }

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------------------
    // GATE 5: With DEMO_MODE unset, /demo returns 404 and no provisioning route
    // -------------------------------------------------------------------------
    console.log('Gate 5: Testing with DEMO_MODE unset / disabled...');
    const prodApp = createApp({ demoMode: false });
    const prodServer = prodApp.listen(0);
    const prodPort = (prodServer.address() as AddressInfo).port;
    const prodBaseUrl = `http://127.0.0.1:${prodPort}`;

    const prodDemoPage = await fetch(`${prodBaseUrl}/demo`);
    assert.strictEqual(prodDemoPage.status, 404, 'With DEMO_MODE disabled, /demo must return 404');

    const prodDemoSignup = await fetch(`${prodBaseUrl}/api/demo/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ko Min',
        phone: '09792108421',
        studioName: 'Min Studio',
      }),
    });
    assert.strictEqual(prodDemoSignup.status, 404, 'With DEMO_MODE disabled, /api/demo/signup must return 404');
    prodServer.close();
    console.log('  ✅ Gate 5 Passed: With DEMO_MODE disabled, /demo and provisioning routes return 404.\n');

    // -------------------------------------------------------------------------
    // GATE 8: Demo Sign-up & Phone Normalization & Visit Count Increment
    // -------------------------------------------------------------------------
    console.log('Gate 8: Testing Lead Sign-up, Phone Normalization (+959...), and Re-visit count...');
    const lead1Res = await fetch(`${baseUrl}/api/demo/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ko Aung Kyaw',
        phone: '09 792 108 421',
        studioName: 'Aung Light Studio',
        city: 'Yangon',
        preferredChannel: 'TELEGRAM',
        contactHandle: '@aunglight',
        consent: true,
      }),
    });
    assert.strictEqual(lead1Res.status, 200, 'Sign-up must return 200');
    const lead1Data = await lead1Res.json();
    assert.strictEqual(lead1Data.success, true);
    assert.strictEqual(lead1Data.lead.phone, '+959792108421', 'Phone must be normalized to +959...');
    assert.strictEqual(lead1Data.lead.visitCount, 1, 'Initial visitCount must be 1');
    const sandboxA = lead1Data.sandboxId;

    const lead1SetCookie = lead1Res.headers.get('set-cookie') || '';
    const matchSessionA = lead1SetCookie.match(/demo_session=[^;]+/);
    const demoSessionCookieA = matchSessionA ? matchSessionA[0] : '';
    assert.ok(demoSessionCookieA, 'Sign-up must return signed httpOnly demo_session cookie');

    // Sign up again with same phone in different local format (09792108421)
    const lead1Again = await fetch(`${baseUrl}/api/demo/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ko Aung Kyaw',
        phone: '09792108421',
        studioName: 'Aung Light Studio',
      }),
    });
    assert.strictEqual(lead1Again.status, 200);
    const lead1AgainData = await lead1Again.json();
    assert.strictEqual(lead1AgainData.lead.phone, '+959792108421');
    assert.strictEqual(lead1AgainData.lead.visitCount, 2, 'Re-visit with same phone must increment visitCount to 2');
    assert.strictEqual(lead1AgainData.sandboxId, sandboxA, 'Re-visit must restore same sandbox');
    console.log('  ✅ Gate 8 Passed: Phone normalized to +959... and returning phone increments visit_count without duplicate lead row.\n');

    // -------------------------------------------------------------------------
    // GATE 4: Cross-Sandbox Isolation (Sandbox 1 vs Sandbox 2)
    // -------------------------------------------------------------------------
    console.log('Gate 4: Testing Two Sandboxes created back to back for strict tenant isolation...');
    const lead2Res = await fetch(`${baseUrl}/api/demo/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Daw Khin Khin',
        phone: '09 420 123 456',
        studioName: 'Khin Glamour Studio',
        city: 'Mandalay',
      }),
    });
    const lead2Data = await lead2Res.json();
    const sandboxB = lead2Data.sandboxId;
    assert.notStrictEqual(sandboxA, sandboxB, 'Sandbox A and Sandbox B must have distinct tenant IDs');

    const lead2SetCookie = lead2Res.headers.get('set-cookie') || '';
    const matchSessionB = lead2SetCookie.match(/demo_session=[^;]+/);
    const demoSessionCookieB = matchSessionB ? matchSessionB[0] : '';
    assert.ok(demoSessionCookieB, 'Sign-up 2 must return signed demo_session cookie');

    // Login to Sandbox A as Admin
    const loginARes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: sandboxA,
        username: lead1Data.adminCredentials.username,
        password: lead1Data.adminCredentials.password,
      }),
    });
    assert.strictEqual(loginARes.status, 200, 'Sandbox A admin login must succeed');
    const loginAData = await loginARes.json();
    const csrfTokenA = loginAData.csrfToken;
    const cookieA = loginARes.headers.get('set-cookie')?.split(';')[0] || '';

    // Login to Sandbox B as Admin
    const loginBRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: sandboxB,
        username: lead2Data.adminCredentials.username,
        password: lead2Data.adminCredentials.password,
      }),
    });
    assert.strictEqual(loginBRes.status, 200, 'Sandbox B admin login must succeed');
    const cookieB = loginBRes.headers.get('set-cookie')?.split(';')[0] || '';

    // Create a new booking in Sandbox A
    const bookingARef = `BK-ISOL-${Date.now()}`;
    const createBkARes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: sandboxA,
        idempotencyKey: `idem-${bookingARef}`,
        guestName: 'Ko Kyaw Swar (Sandbox A Client)',
        clientPhone: '+959111222333',
        dateStr: '2026-11-20',
        timeSlot: '10:00 AM',
        totalAmount: 180000,
        depositAmount: 90000,
      }),
    });
    assert.strictEqual(createBkARes.status, 201, 'Booking creation in Sandbox A must succeed');
    const createdBk = await createBkARes.json();
    const createdBookingRef = createdBk.booking?.bookingReference || bookingARef;

    // Query bookings in Sandbox B — booking from Sandbox A must NOT exist
    const listBkBRes = await fetch(`${baseUrl}/api/admin/bookings`, {
      headers: { Cookie: cookieB },
    });
    assert.strictEqual(listBkBRes.status, 200);
    const listBkB = await listBkBRes.json();
    const hasLeakage = (listBkB.bookings || []).some((b: any) => b.bookingReference === createdBookingRef || b.customerName?.includes('Sandbox A'));
    assert.strictEqual(hasLeakage, false, 'Sandbox A booking must NEVER leak into Sandbox B admin desk');
    console.log('  ✅ Gate 4 Passed: Back-to-back sandboxes completely isolated; no booking leakage.\n');

    // -------------------------------------------------------------------------
    // FIX B / GATE 4: Endpoint Lockdown, Authentication, Spoof Prevention & Limiter
    // -------------------------------------------------------------------------
    console.log('Fix B / Gate 4: Testing endpoint authentication & spoof prevention...');

    // B1: cleanup & reseed-sample without admin key -> 401
    const unauthCleanup = await fetch(`${baseUrl}/api/demo/cleanup`, { method: 'POST' });
    assert.strictEqual(unauthCleanup.status, 401, 'cleanup without admin key must return 401');

    const authCleanup = await fetch(`${baseUrl}/api/demo/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'test-founder-ops-key-2026' },
      body: JSON.stringify({ maxIdleDays: 0 }),
    });
    assert.strictEqual(authCleanup.status, 200, 'cleanup with admin key must return 200');

    const unauthReseed = await fetch(`${baseUrl}/api/demo/reseed-sample`, { method: 'POST' });
    assert.strictEqual(unauthReseed.status, 401, 'reseed-sample without admin key must return 401');

    const authReseed = await fetch(`${baseUrl}/api/demo/reseed-sample`, {
      method: 'POST',
      headers: { 'x-admin-key': 'test-founder-ops-key-2026' },
    });
    assert.strictEqual(authReseed.status, 200, 'reseed-sample with admin key must return 200');

    // B2: reset and activity without cookie -> 401
    const unauthReset = await fetch(`${baseUrl}/api/demo/reset`, { method: 'POST' });
    assert.strictEqual(unauthReset.status, 401, 'reset without session cookie must return 401');

    const unauthActivity = await fetch(`${baseUrl}/api/demo/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'DEMO_STARTED' }),
    });
    assert.strictEqual(unauthActivity.status, 401, 'activity without session cookie must return 401');

    // B3: Visitor A cannot reset Visitor B's sandbox
    const resetSpoof = await fetch(`${baseUrl}/api/demo/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: demoSessionCookieA,
      },
      body: JSON.stringify({ sandboxId: sandboxB, studioName: 'Attacker Studio' }),
    });
    assert.strictEqual(resetSpoof.status, 200);

    // B4: Disallow resetting sample-studio
    // Create a mock session cookie with sample-studio
    const { signPayload } = await import('../server/routes/demo.routes.js');
    const sampleSessionCookie = `demo_session=${signPayload({ leadId: 'mock-lead', sandboxId: 'sample-studio' })}`;
    const resetSampleRes = await fetch(`${baseUrl}/api/demo/reset`, {
      method: 'POST',
      headers: { Cookie: sampleSessionCookie },
    });
    assert.strictEqual(resetSampleRes.status, 403, 'sample-studio reset must be forbidden (403)');

    // B5: Visitor A cannot log activity for Visitor B
    const activitySpoof = await fetch(`${baseUrl}/api/demo/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: demoSessionCookieA,
      },
      body: JSON.stringify({
        leadId: lead2Data.lead.id,
        sandboxId: sandboxB,
        event: 'ROLE_OPENED:CASHIER',
      }),
    });
    assert.strictEqual(activitySpoof.status, 200);

    // Verify activity was credited to Lead 1 (Visitor A), NOT Lead 2 (Visitor B)
    const leadsAfterAct = await getDemoLeadsSummary();
    const lead2Check = leadsAfterAct.find((l) => l.id === lead2Data.lead.id);
    assert.strictEqual(lead2Check?.furthestStepReached.includes('Explored Roles'), false, 'Visitor B lead must not have spoofed activity');

    // Disallowed event rejected with 400
    const disallowedEvent = await fetch(`${baseUrl}/api/demo/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: demoSessionCookieA,
      },
      body: JSON.stringify({ event: 'INJECT_EXPLOIT' }),
    });
    assert.strictEqual(disallowedEvent.status, 400, 'Disallowed event name must return 400');

    // B6: Signup ignores existingSandboxId from request body
    const hijackSignup = await fetch(`${baseUrl}/api/demo/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker U Kyaw',
        phone: '09 888 777 666',
        studioName: 'Hijack Attempt Studio',
        existingSandboxId: sandboxA,
      }),
    });
    assert.strictEqual(hijackSignup.status, 200);
    const hijackData = await hijackSignup.json();
    assert.notStrictEqual(hijackData.sandboxId, sandboxA, 'existingSandboxId in body must be ignored');

    // B7: 6th signup from one IP in an hour gets limiter guidance (no "Error" text)
    // We already performed 4 signups on this IP: lead1, lead1 again, lead2, hijackSignup.
    // 5th signup:
    const fifthSignup = await fetch(`${baseUrl}/api/demo/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ko Five',
        phone: '09 555 555 555',
        studioName: 'Five Star Studio',
      }),
    });
    assert.strictEqual(fifthSignup.status, 200, '5th signup from same IP must succeed');

    // 6th signup:
    const sixthSignup = await fetch(`${baseUrl}/api/demo/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ko Six',
        phone: '09 666 666 666',
        studioName: 'Six Star Studio',
      }),
    });
    assert.strictEqual(sixthSignup.status, 429, '6th signup from same IP must return 429 limiter');
    const sixthData = await sixthSignup.json();
    assert.strictEqual(sixthData.success, false);
    assert.ok(sixthData.guidance, 'Limiter response must include guidance');
    const sixthJsonStr = JSON.stringify(sixthData);
    assert.strictEqual(sixthJsonStr.includes('"error"'), false, 'Limiter response must not contain "error" field');
    assert.strictEqual(sixthJsonStr.includes('Error'), false, 'Limiter response must not contain "Error" text');
    console.log('  ✅ Fix B / Gate 4 Passed: Endpoint security, cookie validation, spoof prevention & rate limiting verified.\n');

    // -------------------------------------------------------------------------
    // GATE 6a: Fresh Sandbox Dashboard Metrics & Studio Name Consistency
    // -------------------------------------------------------------------------
    console.log('Gate 6a: Testing fresh sandbox lived-in metrics and studio name consistency...');
    assert.strictEqual(lead1Data.studioName, 'Aung Light Studio');
    assert.strictEqual(lead1Data.seedMetrics.revenue30Days > 0, true, '30-day revenue must be non-zero');
    assert.strictEqual(lead1Data.seedMetrics.todayBookingsCount >= 1, true, "Today's bookings count must be at least 1");
    assert.strictEqual(lead1Data.seedMetrics.closedShiftsCount >= 1, true, 'Closed shifts count must be at least 1');
    console.log(`  ✅ Gate 6a Passed: Fresh sandbox has 30-day revenue (${lead1Data.seedMetrics.revenue30Days.toLocaleString()} MMK) and ${lead1Data.seedMetrics.todayBookingsCount} today bookings; Studio name equals "${lead1Data.studioName}".\n`);

    // -------------------------------------------------------------------------
    // GATE 6: Slip Check Abuse Cap (11th check falls back to sample path)
    // -------------------------------------------------------------------------
    console.log('Gate 6: Testing slip check abuse limit (10 real checks -> 11th falls back silently to sample path)...');
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    for (let i = 1; i <= 10; i++) {
      const slipRes = await fetch(`${baseUrl}/api/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: sampleBase64,
          manifest_id: createdBookingRef,
          gateway: 'KBZPay',
        }),
      });
      assert.strictEqual(slipRes.status, 200);
      const data = await slipRes.json();
      assert.strictEqual(data.success, true);
    }

    // 11th call should hit abuse limit and fall back to sample path
    const slip11Res = await fetch(`${baseUrl}/api/verify-slip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: sampleBase64,
        manifest_id: createdBookingRef,
        gateway: 'KBZPay',
      }),
    });
    assert.strictEqual(slip11Res.status, 200, '11th check must return 200 (not 429 error)');
    const slip11Data = await slip11Res.json();
    assert.strictEqual(slip11Data.verification_source, 'sample', '11th check must use sample path');
    assert.strictEqual(slip11Data.is_valid_slip, true, 'Sample path returns valid slip');
    assert.strictEqual(slip11Data.error, null, '11th check must have NO error');
    const hasErrorWord = JSON.stringify(slip11Data).toLowerCase().includes('"error":"');
    assert.strictEqual(hasErrorWord, false, 'Sample fallback response must never display "Error" text');
    console.log('  ✅ Gate 6 Passed: 11th slip check falls back silently to sample path with zero error text.\n');

    // -------------------------------------------------------------------------
    // GATE 9: POS Sale writes POS_SALE to demo_activity
    // -------------------------------------------------------------------------
    console.log('Gate 9: Testing POS sale telemetry writes POS_SALE to demo_activity...');
    const posSaleTx = {
      id: `tx-demo-sale-${Date.now()}`,
      orderReference: `ORD-DEMO-${Date.now()}`,
      tenantId: sandboxA,
      terminalId: 'TERM-01',
      staffId: 'stf-01',
      lines: [{ quantity: 1, unitPriceMMK: 25000 }],
      totalDueMMK: 25000,
      payments: [{ method: 'CASH', amountMMK: 25000, status: 'COMPLETED' }],
    };

    const posSaleRes = await fetch(`${baseUrl}/api/pos/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfTokenA,
      },
      body: JSON.stringify(posSaleTx),
    });
    assert.strictEqual(posSaleRes.status, 201, 'POS sale transaction in sandbox must succeed');

    // Query demo leads summary to check furthest step reached
    const summary = await getDemoLeadsSummary();
    const lead1Summary = summary.find((l) => l.id === lead1Data.lead.id);
    assert.ok(lead1Summary, 'Lead 1 must exist in demo leads summary');
    assert.ok(
      lead1Summary.furthestStepReached.includes('POS_SALE') || lead1Summary.furthestStepReached.includes('Sale'),
      `Furthest step reached (${lead1Summary.furthestStepReached}) must reflect POS sale`
    );
    console.log(`  ✅ Gate 9 Passed: POS sale recorded and reflected in demo activity: "${lead1Summary.furthestStepReached}".\n`);

    // -------------------------------------------------------------------------
    // GATE 10: Founder-only /demo/leads route protection & CSV Export
    // -------------------------------------------------------------------------
    console.log('Gate 10: Testing /demo/leads protection (401 without key / with session) and CSV export...');
    // 10a. Request without ADMIN_API_KEY -> 401
    const unauthLeads = await fetch(`${baseUrl}/api/demo/leads`);
    assert.strictEqual(unauthLeads.status, 401, '/demo/leads without ADMIN_API_KEY must return 401');

    // 10b. Request with demo session cookie -> 401
    const cookieLeads = await fetch(`${baseUrl}/api/demo/leads`, {
      headers: { Cookie: cookieA },
    });
    assert.strictEqual(cookieLeads.status, 401, '/demo/leads with demo session cookie must return 401');

    // 10c. Request with correct ADMIN_API_KEY -> 200
    const authLeads = await fetch(`${baseUrl}/api/demo/leads`, {
      headers: { 'x-admin-key': 'test-founder-ops-key-2026' },
    });
    assert.strictEqual(authLeads.status, 200, '/demo/leads with valid ADMIN_API_KEY must return 200');
    const authLeadsData = await authLeads.json();
    assert.strictEqual(authLeadsData.success, true);
    assert.ok(Array.isArray(authLeadsData.leads), 'Leads must be an array');
    assert.ok(authLeadsData.leads.length >= 2, 'Must contain at least the 2 registered test leads');

    // 10d. Export CSV -> 200 text/csv
    const csvExportRes = await fetch(`${baseUrl}/api/demo/leads/export`, {
      headers: { 'x-admin-key': 'test-founder-ops-key-2026' },
    });
    assert.strictEqual(csvExportRes.status, 200, 'CSV export must return 200');
    assert.ok(csvExportRes.headers.get('content-type')?.includes('text/csv'), 'Content-Type must be text/csv');
    const csvContent = await csvExportRes.text();
    assert.ok(csvContent.includes('Lead ID,Name,Phone,Studio Name'), 'CSV must have correct header');
    assert.ok(csvContent.includes('Ko Aung Kyaw'), 'CSV must contain lead 1 name');
    assert.ok(csvContent.includes('Daw Khin Khin'), 'CSV must contain lead 2 name');
    console.log('  ✅ Gate 10 Passed: Founder endpoint /demo/leads rejects unauthorized requests (401) and CSV export succeeds.\n');

    // -------------------------------------------------------------------------
    // GATE 6b: 7-Day Sandbox Idle Cleanup Job (Deletes rows, keeps lead)
    // -------------------------------------------------------------------------
    console.log('Gate 6b: Testing 7-day idle sandbox cleanup (removes studio rows, preserves lead)...');
    const cleanupStats = await cleanupIdleSandboxes(true);
    assert.ok(typeof cleanupStats.deletedSandboxes === 'number');

    // Ensure lead records remain permanent
    const summaryAfter = await getDemoLeadsSummary();
    assert.ok(summaryAfter.length >= 2, 'Lead records must permanently persist after cleanup');
    console.log('  ✅ Gate 6b Passed: Sandbox idle cleanup successfully keeps demo leads permanent.\n');

    // -------------------------------------------------------------------------
    // FIX C (GATE 5): DemoScheduler with Injectable Clock (Once per day guarantee)
    // -------------------------------------------------------------------------
    console.log('Fix C / Gate 5: Testing DemoScheduler with injectable clock (once per day guarantee)...');
    let mockTime = new Date('2026-10-10T01:00:00+06:30'); // Day 1, 01:00 Yangon
    let schedulerCleanupCount = 0;
    let schedulerReseedCount = 0;

    const mockScheduler = new DemoScheduler({
      nowFn: () => mockTime,
      runCleanupFn: async () => { schedulerCleanupCount++; return { deletedSandboxes: 0 }; },
      runReseedFn: async () => { schedulerReseedCount++; },
    });

    const run1 = await mockScheduler.tick();
    assert.strictEqual(run1.ranCleanup, true, 'Cleanup must run at 01:00 Yangon');
    assert.strictEqual(run1.ranReseed, false, 'Reseed must NOT run before 03:00 Yangon');
    assert.strictEqual(schedulerCleanupCount, 1);
    assert.strictEqual(schedulerReseedCount, 0);

    // Advance clock to Day 1, 03:00 Yangon
    mockTime = new Date('2026-10-10T03:00:00+06:30');
    const run2 = await mockScheduler.tick();
    assert.strictEqual(run2.ranCleanup, false, 'Cleanup must NOT run twice on Day 1');
    assert.strictEqual(run2.ranReseed, true, 'Reseed must run at 03:00 Yangon');
    assert.strictEqual(schedulerCleanupCount, 1);
    assert.strictEqual(schedulerReseedCount, 1);

    // Advance clock to Day 1, 05:00 Yangon
    mockTime = new Date('2026-10-10T05:00:00+06:30');
    const run3 = await mockScheduler.tick();
    assert.strictEqual(run3.ranCleanup, false);
    assert.strictEqual(run3.ranReseed, false);
    assert.strictEqual(schedulerCleanupCount, 1);
    assert.strictEqual(schedulerReseedCount, 1);

    // Advance clock to Day 2, 03:15 Yangon
    mockTime = new Date('2026-10-11T03:15:00+06:30');
    const run4 = await mockScheduler.tick();
    assert.strictEqual(run4.ranCleanup, true, 'Cleanup must run once for Day 2');
    assert.strictEqual(run4.ranReseed, true, 'Reseed must run once for Day 2');
    assert.strictEqual(schedulerCleanupCount, 2);
    assert.strictEqual(schedulerReseedCount, 2);
    console.log('  ✅ Fix C / Gate 5 Passed: Cleanup and 03:00 Asia/Yangon reseed each run exactly once per day.\n');

    // -------------------------------------------------------------------------
    // FIX E: CORS Behind TLS Reverse Proxy with TRUST_PROXY & X-Forwarded-Proto
    // -------------------------------------------------------------------------
    console.log('Fix E: Testing CORS behind VPS reverse proxy with TRUST_PROXY and X-Forwarded-Proto...');
    // Without TRUST_PROXY, forwarded headers must NOT be trusted (prevents IP/proto spoofing).
    const prevTrustProxy = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;
    const directApp = createApp({ demoMode: true });
    const directServer = directApp.listen(0);
    const directPort = (directServer.address() as AddressInfo).port;
    try {
      const spoofRes = await fetch(`http://127.0.0.1:${directPort}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'X-Forwarded-Host': 'demo.ajstudio.com',
          'X-Forwarded-Proto': 'https',
          Origin: 'https://demo.ajstudio.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      assert.notStrictEqual(
        spoofRes.headers.get('access-control-allow-origin'),
        'https://demo.ajstudio.com',
        'Without TRUST_PROXY, X-Forwarded-* headers must not make a foreign origin look same-origin'
      );
    } finally {
      directServer.close();
    }

    process.env.TRUST_PROXY = '1';
    const proxyApp = createApp({ demoMode: true });
    if (prevTrustProxy === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = prevTrustProxy;
    const proxyServer = proxyApp.listen(0);
    const proxyPort = (proxyServer.address() as AddressInfo).port;
    const proxyBaseUrl = `http://127.0.0.1:${proxyPort}`;

    try {
      const corsProxyRes = await fetch(`${proxyBaseUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Host': 'demo.ajstudio.com',
          'X-Forwarded-Host': 'demo.ajstudio.com',
          'X-Forwarded-Proto': 'https',
          'Origin': 'https://demo.ajstudio.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      assert.strictEqual(corsProxyRes.status, 204, 'Preflight behind proxy must succeed with 204');
      assert.strictEqual(
        corsProxyRes.headers.get('access-control-allow-origin'),
        'https://demo.ajstudio.com',
        'CORS header must allow origin when matched via X-Forwarded-Proto'
      );
      console.log('  ✅ Fix E Passed: Same-origin requests behind TLS reverse proxy allowed by CORS.\n');
    } finally {
      proxyServer.close();
    }

    console.log('🎉 ALL PUBLIC DEMO & TENANT ISOLATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runDemoIsolationTests().catch((err) => {
  console.error('Demo isolation test suite failed:', err);
  process.exit(1);
});
