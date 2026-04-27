import { sendPushToProfiles } from './pushUtils';
import type { PlayerWithScores } from '@/types/golf';

interface FireScoreSideEffectsArgs {
  round: { id: string };
  user: { id: string; user_metadata?: { full_name?: string } };
  playersWithScores: PlayerWithScores[];
  currentHole: number;
  currentHolePar: number;
  playerId: string;
  score: number;
}

/**
 * Fires "hype" push notifications after a score is saved:
 *  - Hole-in-one (par 3, score 1) → notifies other players
 *  - Eagle (par-2, not hole-in-one) → notifies other players
 *  - Score-entered-for-you → notifies the scored player if someone else logged it
 *
 * Non-critical: never throws and never blocks the score save.
 */
export function fireScoreSideEffects({
  round,
  user,
  playersWithScores,
  currentHole,
  currentHolePar,
  playerId,
  score,
}: FireScoreSideEffectsArgs): void {
  const scoredPlayer = playersWithScores.find(p => p.id === playerId);
  if (!scoredPlayer) return;
  const firstName = (scoredPlayer.name || 'Player').split(' ')[0];
  const roundUrl = `/round/${round.id}`;

  // Everyone else in the round with a profile — the "hype" audience.
  const otherProfileIds = playersWithScores
    .filter(p => p.id !== playerId && p.profileId)
    .map(p => p.profileId as string);

  // Hole-in-one — only par 3s, score of 1
  if (currentHolePar === 3 && score === 1 && otherProfileIds.length > 0) {
    sendPushToProfiles({
      profileIds: otherProfileIds,
      title: 'ACE! ⛳',
      body: `${firstName} just made a hole-in-one on #${currentHole}. The drinks are on them 🍻`,
      data: { roundId: round.id, route: roundUrl },
      type: 'holeInOne',
    });
  } else if (score === currentHolePar - 2 && otherProfileIds.length > 0) {
    // Eagle — par-2, but not a hole-in-one (that's already handled above)
    sendPushToProfiles({
      profileIds: otherProfileIds,
      title: 'Eagle spotted ⛳',
      body: `${firstName} went -2 on #${currentHole}. Nice grip.`,
      data: { roundId: round.id, route: roundUrl },
      type: 'eagleLogged',
    });
  }

  // Score-entered-for-you: notify the scored player if someone else logged it.
  if (
    scoredPlayer.profileId &&
    scoredPlayer.profileId !== user.id
  ) {
    const scorekeeperName = (user.user_metadata?.full_name)?.split(' ')[0] ?? 'Someone';
    sendPushToProfiles({
      profileIds: [scoredPlayer.profileId],
      title: 'Score posted ⛳',
      body: `${scorekeeperName} put you down for a ${score} on #${currentHole}`,
      data: { roundId: round.id, route: roundUrl },
      type: 'scoreEnteredForYou',
    });
  }
}
