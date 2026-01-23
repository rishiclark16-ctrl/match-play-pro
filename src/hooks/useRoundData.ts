import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRounds } from '@/hooks/useRounds';
import { Round, Player, Score, Press, HoleInfo, GameConfig } from '@/types/golf';

interface UseRoundDataResult {
  round: Round | null;
  players: Player[];
  scores: Score[];
  presses: Press[];
  loading: boolean;
  isLocalData: boolean;
}

/**
 * Hook to fetch round data from local storage or Supabase
 * Prioritizes local storage, falls back to Supabase for shared rounds
 */
export function useRoundData(roundId: string | undefined): UseRoundDataResult {
  const { getRoundById, getScoresForRound, getPlayersForRound, getPressesForRound } = useRounds();

  const [supabaseRound, setSupabaseRound] = useState<Round | null>(null);
  const [supabasePlayers, setSupabasePlayers] = useState<Player[]>([]);
  const [supabaseScores, setSupabaseScores] = useState<Score[]>([]);
  const [supabasePresses, setSupabasePresses] = useState<Press[]>([]);
  const [loading, setLoading] = useState(true);

  // Try local storage first
  const localRound = getRoundById(roundId || '');

  useEffect(() => {
    const fetchFromSupabase = async () => {
      if (localRound) {
        setLoading(false);
        return;
      }

      if (!roundId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch round
        const { data: roundData, error: roundError } = await supabase
          .from('rounds')
          .select('*')
          .eq('id', roundId)
          .maybeSingle();

        if (roundError) throw roundError;
        if (!roundData) {
          setLoading(false);
          return;
        }

        // Transform round data
        const transformedRound: Round = {
          id: roundData.id,
          courseId: roundData.course_id || '',
          courseName: roundData.course_name,
          holes: roundData.holes as 9 | 18,
          holeInfo: (roundData.hole_info as unknown) as HoleInfo[],
          strokePlay: roundData.stroke_play ?? true,
          matchPlay: roundData.match_play ?? false,
          stakes: roundData.stakes ?? undefined,
          slope: roundData.slope ?? undefined,
          rating: roundData.rating ?? undefined,
          status: roundData.status as 'active' | 'complete',
          createdAt: new Date(roundData.created_at || ''),
          joinCode: roundData.join_code,
          games: (roundData.games as unknown as GameConfig[]) || [],
          presses: [],
        };

        setSupabaseRound(transformedRound);

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('round_id', roundId)
          .order('order_index');

        if (playersError) throw playersError;

        const transformedPlayers: Player[] = (playersData || []).map(p => ({
          id: p.id,
          roundId: p.round_id || '',
          name: p.name,
          handicap: p.handicap ?? undefined,
          orderIndex: p.order_index,
          teamId: p.team_id ?? undefined,
          profileId: p.profile_id ?? undefined,
        }));

        setSupabasePlayers(transformedPlayers);

        // Fetch scores
        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select('*')
          .eq('round_id', roundId);

        if (scoresError) throw scoresError;

        const transformedScores: Score[] = (scoresData || []).map(s => ({
          id: s.id,
          roundId: s.round_id || '',
          playerId: s.player_id || '',
          holeNumber: s.hole_number,
          strokes: s.strokes,
        }));

        setSupabaseScores(transformedScores);

        // Fetch presses
        const { data: pressesData, error: pressesError } = await supabase
          .from('presses')
          .select('*')
          .eq('round_id', roundId);

        if (!pressesError && pressesData) {
          const transformedPresses: Press[] = pressesData.map(p => ({
            id: p.id,
            startHole: p.start_hole,
            initiatedBy: p.initiated_by || undefined,
            stakes: Number(p.stakes),
            status: (p.status === 'complete' ? 'won' : p.status) as 'active' | 'won' | 'lost' | 'pushed',
            winnerId: p.winner_id || undefined,
          }));
          setSupabasePresses(transformedPresses);
        }

      } catch {
        // Error fetching from Supabase - round may not exist
      } finally {
        setLoading(false);
      }
    };

    fetchFromSupabase();
  }, [roundId, localRound]);

  // Use local or Supabase data
  const round = localRound || supabaseRound;
  const scores = localRound ? getScoresForRound(roundId || '') : supabaseScores;
  const players = localRound ? getPlayersForRound(roundId || '') : supabasePlayers;
  const presses = localRound ? getPressesForRound(roundId || '') : supabasePresses;

  return {
    round,
    players,
    scores,
    presses,
    loading,
    isLocalData: !!localRound,
  };
}
