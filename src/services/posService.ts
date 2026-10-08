import {
  PosCartLineItem,
  PosTransaction,
  PosShiftRecord,
  PosPaymentMethod,
  PosSplitBreakdown,
  PosZReport,
  PosCashMovement,
  PosStaffRole,
} from '../types';
import { CustomerBookingRecord, serverBookingService } from './serverBookingService';
import { getTenantConfig } from '../config/tenantConfig';
import { offlineQueueService } from './offlineQueueService';

const POS_STORAGE_PREFIX = 'aj_pos_';
const POS_TRANSACTIONS_KEY = `${POS_STORAGE_PREFIX}transactions_v1`;
const POS_SHIFT_KEY = `${POS_STORAGE_PREFIX}shift_v1`;
const POS_SHIFT_HISTORY_KEY = `${POS_STORAGE_PREFIX}shift_history_v1`;

let inMemoryShift: PosShiftRecord | null = null;
let inMemoryTransactions: PosTransaction[] = [];

export interface OvertimeAddonPreset {
  id: string;
  title: string;
  myanmarTitle: string;
  unitPriceMMK: number;
  category: 'OVERTIME' | 'ADDON_SERVICE';
  badge: string;
  notes?: string;
}

export const OVERTIME_ADDON_PRESETS: OvertimeAddonPreset[] = [
  {
    id: 'preset-ot-30m',
    title: 'Studio Overtime (30 Mins)',
    myanmarTitle: 'Studio Bay Overtime (30 Mins)',
    unitPriceMMK: 25000,
    category: 'OVERTIME',
    badge: '+30m OT',
    notes: 'Studio bay and continuous lighting extension for 30 minutes.',
  },
  {
    id: 'preset-ot-1h',
    title: 'Studio Overtime (1 Hour)',
    myanmarTitle: 'Studio Bay Overtime (1 Hour)',
    unitPriceMMK: 45000,
    category: 'OVERTIME',
    badge: '+1h OT',
    notes: 'Full studio bay, tethering tech, and equipment extension for 60 minutes.',
  },
  {
    id: 'preset-ot-2h',
    title: 'Studio Overtime (2 Hours)',
    myanmarTitle: 'Studio Bay Overtime (2 Hours)',
    unitPriceMMK: 80000,
    category: 'OVERTIME',
    badge: '+2h OT',
    notes: 'Extended production block with dedicated bay support.',
  },
  {
    id: 'preset-addon-mua',
    title: 'Studio Makeup & Hair Styling (MUA)',
    myanmarTitle: 'On-Site Makeup & Hair Styling',
    unitPriceMMK: 50000,
    category: 'ADDON_SERVICE',
    badge: 'MUA',
    notes: 'Professional on-site makeup artist touch-up session.',
  },
  {
    id: 'preset-addon-lighting-assist',
    title: 'Dedicated Lighting Assistant',
    myanmarTitle: 'Dedicated Lighting Assistant',
    unitPriceMMK: 30000,
    category: 'ADDON_SERVICE',
    badge: 'CREW',
    notes: 'Dedicated gaffer & lighting grip assistant throughout session.',
  },
  {
    id: 'preset-addon-retouch-5',
    title: 'High-End Master Retouching (5 Photos)',
    myanmarTitle: 'High-End Master Retouching (5 Photos)',
    unitPriceMMK: 25000,
    category: 'ADDON_SERVICE',
    badge: 'RETOUCH',
    notes: 'Magazine-grade skin texture preservation & color grading.',
  },
  {
    id: 'preset-addon-rush-deliver',
    title: 'Priority 24-Hour Vault Deliverable',
    myanmarTitle: 'Priority 24-Hour Vault Delivery',
    unitPriceMMK: 35000,
    category: 'ADDON_SERVICE',
    badge: 'RUSH',
    notes: 'Fast-tracked color grading & priority vault upload.',
  },
];

export class PosService {
  /**
   * Search for existing booking by reference number, phone, or guest name.
   */
  public async lookupBookingForDesk(
    searchQuery: string,
    tenantId: string = 'aj-ai-studio'
  ): Promise<CustomerBookingRecord[]> {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();

    // Query in-memory repository or server API
    try {
      const result = await serverBookingService.queryAdminBookings(tenantId, {
        query,
        pageSize: 10,
      });
      return result.items;
    } catch {
      return [];
    }
  }

