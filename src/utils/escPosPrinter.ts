import { PosTransaction, PosZReport } from '../types';

/**
 * ESC/POS THERMAL RECEIPT & CASH DRAWER DRIVER (PHASE 11 ENTERPRISE HARDWARE INTEGRATION)
 *
 * Implements standard ESC/POS binary command protocol for 58mm and 80mm thermal printers
 * (Epson, Star Micronics, Rongta, Xprinter, Sunmi) with direct WebUSB and WebSerial transport,
 * paper auto-cutting, and RJ11/RJ12 cash drawer kick pulse triggers.
 */

export interface EscPosOptions {
  paperWidthMm?: 58 | 80;
  openDrawer?: boolean;
  cutPaper?: boolean;
  studioName?: string;
  studioAddress?: string;
  studioPhone?: string;
  studioEmail?: string;
}

// ESC/POS Command Byte Constants
const ESC = 0x1b;
const GS = 0x1d;

export const CMD_INIT = [ESC, 0x40]; // Initialize printer
export const CMD_ALIGN_LEFT = [ESC, 0x61, 0x00];
export const CMD_ALIGN_CENTER = [ESC, 0x61, 0x01];
export const CMD_ALIGN_RIGHT = [ESC, 0x61, 0x02];
export const CMD_BOLD_ON = [ESC, 0x45, 0x01];
export const CMD_BOLD_OFF = [ESC, 0x45, 0x00];
export const CMD_DOUBLE_SIZE = [GS, 0x21, 0x11];
export const CMD_NORMAL_SIZE = [GS, 0x21, 0x00];
export const CMD_LINE_FEED = [0x0a];
export const CMD_FEED_3 = [ESC, 0x64, 0x03];
export const CMD_CUT_PAPER = [GS, 0x56, 0x41, 0x00]; // GS V 'A' 0 (Feed and full cut)
export const CMD_KICK_DRAWER_PIN2 = [ESC, 0x70, 0x00, 0x19, 0xfa]; // ESC p 0 25 250 (Pin 2 kick)
export const CMD_KICK_DRAWER_PIN5 = [ESC, 0x70, 0x01, 0x19, 0xfa]; // ESC p 1 25 250 (Pin 5 kick)

function stringToBytes(str: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(str));
}

function padLine(left: string, right: string, width: number): string {
  const total = left.length + right.length;
  if (total >= width) {
    return `${left} ${right}`.slice(0, width);
  }
  const spaces = ' '.repeat(width - total);
  return `${left}${spaces}${right}`;
}

/**
 * Builds the binary ESC/POS byte array representation of a POS sale transaction.
 */
