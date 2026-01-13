import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  queueScore, 
  getUnsyncedScores, 
  markScoreSynced, 
  cleanupSyncedScores,
  getPendingCount 
} from '@/lib/offlineDb';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import { toast } from 'sonner';

// Background Sync tag
const SYNC_TAG = 'sync-scores';

/**
 * Check if Background Sync API is supported
 */
function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Register for background sync
 */
async function registerBackgroundSync(): Promise<boolean> {
  if (!isBackgroundSyncSupported()) {
    console.log('[OfflineSync] Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // Use type assertion since sync is not in standard TS types yet
    await (registration as any).sync.register(SYNC_TAG);
    console.log('[OfflineSync] Background sync registered');
    return true;
  } catch (error) {
    console.error('[OfflineSync] Failed to register background sync:', error);
    return false;
  }
}

/**
 * Send Supabase config to service worker
 */
async function configureServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'SUPABASE_CONFIG',
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    });
    console.log('[OfflineSync] Service worker configured');
  } catch (error) {
    console.error('[OfflineSync] Failed to configure service worker:', error);
  }
}

/**
 * Register for periodic background sync (if supported)
 */
async function registerPeriodicSync(): Promise<boolean> {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.log('[OfflineSync] Periodic Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // Check permission
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    });

    if (status.state === 'granted') {
      await (registration as any).periodicSync.register('sync-scores-periodic', {
        minInterval: 15 * 60 * 1000, // 15 minutes minimum
      });
      console.log('[OfflineSync] Periodic background sync registered');
      return true;
    }
  } catch (error) {
    console.error('[OfflineSync] Failed to register periodic sync:', error);
  }
  return false;
}

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  backgroundSyncSupported: boolean;
  syncNow: () => Promise<void>;
  saveScoreOffline: (roundId: string, playerId: string, holeNumber: number, strokes: number) => Promise<void>;
}

/**
 * Hook for managing offline data sync
 * Automatically syncs when coming back online
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [backgroundSyncSupported] = useState(isBackgroundSyncSupported);
  const swConfigured = useRef(false);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Sync all pending scores to server
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    console.log('[OfflineSync] Starting sync...');

    try {
      const unsyncedScores = await getUnsyncedScores();
      
      if (unsyncedScores.length === 0) {
        console.log('[OfflineSync] No pending scores to sync');
        setIsSyncing(false);
        return;
      }

      console.log(`[OfflineSync] Syncing ${unsyncedScores.length} scores...`);

      // Group scores by round and player for efficient upsert
      for (const score of unsyncedScores) {
        try {
          const { error } = await supabase
            .from('scores')
            .upsert(
              {
                round_id: score.roundId,
                player_id: score.playerId,
                hole_number: score.holeNumber,
                strokes: score.strokes,
              },
              {
                onConflict: 'round_id,player_id,hole_number',
              }
            );

          if (error) {
            console.error('[OfflineSync] Failed to sync score:', error);
          } else {
            await markScoreSynced(score.id);
            console.log('[OfflineSync] Synced score:', score.id);
          }
        } catch (err) {
          console.error('[OfflineSync] Error syncing score:', err);
        }
      }

      // Cleanup old synced scores
      await cleanupSyncedScores();
      await updatePendingCount();

      hapticSuccess();
      toast.success('Scores synced successfully');
      console.log('[OfflineSync] Sync complete');
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      hapticWarning();
      toast.error('Failed to sync some scores');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Save a score (queues offline if no connection)
  const saveScoreOffline = useCallback(async (
    roundId: string,
    playerId: string,
    holeNumber: number,
    strokes: number
  ) => {
    if (isOnline) {
      // Try to save directly
      try {
        const { error } = await supabase
          .from('scores')
          .upsert(
            {
              round_id: roundId,
              player_id: playerId,
              hole_number: holeNumber,
              strokes,
            },
            {
              onConflict: 'round_id,player_id,hole_number',
            }
          );

        if (error) throw error;
        return;
      } catch (error) {
        console.log('[OfflineSync] Online save failed, queuing offline:', error);
      }
    }

    // Queue for offline sync
    await queueScore(roundId, playerId, holeNumber, strokes);
    await updatePendingCount();
    
    // Register for background sync so it syncs even if app is closed
    if (backgroundSyncSupported) {
      registerBackgroundSync();
    }
    
    console.log('[OfflineSync] Score queued for offline sync');
  }, [isOnline, updatePendingCount, backgroundSyncSupported]);

  // Configure service worker with Supabase credentials
  useEffect(() => {
    if (!swConfigured.current) {
      configureServiceWorker();
      registerPeriodicSync();
      swConfigured.current = true;
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Back online');
      setIsOnline(true);
      hapticSuccess();
      toast.success('Back online');
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Gone offline');
      setIsOnline(false);
      hapticWarning();
      toast.warning('You are offline - scores will sync when back online');
      
      // Register for background sync when going offline
      if (backgroundSyncSupported) {
        registerBackgroundSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updatePendingCount, backgroundSyncSupported]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        syncNow();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, syncNow]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    backgroundSyncSupported,
    syncNow,
    saveScoreOffline,
  };
}
