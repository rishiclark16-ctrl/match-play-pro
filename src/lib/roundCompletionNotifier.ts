import { calculateMatchPlay, calculateFourballMatchPlay, generateMatchPlayHeadline } from './games/matchPlay';
import { sendPushToProfiles as defaultSendPushToProfiles } from './pushUtils';
import { supabase as defaultSupabase } from '@/integrations/supabase/client';
import type { GameConfig, PlayerWithScores } from '@/types/golf';

interface NotifyArgs {
  round: {
    id: string;
    courseName: string;
    holes: number;
    holeInfo: Array<{ number: number; par: number; handicap?: number }>;
    games?: GameConfig[];
  };
  userId: string;
  playersWithScores: PlayerWithScores[];
  roundScores: Array<{ player_id: string; hole_number: number; strokes: number }>;
  /** Persists updated games (e.g. with the resultHeadline) back to Supabase. */
  updateGames: (games: GameConfig[]) => void;
  /** Test injection seam — defaults to the real sendPushToProfiles. */
  sendPushToProfiles?: typeof defaultSendPushToProfiles;
  /** Test injection seam — defaults to the real supabase client. */
  supabase?: typeof defaultSupabase;
}

/**
 * Sends a push notification to friends-not-in-the-round when a match is
 * complete. Computes match-play headlines from the final scoresheet and
 * persists them onto the round's games array. Best-effort: any failure is
 * swallowed since notifications are non-critical to round completion.
 */
export async function sendRoundCompletionNotifications({
  round,
  userId,
  playersWithScores,
  roundScores,
  updateGames,
  sendPushToProfiles = defaultSendPushToProfiles,
  supabase = defaultSupabase,
}: NotifyArgs): Promise<void> {
  // Build game result headlines
  const headlines: string[] = [];
  const matchPlayGame = round.games?.find(g => g.type === 'match_play');

  if (matchPlayGame) {
    const isFourball = matchPlayGame.matchPlayFormat === 'fourball' && matchPlayGame.matchPlayTeams?.length === 2;

    let strokesPerHole: Map<string, Map<number, number>> | undefined;
    if (matchPlayGame.useNet) {
      strokesPerHole = new Map();
      for (const player of playersWithScores) {
        if (player.strokesPerHole) {
          strokesPerHole.set(player.id, player.strokesPerHole);
        }
      }
      if (strokesPerHole.size === 0) strokesPerHole = undefined;
    }

    const mpResult = isFourball
      ? calculateFourballMatchPlay(roundScores, playersWithScores, round.holeInfo, strokesPerHole, round.holes as 9 | 18, matchPlayGame.matchPlayTeams!)
      : playersWithScores.length === 2
        ? calculateMatchPlay(roundScores, playersWithScores, round.holeInfo, strokesPerHole, round.holes as 9 | 18)
        : null;

    if (mpResult) {
      const headline = generateMatchPlayHeadline(mpResult, playersWithScores);
      if (headline) {
        headlines.push(headline);
        const updatedGames = (round.games || []).map(g =>
          g.type === 'match_play' ? { ...g, resultHeadline: headline } : g
        );
        updateGames(updatedGames);
      }
    }
  }

  if (headlines.length === 0) return;

  // Get friends of the current user to notify
  try {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (!friendships?.length) return;

    const friendIds = friendships.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // Exclude players already in the round (they'll see the result directly)
    const playerProfileIds = playersWithScores
      .map(p => p.profileId)
      .filter(Boolean) as string[];
    const notifyIds = friendIds.filter(id => !playerProfileIds.includes(id));

    if (notifyIds.length > 0) {
      sendPushToProfiles({
        profileIds: notifyIds,
        title: 'Match over ⛳',
        body: `${headlines[0]} at ${round.courseName}`,
        data: { roundId: round.id, route: `/round/${round.id}/complete` },
        type: 'roundCompleted',
      });
    }
  } catch {
    // Notification is non-critical
  }
}
