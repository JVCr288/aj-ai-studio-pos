import { useState, useEffect, useCallback } from 'react';
import { offlineQueueService, OfflineQueueItem } from '../services/offlineQueueService';

export interface UseOfflineSyncResult {
  isOnline: boolean;
  pendingCount: number;
  pendingItems: OfflineQueueItem[];
  isSyncing: boolean;
  lastSyncResult: { syncedCount: number; failedCount: number; timestamp: number } | null;
  syncNow: () => Promise<{ syncedCount: number; failedCount: number }>;
}

export function useOfflineSync(onSyncSuccess?: (syncedCount: number) => void): UseOfflineSyncResult {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [pendingItems, setPendingItems] = useState<OfflineQueueItem[]>(() =>
    offlineQueueService.getPendingItems()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    syncedCount: number;
    failedCount: number;
    timestamp: number;
  } | null>(null);

  // Sync handler
  const syncNow = useCallback(async () => {
    if (isSyncing) return { syncedCount: 0, failedCount: 0 };
    setIsSyncing(true);
    try {
      const res = await offlineQueueService.flushQueue();
      setLastSyncResult({ ...res, timestamp: Date.now() });
      if (res.syncedCount > 0 && onSyncSuccess) {
        onSyncSuccess(res.syncedCount);
      }
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, onSyncSuccess]);

  // Subscribe to offline queue changes
  useEffect(() => {
    const unsubscribe = offlineQueueService.subscribe((items) => {
      setPendingItems(items);
    });
    return unsubscribe;
  }, []);

  // Monitor network online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-flush pending queue when internet connection restores
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  return {
    isOnline,
    pendingCount: pendingItems.length,
    pendingItems,
    isSyncing,
    lastSyncResult,
    syncNow,
  };
}
