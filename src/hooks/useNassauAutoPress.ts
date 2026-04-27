import { useEffect } from 'react';
import { toast } from 'sonner';
import { checkAutoPress } from '@/lib/games/nassau';
import { sendPushToProfiles } from '@/lib/pushUtils';
import type { Press, PlayerWithScores, GameConfig } from '@/types/golf';

interface UseNassauAutoPressArgs {
  round: {
    id: string;
    holes: number;
    games?: GameConfig[];
    presses?: Press[];
  } | null;
  roundScores: Array<{ player_id: string; hole_number: number; strokes: number }>;
  playersWithScores: PlayerWithScores[];
  onAddPress: (press: Press) => void;
}

/**
 * Watches the scoresheet for a Nassau auto-press condition (player goes 2-down)
 * and, when triggered, dispatches the press, toasts the scorekeeper, and pushes
 * a notification to all players with accounts. Heads-up only — does not affect
 * scoring math itself.
 *
 * Extracted from Scorecard.tsx so the page stays focused on render orchestration.
 */
export function useNassauAutoPress({
  round,
  roundScores,
  playersWithScores,
  onAddPress,
}: UseNassauAutoPressArgs): void {
  useEffect(() => {
    if (!round) return;

    const nassauGame = round.games?.find(g => g.type === 'nassau');
    if (!nassauGame || !nassauGame.autoPress) return;
    if (playersWithScores.length !== 2) return;

    // Build strokes map if using net scoring
    let strokesPerHole: Map<string, Map<number, number>> | undefined;
    if (nassauGame.useNet) {
      strokesPerHole = new Map();
      for (const player of playersWithScores) {
        if (player.strokesPerHole) {
          strokesPerHole.set(player.id, player.strokesPerHole);
        }
      }
      if (strokesPerHole.size === 0) strokesPerHole = undefined;
    }

    const autoPress = checkAutoPress(
      roundScores,
      playersWithScores,
      nassauGame.stakes,
      round.presses || [],
      round.holes,
      strokesPerHole
    );

    if (!autoPress) return;

    const pressingPlayer = playersWithScores.find(p => p.id === autoPress.initiatedBy);
    onAddPress(autoPress);
    toast.info(
      `Auto-Press! ${(pressingPlayer?.name || 'Player').split(' ')[0]} is 2 down`,
      {
        description: `Press $${nassauGame.stakes} starting hole ${autoPress.startHole}`,
        duration: 4000,
      }
    );

    // Notify all players with accounts
    const profileIds = playersWithScores
      .filter(p => p.profileId)
      .map(p => p.profileId as string);
    if (profileIds.length > 0) {
      sendPushToProfiles({
        profileIds,
        title: 'Auto-press! ⛳',
        body: `${(pressingPlayer?.name || 'Player').split(' ')[0]} is 2 down and got desperate — $${nassauGame.stakes} press from hole ${autoPress.startHole}`,
        data: { roundId: round.id, route: `/round/${round.id}` },
        type: 'pressTriggered',
      });
    }
  }, [round, roundScores, playersWithScores, onAddPress]);
}
