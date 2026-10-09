import assert from 'node:assert';
import { AddressInfo } from 'node:net';
import postgres from 'postgres';
import { createApp } from '../server/app.js';
import { getDb, closeDb } from '../db/index.js';
import {
  productionStudios,
  adminUsers,
  adminSessions,
  customerBookings,
  bookingEvents,
  verifiedSlips,
} from '../db/schema/index.js';
import { hashWithScrypt } from '../server/utils/crypto.js';

console.log('=== RUNNING DB-BACKED BOOKINGS ACCEPTANCE GATES (GATES 2, 3, 4, 5, 6) ===\n');

async function runDbBookingsTests() {
  process.env.NODE_ENV = 'production';

  const ownerDbUrl = process.env.DATABASE_URL || 'postgres://aj_dev:aj_dev_password@localhost:5432/aj_studio_dev';
  process.env.DATABASE_URL = ownerDbUrl;

  const urlObj = new URL(ownerDbUrl);
  const demoAppPassword = process.env.DEMO_DB_PASSWORD || 'demo_app_dev_password';
  const demoAppUrl =
    process.env.DEMO_DATABASE_URL ||
    `postgres://demo_app:${demoAppPassword}@${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`;
  process.env.DEMO_DATABASE_URL = demoAppUrl;

  const sqlClient = postgres(ownerDbUrl, { max: 5 });
  const demoClient = postgres(demoAppUrl, { max: 5 });

  const TENANT_A = 'tenant-gate-alpha';
  const ADMIN_A_USER = 'alpha_admin';
  const ADMIN_A_PASS = 'AlphaAdmin2026!';

  const TENANT_B = 'tenant-gate-beta';
  const ADMIN_B_USER = 'beta_admin';
  const ADMIN_B_PASS = 'BetaAdmin2026!';

  try {
    // -------------------------------------------------------------------------
    // CLEANUP & SEED TEST TENANTS
    // -------------------------------------------------------------------------
    console.log('Setting up test tenants in PostgreSQL (tenant-gate-alpha, tenant-gate-beta)...');

    for (const t of [TENANT_A, TENANT_B]) {
      await sqlClient`DELETE FROM booking_events WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM customer_bookings WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM admin_sessions WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM verified_slips WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM admin_users WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM production_studios WHERE slug = ${t}`;
    }

    const db = getDb();
    if (!db) {
      throw new Error('Database connection failed to initialize with getDb()');
    }

    const hashA = await hashWithScrypt(ADMIN_A_PASS);
    const hashB = await hashWithScrypt(ADMIN_B_PASS);

    await db.insert(productionStudios).values([
      { slug: TENANT_A, displayName: 'Studio Alpha Gate', status: 'APPROVED' },
      { slug: TENANT_B, displayName: 'Studio Beta Gate', status: 'APPROVED' },
    ]);

    await db.insert(adminUsers).values([
      { tenantId: TENANT_A, username: ADMIN_A_USER, passwordHash: hashA, role: 'STUDIO_ADMIN', isActive: true },
      { tenantId: TENANT_B, username: ADMIN_B_USER, passwordHash: hashB, role: 'STUDIO_ADMIN', isActive: true },
    ]);

    console.log('  ✅ Test tenants initialized in PostgreSQL.');

    // -------------------------------------------------------------------------
    // GATE 2: RESTART GATE (PostgreSQL Persistence Across Server Lifecycle)
    // -------------------------------------------------------------------------
    console.log('\nGate 2: Testing Restart Gate (Create booking, review payment, update status, add note -> restart app -> verify data intact)...');

    let createdBookingId = '';
    let createdBookingRef = '';

    // Step 2a: Run App Instance 1
    const app1 = createApp();
    const server1 = app1.listen(0);
    const port1 = (server1.address() as AddressInfo).port;
    const url1 = `http://127.0.0.1:${port1}`;

    try {
      // Create booking via HTTP
      const bookingPayload = {
        tenantId: TENANT_A,
        idempotencyKey: `idemp-gate2-${Date.now()}`,
        guestName: 'Ma Hnin Hnin',
        clientPhone: '+95 9 123 456 789',
        customerEmail: 'hnin@example.com',
        telegramHandle: '@hnin_photo',
        dateStr: '2026-11-28',
        timeSlot: '01:00 PM',
        bayAllocation: 'BAY ALPHA-01',
        totalAmount: 350000,
        depositAmount: 150000,
        uploadedSlipName: 'deposit_slip_01.jpg',
        uploadedSlipSize: '2.4 MB',
        briefingNotes: 'Editorial portrait session with wardrobe changes.',
      };

      const createRes = await fetch(`${url1}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });
      assert.strictEqual(createRes.status, 201, 'Public customer booking creation must return 201');
      const createData = await createRes.json();
      assert.strictEqual(createData.success, true);
      assert.ok(createData.booking?.id, 'Booking record must contain id');
      createdBookingId = createData.booking.id;
      createdBookingRef = createData.booking.bookingReference;
      assert.strictEqual(createData.booking.bookingStatus, 'AWAITING_PAYMENT_REVIEW');
      assert.strictEqual(createData.booking.paymentStatus, 'EVIDENCE_RECEIVED');
      console.log(`  ✅ Booking created on Server 1: ${createdBookingRef} (ID: ${createdBookingId})`);

      // Log in as Studio Alpha Admin on Server 1
      const loginRes1 = await fetch(`${url1}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: TENANT_A,
          username: ADMIN_A_USER,
          password: ADMIN_A_PASS,
        }),
      });
      assert.strictEqual(loginRes1.status, 200, 'Admin login on Server 1 must succeed');
      const cookie1 = loginRes1.headers.get('set-cookie')?.split(';')[0] || '';
      const csrf1 = (await loginRes1.json()).csrfToken;

      // Review Payment Evidence via HTTP
      const reviewRes = await fetch(`${url1}/api/admin/bookings/${createdBookingId}/payment-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie1,
          'x-csrf-token': csrf1,
        },
        body: JSON.stringify({
          decision: 'VERIFY',
          amountPaidMMK: 150000,
          notes: 'KBZPay transaction confirmed with account department.',
        }),
      });
      assert.strictEqual(reviewRes.status, 200, 'Payment review must return 200');
      const reviewData = await reviewRes.json();
      assert.strictEqual(reviewData.booking.paymentStatus, 'VERIFIED');
      assert.strictEqual(reviewData.booking.bookingStatus, 'CONFIRMED');
      assert.strictEqual(reviewData.booking.verifiedPaidAmount, 150000);
      assert.strictEqual(reviewData.booking.outstandingBalance, 200000);
      console.log('  ✅ Payment reviewed and verified on Server 1 (CONFIRMED)');

      // Update Booking Status to IN_PROGRESS
      const statusRes = await fetch(`${url1}/api/admin/bookings/${createdBookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie1,
          'x-csrf-token': csrf1,
        },
        body: JSON.stringify({
          targetStatus: 'IN_PROGRESS',
          reason: 'Client checked in and shooting in progress.',
          expectedRevision: 2,
        }),
      });
      assert.strictEqual(statusRes.status, 200, 'Status update to IN_PROGRESS must return 200');
      const statusData = await statusRes.json();
      assert.strictEqual(statusData.booking.bookingStatus, 'IN_PROGRESS');
      assert.strictEqual(statusData.booking.revision, 3);
      console.log('  ✅ Status updated to IN_PROGRESS on Server 1 (Revision 3)');

      // Add Admin Private Note
      const noteRes = await fetch(`${url1}/api/admin/bookings/${createdBookingId}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie1,
          'x-csrf-token': csrf1,
        },
        body: JSON.stringify({
          notes: 'Client ordered 5 extra retouched high-res prints.',
        }),
      });
      assert.strictEqual(noteRes.status, 200, 'Admin note update must return 200');
      const noteData = await noteRes.json();
      assert.strictEqual(noteData.booking.privateAdminNotes, 'Client ordered 5 extra retouched high-res prints.');
      console.log('  ✅ Admin notes updated on Server 1 (Revision 4)');
    } finally {
      server1.close();
      await closeDb();
      console.log('  ✅ Server 1 shut down and database pool closed.');
    }

    // Step 2b: Restart App (New Process Instance & Fresh Connection Pool)
    console.log('  Booting Server 2 with fresh createApp() and database pool...');
    const app2 = createApp();
    const server2 = app2.listen(0);
    const port2 = (server2.address() as AddressInfo).port;
    const url2 = `http://127.0.0.1:${port2}`;

    try {
      // Re-authenticate on Server 2
      const loginRes2 = await fetch(`${url2}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: TENANT_A,
          username: ADMIN_A_USER,
          password: ADMIN_A_PASS,
        }),
      });
      assert.strictEqual(loginRes2.status, 200, 'Admin login on Server 2 must succeed');
      const cookie2 = loginRes2.headers.get('set-cookie')?.split(';')[0] || '';

      // Verify Query Bookings on Server 2 (Loaded from PostgreSQL)
      const listRes = await fetch(`${url2}/api/admin/bookings`, {
        headers: { Cookie: cookie2 },
      });
      assert.strictEqual(listRes.status, 200, 'Query admin bookings on Server 2 must return 200');
      const listData = await listRes.json();
      assert.strictEqual(listData.totalCount, 1, 'Server 2 must find exactly 1 booking in PostgreSQL');
      const foundItem = listData.items.find((b: any) => b.id === createdBookingId);
      assert.ok(foundItem, 'Booking must be returned in items list after restart');
      assert.strictEqual(foundItem.bookingStatus, 'IN_PROGRESS', 'Status must persist as IN_PROGRESS');
      assert.strictEqual(foundItem.paymentStatus, 'VERIFIED', 'Payment status must persist as VERIFIED');
      assert.strictEqual(foundItem.verifiedPaidAmount, 150000, 'Verified amount must persist as 150,000 MMK');
      assert.strictEqual(foundItem.revision, 4, 'Revision 4 must persist intact');
      console.log('  ✅ Server 2 admin booking query confirmed row from PostgreSQL.');

      // Verify Summary Counts on Server 2
      const summaryRes = await fetch(`${url2}/api/admin/bookings/summary`, {
        headers: { Cookie: cookie2 },
      });
      assert.strictEqual(summaryRes.status, 200);
      const summaryData = await summaryRes.json();
      assert.strictEqual(summaryData.summary.total, 1);
      assert.strictEqual(summaryData.summary.inProgress, 1);
      assert.strictEqual(summaryData.summary.verifiedRevenueMMK, 150000);
      console.log('  ✅ Server 2 booking summary confirmed aggregation from PostgreSQL.');

      // Verify Full Details & All Audit Events on Server 2
      const detailsRes = await fetch(`${url2}/api/admin/bookings/${createdBookingId}`, {
        headers: { Cookie: cookie2 },
      });
      assert.strictEqual(detailsRes.status, 200);
      const detailsData = await detailsRes.json();
      assert.strictEqual(detailsData.booking.id, createdBookingId);
      assert.strictEqual(detailsData.booking.privateAdminNotes, 'Client ordered 5 extra retouched high-res prints.');

      const events = detailsData.events;
      assert.strictEqual(events.length, 4, 'Must have exactly 4 audit events persisted in PostgreSQL');
      assert.strictEqual(events[0].eventType, 'SUBMITTED', 'Event 1 must be SUBMITTED');
      assert.strictEqual(events[1].eventType, 'PAYMENT_VERIFIED', 'Event 2 must be PAYMENT_VERIFIED');
      assert.strictEqual(events[2].eventType, 'IN_PROGRESS', 'Event 3 must be IN_PROGRESS');
      assert.strictEqual(events[3].eventType, 'NOTE_ADDED', 'Event 4 must be NOTE_ADDED');
      console.log('  ✅ Server 2 verified all 4 audit events persisted in PostgreSQL.');
      console.log('  ✅ Gate 2 (Restart Gate) Passed: 100% database persistence across server restarts.');
    } finally {
      server2.close();
      await closeDb();
    }

    // -------------------------------------------------------------------------
    // GATE 3: DEMO GATE (PostgreSQL as demo_app via DEMO_DATABASE_URL)
    // -------------------------------------------------------------------------
    console.log('\nGate 3: Testing Demo Gate (Fresh sandbox as demo_app shows seeded bookings on admin desk)...');
    process.env.DEMO_MODE = 'true';
    process.env.ADMIN_API_KEY = 'test-founder-ops-key-2026';

    const demoApp = createApp({ demoMode: true });
    const demoServer = demoApp.listen(0);
    const demoPort = (demoServer.address() as AddressInfo).port;
    const demoUrl = `http://127.0.0.1:${demoPort}`;

    try {
      // 3a. Visitor signs up for fresh sandbox
      const uniqueSuffix = `${Date.now()}`.slice(-6);
      const signupRes = await fetch(`${demoUrl}/api/demo/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ko Soe Win',
          phone: `09 888 ${uniqueSuffix.slice(0, 3)} ${uniqueSuffix.slice(3)}`,
          studioName: 'Soe Win Atelier Demo',
          city: 'Mandalay',
          preferredChannel: 'TELEGRAM',
        }),
      });
      assert.strictEqual(signupRes.status, 200, 'Demo signup must succeed');
      const signupData = await signupRes.json();
      assert.strictEqual(signupData.success, true);
      const sandboxId = signupData.sandboxId;
      const { username, password } = signupData.adminCredentials;
      console.log(`  ✅ Fresh demo sandbox provisioned: ${sandboxId}`);

      // Count actual seeded rows in demo.customer_bookings
      const [dbCountRow] = await demoClient`
        SELECT count(*)::int as count FROM demo.customer_bookings WHERE tenant_id = ${sandboxId}
      `;
      const expectedDbCount = dbCountRow.count;
      console.log(`  Direct DB verification: ${expectedDbCount} bookings seeded in demo.customer_bookings.`);
      assert.ok(expectedDbCount > 0, 'Seeder must have seeded > 0 bookings in demo.customer_bookings');

      // 3b. Admin logs into the demo sandbox
      const loginRes = await fetch(`${demoUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: sandboxId,
          username,
          password,
        }),
      });
      assert.strictEqual(loginRes.status, 200, 'Demo admin login must return 200');
      const demoCookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';

      // 3c. Query /api/admin/bookings on Admin Booking Desk
      const deskRes = await fetch(`${demoUrl}/api/admin/bookings?page=1&pageSize=20`, {
        headers: { Cookie: demoCookie },
      });
      assert.strictEqual(deskRes.status, 200, 'Admin booking desk query must return 200');
      const deskData = await deskRes.json();
      assert.strictEqual(deskData.success, true);
      assert.ok(deskData.items.length > 0, 'Page 1 must return > 0 items (production blocker fixed!)');
      assert.strictEqual(
        deskData.totalCount,
        expectedDbCount,
        `totalCount (${deskData.totalCount}) must equal DB row count (${expectedDbCount}) in demo.customer_bookings`
      );
      console.log(`  ✅ Admin Booking Desk shows ${deskData.items.length} items on page 1, totalCount = ${deskData.totalCount}`);

      // 3d. Summary counts match the database
      const demoSummaryRes = await fetch(`${demoUrl}/api/admin/bookings/summary`, {
        headers: { Cookie: demoCookie },
      });
      assert.strictEqual(demoSummaryRes.status, 200);
      const demoSummary = (await demoSummaryRes.json()).summary;
      assert.strictEqual(demoSummary.total, expectedDbCount, 'Summary total count must equal DB row count');
      assert.ok(demoSummary.verifiedRevenueMMK > 0, 'Summary verified revenue must be > 0 MMK');
      console.log(`  ✅ Admin Booking Summary matches DB: total = ${demoSummary.total}, revenue = ${demoSummary.verifiedRevenueMMK.toLocaleString()} MMK`);
      console.log('  ✅ Gate 3 (Demo Gate) Passed: Demo sandbox bookings populated on Admin Booking Desk.');
    } finally {
      demoServer.close();
      delete process.env.DEMO_MODE;
      await closeDb();
    }

    // -------------------------------------------------------------------------
    // GATE 4: CONCURRENCY GATE (10 Parallel Bookings for Exact Same Slot)
    // -------------------------------------------------------------------------
    console.log('\nGate 4: Testing Concurrency Gate (10 parallel bookings for exact same slot -> exactly 1 succeeds, 9 receive 409 conflict)...');

    const app4 = createApp();
    const server4 = app4.listen(0);
    const port4 = (server4.address() as AddressInfo).port;
    const url4 = `http://127.0.0.1:${port4}`;

    try {
      const targetDate = '2026-12-15';
      const targetSlot = '04:00 PM';
      const targetSpace = 'BAY ALPHA-01';

      // Prepare 10 concurrent booking requests
      const concurrentRequests = Array.from({ length: 10 }).map((_, i) => {
        return fetch(`${url4}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: TENANT_A,
            idempotencyKey: `idemp-concurrent-${Date.now()}-${i}`,
            guestName: `Concurrent Guest ${i + 1}`,
            clientPhone: `+9591112223${i}`,
            dateStr: targetDate,
            timeSlot: targetSlot,
            bayAllocation: targetSpace,
            totalAmount: 200000,
            depositAmount: 50000,
          }),
        });
      });

      const responses = await Promise.all(concurrentRequests);
      const statuses = responses.map((r) => r.status);
      const bodies = await Promise.all(responses.map((r) => r.json()));

      const successCount = statuses.filter((s) => s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      console.log(`  Concurrency results: 201 Created = ${successCount}, 409 Conflict = ${conflictCount}`);
      assert.strictEqual(successCount, 1, 'Exactly 1 concurrent request must succeed with 201 Created');
      assert.strictEqual(conflictCount, 9, 'Exactly 9 concurrent requests must be rejected with 409 Conflict');

      // Verify guidance wording on rejected responses
      const conflictBodies = bodies.filter((b, i) => statuses[i] === 409);
      for (const b of conflictBodies) {
        assert.strictEqual(b.code, 'SLOT_DOUBLE_BOOKED', 'Code must be SLOT_DOUBLE_BOOKED');
        assert.ok(
          b.error?.includes(`Space "${targetSpace}" is already booked for date ${targetDate} at ${targetSlot}.`),
          'Guidance text must describe the conflicting space, date, and slot'
        );
        // Ensure no raw unformatted Error stack or "Error:" prefix in message
        assert.ok(!b.error?.startsWith('Error:'), 'Guidance message must not start with "Error:"');
      }
      // Same day written in the customer-UI spelling ("15 DEC 2026") must collide with the ISO booking above.
      const altSpellingRes = await fetch(`${url4}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_A,
          idempotencyKey: `idemp-alt-spelling-${Date.now()}`,
          guestName: 'Alt Spelling Guest',
          clientPhone: '+959111222399',
          dateStr: '15 DEC 2026',
          timeSlot: targetSlot,
          bayAllocation: targetSpace,
          totalAmount: 200000,
          depositAmount: 50000,
        }),
      });
      assert.strictEqual(altSpellingRes.status, 409, '"15 DEC 2026" and "2026-12-15" are the same day and must conflict');
      console.log('  ✅ Mixed date spellings ("15 DEC 2026" vs "2026-12-15") are treated as the same slot.');
      console.log('  ✅ Concurrency protection verified: pg_advisory_xact_lock serialized transactions safely.');
      console.log('  ✅ Gate 4 (Concurrency Gate) Passed: Exactly 1 succeeded, 9 cleanly rejected with guidance message.');
    } finally {
      server4.close();
      await closeDb();
    }

    // -------------------------------------------------------------------------
    // GATE 5: TENANT ISOLATION GATE (Tenant A vs Tenant B Boundaries)
    // -------------------------------------------------------------------------
    console.log('\nGate 5: Testing Isolation Gate (Tenant A booking cannot be read or mutated by Tenant B -> 404 / rejected)...');

    const app5 = createApp();
    const server5 = app5.listen(0);
    const port5 = (server5.address() as AddressInfo).port;
    const url5 = `http://127.0.0.1:${port5}`;

    try {
      // 5a. Create a booking for Tenant A
      const bPayloadA = {
        tenantId: TENANT_A,
        idempotencyKey: `idemp-isol-a-${Date.now()}`,
        guestName: 'Ko Aung Ko',
        clientPhone: '+959444555666',
        dateStr: '2026-12-20',
        timeSlot: '10:00 AM',
        totalAmount: 280000,
        depositAmount: 80000,
      };
      const bResA = await fetch(`${url5}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bPayloadA),
      });
      assert.strictEqual(bResA.status, 201);
      const bookingA = (await bResA.json()).booking;
      console.log(`  Tenant A booking created: ${bookingA.id}`);

      // 5b. Authenticate as Tenant B Admin
      const loginResB = await fetch(`${url5}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: TENANT_B,
          username: ADMIN_B_USER,
          password: ADMIN_B_PASS,
        }),
      });
      assert.strictEqual(loginResB.status, 200, 'Tenant B admin login must succeed');
      const cookieB = loginResB.headers.get('set-cookie')?.split(';')[0] || '';
      const csrfB = (await loginResB.json()).csrfToken;

      // 5c. Tenant B attempts to read Tenant A's booking by ID -> MUST return 404
      const readRes = await fetch(`${url5}/api/admin/bookings/${bookingA.id}`, {
        headers: { Cookie: cookieB },
      });
      assert.strictEqual(readRes.status, 404, 'Cross-tenant GET /api/admin/bookings/:id must return 404');
      console.log('  ✅ Tenant B cannot read Tenant A booking (404 Not Found)');

      // 5d. Tenant B attempts to review payment on Tenant A's booking -> MUST fail
      const reviewCrossRes = await fetch(`${url5}/api/admin/bookings/${bookingA.id}/payment-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieB,
          'x-csrf-token': csrfB,
        },
        body: JSON.stringify({ decision: 'VERIFY', amountPaidMMK: 80000 }),
      });
      assert.strictEqual(reviewCrossRes.status, 404, 'Cross-tenant payment review must be rejected');
      console.log('  ✅ Tenant B cannot review payment on Tenant A booking (Rejected)');

      // 5e. Tenant B attempts to update status on Tenant A's booking -> MUST fail
      const statusCrossRes = await fetch(`${url5}/api/admin/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieB,
          'x-csrf-token': csrfB,
        },
        body: JSON.stringify({ targetStatus: 'CONFIRMED' }),
      });
      assert.strictEqual(statusCrossRes.status, 404, 'Cross-tenant status update must be rejected');
      console.log('  ✅ Tenant B cannot mutate status on Tenant A booking (Rejected)');

      // 5f. Tenant B attempts to add note to Tenant A's booking -> MUST fail
      const noteCrossRes = await fetch(`${url5}/api/admin/bookings/${bookingA.id}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieB,
          'x-csrf-token': csrfB,
        },
        body: JSON.stringify({ notes: 'Malicious note from Tenant B' }),
      });
      assert.strictEqual(noteCrossRes.status, 404, 'Cross-tenant note update must be rejected');
      console.log('  ✅ Tenant B cannot mutate notes on Tenant A booking (Rejected)');

      // 5g. Tenant B queries /api/admin/bookings -> Tenant A's booking is invisible
      const listResB = await fetch(`${url5}/api/admin/bookings`, {
        headers: { Cookie: cookieB },
      });
      assert.strictEqual(listResB.status, 200);
      const listDataB = await listResB.json();
      assert.strictEqual(listDataB.totalCount, 0, 'Tenant B admin list must show 0 bookings');
      console.log('  ✅ Tenant B admin query shows 0 bookings (Zero cross-tenant leakage)');
      console.log('  ✅ Gate 5 (Isolation Gate) Passed: Strict WHERE tenant_id = $session boundary verified.');
    } finally {
      server5.close();
      await closeDb();
    }

    // -------------------------------------------------------------------------
    // GATE 6: SLIP GATE (Payment Slip Finds DB Booking by Manifest/Ref After Restart)
    // -------------------------------------------------------------------------
    console.log('\nGate 6: Testing Slip Gate (Slip verification finds DB booking by manifest/reference after restart)...');

    let slipBookingRef = '';
    const depositMMK = 95000;

    // Step 6a: Create Booking in PostgreSQL
    const app6a = createApp();
    const server6a = app6a.listen(0);
    const port6a = (server6a.address() as AddressInfo).port;
    const url6a = `http://127.0.0.1:${port6a}`;

    try {
      const slipBookingPayload = {
        tenantId: TENANT_A,
        idempotencyKey: `idemp-slip-gate-${Date.now()}`,
        guestName: 'Ma Sandar',
        clientPhone: '+95 9 555 666 777',
        dateStr: '2026-11-30',
        timeSlot: '03:00 PM',
        totalAmount: 250000,
        depositAmount: depositMMK,
        bayAllocation: 'BAY BETA-02',
      };
      const res = await fetch(`${url6a}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slipBookingPayload),
      });
      assert.strictEqual(res.status, 201);
      slipBookingRef = (await res.json()).booking.bookingReference;
      console.log(`  Booking created for slip test: ${slipBookingRef}`);
    } finally {
      server6a.close();
      await closeDb();
      console.log('  Server closed & DB connection closed.');
    }

    // Step 6b: Restart Server and verify slip lookup finds DB booking
    const app6b = createApp();
    const server6b = app6b.listen(0);
    const port6b = (server6b.address() as AddressInfo).port;
    const url6b = `http://127.0.0.1:${port6b}`;

    try {
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // 6c. Verify slip check using booking reference after restart
      const slipRes = await fetch(`${url6b}/api/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest_id: slipBookingRef,
          image: samplePng,
          gateway: 'KBZPAY',
          simulated_transaction_id: `TRX-GATE6-${Date.now()}`,
        }),
      });
      assert.strictEqual(slipRes.status, 200, 'Slip verification must return 200');
      const slipData = await slipRes.json();
      assert.strictEqual(slipData.success, true);
      assert.strictEqual(
        slipData.amount_mmk,
        depositMMK,
        `Slip check must resolve exact deposit amount (${depositMMK}) from PostgreSQL booking`
      );
      assert.strictEqual(slipData.error, null, 'Error must be null');
      console.log(`  ✅ Slip check successfully resolved DB booking: amount_mmk = ${slipData.amount_mmk}`);

      // 6d. Verify slip check with unknown manifest ID returns needs_review
      const unlinkedRes = await fetch(`${url6b}/api/verify-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest_id: 'NONEXISTENT-MANIFEST-REF-XYZ',
          image: samplePng,
          gateway: 'KBZPAY',
        }),
      });
      assert.strictEqual(unlinkedRes.status, 200);
      const unlinkedData = await unlinkedRes.json();
      assert.strictEqual(unlinkedData.verification_status, 'needs_review', 'Unlinked slip must return needs_review');
      assert.strictEqual(unlinkedData.amount_mmk, null, 'Unlinked slip amount must be null');
      console.log('  ✅ Unlinked slip returns needs_review without resolving amount.');
      console.log('  ✅ Gate 6 (Slip Gate) Passed: Slip check finds DB bookings across server restart.');
    } finally {
      server6b.close();
      await closeDb();
    }

    // Clean up test data
    for (const t of [TENANT_A, TENANT_B]) {
      await sqlClient`DELETE FROM booking_events WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM customer_bookings WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM admin_sessions WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM verified_slips WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM admin_users WHERE tenant_id = ${t}`;
      await sqlClient`DELETE FROM production_studios WHERE slug = ${t}`;
    }

    console.log('\n🎉 ALL ACCEPTANCE GATES (GATES 2, 3, 4, 5, 6) PASSED ON POSTGRESQL!\n');
    await sqlClient.end();
    await demoClient.end();
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ DB-Backed Bookings test suite failed:', err);
    await sqlClient.end();
    await demoClient.end();
    process.exit(1);
  }
}

runDbBookingsTests();
