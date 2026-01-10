import { useState, useEffect, useCallback } from 'react';
import { SyncService, SyncStatus } from '@/lib/sync-service';

interface UseSyncStatusReturn {
  status: SyncStatus;
  message: string | undefined;
  pendingCount: number;
  isSyncing: boolean;
  forceSync: () => Promise<void>;
  clearFailed: () => Promise<void>;
}

export function useSyncStatus(): UseSyncStatusReturn {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [message, setMessage] = useState<string | undefined>();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = SyncService.addSyncListener((newStatus, newMessage) => {
      setStatus(newStatus);
      setMessage(newMessage);
    });

    // Get initial pending count
    SyncService.getPendingCount().then(setPendingCount);

    // Update pending count periodically
    const interval = setInterval(async () => {
      const count = await SyncService.getPendingCount();
      setPendingCount(count);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const forceSync = useCallback(async () => {
    await SyncService.forceSync();
    const count = await SyncService.getPendingCount();
    setPendingCount(count);
  }, []);

  const clearFailed = useCallback(async () => {
    await SyncService.clearFailedOperations();
    const count = await SyncService.getPendingCount();
    setPendingCount(count);
  }, []);

  return {
    status,
    message,
    pendingCount,
    isSyncing: status === 'syncing',
    forceSync,
    clearFailed,
  };
}
