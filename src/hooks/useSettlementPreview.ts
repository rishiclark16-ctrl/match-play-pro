import { useMemo } from 'react';
import { Round, Score, PlayerWithScores } from '@/types/golf';
import { PropBet } from '@/types/betting';
import { calculateSettlement, NetSettlement } from '@/lib/games/settlement';
import { calculateSkins } from '@/lib/games/skins';
import { calculateNassau } from '@/lib/games/nassau';
import { calculateMatchPlay, calculateFourballMatchPlay, fourballMoney, fourballOptions } from '@/lib/games/matchPlay';
import { customGamesTransfers } from '@/lib/games/custom/round';
import { useGameResults } from '@/hooks/useGameResults';

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
}: UseSettlementPreviewOptions): NetSettlement[] {
  // Same all-games calculator RoundComplete uses, so the in-round preview and the
  // final settlement can't disagree (Notion 09.2 M5).
  const gameResults = useGameResults({
    round,
    players: playersWithScores,
    scores,
    presses: round?.presses || [],
    playersWithScores,
  });

  return useMemo(() => {
    if (!round || playersWithScores.length < 2) return [];

    // Calculate results for each game type
    let skinsResult;
    let nassauResult;
    let matchPlayWinnerId: string | null = null;
    let matchPlayStakes = 0;
    let fourballPayments: { from: string; to: string; amount: number }[] = [];

    for (const game of round.games || []) {
      if (game.type === 'skins') {
        // Build strokes map if using net scoring
        let skinsStrokesMap: Map<string, Map<number, number>> | undefined;
        if (game.useNet) {
          skinsStrokesMap = new Map();
          for (const player of playersWithScores) {
            if (player.strokesPerHole) {
              skinsStrokesMap.set(player.id, player.strokesPerHole);
            }
          }
          if (skinsStrokesMap.size === 0) skinsStrokesMap = undefined;
        }
        skinsResult = calculateSkins(
          scores,
          playersWithScores,
          round.holes,
          game.stakes,
          game.carryover ?? true,
          skinsStrokesMap
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
        if (game.matchPlayFormat === 'fourball' && game.matchPlayTeams?.length === 2) {
          const fb = calculateFourballMatchPlay(scores, playersWithScores, round.holeInfo, matchStrokesMap, round.holes, game.matchPlayTeams, fourballOptions(game));
          fourballPayments = fourballMoney(game, fb, true);
          continue;
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

    const wolfGame = round.games?.find(g => g.type === 'wolf');

    return calculateSettlement(
      playersWithScores,
      skinsResult,
      nassauResult,
      matchPlayWinnerId,
      matchPlayStakes,
      wolfGame?.wolfResults,
      wolfGame?.stakes,
      propBets,
      gameResults?.houseGameResult,
      gameResults?.vegasResult,
      gameResults?.ninesResult,
      gameResults?.defenderResult,
      gameResults?.sixesResult,
      [...fourballPayments, ...customGamesTransfers(round.games, playersWithScores, scores, round.holeInfo, false)],
    );
  }, [round, playersWithScores, scores, propBets, gameResults]);
}
