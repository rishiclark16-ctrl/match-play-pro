import { useMemo } from 'react';
import { Round, Player, Score, Press, PlayerWithScores } from '@/types/golf';
import { calculateSkins, SkinsResult } from '@/lib/games/skins';
import { calculateNassau, NassauResult } from '@/lib/games/nassau';
import { calculateWolfStandings, WolfStanding } from '@/lib/games/wolf';

export interface GameResults {
  skinsResult?: SkinsResult;
  nassauResult?: NassauResult;
  wolfStandings?: WolfStanding[];
}

interface UseGameResultsOptions {
  round: Round | null;
  players: Player[];
  scores: Score[];
  presses: Press[];
  playersWithScores: PlayerWithScores[];
}

/**
 * Hook to calculate all game results (skins, nassau, wolf)
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

    const skinsGame = round.games?.find(g => g.type === 'skins');
    const nassauGame = round.games?.find(g => g.type === 'nassau');
    const wolfGame = round.games?.find(g => g.type === 'wolf');

    let skinsResult: SkinsResult | undefined;
    let nassauResult: NassauResult | undefined;
    let wolfStandings: WolfStanding[] | undefined;

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

    return { skinsResult, nassauResult, wolfStandings };
  }, [round, playersWithScores, scores, players, presses]);
}
