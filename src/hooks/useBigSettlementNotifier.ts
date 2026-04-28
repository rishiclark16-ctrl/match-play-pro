import { useEffect, useRef } from 'react';
import { sendPushToProfiles } from '@/lib/pushUtils';

interface SettlementLike {
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
}

interface PlayerLike {
  id: string;
  name: string;
  profileId?: string | null;
}

interface UseBigSettlementNotifierArgs {
  round: { id: string } | null;
  user: { id: string } | null;
  isScorekeeper: boolean;
  /** Settlements minus any ghost-player legs. */
  nonGhostSettlements: SettlementLike[];
  rawPlayers: PlayerLike[];
  ghostPlayerIds: Set<string>;
  /** Threshold above which a "big" notification fires. Defaults to $20. */
  threshold?: number;
}

/**
 * Fires a one-shot push to each profiled player when their net round
 * settlement crosses ±$threshold. Wins get the "Payday" copy; losses get
 * the "Tab's due" copy. Only the scorekeeper triggers this so other
 * clients viewing the same round don't double-fire.
 *
 * Extracted from RoundComplete.tsx — keeps the page free of marshaling.
 */
export function useBigSettlementNotifier({
  round,
  user,
  isScorekeeper,
  nonGhostSettlements,
  rawPlayers,
  ghostPlayerIds,
  threshold = 20,
}: UseBigSettlementNotifierArgs): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!round || !user || !isScorekeeper) return;
    if (nonGhostSettlements.length === 0) return;

    const netByPlayer = new Map<string, number>();
    for (const s of nonGhostSettlements) {
      netByPlayer.set(s.toPlayerId, (netByPlayer.get(s.toPlayerId) ?? 0) + s.amount);
      netByPlayer.set(s.fromPlayerId, (netByPlayer.get(s.fromPlayerId) ?? 0) - s.amount);
    }

    const roundUrl = `/round/${round.id}/complete`;
    for (const player of rawPlayers) {
      if (!player.profileId || ghostPlayerIds.has(player.id)) continue;
      const net = netByPlayer.get(player.id) ?? 0;
      if (Math.abs(net) < threshold) continue;

      const firstName = (player.name || 'Player').split(' ')[0];
      const amount = Math.abs(net).toFixed(2);

      if (net > 0) {
        sendPushToProfiles({
          profileIds: [player.profileId],
          title: 'Payday ⛳',
          body: `You're up $${amount} this round. Collect before they conveniently forget 💸`,
          data: { roundId: round.id, route: roundUrl },
          type: 'youWonBig',
        });
      } else {
        sendPushToProfiles({
          profileIds: [player.profileId],
          title: "Tab's due ⛳",
          body: `${firstName}, you're down $${amount}. Venmo now, coward 😬`,
          data: { roundId: round.id, route: roundUrl },
          type: 'youLostBig',
        });
      }
    }
    firedRef.current = true;
  }, [round, user, isScorekeeper, nonGhostSettlements, rawPlayers, ghostPlayerIds, threshold]);
}
