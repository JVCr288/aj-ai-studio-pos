import assert from 'node:assert';
import { AddressInfo } from 'node:net';
import { createApp } from '../server/app';
import { offlineQueueService } from '../services/offlineQueueService';
import { PosTransaction, PosZReport } from '../types';

process.env.NODE_ENV = 'test';
console.log('=== RUNNING OFFLINE-FIRST QUEUE & SERVER SYNC INTEGRATION TESTS ===\n');

// Clear existing queue before tests
offlineQueueService.clearQueue();
assert.strictEqual(offlineQueueService.getPendingCount(), 0, 'Queue must initialize empty');
console.log('  ✅ Initial queue state is clean (0 pending)');

// Test 1: Enqueue Transaction
console.log('Testing transaction enqueueing...');
const mockTx: PosTransaction = {
  id: `tx-offline-${Date.now()}`,
  orderReference: 'ORD-OFF-101',
  tenantId: 'nocturne',
  customerName: 'Khin Khin',
  customerPhone: '+95999887766',
  items: [
    {
      id: 'it-canvas',
      category: 'RETAIL_PRODUCT',
      title: 'Floating Canvas Wall Art',
      unitPriceMMK: 125000,
      quantity: 1,
    },
  ],
  subtotalMMK: 125000,
  depositCreditedMMK: 0,
  discountMMK: 0,
  taxMMK: 0,
  totalDueMMK: 125000,
  paymentMethod: 'CASH',
  tenderedCashMMK: 130000,
  changeDueMMK: 5000,
  transactionStatus: 'COMPLETED',
  cashierName: 'Aung Kyaw',
  terminalId: 'TERM-01',
  receiptNumber: 'RCP-NOC-2026-9001',
  timestamp: new Date().toISOString(),
};

const queuedItem = offlineQueueService.enqueueTransaction(mockTx);
assert.ok(queuedItem.id.startsWith('queue-tx-'), 'Queue item must have valid prefix');
assert.strictEqual(queuedItem.type, 'TRANSACTION');
assert.strictEqual(offlineQueueService.getPendingCount(), 1);
console.log('  ✅ Transaction successfully enqueued to offline queue');

// Test 2: Enqueue Booking Sync
console.log('Testing booking balance settlement sync enqueueing...');
const bookingQueueItem = offlineQueueService.enqueueBookingSync(
  'nocturne',
  '#AJ-BK-2026-8801',
  105000,
  'Offline cash settlement',
  'Aung Kyaw'
);
assert.strictEqual(bookingQueueItem.type, 'BOOKING_SYNC');
assert.strictEqual(offlineQueueService.getPendingCount(), 2);
console.log('  ✅ Booking sync successfully enqueued');

// Test 3: Enqueue Shift Report
console.log('Testing shift closure Z-Report enqueueing...');
const mockZReport: PosZReport = {
  reportId: `Z-OFF-${Date.now()}`,
  reportType: 'Z_REPORT',
  shiftId: 'SHIFT-2026-09-28-001',
  terminalId: 'TERM-01',
  staffName: 'Aung Kyaw',
  tenantId: 'nocturne',
  openedAt: new Date(Date.now() - 3600000).toISOString(),
  closedAt: new Date().toISOString(),
  status: 'CLOSED',
  totalTransactions: 5,
  grossSalesMMK: 450000,
  totalDiscountMMK: 0,
  totalTaxMMK: 0,
  netSalesMMK: 450000,
  categoryBreakdown: {},
  tenderBreakdown: {
    cashMMK: 250000,
    kbzpayMMK: 200000,
    wavepayMMK: 0,
    ayapayMMK: 0,
    splitTotalMMK: 0,
  },
  cashReconciliation: {
    startingCashMMK: 150000,
    cashSalesMMK: 250000,
    expectedCashMMK: 400000,
    actualCountedCashMMK: 400000,
    discrepancyMMK: 0,
    discrepancyType: 'BALANCED',
  },
  generatedAt: new Date().toISOString(),
};

