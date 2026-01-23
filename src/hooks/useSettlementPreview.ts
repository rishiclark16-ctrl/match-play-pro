import { useMemo } from 'react';
import { Round, Score, PlayerWithScores, Settlement } from '@/types/golf';
import { PropBet } from '@/types/betting';
import { calculateSettlement } from '@/lib/games/settlement';
import { calculateSkins } from '@/lib/games/skins';
import { calculateNassau } from '@/lib/games/nassau';
import { calculateMatchPlay } from '@/lib/games/matchPlay';

interface UseSettlementPreviewOptions {
  round: Round | null;
  playersWithScores: PlayerWithScores[];
  scores: Score[];
  propBets: PropBet[];
}

/**
 * Hook to calculate settlement preview for the finish overlay.
 * Computes game results for skins, nassau, and match play, then calculates settlements.
 */
export function useSettlementPreview({
  round,
  playersWithScores,
  scores,
  propBets,
}: UseSettlementPreviewOptions): Settlement[] {
  return useMemo(() => {
    if (!round || playersWithScores.length < 2) return [];

    // Calculate results for each game type
    let skinsResult;
    let nassauResult;
    let matchPlayWinnerId: string | null = null;
    let matchPlayStakes = 0;

    for (const game of round.games || []) {
      if (game.type === 'skins') {
        skinsResult = calculateSkins(
          scores,
          playersWithScores,
          round.holes,
          game.stakes,
          game.carryover ?? true
        );
      } else if (game.type === 'nassau') {
        // Build strokes map if using net scoring
        let strokesPerHole: Map<string, Map<number, number>> | undefined;
        if (game.useNet) {
          strokesPerHole = new Map();
          for (const player of playersWithScores) {
            if (player.strokesPerHole) {
              strokesPerHole.set(player.id, player.strokesPerHole);
            }
          }
          if (strokesPerHole.size === 0) strokesPerHole = undefined;
        }
        nassauResult = calculateNassau(
          scores,
          playersWithScores,
          game.stakes,
          round.presses || [],
          round.holes,
          strokesPerHole
        );
      } else if (game.type === 'match') {
        // Build strokes map if using net scoring
        let matchStrokesMap: Map<string, Map<number, number>> | undefined;
        if (game.useNet) {
          matchStrokesMap = new Map();
          for (const player of playersWithScores) {
            if (player.strokesPerHole) {
              matchStrokesMap.set(player.id, player.strokesPerHole);
            }
          }
          if (matchStrokesMap.size === 0) matchStrokesMap = undefined;
        }
        const matchResult = calculateMatchPlay(
          scores,
          playersWithScores,
          round.holeInfo,
          matchStrokesMap,
          round.holes
        );
        if (matchResult.winnerId) {
          matchPlayWinnerId = matchResult.winnerId;
          matchPlayStakes = game.stakes;
        }
      }
    }

    return calculateSettlement(
      playersWithScores,
      skinsResult,
      nassauResult,
      matchPlayWinnerId,
      matchPlayStakes,
      undefined, // wolfResults - not needed for preview
      0, // wolfStakes
      propBets
    );
  }, [round, playersWithScores, scores, propBets]);
}
