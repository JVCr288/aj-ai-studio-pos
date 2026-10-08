import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  buildEscPosReceipt,
  buildEscPosZReport,
  CMD_INIT,
  CMD_KICK_DRAWER_PIN2,
  CMD_KICK_DRAWER_PIN5,
  CMD_CUT_PAPER,
  CMD_FEED_3,
} from '../utils/escPosPrinter.ts';
import { PosTransaction, PosZReport } from '../types.ts';

const mockTransaction: PosTransaction = {
  id: 'tx-test-001',
  orderReference: '#ORD-991204',
  tenantId: 'aj-ai-studio',
  bookingReference: '#AJ-BK-2026-9901',
  customerName: 'Daw Khin Khin',
  customerPhone: '09-792108421',
  bayAllocation: 'BAY ALPHA-01',
  items: [
    {
      id: 'item-1',
      category: 'BOOKING_BALANCE',
      title: 'Commercial Suite Session Balance',
      unitPriceMMK: 105000,
      quantity: 1,
    },
    {
      id: 'item-2',
      category: 'RETAIL_PRODUCT',
      title: 'Fine Art Velvet Print 8x12',
      unitPriceMMK: 25000,
      quantity: 2,
    },
  ],
  subtotalMMK: 155000,
  depositCreditedMMK: 105000,
  discountMMK: 5000,
  taxMMK: 0,
  totalDueMMK: 150000,
  tenderedCashMMK: 160000,
  changeDueMMK: 10000,
  paymentMethod: 'CASH',
  transactionStatus: 'COMPLETED',
  receiptNumber: 'RCP-2026-00042',
  cashierName: 'Aung Kyaw',
  terminalId: 'TERM-01',
  timestamp: '2026-11-18T14:30:00+06:30',
};

