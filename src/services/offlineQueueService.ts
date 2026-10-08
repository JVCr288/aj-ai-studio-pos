import { PosTransaction, PosZReport } from '../types';
import { serverBookingService } from './serverBookingService';

export interface OfflineQueueItem {
  id: string;
  type: 'TRANSACTION' | 'BOOKING_SYNC' | 'SHIFT_REPORT';
  payload: any;
  queuedAt: string;
  retryCount: number;
  lastError?: string;
}

const OFFLINE_QUEUE_STORAGE_KEY = 'aj_pos_offline_queue_v1';

class OfflineQueueService {
  private inMemoryQueue: OfflineQueueItem[] = [];
  private listeners: Set<(items: OfflineQueueItem[]) => void> = new Set();
  private isFlushing = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      if (data) {
        this.inMemoryQueue = JSON.parse(data);
      }
    } catch (err) {
      console.warn('[OfflineQueue] Failed to load from storage:', err);
    }
  }

  private persist() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(this.inMemoryQueue));
      } catch (err) {
        console.warn('[OfflineQueue] Failed to persist queue:', err);
      }
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener([...this.inMemoryQueue]);
      } catch (e) {
        console.error('[OfflineQueue] Listener error:', e);
      }
    }
  }

  public subscribe(callback: (items: OfflineQueueItem[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.inMemoryQueue]);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getPendingItems(): OfflineQueueItem[] {
    return [...this.inMemoryQueue];
  }

  public getPendingCount(): number {
    return this.inMemoryQueue.length;
  }

  public enqueueTransaction(tx: PosTransaction): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: `queue-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'TRANSACTION',
      payload: tx,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    this.inMemoryQueue.push(item);
    this.persist();
    return item;
  }

  public enqueueBookingSync(tenantId: string, bookingId: string, totalAmount: number, details: string, cashier: string): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: `queue-bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'BOOKING_SYNC',
      payload: { tenantId, bookingId, totalAmount, details, cashier },
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    this.inMemoryQueue.push(item);
    this.persist();
    return item;
  }

  public enqueueShiftReport(report: PosZReport): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: `queue-shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'SHIFT_REPORT',
      payload: report,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    this.inMemoryQueue.push(item);
    this.persist();
    return item;
  }

  public dequeue(id: string) {
    this.inMemoryQueue = this.inMemoryQueue.filter((it) => it.id !== id);
    this.persist();
  }

  public clearQueue() {
    this.inMemoryQueue = [];
    this.persist();
  }

  /**
   * Sequentially flushes all pending offline items to the server API.
   */
  public async flushQueue(): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isFlushing || this.inMemoryQueue.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isFlushing = true;
    let syncedCount = 0;
    let failedCount = 0;

    const itemsToProcess = [...this.inMemoryQueue];
    const apiOrigin = typeof window !== 'undefined' ? '' : 'http://localhost:4000';

    for (const item of itemsToProcess) {
      try {
        if (item.type === 'TRANSACTION') {
          const res = await fetch(`${apiOrigin}/api/pos/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.dequeue(item.id);
          syncedCount++;
        } else if (item.type === 'SHIFT_REPORT') {
          const res = await fetch(`${apiOrigin}/api/pos/shifts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.dequeue(item.id);
          syncedCount++;
        } else if (item.type === 'BOOKING_SYNC') {
          const { tenantId, bookingId, totalAmount, details, cashier } = item.payload;
          const updated = await serverBookingService.reviewPaymentEvidence(
            tenantId,
            bookingId,
            'VERIFY',
            totalAmount,
            details,
            cashier
          );
          await serverBookingService.updateBookingStatus(
            tenantId,
            bookingId,
            'CONFIRMED',
            `Offline sync balance settlement.`,
            updated.revision,
            cashier
          );
          this.dequeue(item.id);
          syncedCount++;
        }
      } catch (err: any) {
        failedCount++;
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = err.message || 'Network sync failed';
        this.persist();
      }
    }

    this.isFlushing = false;
    return { syncedCount, failedCount };
  }
}

export const offlineQueueService = new OfflineQueueService();