  /**
   * Get the current active POS shift record or initialize a fresh one.
   */
  public getActiveShift(terminalId: string = 'TERM-01', staffName: string = 'Aung Kyaw'): PosShiftRecord {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(POS_SHIFT_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore error
        }
      }
    } else if (inMemoryShift) {
      return inMemoryShift;
    }

    const defaultShift: PosShiftRecord = {
      shiftId: `SHIFT-${new Date().toISOString().slice(0, 10)}-01`,
      terminalId,
      staffName,
      openedAt: new Date().toISOString(),
      startingCashMMK: 100000, // 100,000 MMK float in drawer
      cashInDrawerMMK: 100000,
      totalCashSalesMMK: 0,
      totalDigitalSalesMMK: 0,
      totalTransactionsCount: 0,
      status: 'OPEN',
    };

    this.saveShift(defaultShift);
    return defaultShift;
  }

  /**
   * Save shift state to storage.
   */
  public saveShift(shift: PosShiftRecord): void {
    inMemoryShift = shift;
    if (typeof window !== 'undefined') {
      localStorage.setItem(POS_SHIFT_KEY, JSON.stringify(shift));
    }
  }

  /**
   * Record a completed POS sale transaction.
   */
  public async recordTransaction(
    transactionData: Omit<PosTransaction, 'id' | 'receiptNumber' | 'timestamp' | 'transactionStatus'>,
    options: { updateServerBookingStatus?: boolean } = { updateServerBookingStatus: true }
  ): Promise<PosTransaction> {
    const timestamp = new Date().toISOString();
    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `RCP-${transactionData.tenantId.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${orderNumber}`;

    const completeTransaction: PosTransaction = {
      ...transactionData,
      id: `pos-tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      receiptNumber,
      timestamp,
      transactionStatus: 'COMPLETED',
    };

    // 1. Save to local storage
    const transactions = this.getAllTransactions();
    transactions.unshift(completeTransaction);
    inMemoryTransactions = transactions;
    if (typeof window !== 'undefined') {
      localStorage.setItem(POS_TRANSACTIONS_KEY, JSON.stringify(transactions.slice(0, 200)));
    }

    // 2. Update active shift ledger
    const shift = this.getActiveShift(completeTransaction.terminalId, completeTransaction.cashierName);
    if (completeTransaction.paymentMethod === 'CASH') {
      shift.cashInDrawerMMK += completeTransaction.totalDueMMK;
      shift.totalCashSalesMMK += completeTransaction.totalDueMMK;
    } else if (completeTransaction.paymentMethod === 'SPLIT' && completeTransaction.splitDetails) {
      shift.cashInDrawerMMK += completeTransaction.splitDetails.cashAmountMMK;
      shift.totalCashSalesMMK += completeTransaction.splitDetails.cashAmountMMK;
      shift.totalDigitalSalesMMK += completeTransaction.splitDetails.digitalAmountMMK;
    } else {
      shift.totalDigitalSalesMMK += completeTransaction.totalDueMMK;
    }
    shift.totalTransactionsCount += 1;
    this.saveShift(shift);

    // 3. Server sync & Offline Queueing
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (isOffline) {
      offlineQueueService.enqueueTransaction(completeTransaction);
    } else if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeTransaction),
      }).catch((err) => {
        console.warn('[POS] Failed to push transaction to server API, queueing offline:', err);
        offlineQueueService.enqueueTransaction(completeTransaction);
      });
    }

    // 4. If tied to a booking, update the server booking record (or queue if offline)
    if (options.updateServerBookingStatus && completeTransaction.bookingReference) {
      if (isOffline) {
        offlineQueueService.enqueueBookingSync(
          completeTransaction.tenantId,
          completeTransaction.bookingReference,
          completeTransaction.totalDueMMK,
          `POS Settlement on ${completeTransaction.terminalId} by ${completeTransaction.cashierName}. Receipt: ${receiptNumber}`,
          completeTransaction.cashierName
        );
      } else {
        try {
          const bookings = await this.lookupBookingForDesk(
            completeTransaction.bookingReference,
            completeTransaction.tenantId
          );
          const targetBooking = bookings.find(
            (b) => b.bookingReference === completeTransaction.bookingReference
          );

          if (targetBooking) {
            // Review and verify payment
            const updatedBooking = await serverBookingService.reviewPaymentEvidence(
              completeTransaction.tenantId,
              targetBooking.id,
              'VERIFY',
              targetBooking.totalAmount,
              `POS Settlement on ${completeTransaction.terminalId} by ${completeTransaction.cashierName}. Receipt: ${receiptNumber}`,
              completeTransaction.cashierName
            );

            // Update status to CONFIRMED or CHECKED_IN
            await serverBookingService.updateBookingStatus(
              completeTransaction.tenantId,
              targetBooking.id,
              'CONFIRMED',
              `Customer checked in at POS desk with full balance settled.`,
              updatedBooking.revision,
              completeTransaction.cashierName
            );
          }
        } catch (err) {
          console.warn('POS linked booking status sync failed, queueing offline:', err);
          offlineQueueService.enqueueBookingSync(
            completeTransaction.tenantId,
            completeTransaction.bookingReference,
            completeTransaction.totalDueMMK,
            `POS Settlement on ${completeTransaction.terminalId} by ${completeTransaction.cashierName}. Receipt: ${receiptNumber}`,
            completeTransaction.cashierName
          );
        }
      }
    }

    return completeTransaction;
  }

  /**
   * Fetch all historical transactions from storage.
   */
  public getAllTransactions(): PosTransaction[] {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(POS_TRANSACTIONS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore error
        }
      }
    }
    return inMemoryTransactions;
  }

  /**
   * Helper to compile X-Report or Z-Report financial data from transactions.
   */
  private compileReportData(
    shift: PosShiftRecord,
    reportType: 'X_REPORT' | 'Z_REPORT',
    countedCash?: number,
    closureNotes?: string,
    tenantId: string = 'aj-ai-studio'
  ): PosZReport {
    const transactions = this.getAllTransactions().filter(
      (tx) => tx.terminalId === shift.terminalId && new Date(tx.timestamp).getTime() >= new Date(shift.openedAt).getTime()
    );

    let grossSalesMMK = 0;
    let netSalesMMK = 0;
    let totalDiscountMMK = 0;
    let totalTaxMMK = 0;

    const tenderBreakdown = {
      cashMMK: 0,
      kbzpayMMK: 0,
      wavepayMMK: 0,
      ayapayMMK: 0,
      splitTotalMMK: 0,
    };

    const categoryBreakdown: Record<string, { count: number; totalMMK: number }> = {};

    for (const tx of transactions) {
      grossSalesMMK += tx.subtotalMMK;
      netSalesMMK += tx.totalDueMMK;
      totalDiscountMMK += tx.discountMMK || 0;
      totalTaxMMK += tx.taxMMK || 0;

      // Tender breakdown
      if (tx.paymentMethod === 'CASH') {
        tenderBreakdown.cashMMK += tx.totalDueMMK;
      } else if (tx.paymentMethod === 'KBZPAY') {
        tenderBreakdown.kbzpayMMK += tx.totalDueMMK;
      } else if (tx.paymentMethod === 'WAVEPAY') {
        tenderBreakdown.wavepayMMK += tx.totalDueMMK;
      } else if (tx.paymentMethod === 'AYA_PAY') {
        tenderBreakdown.ayapayMMK += tx.totalDueMMK;
      } else if (tx.paymentMethod === 'SPLIT' && tx.splitDetails) {
        tenderBreakdown.splitTotalMMK += tx.totalDueMMK;
        tenderBreakdown.cashMMK += tx.splitDetails.cashAmountMMK;
        if (tx.splitDetails.digitalGateway === 'KBZPay') {
          tenderBreakdown.kbzpayMMK += tx.splitDetails.digitalAmountMMK;
        } else if (tx.splitDetails.digitalGateway === 'WavePay') {
          tenderBreakdown.wavepayMMK += tx.splitDetails.digitalAmountMMK;
        } else if (tx.splitDetails.digitalGateway === 'AYA Pay') {
          tenderBreakdown.ayapayMMK += tx.splitDetails.digitalAmountMMK;
        }
      }

      // Line items category breakdown
      for (const item of tx.items) {
        if (!categoryBreakdown[item.category]) {
          categoryBreakdown[item.category] = { count: 0, totalMMK: 0 };
        }
        categoryBreakdown[item.category].count += item.quantity;
        categoryBreakdown[item.category].totalMMK += item.unitPriceMMK * item.quantity;
      }
    }

    const totalCashDropsMMK = shift.totalCashDropsMMK || 0;
    const totalCashInMMK = shift.totalCashInMMK || 0;
    const expectedCashMMK = shift.startingCashMMK + shift.totalCashSalesMMK + totalCashInMMK - totalCashDropsMMK;
    const actualCountedCashMMK = countedCash !== undefined ? countedCash : shift.cashInDrawerMMK;
    const discrepancyMMK = actualCountedCashMMK - expectedCashMMK;

    const discrepancyType: 'BALANCED' | 'SHORTAGE' | 'OVERAGE' =
      discrepancyMMK === 0 ? 'BALANCED' : discrepancyMMK < 0 ? 'SHORTAGE' : 'OVERAGE';

    const reportId = `${reportType === 'Z_REPORT' ? 'ZR' : 'XR'}-${shift.terminalId}-${Date.now().toString().slice(-6)}`;

    return {
      reportType,
      reportId,
      generatedAt: new Date().toISOString(),
      shiftId: shift.shiftId,
      terminalId: shift.terminalId,
      staffName: shift.staffName,
      tenantId,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      grossSalesMMK,
      netSalesMMK,
      totalDiscountMMK,
      totalTaxMMK,
      totalTransactions: transactions.length,
      tenderBreakdown,
      categoryBreakdown,
      cashReconciliation: {
        startingCashMMK: shift.startingCashMMK,
        cashSalesMMK: shift.totalCashSalesMMK,
        totalCashDropsMMK,
        totalCashInMMK,
        expectedCashMMK,
        actualCountedCashMMK,
        discrepancyMMK,
        discrepancyType,
      },
      cashMovements: shift.cashMovements || [],
      closureNotes: closureNotes || shift.closureNotes,
    };
  }

  /**
   * Generate an X-Report (Mid-Shift Audit snapshot without closing the shift).
   */
  public generateXReport(
    terminalId: string = 'TERM-01',
    staffName: string = 'Aung Kyaw',
    countedCash?: number,
    tenantId: string = 'aj-ai-studio'
  ): PosZReport {
    const shift = this.getActiveShift(terminalId, staffName);
    return this.compileReportData(shift, 'X_REPORT', countedCash, undefined, tenantId);
  }

  /**
   * Finalize and close the current shift, record cash drawer reconciliation, and generate a Z-Report.
   */
  public closeShiftAndGenerateZReport(params: {
    terminalId?: string;
    staffName?: string;
    actualCashInDrawerMMK: number;
    closureNotes?: string;
    tenantId?: string;
  }): { shift: PosShiftRecord; zReport: PosZReport } {
    const terminalId = params.terminalId || 'TERM-01';
    const staffName = params.staffName || 'Aung Kyaw';
    const tenantId = params.tenantId || 'aj-ai-studio';

    const shift = this.getActiveShift(terminalId, staffName);
    const totalCashDropsMMK = shift.totalCashDropsMMK || 0;
    const totalCashInMMK = shift.totalCashInMMK || 0;
    const expectedCashMMK = shift.startingCashMMK + shift.totalCashSalesMMK + totalCashInMMK - totalCashDropsMMK;
    const discrepancyMMK = params.actualCashInDrawerMMK - expectedCashMMK;

    shift.status = 'CLOSED';
    shift.closedAt = new Date().toISOString();
    shift.closedBy = staffName;
    shift.actualCashInDrawerMMK = params.actualCashInDrawerMMK;
    shift.cashDiscrepancyMMK = discrepancyMMK;
    shift.closureNotes = params.closureNotes;

    // Save updated closed shift
    this.saveShift(shift);

    // Archive into shift history
    this.archiveShift(shift);

    // Compile formal Z-Report
    const zReport = this.compileReportData(
      shift,
      'Z_REPORT',
      params.actualCashInDrawerMMK,
      params.closureNotes,
      tenantId
    );

    // Push Z-Report to server or queue offline
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline) {
      offlineQueueService.enqueueShiftReport(zReport);
    } else if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zReport),
      }).catch((e) => {
        console.warn('Failed to push Z-report to server, queueing offline:', e);
        offlineQueueService.enqueueShiftReport(zReport);
      });
    }

    return { shift, zReport };
  }

  /**
   * Archive a closed shift record into persistent history.
   */
  public archiveShift(shift: PosShiftRecord): void {
    if (typeof window !== 'undefined') {
      try {
        const historyJson = localStorage.getItem(POS_SHIFT_HISTORY_KEY);
        const history: PosShiftRecord[] = historyJson ? JSON.parse(historyJson) : [];
        history.unshift(shift);
        localStorage.setItem(POS_SHIFT_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
      } catch (err) {
        console.warn('Failed to archive shift history:', err);
      }
    }
  }

  /**
   * Open a fresh active shift with float cash in drawer.
   */
  public openNewShift(
    terminalId: string = 'TERM-01',
    staffName: string = 'Aung Kyaw',
    startingCashMMK: number = 100000
  ): PosShiftRecord {
    const shiftId = `SHIFT-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`;
    const newShift: PosShiftRecord = {
      shiftId,
      terminalId,
      staffName,
      openedAt: new Date().toISOString(),
      startingCashMMK,
      cashInDrawerMMK: startingCashMMK,
      totalCashSalesMMK: 0,
      totalDigitalSalesMMK: 0,
      totalTransactionsCount: 0,
      status: 'OPEN',
      cashMovements: [],
      totalCashDropsMMK: 0,
      totalCashInMMK: 0,
    };

    this.saveShift(newShift);
    return newShift;
  }

  /**
   * Record a Cash Drop (Paid Out to safe/petty cash) or Cash In (Float top-up).
   */
  public recordCashMovement(params: {
    type: 'CASH_DROP' | 'CASH_IN';
    amountMMK: number;
    reason: string;
    performedBy: string;
    staffId?: string;
    staffRole?: PosStaffRole;
    authorizedBy?: string;
    terminalId?: string;
  }): { shift: PosShiftRecord; movement: PosCashMovement } {
    const shift = this.getActiveShift(params.terminalId || 'TERM-01', params.performedBy);
    if (shift.status !== 'OPEN') {
      throw new Error('CANNOT_MODIFY_CLOSED_SHIFT: Active register shift is already closed.');
    }

    const movement: PosCashMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: params.type,
      amountMMK: params.amountMMK,
      reason: params.reason,
      performedBy: params.performedBy,
      staffId: params.staffId,
      staffRole: params.staffRole,
      authorizedBy: params.authorizedBy,
      timestamp: new Date().toISOString(),
    };

    if (!shift.cashMovements) {
      shift.cashMovements = [];
    }
    shift.cashMovements.unshift(movement);

    if (params.type === 'CASH_DROP') {
      shift.cashInDrawerMMK = Math.max(0, shift.cashInDrawerMMK - params.amountMMK);
      shift.totalCashDropsMMK = (shift.totalCashDropsMMK || 0) + params.amountMMK;
    } else {
      shift.cashInDrawerMMK += params.amountMMK;
      shift.totalCashInMMK = (shift.totalCashInMMK || 0) + params.amountMMK;
    }

    this.saveShift(shift);
    return { shift, movement };
  }

  /**
   * Retrieve historical closed register shifts.
   */
  public getShiftHistory(): PosShiftRecord[] {
    if (typeof window !== 'undefined') {
      try {
        const historyJson = localStorage.getItem(POS_SHIFT_HISTORY_KEY);
        if (historyJson) {
          return JSON.parse(historyJson);
        }
      } catch (err) {
        console.warn('Failed to read shift history:', err);
      }
    }
    return [];
  }
}

export const posService = new PosService();