export function buildEscPosReceipt(
  tx: PosTransaction,
  options: EscPosOptions = {}
): Uint8Array {
  const widthChars = options.paperWidthMm === 58 ? 32 : 42;
  const divider = '-'.repeat(widthChars);
  const studioName = options.studioName || 'AJ AI STUDIO';
  const studioAddress = options.studioAddress || 'Yangon, Myanmar';
  const studioPhone = options.studioPhone || '+95 9 123 456 789';

  const bytes: number[] = [];

  // 1. Kick cash drawer if requested
  if (options.openDrawer !== false) {
    bytes.push(...CMD_KICK_DRAWER_PIN2);
    bytes.push(...CMD_KICK_DRAWER_PIN5);
  }

  // 2. Initialize
  bytes.push(...CMD_INIT);

  // 3. Header: Studio Name & Info (Centered)
  bytes.push(...CMD_ALIGN_CENTER);
  bytes.push(...CMD_DOUBLE_SIZE, ...CMD_BOLD_ON);
  bytes.push(...stringToBytes(`${studioName}\n`));
  bytes.push(...CMD_NORMAL_SIZE, ...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(`${studioAddress}\n`));
  bytes.push(...stringToBytes(`Tel: ${studioPhone}\n`));
  bytes.push(...stringToBytes(`OFFICIAL SALES RECEIPT\n`));
  bytes.push(...stringToBytes(`${divider}\n`));

  // 4. Metadata: Receipt ID, Date, Staff, Terminal (Left-aligned)
  bytes.push(...CMD_ALIGN_LEFT);
  bytes.push(...stringToBytes(padLine('Receipt:', tx.receiptNumber, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Date:', new Date(tx.timestamp).toLocaleString(), widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Cashier:', tx.cashierName, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Terminal:', tx.terminalId, widthChars) + '\n'));
  if (tx.bookingReference) {
    bytes.push(...stringToBytes(padLine('Linked Booking:', tx.bookingReference, widthChars) + '\n'));
  }
  if (tx.customerName) {
    bytes.push(...stringToBytes(padLine('Customer:', tx.customerName, widthChars) + '\n'));
  }
  bytes.push(...stringToBytes(`${divider}\n`));

  // 5. Line Items Table Header
  bytes.push(...CMD_BOLD_ON);
  bytes.push(...stringToBytes(padLine('ITEM / QTY', 'AMOUNT (MMK)', widthChars) + '\n'));
  bytes.push(...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(`${divider}\n`));

  // 6. Line Items
  for (const item of tx.items) {
    const itemTitle = item.title.slice(0, widthChars - 14);
    const amountStr = `${(item.unitPriceMMK * item.quantity).toLocaleString()} MMK`;
    bytes.push(...stringToBytes(padLine(itemTitle, amountStr, widthChars) + '\n'));
    if (item.quantity > 1) {
      bytes.push(...stringToBytes(`  ${item.quantity} @ ${item.unitPriceMMK.toLocaleString()} MMK\n`));
    }
  }
  bytes.push(...stringToBytes(`${divider}\n`));

  // 7. Totals & Payment Summary (Right-aligned / Justified)
  bytes.push(...stringToBytes(padLine('Subtotal:', `${tx.subtotalMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  if (tx.discountMMK && tx.discountMMK > 0) {
    bytes.push(...stringToBytes(padLine('Discount:', `-${tx.discountMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  }
  bytes.push(...CMD_BOLD_ON, ...CMD_DOUBLE_SIZE);
  bytes.push(...stringToBytes(padLine('TOTAL:', `${tx.totalDueMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  bytes.push(...CMD_NORMAL_SIZE, ...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(`${divider}\n`));

  // 8. Payment Breakdown
  bytes.push(...stringToBytes(padLine('Method:', tx.paymentMethod, widthChars) + '\n'));
  if (tx.paymentMethod === 'CASH' && tx.tenderedCashMMK !== undefined) {
    bytes.push(...stringToBytes(padLine('Cash Tendered:', `${tx.tenderedCashMMK.toLocaleString()} MMK`, widthChars) + '\n'));
    if (tx.changeDueMMK !== undefined) {
      bytes.push(...stringToBytes(padLine('Change Due:', `${tx.changeDueMMK.toLocaleString()} MMK`, widthChars) + '\n'));
    }
  } else if (tx.paymentMethod === 'SPLIT' && tx.splitDetails) {
    bytes.push(...stringToBytes(padLine('  Cash Portion:', `${tx.splitDetails.cashAmountMMK.toLocaleString()} MMK`, widthChars) + '\n'));
    bytes.push(...stringToBytes(padLine(`  Digital (${tx.splitDetails.digitalGateway}):`, `${tx.splitDetails.digitalAmountMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  }

  // 9. Footer & Paper Cut
  bytes.push(...CMD_ALIGN_CENTER);
  bytes.push(...stringToBytes(`\nThank you for choosing ${studioName}!\n`));
  bytes.push(...stringToBytes(`Preserve Your Creative Legacy\n`));
  bytes.push(...stringToBytes(`*** VAT Included ***\n`));
  bytes.push(...CMD_FEED_3);

  if (options.cutPaper !== false) {
    bytes.push(...CMD_CUT_PAPER);
  }

  return new Uint8Array(bytes);
}

/**
 * Builds the binary ESC/POS byte array representation for X-Report / Z-Report shift closure.
 */
export function buildEscPosZReport(
  report: PosZReport,
  options: EscPosOptions = {}
): Uint8Array {
  const widthChars = options.paperWidthMm === 58 ? 32 : 42;
  const divider = '='.repeat(widthChars);
  const thinDivider = '-'.repeat(widthChars);
  const studioName = options.studioName || 'AJ AI STUDIO';
  const studioAddress = options.studioAddress || 'Yangon, Myanmar (+06:30 MM-DST)';
  const studioPhone = options.studioPhone || '+95 9 792 108 421';

  const bytes: number[] = [];

  // 1. Kick cash drawer if requested (so manager can audit/take cash)
  if (options.openDrawer !== false) {
    bytes.push(...CMD_KICK_DRAWER_PIN2);
    bytes.push(...CMD_KICK_DRAWER_PIN5);
  }

  // 2. Initialize
  bytes.push(...CMD_INIT);

  // 3. Header: Studio Name & Title (Centered)
  bytes.push(...CMD_ALIGN_CENTER);
  bytes.push(...CMD_DOUBLE_SIZE, ...CMD_BOLD_ON);
  bytes.push(...stringToBytes(`${studioName}\n`));
  bytes.push(...CMD_NORMAL_SIZE, ...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(`${studioAddress}\n`));
  bytes.push(...stringToBytes(`Tel: ${studioPhone}\n`));
  bytes.push(...stringToBytes(`${divider}\n`));

  bytes.push(...CMD_BOLD_ON);
  const title = report.reportType === 'Z_REPORT' ? 'OFFICIAL Z-REPORT (SHIFT CLOSE)' : 'OFFICIAL X-REPORT (MID-SHIFT AUDIT)';
  bytes.push(...stringToBytes(`${title}\n`));
  bytes.push(...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(`${divider}\n`));

  // 4. Shift Metadata
  bytes.push(...CMD_ALIGN_LEFT);
  bytes.push(...stringToBytes(padLine('Report ID:', report.reportId, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Shift ID:', report.shiftId, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Terminal:', report.terminalId, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Cashier:', report.staffName, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Shift Opened:', new Date(report.openedAt).toLocaleTimeString(), widthChars) + '\n'));
  if (report.closedAt) {
    bytes.push(...stringToBytes(padLine('Shift Closed:', new Date(report.closedAt).toLocaleTimeString(), widthChars) + '\n'));
  }
  bytes.push(...stringToBytes(padLine('Status:', report.status === 'CLOSED' ? 'CLOSED (FINAL)' : 'OPEN (ACTIVE)', widthChars) + '\n'));
  bytes.push(...stringToBytes(`${thinDivider}\n`));

  // 5. Sales & Revenue Summary
  bytes.push(...CMD_BOLD_ON);
  bytes.push(...stringToBytes('SALES & REVENUE SUMMARY\n'));
  bytes.push(...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(padLine('Transactions:', `${report.totalTransactions} tx`, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Gross Sales:', `${report.grossSalesMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  if (report.totalDiscountMMK > 0) {
    bytes.push(...stringToBytes(padLine('Discounts:', `-${report.totalDiscountMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  }
  if (report.totalTaxMMK > 0) {
    bytes.push(...stringToBytes(padLine('Tax:', `+${report.totalTaxMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  }
  bytes.push(...CMD_BOLD_ON);
  bytes.push(...stringToBytes(padLine('NET REVENUE:', `${report.netSalesMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  bytes.push(...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(`${thinDivider}\n`));

  // 6. Tender Breakdown
  bytes.push(...CMD_BOLD_ON);
  bytes.push(...stringToBytes('TENDER BREAKDOWN\n'));
  bytes.push(...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(padLine('Cash Sales:', `${report.tenderBreakdown.cashMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('KBZPay:', `${report.tenderBreakdown.kbzpayMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('WavePay:', `${report.tenderBreakdown.wavepayMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  if (report.tenderBreakdown.ayapayMMK > 0) {
    bytes.push(...stringToBytes(padLine('AYA Pay:', `${report.tenderBreakdown.ayapayMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  }
  bytes.push(...stringToBytes(`${thinDivider}\n`));

  // 7. Cash Drawer Reconciliation
  bytes.push(...CMD_BOLD_ON);
  bytes.push(...stringToBytes('CASH DRAWER RECONCILIATION\n'));
  bytes.push(...CMD_BOLD_OFF);
  bytes.push(...stringToBytes(padLine('Starting Float:', `${report.cashReconciliation.startingCashMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Cash Sales:', `+${report.cashReconciliation.cashSalesMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  if (report.cashReconciliation.totalCashInMMK && report.cashReconciliation.totalCashInMMK > 0) {
    bytes.push(...stringToBytes(padLine('Cash In (Top-up):', `+${report.cashReconciliation.totalCashInMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  }
  if (report.cashReconciliation.totalCashDropsMMK && report.cashReconciliation.totalCashDropsMMK > 0) {
    bytes.push(...stringToBytes(padLine('Cash Drops (Out):', `-${report.cashReconciliation.totalCashDropsMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  }
  bytes.push(...stringToBytes(padLine('Expected in Drawer:', `${report.cashReconciliation.expectedCashMMK.toLocaleString()} MMK`, widthChars) + '\n'));
  bytes.push(...stringToBytes(padLine('Actual Counted:', `${report.cashReconciliation.actualCountedCashMMK.toLocaleString()} MMK`, widthChars) + '\n'));

  bytes.push(...CMD_BOLD_ON);
  const diff = report.cashReconciliation.discrepancyMMK;
  const diffLabel = diff === 0 ? '0 MMK (BALANCED)' : diff > 0 ? `+${diff.toLocaleString()} MMK (OVER)` : `${diff.toLocaleString()} MMK (SHORT)`;
  bytes.push(...stringToBytes(padLine('DISCREPANCY:', diffLabel, widthChars) + '\n'));
  bytes.push(...CMD_BOLD_OFF);

  if (report.closureNotes) {
    bytes.push(...stringToBytes(`${thinDivider}\n`));
    bytes.push(...stringToBytes(`Notes: ${report.closureNotes.slice(0, widthChars * 2)}\n`));
  }

  // 8. Sign-off
  bytes.push(...stringToBytes(`${thinDivider}\n`));
  bytes.push(...stringToBytes('Cashier Signature: __________________\n\n'));
  bytes.push(...stringToBytes('Manager Signature: __________________\n'));
  bytes.push(...stringToBytes(`${divider}\n`));

  // 9. Footer & Paper Cut
  bytes.push(...CMD_ALIGN_CENTER);
  bytes.push(...stringToBytes('AJ AI STUDIO POS ENTERPRISE PLATFORM\n'));
  bytes.push(...stringToBytes(`Generated: ${new Date(report.generatedAt).toLocaleString()}\n`));
  bytes.push(...CMD_FEED_3);

  if (options.cutPaper !== false) {
    bytes.push(...CMD_CUT_PAPER);
  }

  return new Uint8Array(bytes);
}

/**
 * Builds standalone drawer kick command buffer.
 */
export function buildCashDrawerKickBytes(): Uint8Array {
  return new Uint8Array([...CMD_INIT, ...CMD_KICK_DRAWER_PIN2, ...CMD_KICK_DRAWER_PIN5]);
}

/**
 * Direct WebUSB Thermal Printing
 */
export async function printDirectWebUsb(
  data: Uint8Array
): Promise<{ success: boolean; message: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).usb) {
    return {
      success: false,
      message: 'WebUSB API is not supported on this browser. Please use Chrome, Edge, or Opera.',
    };
  }

  try {
    const navUsb = (navigator as any).usb;
    // Request permission to access USB printer (Printers have interface class 7)
    const device = await navUsb.requestDevice({
      filters: [{ classCode: 7 }],
    });

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Find the OUT endpoint for bulk transfer
    const iface = device.configuration.interfaces[0];
    const endpoint = iface.alternate.endpoints.find(
      (ep: any) => ep.direction === 'out'
    );

    if (!endpoint) {
      throw new Error('No OUT endpoint found on selected USB printer device.');
    }

    await device.transferOut(endpoint.endpointNumber, data);
    await device.close();

    return {
      success: true,
      message: 'Printed successfully via direct WebUSB thermal printer.',
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, message: 'Printer selection was cancelled.' };
    }
    return { success: false, message: err.message || 'WebUSB print failed.' };
  }
}

/**
 * Direct WebSerial Thermal Printing (for RS232 / USB-to-Serial POS Printers)
 */
export async function printDirectWebSerial(
  data: Uint8Array
): Promise<{ success: boolean; message: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).serial) {
    return {
      success: false,
      message: 'WebSerial API is not supported on this browser.',
    };
  }

  try {
    const navSerial = (navigator as any).serial;
    const port = await navSerial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    await port.close();

    return {
      success: true,
      message: 'Printed successfully via WebSerial port.',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'WebSerial print failed.' };
  }
}

/**
 * Direct Hardware Trigger to Kick Open Cash Drawer
 */
export async function kickCashDrawerDirect(): Promise<{ success: boolean; message: string }> {
  const kickBytes = buildCashDrawerKickBytes();
  // Try WebUSB first, then WebSerial
  if (typeof navigator !== 'undefined' && (navigator as any).usb) {
    const res = await printDirectWebUsb(kickBytes);
    if (res.success) return res;
  }
  if (typeof navigator !== 'undefined' && (navigator as any).serial) {
    return printDirectWebSerial(kickBytes);
  }
  return {
    success: false,
    message: 'Hardware USB/Serial interface unavailable. Ensure POS thermal printer is connected via USB.',
  };
}
