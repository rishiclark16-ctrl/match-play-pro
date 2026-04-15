import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Round, HoleInfo, GameConfig, TeeSet, generateJoinCode } from '@/types/golf';
import { Json } from '@/integrations/supabase/types';
import { captureException } from '@/lib/sentry';
import { calculatePlayingHandicap, getStrokesPerHole } from '@/lib/handicapUtils';
import { sendPushToProfiles } from '@/lib/pushUtils';
import { capture } from '@/lib/posthog';

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
  teeSets?: TeeSet[];
  mixedTees?: boolean;
  players: { name: string; handicap?: number; manualStrokes?: number; teamId?: string; profileId?: string; isGhost?: boolean; teeSetId?: string }[];
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
          tee_sets: input.teeSets as unknown as Json || null,
          mixed_tees: input.mixedTees || false,
          status: 'active'
        });

      if (roundError) {
        // Create round error handled
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
        profile_id: index === 0 && !p.isGhost ? userId : (p.profileId || null),
        is_ghost: p.isGhost ?? false,
        tee_set_id: p.teeSetId || null,
      }));

      // Wrap players insert + ghost score generation in a try/catch so that any
      // failure (thrown exception or Supabase error) triggers cleanup of the
      // already-inserted round row, preventing orphaned rounds (Bug H-3).
      try {
        const { error: playersError } = await supabase
          .from('players')
          .insert(playersToInsert);

        // Bug M-5: explicitly check the players insert error and throw before
        // reaching ghost score generation so scores never reference non-existent
        // player IDs.
        if (playersError) {
          throw playersError;
        }

        // Auto-populate scores for ghost players (gross = par + handicap_strokes → net par)
        const ghostPlayers = input.players.filter(p => p.isGhost);
        if (ghostPlayers.length > 0) {
          const { data: insertedPlayers } = await supabase
            .from('players')
            .select('id, name, handicap, order_index')
            .eq('round_id', roundId)
            .eq('is_ghost', true);

          if (insertedPlayers && insertedPlayers.length > 0) {
            const slope = input.slope ?? 113;
            const ghostScores: { round_id: string; player_id: string; hole_number: number; strokes: number }[] = [];

            for (const gp of insertedPlayers) {
              const playingHcp = gp.handicap
                ? calculatePlayingHandicap(gp.handicap, slope, input.holes)
                : 0;
              const strokesMap = getStrokesPerHole(playingHcp, input.holeInfo);

              for (const hole of input.holeInfo) {
                const handicapStrokes = strokesMap.get(hole.number) ?? 0;
                // Gross score = par + handicap strokes → net = par (net par)
                ghostScores.push({
                  round_id: roundId,
                  player_id: gp.id,
                  hole_number: hole.number,
                  strokes: hole.par + handicapStrokes,
                });
              }
            }

            if (ghostScores.length > 0) {
              await supabase.from('scores').insert(ghostScores);
            }
          }
        }

        // Notify other players with accounts that a round has been created
        const inviteeProfileIds = input.players
          .slice(1) // skip creator (index 0)
          .filter(p => p.profileId && !p.isGhost)
          .map(p => p.profileId as string);
        if (inviteeProfileIds.length > 0) {
          sendPushToProfiles({
            profileIds: inviteeProfileIds,
            title: "You're teeing off ⛳",
            body: `Added to a round at ${input.courseName}`,
            data: { roundId, route: `/round/${roundId}` },
            type: 'roundInvites',
          });
        }

        // Notify friends that a round has started (so they can watch live)
        const allPlayerProfileIds = new Set(
          input.players.filter(p => p.profileId).map(p => p.profileId as string)
        );
        allPlayerProfileIds.add(userId); // include creator
        try {
          const { data: friendships } = await supabase
            .from('friendships')
            .select('user_id, friend_id')
            .eq('status', 'accepted')
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

          if (friendships && friendships.length > 0) {
            const friendIds = friendships
              .map(f => f.user_id === userId ? f.friend_id : f.user_id)
              .filter(id => !allPlayerProfileIds.has(id)); // don't notify players already in the round

            if (friendIds.length > 0) {
              const creatorName = input.players[0]?.name ?? 'A friend';
              sendPushToProfiles({
                profileIds: friendIds,
                title: `${creatorName} is on the course ⛳`,
                body: `Live at ${input.courseName} — tap to spectate`,
                data: { roundId, route: `/round/${roundId}?spectator=true` },
                type: 'friendStartedRound',
              });
            }
          }
        } catch {
          // Friend notification is non-critical
        }
      } catch (playersOrGhostErr) {
        // Bug H-3: players insert (or ghost score generation) failed — delete the
        // orphaned round row so the DB is left in a consistent state.
        try {
          const { error: cleanupError } = await supabase.from('rounds').delete().eq('id', roundId);
          if (cleanupError) {
            captureException(new Error(`Cleanup failed: ${cleanupError.message}`), {
              context: 'createRound.cleanup',
              roundId,
              originalError: playersOrGhostErr instanceof Error ? playersOrGhostErr.message : String(playersOrGhostErr),
            });
          }
        } catch (cleanupErr) {
          captureException(cleanupErr instanceof Error ? cleanupErr : new Error('Cleanup exception'), {
            context: 'createRound.cleanup',
            roundId,
          });
        }
        // Re-throw so the outer catch can format and return the CreateRoundError.
        throw playersOrGhostErr;
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
        teeSets: input.teeSets,
        mixedTees: input.mixedTees || false,
      };

      capture('round_created', {
        course_name: input.courseName,
        holes: input.holes,
        player_count: input.players.length,
        game_types: input.games.map(g => g.type),
        has_stakes: !!input.stakes,
      });

      return { round };
    } catch (err) {
      // CreateRound error handled
      const isAuthError = err instanceof Error
        ? err.message?.toLowerCase().includes('jwt') || err.message?.toLowerCase().includes('auth')
        : (err as { code?: string })?.code === '401';
      return {
        round: null,
        error: {
          step: 'players_insert',
          message: isAuthError
            ? 'Session expired. Please sign in again.'
            : err instanceof Error
              ? err.message
              : 'Unexpected error creating round',
          code: (err as { code?: string })?.code ?? 'UNKNOWN',
          isAuthError,
        }
      };
    }
  }, []);

  return { createRound };
}