const shiftQueueItem = offlineQueueService.enqueueShiftReport(mockZReport);
assert.strictEqual(shiftQueueItem.type, 'SHIFT_REPORT');
assert.strictEqual(offlineQueueService.getPendingCount(), 3);
console.log('  ✅ Shift Z-Report successfully enqueued (Pending count: 3)');

// Test 4: Queue Subscription Listener
console.log('Testing queue listener subscription...');
let listenerCalled = false;
let observedCount = 0;
const unsubscribe = offlineQueueService.subscribe((items) => {
  listenerCalled = true;
  observedCount = items.length;
});
assert.ok(listenerCalled, 'Subscriber must be notified on attach');
assert.strictEqual(observedCount, 3);
unsubscribe();
console.log('  ✅ Queue subscriber event contract verified');

// Test 5: Dequeue specific item
console.log('Testing selective dequeue...');
offlineQueueService.dequeue(bookingQueueItem.id);
assert.strictEqual(offlineQueueService.getPendingCount(), 2);
const remaining = offlineQueueService.getPendingItems();
assert.ok(!remaining.some((it) => it.id === bookingQueueItem.id));
console.log('  ✅ Selective dequeue by ID verified');

// Test 6: Server API HTTP Ingestion (/api/pos/transactions)
console.log('Testing Server API transaction ingestion endpoint...');

async function runHttpTests() {
  process.env.DEMO_MODE = 'true';
  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const serverHost = `http://127.0.0.1:${port}`;

  try {
    // 0. Authenticate admin session for 'nocturne' tenant
    const loginRes = await fetch(`${serverHost}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: 'nocturne',
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

    const postRes = await fetch(`${serverHost}/api/pos/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(mockTx),
    });
    assert.strictEqual(postRes.status, 201, 'POST /api/pos/transactions should return 201');
    const postJson = await postRes.json();
    assert.strictEqual(postJson.success, true);
    assert.strictEqual(postJson.ingestedCount, 1);
    console.log('  ✅ POST /api/pos/transactions single item ingest returned 201 Created');

    // Test 7: GET /api/pos/transactions
    const getRes = await fetch(`${serverHost}/api/pos/transactions`, {
      headers: authHeaders,
    });
    assert.strictEqual(getRes.status, 200, 'GET /api/pos/transactions should return 200');
    const getJson = await getRes.json();
    assert.strictEqual(getJson.success, true);
    assert.ok(getJson.count >= 1);
    assert.ok(getJson.transactions.some((t: any) => t.id === mockTx.id));
    console.log('  ✅ GET /api/pos/transactions verified and returned persisted transaction');

    // Test 8: POST /api/pos/shifts
    const shiftRes = await fetch(`${serverHost}/api/pos/shifts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(mockZReport),
    });
    assert.strictEqual(shiftRes.status, 201, 'POST /api/pos/shifts should return 201');
    const shiftJson = await shiftRes.json();
    assert.strictEqual(shiftJson.success, true);
    console.log('  ✅ POST /api/pos/shifts returned 201 Created');

    // Test 9: Bulk batch ingestion for offline queue sync
    const bulkTx1 = { ...mockTx, id: `tx-bulk-1-${Date.now()}`, orderReference: 'ORD-BLK-01' };
    const bulkTx2 = { ...mockTx, id: `tx-bulk-2-${Date.now()}`, orderReference: 'ORD-BLK-02' };
    const bulkRes = await fetch(`${serverHost}/api/pos/transactions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify([bulkTx1, bulkTx2]),
    });
    assert.strictEqual(bulkRes.status, 201);
    const bulkJson = await bulkRes.json();
    assert.strictEqual(bulkJson.ingestedCount, 2);
    console.log('  ✅ Bulk batch ingestion verified (2 transactions synced simultaneously)');

    console.log('\n🎉 ALL 9 OFFLINE-FIRST QUEUE & SERVER SYNC TESTS PASSED!\n');
    server.close();
    process.exit(0);
  } catch (err: any) {
    console.error('Offline server integration test failed:', err);
    server.close();
    process.exit(1);
  }
}

runHttpTests();
