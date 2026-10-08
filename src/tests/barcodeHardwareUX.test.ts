import assert from 'node:assert';
import {
  buildCashDrawerKickBytes,
  buildEscPosReceipt,
  CMD_KICK_DRAWER_PIN2,
  CMD_KICK_DRAWER_PIN5,
} from '../utils/escPosPrinter';
import { INITIAL_CLIENT_PRODUCTS } from '../data/clientProductsData';
import { INITIAL_EQUIPMENT_LIST } from '../data/equipmentData';
import { PHOTOGRAPHY_PACKAGES } from '../data/mockData';
import { playScannerBeep } from '../hooks/useBarcodeScanner';
import { PosTransaction } from '../types';

console.log('=== RUNNING POS HARDWARE & BARCODE SCANNER INTEGRATION TESTS ===\n');

// Test 1: ESC/POS Cash Drawer Kick Command Bytes
console.log('Testing ESC/POS cash drawer kick command bytes...');
const kickBytes = buildCashDrawerKickBytes();
assert.ok(kickBytes instanceof Uint8Array, 'Kick bytes must be Uint8Array');
assert.ok(kickBytes.length >= 10, 'Kick command must contain init and dual-pin kick commands');
// Verify ESC p 0 25 250 (0x1b 0x70 0x00 0x19 0xfa)
const kickHex = Array.from(kickBytes).map((b) => b.toString(16).padStart(2, '0')).join(' ');
assert.ok(kickHex.includes('1b 70 00 19 fa'), 'Must contain pin 2 pulse command');
assert.ok(kickHex.includes('1b 70 01 19 fa'), 'Must contain pin 5 pulse command');
console.log('  ✅ ESC/POS drawer kick binary pulse verified (Pin 2 + Pin 5)');

// Test 2: Receipt Auto-Drawer Kick Embedding on Cash
console.log('Testing receipt generation with openDrawer flag...');
const mockTx: PosTransaction = {
  id: 'tx-test-01',
  orderReference: 'ORD-998811',
  tenantId: 'nocturne',
  customerName: 'Aung Thu',
  customerPhone: '+95912345678',
  items: [
    {
      id: 'it-1',
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
  tenderedCashMMK: 150000,
  changeDueMMK: 25000,
  transactionStatus: 'COMPLETED',
  cashierName: 'Aung Kyaw',
  terminalId: 'TERM-01',
  receiptNumber: 'RCP-2026-001',
  timestamp: new Date().toISOString(),
};

const receiptWithDrawer = buildEscPosReceipt(mockTx, { openDrawer: true });
const receiptHex = Array.from(receiptWithDrawer).map((b) => b.toString(16).padStart(2, '0')).join(' ');
assert.ok(receiptHex.includes('1b 70 00 19 fa'), 'Receipt with openDrawer: true must embed drawer pulse');

const receiptWithoutDrawer = buildEscPosReceipt(mockTx, { openDrawer: false });
const receiptWithoutDrawerHex = Array.from(receiptWithoutDrawer).map((b) => b.toString(16).padStart(2, '0')).join(' ');
assert.ok(!receiptWithoutDrawerHex.includes('1b 70 00 19 fa'), 'Receipt with openDrawer: false must not embed drawer pulse');
console.log('  ✅ Conditional ESC/POS cash drawer embedding verified in receipt builder');

// Test 3: Retail Product SKU Resolution
console.log('Testing Retail SKU Barcode resolution against catalog...');
const canvasProduct = INITIAL_CLIENT_PRODUCTS.find(
  (p) => p.sku?.toLowerCase() === 'aj-can-1624'.toLowerCase()
);
assert.ok(canvasProduct, 'SKU AJ-CAN-1624 must resolve to Floating Canvas');
assert.strictEqual(canvasProduct?.priceMMK, 125000);

const acrylicProduct = INITIAL_CLIENT_PRODUCTS.find(
  (p) => p.sku?.toLowerCase() === 'aj-acr-1218'.toLowerCase()
);
assert.ok(acrylicProduct, 'SKU AJ-ACR-1218 must resolve to Acrylic Frame');

const filmProduct = INITIAL_CLIENT_PRODUCTS.find(
  (p) => p.sku?.toLowerCase() === 'aj-flm-kp400'.toLowerCase()
);
assert.ok(filmProduct, 'SKU AJ-FLM-KP400 must resolve to Portra 400 film');
console.log('  ✅ Retail SKU barcode lookups verified against INITIAL_CLIENT_PRODUCTS');

// Test 4: Equipment Asset Code / ID Resolution
console.log('Testing Equipment Asset Code barcode resolution...');
const camera = INITIAL_EQUIPMENT_LIST.find(
  (g) => g.assetCode?.toLowerCase() === 'aj-cam-001'.toLowerCase() || g.id === 'eq-cam-01'
);
assert.ok(camera, 'Asset code AJ-CAM-001 must resolve to Sony Alpha 1');
console.log('  ✅ Equipment barcode/assetCode resolution verified');

// Test 5: Photography Package Resolution
console.log('Testing Package catalog resolution...');
const pkg = PHOTOGRAPHY_PACKAGES.find((p) => p.id === 'editorial-fashion-atelier');
assert.ok(pkg, 'Package editorial-fashion-atelier must resolve');
console.log('  ✅ Photography package catalog resolution verified');

// Test 6: Synthesized Audio Beep Safety Check
console.log('Testing Audio Beep safety in non-browser Node runtime...');
assert.doesNotThrow(() => {
  playScannerBeep('success');
  playScannerBeep('error');
}, 'playScannerBeep must handle missing window/AudioContext gracefully without crashing');
console.log('  ✅ Audio feedback failsafe verified');

console.log('\n🎉 ALL 6 POS HARDWARE & BARCODE SCANNER TESTS PASSED SUCCESSFULLY!\n');
