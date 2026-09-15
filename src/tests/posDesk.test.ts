import assert from 'assert';
import {
  posService,
  OVERTIME_ADDON_PRESETS,
} from '../services/posService';
import { serverBookingService } from '../services/serverBookingService';

async function runPosDeskTests() {
  console.log('\n=== RUNNING AJ AI STUDIO POS DESK TERMINAL TESTS ===\n');

  // Test 1: Preset Overtime and Add-on Data
  console.log('Testing Overtime and Add-on Presets...');
  assert.ok(OVERTIME_ADDON_PRESETS.length >= 6, 'Should have at least 6 presets');
  const ot30m = OVERTIME_ADDON_PRESETS.find((p) => p.id === 'preset-ot-30m');
  assert.strictEqual(ot30m?.unitPriceMMK, 25000);
  assert.strictEqual(ot30m?.category, 'OVERTIME');
  console.log('  ✅ Test 1: Overtime & Add-on presets verified');

  // Test 2: Lookup Booking by Reference and Phone
  console.log('Testing Desk Booking Lookup...');
  const initialBookings = await posService.lookupBookingForDesk('8801', 'aj-ai-studio');
  assert.ok(initialBookings.length > 0, 'Should find pilot booking 8801');
  const pilotBooking = initialBookings[0];
  assert.strictEqual(pilotBooking.bookingReference, '#AJ-BK-2026-8801');
  assert.strictEqual(pilotBooking.customerName, 'Elena Rostova');
  console.log('  ✅ Test 2: Desk booking lookup by reference verified');

  // Test 3: Active Shift Initialization and Cash Drawer Float
  console.log('Testing Active POS Shift...');
  const shift = posService.getActiveShift('TEST-TERM-01', 'Ko Aung');
  assert.ok(shift.shiftId.startsWith('SHIFT-'));
  assert.strictEqual(shift.status, 'OPEN');
  assert.ok(shift.startingCashMMK >= 0);
  assert.ok(shift.cashInDrawerMMK >= shift.startingCashMMK);
  console.log('  ✅ Test 3: POS shift record and drawer float verified');

  // Test 4: Record a Cash Sale Transaction & Verify Cash Drawer Update
  console.log('Testing Cash Sale Transaction & Drawer Balance Update...');
  const drawerBefore = shift.cashInDrawerMMK;
  const cashTx = await posService.recordTransaction(
    {
      orderReference: '#ORD-TEST-CASH-01',
      tenantId: 'aj-ai-studio',
      customerName: 'Daw Thuzar',
      customerPhone: '09790001122',
      items: [
        {
          id: 'item-1',
          category: 'OVERTIME',
          title: 'Studio Overtime (1 Hour)',
          unitPriceMMK: 45000,
          quantity: 1,
        },
      ],
      subtotalMMK: 45000,
      depositCreditedMMK: 0,
      discountMMK: 0,
      taxMMK: 0,
      totalDueMMK: 45000,
      tenderedCashMMK: 50000,
      changeDueMMK: 5000,
      paymentMethod: 'CASH',
      cashierName: 'Ko Aung',
      terminalId: 'TEST-TERM-01',
    },
    { updateServerBookingStatus: false }
  );

  assert.strictEqual(cashTx.transactionStatus, 'COMPLETED');
  assert.strictEqual(cashTx.totalDueMMK, 45000);
  assert.strictEqual(cashTx.changeDueMMK, 5000);

  const shiftAfterCash = posService.getActiveShift('TEST-TERM-01', 'Ko Aung');
  assert.strictEqual(
    shiftAfterCash.cashInDrawerMMK,
    drawerBefore + 45000,
    'Cash in drawer should increase by cash sale amount'
  );
  console.log('  ✅ Test 4: Cash sale transaction and change calculation verified');

  // Test 5: Record Digital Wallet Sale (KBZPay) & Drawer Separation
  console.log('Testing Digital Wallet Transaction (KBZPay)...');
  const drawerBeforeDigital = shiftAfterCash.cashInDrawerMMK;
  const digitalSalesBefore = shiftAfterCash.totalDigitalSalesMMK;

  const digitalTx = await posService.recordTransaction(
    {
      orderReference: '#ORD-TEST-KPAY-01',
      tenantId: 'aj-ai-studio',
      customerName: 'U Min Hein',
      customerPhone: '09440003344',
      items: [
        {
          id: 'item-2',
          category: 'RETAIL_PRODUCT',
          title: 'Crystal Acrylic Ultra-Clear Glass Frame',
          unitPriceMMK: 95000,
          quantity: 1,
        },
      ],
      subtotalMMK: 95000,
      depositCreditedMMK: 0,
      discountMMK: 0,
      taxMMK: 0,
      totalDueMMK: 95000,
      paymentMethod: 'KBZPAY',
      cashierName: 'Ko Aung',
      terminalId: 'TEST-TERM-01',
    },
    { updateServerBookingStatus: false }
  );

  assert.strictEqual(digitalTx.paymentMethod, 'KBZPAY');
  const shiftAfterDigital = posService.getActiveShift('TEST-TERM-01', 'Ko Aung');
  assert.strictEqual(
    shiftAfterDigital.cashInDrawerMMK,
    drawerBeforeDigital,
    'Digital sale must NOT increase physical cash in drawer'
  );
  assert.strictEqual(
    shiftAfterDigital.totalDigitalSalesMMK,
    digitalSalesBefore + 95000,
    'Digital sales total must increase by digital sale amount'
  );
  console.log('  ✅ Test 5: Digital transaction separation verified');

  // Test 6: Split Payment (Cash + WavePay)
  console.log('Testing Split Payment Transaction...');
  const splitTx = await posService.recordTransaction(
    {
      orderReference: '#ORD-TEST-SPLIT-01',
      tenantId: 'aj-ai-studio',
      customerName: 'Ma Sandar',
      customerPhone: '09550006677',
      items: [
        {
          id: 'item-3',
          category: 'ADDON_SERVICE',
          title: 'Dedicated Lighting Assistant',
          unitPriceMMK: 30000,
          quantity: 1,
        },
      ],
      subtotalMMK: 30000,
      depositCreditedMMK: 0,
      discountMMK: 0,
      taxMMK: 0,
      totalDueMMK: 30000,
      paymentMethod: 'SPLIT',
      splitDetails: {
        cashAmountMMK: 10000,
        digitalAmountMMK: 20000,
        digitalGateway: 'WavePay',
      },
      cashierName: 'Ko Aung',
      terminalId: 'TEST-TERM-01',
    },
    { updateServerBookingStatus: false }
  );

  assert.strictEqual(splitTx.paymentMethod, 'SPLIT');
  assert.strictEqual(splitTx.splitDetails?.cashAmountMMK, 10000);
  assert.strictEqual(splitTx.splitDetails?.digitalAmountMMK, 20000);
  console.log('  ✅ Test 6: Split payment allocation verified');

  // Test 7: Linked Booking Settlement & Status Transition
  console.log('Testing Linked Booking Settle & Server Status Sync...');
  const settleTx = await posService.recordTransaction(
    {
      orderReference: '#ORD-TEST-SETTLE-01',
      tenantId: 'aj-ai-studio',
      bookingReference: '#AJ-BK-2026-8801',
      customerName: 'Elena Rostova',
      customerPhone: '+95 9 792 108 421',
      bayAllocation: 'BAY ALPHA-01',
      items: [
        {
          id: 'item-bal-1',
          category: 'BOOKING_BALANCE',
          title: 'Gold Commercial Suite (Balance Settle)',
          unitPriceMMK: 105000,
          quantity: 1,
          referenceId: '#AJ-BK-2026-8801',
        },
      ],
      subtotalMMK: 105000,
      depositCreditedMMK: 105000,
      discountMMK: 0,
      taxMMK: 0,
      totalDueMMK: 105000,
      paymentMethod: 'KBZPAY',
      cashierName: 'Ko Aung',
      terminalId: 'TEST-TERM-01',
    },
    { updateServerBookingStatus: true }
  );

  assert.strictEqual(settleTx.bookingReference, '#AJ-BK-2026-8801');

  // Verify server booking record updated to CONFIRMED
  const bookingsAfter = await posService.lookupBookingForDesk('8801', 'aj-ai-studio');
  const settledBooking = bookingsAfter.find((b) => b.bookingReference === '#AJ-BK-2026-8801');
  assert.strictEqual(settledBooking?.bookingStatus, 'CONFIRMED');
  console.log('  ✅ Test 7: Linked booking status transition to CONFIRMED verified');

  console.log('\nALL 7 AJ AI STUDIO POS DESK TERMINAL TESTS PASSED! 🎉\n');
}

runPosDeskTests().catch((err) => {
  console.error('POS Desk Test Failure:', err);
  process.exit(1);
});
