import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Round } from '@/types/golf';
import { transformRound, DbRound } from '@/lib/transformers';
import { useAuth } from '@/hooks/useAuth';

export interface RoundsListItem {
  round: Round;
  playerCount: number;
  currentHole: number;
  isOwned: boolean;
}

async function fetchAllRounds(userId: string): Promise<RoundsListItem[]> {
  const { data: myRoundsData, error: myErr } = await supabase
    .from('rounds')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (myErr) throw myErr;

  const { data: playerRows, error: pErr } = await supabase
    .from('players')
    .select('round_id')
    .eq('profile_id', userId);
  if (pErr) throw pErr;

  const myIds = new Set((myRoundsData || []).map((r) => r.id));
  const sharedIds = (playerRows || [])
    .map((p) => p.round_id)
    .filter((id): id is string => !!id && !myIds.has(id));

  let sharedRoundsData: DbRound[] = [];
  if (sharedIds.length > 0) {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .in('id', sharedIds)
      .order('created_at', { ascending: false });
    if (!error && data) sharedRoundsData = data;
  }

  const myRounds: Round[] = (myRoundsData || []).map(transformRound);
  const sharedRounds: Round[] = sharedRoundsData.map(transformRound);
  const allRounds = [...myRounds, ...sharedRounds];

  const allIds = allRounds.map((r) => r.id);
  const playerCountMap = new Map<string, number>();
  const currentHoleMap = new Map<string, number>();

  if (allIds.length > 0) {
    const { data: playersData } = await supabase
      .from('players')
      .select('round_id')
      .in('round_id', allIds);
    const { data: scoresData } = await supabase
      .from('scores')
      .select('round_id, hole_number')
      .in('round_id', allIds);

    for (const id of allIds) {
      playerCountMap.set(id, playersData?.filter((p) => p.round_id === id).length ?? 0);
      const roundScores = scoresData?.filter((s) => s.round_id === id) ?? [];
      currentHoleMap.set(id, roundScores.length > 0 ? Math.max(...roundScores.map((s) => s.hole_number)) : 0);
    }
  }

  return allRounds
    .map<RoundsListItem>((round) => ({
      round,
      playerCount: playerCountMap.get(round.id) ?? 0,
      currentHole: currentHoleMap.get(round.id) ?? 0,
      isOwned: myIds.has(round.id),
    }))
    .sort((a, b) => {
      // Active first, then by created_at desc.
      const aActive = a.round.status === 'active' ? 1 : 0;
      const bActive = b.round.status === 'active' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      const aTime = a.round.createdAt?.getTime() ?? 0;
      const bTime = b.round.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });
}

export function useAllRoundsList() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['rounds-archive', user?.id],
    queryFn: () => fetchAllRounds(user!.id),
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
  };
}
