import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FriendLiveRound {
  roundId: string;
  courseName: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string | null;
  playerNames: string[];
  playerCount: number;
  currentHole: number;
  joinCode: string;
  startedAt: string;
}

export function useFriendActivity() {
  const { user } = useAuth();
  const [liveRounds, setLiveRounds] = useState<FriendLiveRound[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendLiveRounds = useCallback(async () => {
    if (!user) {
      setLiveRounds([]);
      setLoading(false);
      return;
    }

    try {
      // Get friend IDs (accepted friendships only)
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendError || !friendships?.length) {
        setLiveRounds([]);
        setLoading(false);
        return;
      }

      const friendIds = friendships.map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Find active rounds where friends are playing
      // A friend is "playing" if they created a round or are a player in it
      const { data: friendPlayers, error: playersError } = await supabase
        .from('players')
        .select('round_id, profile_id, name')
        .in('profile_id', friendIds)
        .not('is_ghost', 'eq', true);

      if (playersError || !friendPlayers?.length) {
        setLiveRounds([]);
        setLoading(false);
        return;
      }

      const roundIds = [...new Set(friendPlayers.map(p => p.round_id))];

      // Fetch those rounds — only active ones
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, course_name, created_by, join_code, created_at')
        .in('id', roundIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (roundsError || !rounds?.length) {
        setLiveRounds([]);
        setLoading(false);
        return;
      }

      // Also exclude rounds where the current user is already a player
      const { data: myPlayers } = await supabase
        .from('players')
        .select('round_id')
        .eq('profile_id', user.id)
        .in('round_id', rounds.map(r => r.id));

      const myRoundIds = new Set(myPlayers?.map(p => p.round_id) ?? []);

      // Get all players for these rounds to show names
      const { data: allPlayers } = await supabase
        .from('players')
        .select('round_id, name, profile_id, profiles:profile_id(full_name, avatar_url)')
        .in('round_id', rounds.map(r => r.id));

      // Get current hole for each round
      const { data: scores } = await supabase
        .from('scores')
        .select('round_id, hole_number')
        .in('round_id', rounds.map(r => r.id));

      const result: FriendLiveRound[] = rounds
        .filter(r => !myRoundIds.has(r.id)) // exclude rounds I'm already in
        .map(r => {
          const roundPlayers = allPlayers?.filter(p => p.round_id === r.id) ?? [];
          const creatorPlayer = roundPlayers.find(p => p.profile_id === r.created_by);
          const profile = creatorPlayer?.profiles as { full_name?: string; avatar_url?: string } | null;

          const roundScores = scores?.filter(s => s.round_id === r.id) ?? [];
          const currentHole = roundScores.length > 0
            ? Math.max(...roundScores.map(s => s.hole_number))
            : 0;

          return {
            roundId: r.id,
            courseName: r.course_name,
            creatorId: r.created_by,
            creatorName: profile?.full_name ?? creatorPlayer?.name ?? 'Unknown',
            creatorAvatar: profile?.avatar_url ?? null,
            playerNames: roundPlayers.map(p => {
              const pp = p.profiles as { full_name?: string } | null;
              return pp?.full_name?.split(' ')[0] ?? p.name?.split(' ')[0] ?? 'Player';
            }),
            playerCount: roundPlayers.length,
            currentHole,
            joinCode: r.join_code ?? '',
            startedAt: r.created_at ?? '',
          };
        });

      setLiveRounds(result);
    } catch {
      setLiveRounds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriendLiveRounds();

    // Refresh every 60 seconds for live updates
    const interval = setInterval(fetchFriendLiveRounds, 60000);
    return () => clearInterval(interval);
  }, [fetchFriendLiveRounds]);

  return { liveRounds, loading, refetch: fetchFriendLiveRounds };
}
