import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LeaderboardEntry {
  friendProfileId: string;
  friendName: string;
  friendAvatar: string | null;
  netAmount: number;   // positive = viewer won money from this person; negative = viewer owes
  roundCount: number;
}

export function useSeasonLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_season_leaderboard', {
        viewer_id: user.id,
      });
      if (error) throw error;
      setEntries(
        (data ?? []).map((r: any) => ({
          friendProfileId: r.friend_profile_id,
          friendName: r.friend_name ?? 'Unknown',
          friendAvatar: r.friend_avatar ?? null,
          netAmount: Number(r.net_amount ?? 0),
          roundCount: Number(r.round_count ?? 0),
        }))
      );
    } catch (err) {
      console.error('useSeasonLeaderboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entries, loading, refetch: fetch };
}
