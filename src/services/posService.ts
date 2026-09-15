import {
  PosCartLineItem,
  PosTransaction,
  PosShiftRecord,
  PosPaymentMethod,
  PosSplitBreakdown,
} from '../types';
import { CustomerBookingRecord, serverBookingService } from './serverBookingService';
import { getTenantConfig } from '../config/tenantConfig';

const POS_STORAGE_PREFIX = 'aj_pos_';
const POS_TRANSACTIONS_KEY = `${POS_STORAGE_PREFIX}transactions_v1`;
const POS_SHIFT_KEY = `${POS_STORAGE_PREFIX}shift_v1`;

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

    // 3. If tied to a booking, update the server booking record
    if (options.updateServerBookingStatus && completeTransaction.bookingReference) {
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
        console.warn('POS linked booking status sync failed (handled gracefully):', err);
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
}

export const posService = new PosService();
