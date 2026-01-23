import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Round } from '@/types/golf';
import { transformRound, DbRound } from '@/lib/transformers';
import { useAuth } from '@/hooks/useAuth';

export interface RoundStats {
  playerCount: number;
  currentHole: number;
}

interface RoundsQueryResult {
  myRounds: Round[];
  sharedRounds: Round[];
  stats: Map<string, RoundStats>;
}

async function fetchUserRounds(userId: string): Promise<RoundsQueryResult> {
  // Fetch my rounds (where I'm the creator)
  const { data: myRoundsData, error: myRoundsError } = await supabase
    .from('rounds')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (myRoundsError) throw myRoundsError;

  // Fetch rounds I'm a player in but didn't create
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('round_id')
    .eq('profile_id', userId);

  if (playerError) throw playerError;

  const playerRoundIds = playerData?.map(p => p.round_id).filter(Boolean) || [];
  const myRoundIds = myRoundsData?.map(r => r.id) || [];
  const sharedRoundIds = playerRoundIds.filter(id => !myRoundIds.includes(id));

  let sharedRoundsData: DbRound[] = [];
  if (sharedRoundIds.length > 0) {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .in('id', sharedRoundIds)
      .order('created_at', { ascending: false });

    if (!error && data) {
      sharedRoundsData = data;
    }
  }

  const myRounds = (myRoundsData || []).map(transformRound);
  const sharedRounds = sharedRoundsData.map(transformRound);

  // Fetch player counts and current holes for all rounds
  const allRoundIds = [...myRoundIds, ...sharedRoundIds];
  const stats = new Map<string, RoundStats>();

  if (allRoundIds.length > 0) {
    const { data: playersData } = await supabase
      .from('players')
      .select('round_id')
      .in('round_id', allRoundIds);

    const { data: scoresData } = await supabase
      .from('scores')
      .select('round_id, hole_number')
      .in('round_id', allRoundIds);

    allRoundIds.forEach(roundId => {
      const playerCount = playersData?.filter(p => p.round_id === roundId).length || 0;
      const roundScores = scoresData?.filter(s => s.round_id === roundId) || [];
      const currentHole = roundScores.length > 0
        ? Math.max(...roundScores.map(s => s.hole_number))
        : 0;

      stats.set(roundId, { playerCount, currentHole });
    });
  }

  return { myRounds, sharedRounds, stats };
}

/**
 * React Query hook for fetching user's rounds
 * Provides automatic caching, background refetching, and loading states
 */
export function useRoundsQuery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rounds', user?.id],
    queryFn: () => fetchUserRounds(user!.id),
    enabled: !!user,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['rounds', user?.id] });
  };

  return {
    rounds: query.data?.myRounds ?? [],
    sharedRounds: query.data?.sharedRounds ?? [],
    roundStats: query.data?.stats ?? new Map<string, RoundStats>(),
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch,
  };
}
