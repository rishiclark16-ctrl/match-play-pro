import { useState, useEffect, useCallback } from 'react';
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

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
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
    console.log('[OfflineSync] Score queued for offline sync');
  }, [isOnline, updatePendingCount]);

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
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updatePendingCount]);

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
    syncNow,
    saveScoreOffline,
  };
}
