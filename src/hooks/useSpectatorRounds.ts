import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Round, HoleInfo, GameConfig, Press } from '@/types/golf';

interface SpectatingRound extends Round {
  isSpectating: true;
}

interface RoundStats {
  playerCount: number;
  currentHole: number;
}

export function useSpectatorRounds() {
  const { user } = useAuth();
  const [spectatorRounds, setSpectatorRounds] = useState<SpectatingRound[]>([]);
  const [spectatorStats, setSpectatorStats] = useState<Map<string, RoundStats>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchSpectatorRounds = useCallback(async () => {
    if (!user) {
      setSpectatorRounds([]);
      setLoading(false);
      return;
    }

    try {
      // Get rounds user is spectating
      const { data: spectatorData, error: spectatorError } = await supabase
        .from('round_spectators')
        .select('round_id')
        .eq('profile_id', user.id);

      if (spectatorError) throw spectatorError;

      if (!spectatorData || spectatorData.length === 0) {
        setSpectatorRounds([]);
        setLoading(false);
        return;
      }

      const roundIds = spectatorData.map(s => s.round_id);

      // Fetch the actual rounds
      const { data: roundsData, error: roundsError } = await supabase
        .from('rounds')
        .select('*')
        .in('id', roundIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (roundsError) throw roundsError;

      const transformedRounds: SpectatingRound[] = (roundsData || []).map(r => ({
        id: r.id,
        courseId: r.course_id || '',
        courseName: r.course_name,
        holes: r.holes as 9 | 18,
        strokePlay: r.stroke_play ?? true,
        matchPlay: r.match_play ?? false,
        stakes: r.stakes ?? undefined,
        status: 'active' as const,
        createdAt: new Date(r.created_at || Date.now()),
        joinCode: r.join_code,
        holeInfo: (r.hole_info as unknown as HoleInfo[]) || [],
        slope: r.slope ?? undefined,
        rating: r.rating ?? undefined,
        games: (r.games as unknown as GameConfig[]) || [],
        presses: [] as Press[],
        isSpectating: true as const,
      }));

      setSpectatorRounds(transformedRounds);

      // Fetch stats for spectator rounds
      if (roundsData && roundsData.length > 0) {
        const spectatorRoundIds = roundsData.map(r => r.id);
        
        const { data: playersData } = await supabase
          .from('players')
          .select('round_id')
          .in('round_id', spectatorRoundIds);
        
        const { data: scoresData } = await supabase
          .from('scores')
          .select('round_id, hole_number')
          .in('round_id', spectatorRoundIds);
        
        const statsMap = new Map<string, RoundStats>();
        
        spectatorRoundIds.forEach(roundId => {
          const playerCount = playersData?.filter(p => p.round_id === roundId).length || 0;
          const roundScores = scoresData?.filter(s => s.round_id === roundId) || [];
          const currentHole = roundScores.length > 0 
            ? Math.max(...roundScores.map(s => s.hole_number))
            : 0;
          
          statsMap.set(roundId, { playerCount, currentHole });
        });
        
        setSpectatorStats(statsMap);
      }
    } catch (err) {
      console.error('Error fetching spectator rounds:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSpectatorRounds();
  }, [fetchSpectatorRounds]);

  const leaveSpectating = useCallback(async (roundId: string) => {
    if (!user) return false;

    try {
      await supabase
        .from('round_spectators')
        .delete()
        .eq('round_id', roundId)
        .eq('profile_id', user.id);

      setSpectatorRounds(prev => prev.filter(r => r.id !== roundId));
      return true;
    } catch (err) {
      console.error('Error leaving spectator:', err);
      return false;
    }
  }, [user]);

  return {
    spectatorRounds,
    spectatorStats,
    loading,
    fetchSpectatorRounds,
    leaveSpectating,
  };
}
