import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LedgerSyncEntry {
  profileId: string;
  amount: number;
  gameBreakdown: Record<string, number>;
}

export function useRoundLedgerSync() {
  /**
   * Upserts all player result entries for a completed round into the group ledger.
   * Safe to call multiple times — upserts on (group_id, round_id, profile_id).
   *
   * @param roundId       - The finished round's ID
   * @param groupId       - The group to post results to
   * @param settlements   - Array of per-player amounts and game breakdowns
   */
  const syncRoundToLedger = useCallback(
    async (
      roundId: string,
      groupId: string,
      settlements: LedgerSyncEntry[]
    ): Promise<void> => {
      if (!roundId || !groupId || settlements.length === 0) return;

      const rows = settlements.map(s => ({
        group_id: groupId,
        round_id: roundId,
        profile_id: s.profileId,
        amount: s.amount,
        game_breakdown: s.gameBreakdown,
      }));

      const { error } = await supabase
        .from('group_ledger_entries')
        .upsert(rows, { onConflict: 'group_id,round_id,profile_id' });

      if (error) {
        console.error('[useRoundLedgerSync] syncRoundToLedger error:', error);
        throw error;
      }
    },
    []
  );

  return { syncRoundToLedger };
}