describe('ESC/POS Thermal Hardware Driver Tests', () => {
  test('buildEscPosReceipt generates valid binary with drawer kick, init, and cutter', () => {
    const receiptBytes = buildEscPosReceipt(mockTransaction, {
      studioName: 'AJ AI STUDIO',
      openDrawer: true,
      cutPaper: true,
      paperWidthMm: 80,
    });

    assert.ok(receiptBytes instanceof Uint8Array, 'Should return Uint8Array');
    assert.ok(receiptBytes.length > 100, 'Receipt binary should have substantial length');

    // 1. Verify Cash Drawer Kick Pin 2 is at the beginning (0x1B, 0x70, 0x00, 0x19, 0xFA)
    const kickPin2 = Array.from(receiptBytes.slice(0, 5));
    assert.deepEqual(kickPin2, CMD_KICK_DRAWER_PIN2, 'Must include Pin 2 drawer kick');

    // 2. Verify Cash Drawer Kick Pin 5 follows (0x1B, 0x70, 0x01, 0x19, 0xFA)
    const kickPin5 = Array.from(receiptBytes.slice(5, 10));
    assert.deepEqual(kickPin5, CMD_KICK_DRAWER_PIN5, 'Must include Pin 5 drawer kick');

    // 3. Verify ESC @ (Init) follows (0x1B, 0x40)
    const initCmd = Array.from(receiptBytes.slice(10, 12));
    assert.deepEqual(initCmd, CMD_INIT, 'Must include ESC/POS Init sequence');

    // 4. Verify text content decoding contains critical receipts fields
    const textDecoder = new TextDecoder('utf-8');
    const decodedText = textDecoder.decode(receiptBytes);

    assert.ok(decodedText.includes('AJ AI STUDIO'), 'Decoded text must contain studio name');
    assert.ok(decodedText.includes('RCP-2026-00042'), 'Decoded text must contain receipt number');
    assert.ok(decodedText.includes('Daw Khin Khin'), 'Decoded text must contain customer name');
    assert.ok(decodedText.includes('Commercial Suite'), 'Decoded text must contain line item title');
    assert.ok(decodedText.includes('150,000 MMK'), 'Decoded text must contain total amount');
    assert.ok(decodedText.includes('10,000 MMK'), 'Decoded text must contain change due');

    // 5. Verify Paper Cut command at the end
    const lastCmd = Array.from(receiptBytes.slice(-CMD_CUT_PAPER.length));
    assert.deepEqual(lastCmd, CMD_CUT_PAPER, 'Must end with paper cut command');
  });

  test('buildEscPosReceipt respects openDrawer=false and 58mm compact width', () => {
    const receiptBytes = buildEscPosReceipt(mockTransaction, {
      openDrawer: false,
      cutPaper: false,
      paperWidthMm: 58,
    });

    // When openDrawer is false, the first command should be CMD_INIT (0x1B, 0x40)
    const initCmd = Array.from(receiptBytes.slice(0, 2));
    assert.deepEqual(initCmd, CMD_INIT, 'Should start with Init command when drawer kick is disabled');

    const textDecoder = new TextDecoder('utf-8');
    const decodedText = textDecoder.decode(receiptBytes);
    // 58mm line divider is 32 characters
    assert.ok(decodedText.includes('-'.repeat(32)), 'Should use 32-column divider for 58mm roll');

    // Last command should not be cut paper
    const lastCmd = Array.from(receiptBytes.slice(-CMD_CUT_PAPER.length));
    assert.notDeepEqual(lastCmd, CMD_CUT_PAPER, 'Should not cut paper when cutPaper=false');
  });

  test('buildEscPosReceipt handles SPLIT payment breakdown properly', () => {
    const splitTx: PosTransaction = {
      ...mockTransaction,
      paymentMethod: 'SPLIT',
      splitDetails: {
        cashAmountMMK: 50000,
        digitalAmountMMK: 100000,
        digitalGateway: 'KBZPay',
      },
    };

    const receiptBytes = buildEscPosReceipt(splitTx, {
      openDrawer: true,
      paperWidthMm: 80,
    });

    const textDecoder = new TextDecoder('utf-8');
    const decoded = textDecoder.decode(receiptBytes);
    assert.ok(decoded.includes('SPLIT'), 'Must specify SPLIT method');
    assert.ok(decoded.includes('Cash Portion:'), 'Must show Cash portion');
    assert.ok(decoded.includes('50,000 MMK'), 'Must show 50,000 MMK cash amount');
    assert.ok(decoded.includes('KBZPay'), 'Must show KBZPay digital gateway');
    assert.ok(decoded.includes('100,000 MMK'), 'Must show 100,000 MMK digital amount');
  });

  test('buildEscPosZReport generates compliant thermal binary with audit reconciliation, cutter, and signatures', () => {
    const mockZReport: PosZReport = {
      reportType: 'Z_REPORT',
      reportId: 'ZR-TERM-01-998822',
      generatedAt: '2026-11-18T20:30:00+06:30',
      shiftId: 'SHIFT-2026-11-18-01',
      terminalId: 'TERM-01',
      staffName: 'Aung Kyaw',
      tenantId: 'aj-ai-studio',
      openedAt: '2026-11-18T09:00:00+06:30',
      closedAt: '2026-11-18T20:30:00+06:30',
      status: 'CLOSED',
      grossSalesMMK: 500000,
      netSalesMMK: 480000,
      totalDiscountMMK: 20000,
      totalTaxMMK: 0,
      totalTransactions: 6,
      tenderBreakdown: {
        cashMMK: 250000,
        kbzpayMMK: 150000,
        wavepayMMK: 80000,
        ayapayMMK: 0,
        splitTotalMMK: 0,
      },
      categoryBreakdown: {
        BOOKING_BALANCE: { count: 2, totalMMK: 210000 },
        OVERTIME: { count: 1, totalMMK: 45000 },
        RETAIL_PRODUCT: { count: 3, totalMMK: 225000 },
      },
      cashReconciliation: {
        startingCashMMK: 100000,
        cashSalesMMK: 250000,
        expectedCashMMK: 350000,
        actualCountedCashMMK: 350000,
        discrepancyMMK: 0,
        discrepancyType: 'BALANCED',
      },
      closureNotes: 'All register drawers balanced perfectly.',
    };

    const zReportBytes = buildEscPosZReport(mockZReport, {
      studioName: 'AJ AI STUDIO',
      paperWidthMm: 80,
      openDrawer: true,
      cutPaper: true,
    });

    assert.ok(zReportBytes instanceof Uint8Array);
    assert.ok(zReportBytes.length > 200, 'Z-report binary must have substantial size');

    // 1. Must kick cash drawer at beginning
    const kickBytes = Array.from(zReportBytes.slice(0, 5));
    assert.deepEqual(kickBytes, CMD_KICK_DRAWER_PIN2);

    // 2. Decode text and assert critical audit lines
    const text = new TextDecoder('utf-8').decode(zReportBytes);
    assert.ok(text.includes('OFFICIAL Z-REPORT (SHIFT CLOSE)'));
    assert.ok(text.includes('ZR-TERM-01-998822'));
    assert.ok(text.includes('Aung Kyaw'));
    assert.ok(text.includes('Gross Sales:'));
    assert.ok(text.includes('500,000 MMK'));
    assert.ok(text.includes('Starting Float:'));
    assert.ok(text.includes('100,000 MMK'));
    assert.ok(text.includes('Expected in Drawer:'));
    assert.ok(text.includes('350,000 MMK'));
    assert.ok(text.includes('0 MMK (BALANCED)'));
    assert.ok(text.includes('Cashier Signature:'));
    assert.ok(text.includes('Manager Signature:'));

    // 3. Must cut paper at end
    const lastCmd = Array.from(zReportBytes.slice(-CMD_CUT_PAPER.length));
    assert.deepEqual(lastCmd, CMD_CUT_PAPER, 'Z-Report must end with paper cut command');
  });
});
