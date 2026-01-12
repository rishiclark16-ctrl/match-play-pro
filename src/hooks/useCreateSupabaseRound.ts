import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Round, HoleInfo, GameConfig, generateJoinCode } from '@/types/golf';
import { Json } from '@/integrations/supabase/types';

interface CreateRoundInput {
  courseId: string;
  courseName: string;
  holes: 9 | 18;
  holeInfo: HoleInfo[];
  strokePlay: boolean;
  matchPlay: boolean;
  stakes?: number;
  slope?: number;
  rating?: number;
  games: GameConfig[];
  players: { name: string; handicap?: number; teamId?: string }[];
}

export function useCreateSupabaseRound() {
  const createRound = useCallback(async (input: CreateRoundInput): Promise<Round | null> => {
    const joinCode = generateJoinCode();

    try {
      // Check if any games are stableford
      const stablefordGame = input.games.find(g => g.type === 'stableford');
      
      // Insert round
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .insert({
          join_code: joinCode,
          course_name: input.courseName,
          course_id: input.courseId || null,
          holes: input.holes,
          stroke_play: input.strokePlay,
          match_play: input.matchPlay,
          stableford: !!stablefordGame,
          modified_stableford: stablefordGame?.modifiedStableford || false,
          stakes: input.stakes || null,
          slope: input.slope || null,
          rating: input.rating || null,
          games: input.games as unknown as Json,
          teams: input.games.find(g => g.type === 'bestball')?.teams as unknown as Json || null,
          hole_info: input.holeInfo as unknown as Json,
          status: 'active'
        })
        .select()
        .single();

      if (roundError) {
        console.error('Error creating round:', roundError);
        return null;
      }

      // Insert players
      const playersToInsert = input.players.map((p, index) => ({
        round_id: roundData.id,
        name: p.name,
        handicap: p.handicap || null,
        team_id: p.teamId || null,
        order_index: index
      }));

      const { error: playersError } = await supabase
        .from('players')
        .insert(playersToInsert);

      if (playersError) {
        console.error('Error creating players:', playersError);
        // Clean up round if players failed
        await supabase.from('rounds').delete().eq('id', roundData.id);
        return null;
      }

      // Transform to app type
      const round: Round = {
        id: roundData.id,
        courseId: roundData.course_id || '',
        courseName: roundData.course_name,
        holes: roundData.holes as 9 | 18,
        strokePlay: roundData.stroke_play,
        matchPlay: roundData.match_play,
        stakes: roundData.stakes ?? undefined,
        slope: roundData.slope ?? undefined,
        rating: roundData.rating ?? undefined,
        status: 'active',
        games: (roundData.games as unknown as GameConfig[]) || [],
        holeInfo: (roundData.hole_info as unknown as HoleInfo[]) || [],
        joinCode: roundData.join_code,
        createdAt: new Date(roundData.created_at),
        presses: [],
      };

      return round;
    } catch (err) {
      console.error('Error in createRound:', err);
      return null;
    }
  }, []);

  return { createRound };
}
