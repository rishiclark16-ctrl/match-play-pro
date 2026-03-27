import { useMemo } from 'react';
import { Round, Player, Score, Press, PlayerWithScores } from '@/types/golf';
import { calculateSkins, SkinsResult } from '@/lib/games/skins';
import { calculateNassau, NassauResult } from '@/lib/games/nassau';
import { calculateWolfStandings, WolfStanding } from '@/lib/games/wolf';
import { calculateHouseGame, HouseGameResult } from '@/lib/games/houseGame';
import { buildScoringConfig } from '@/lib/houseGame/engine';

export interface GameResults {
  skinsResult?: SkinsResult;
  nassauResult?: NassauResult;
  wolfStandings?: WolfStanding[];
  houseGameResult?: HouseGameResult;
}

interface UseGameResultsOptions {
  round: Round | null;
  players: Player[];
  scores: Score[];
  presses: Press[];
  playersWithScores: PlayerWithScores[];
}

/**
 * Hook to calculate all game results (skins, nassau, wolf, house game).
 */
export function useGameResults({
  round,
  players,
  scores,
  presses,
  playersWithScores,
}: UseGameResultsOptions): GameResults | null {
  return useMemo(() => {
    if (!round || playersWithScores.length === 0) return null;

    const skinsGame  = round.games?.find(g => g.type === 'skins');
    const nassauGame = round.games?.find(g => g.type === 'nassau');
    const wolfGame   = round.games?.find(g => g.type === 'wolf');
    const houseGame  = round.games?.find(g => g.type === 'house');

    let skinsResult: SkinsResult | undefined;
    let nassauResult: NassauResult | undefined;
    let wolfStandings: WolfStanding[] | undefined;
    let houseGameResult: HouseGameResult | undefined;

    const holesPlayed = Math.max(...playersWithScores.map(p => p.holesPlayed));

    if (skinsGame) {
      skinsResult = calculateSkins(
        scores,
        players,
        holesPlayed,
        skinsGame.stakes || 1,
        skinsGame.carryover !== false
      );
    }

    if (nassauGame) {
      nassauResult = calculateNassau(
        scores,
        players,
        nassauGame.stakes || 1,
        presses,
        round.holes
      );
    }

    if (wolfGame && players.length === 4) {
      wolfStandings = calculateWolfStandings(wolfGame.wolfResults || [], players, wolfGame.stakes || 1);
    }

    // House game — uses its own all-in-one calculator
    if (houseGame?.activePrimitives && houseGame.activePrimitives.length > 0 && round.holeInfo.length > 0) {
      try {
        const config = buildScoringConfig(houseGame.activePrimitives);
        houseGameResult = calculateHouseGame(
          scores,
          players,
          round.holeInfo,
          config,
          round.slope ?? 113,
          round.holes as 9 | 18,
        );
      } catch (err) {
        console.error('[useGameResults] calculateHouseGame failed:', err);
      }
    }

    return { skinsResult, nassauResult, wolfStandings, houseGameResult };
  }, [round, playersWithScores, scores, players, presses]);
}
