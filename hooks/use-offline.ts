import { useState, useEffect } from 'react';
import { CacheService } from '@/lib/cache-service';

/**
 * Hook para monitorar o estado de conexão offline
 */
export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize cache service
    CacheService.initialize();

    // Get initial state
    setIsOffline(CacheService.getOfflineState());

    // Load last sync time
    CacheService.getLastSync().then(setLastSync);

    // Subscribe to offline state changes
    const unsubscribe = CacheService.addOfflineListener((offline) => {
      setIsOffline(offline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshLastSync = async () => {
    const sync = await CacheService.getLastSync();
    setLastSync(sync);
  };

  return {
    isOffline,
    lastSync,
    lastSyncFormatted: CacheService.formatLastSync(lastSync),
    refreshLastSync,
  };
}
