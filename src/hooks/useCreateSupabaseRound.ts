import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Round, HoleInfo, GameConfig, generateJoinCode } from '@/types/golf';
import { Json } from '@/integrations/supabase/types';
import { captureException } from '@/lib/sentry';

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
  handicapMode?: 'auto' | 'manual';
  games: GameConfig[];
  players: { name: string; handicap?: number; manualStrokes?: number; teamId?: string; profileId?: string }[];
}

export interface CreateRoundError {
  step: 'session' | 'round_insert' | 'players_insert';
  message: string;
  code?: string;
  isAuthError?: boolean;
}

export interface CreateRoundResult {
  round: Round | null;
  error?: CreateRoundError;
}

export function useCreateSupabaseRound() {
  const createRound = useCallback(async (input: CreateRoundInput): Promise<CreateRoundResult> => {
    // Get current session directly to ensure we have the latest auth state
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      console.error('No authenticated user found - cannot create round', sessionError);
      return {
        round: null,
        error: {
          step: 'session',
          message: 'Session expired. Please sign in again.',
          code: sessionError?.message || 'NO_SESSION',
          isAuthError: true,
        }
      };
    }
    
    const userId = session.user.id;
    const joinCode = generateJoinCode();
    // Generate round ID client-side to avoid .select().single() RLS issues
    const roundId = crypto.randomUUID();

    try {
      // Check if any games are stableford
      const stablefordGame = input.games.find(g => g.type === 'stableford');
      
      // Insert round - no .select() to avoid RLS visibility issues
      const { error: roundError } = await supabase
        .from('rounds')
        .insert({
          id: roundId,
          created_by: userId,
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
          handicap_mode: input.handicapMode || 'auto',
          games: input.games as unknown as Json,
          teams: input.games.find(g => g.type === 'bestball')?.teams as unknown as Json || null,
          hole_info: input.holeInfo as unknown as Json,
          status: 'active'
        });

      if (roundError) {
        console.error('Error creating round:', roundError);
        const isAuthError = roundError.code === '401' || 
          roundError.message?.toLowerCase().includes('jwt') ||
          roundError.message?.toLowerCase().includes('auth');
        return {
          round: null,
          error: {
            step: 'round_insert',
            message: isAuthError ? 'Session expired. Please sign in again.' : `Failed to create round: ${roundError.message}`,
            code: roundError.code,
            isAuthError,
          }
        };
      }

      // Insert players - first player (index 0) is the creator and gets their profile_id set
      const playersToInsert = input.players.map((p, index) => ({
        round_id: roundId,
        name: p.name,
        handicap: p.handicap || null,
        manual_strokes: p.manualStrokes ?? 0,
        team_id: p.teamId || null,
        order_index: index,
        profile_id: index === 0 ? userId : (p.profileId || null)
      }));

      const { error: playersError } = await supabase
        .from('players')
        .insert(playersToInsert);

      if (playersError) {
        console.error('Error creating players:', playersError);
        // Clean up round if players failed - wrap in try-catch to handle cleanup failures
        try {
          const { error: cleanupError } = await supabase.from('rounds').delete().eq('id', roundId);
          if (cleanupError) {
            console.error('Failed to cleanup round after player insert failure:', cleanupError);
            captureException(new Error(`Cleanup failed: ${cleanupError.message}`), {
              context: 'createRound.cleanup',
              roundId,
              originalError: playersError.message
            });
          }
        } catch (cleanupErr) {
          console.error('Exception during round cleanup:', cleanupErr);
          captureException(cleanupErr instanceof Error ? cleanupErr : new Error('Cleanup exception'), {
            context: 'createRound.cleanup',
            roundId
          });
        }

        const isAuthError = playersError.code === '401' ||
          playersError.message?.toLowerCase().includes('jwt') ||
          playersError.message?.toLowerCase().includes('auth');
        return {
          round: null,
          error: {
            step: 'players_insert',
            message: isAuthError ? 'Session expired. Please sign in again.' : `Failed to add players: ${playersError.message}`,
            code: playersError.code,
            isAuthError,
          }
        };
      }

      // Build Round object from inputs (no need to fetch back from DB)
      const round: Round = {
        id: roundId,
        courseId: input.courseId || '',
        courseName: input.courseName,
        holes: input.holes,
        strokePlay: input.strokePlay,
        matchPlay: input.matchPlay,
        stakes: input.stakes,
        slope: input.slope,
        rating: input.rating,
        handicapMode: input.handicapMode || 'auto',
        status: 'active',
        games: input.games,
        holeInfo: input.holeInfo,
        joinCode,
        createdAt: new Date(),
        presses: [],
      };

      return { round };
    } catch (err) {
      console.error('Error in createRound:', err);
      return {
        round: null,
        error: {
          step: 'round_insert',
          message: err instanceof Error ? err.message : 'Unexpected error creating round',
          code: 'UNKNOWN',
        }
      };
    }
  }, []);

  return { createRound };
}
