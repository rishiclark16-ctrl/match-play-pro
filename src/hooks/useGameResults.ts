import { useMemo } from 'react';
import { Round, Player, Score, Press, PlayerWithScores } from '@/types/golf';
import { calculateSkins, SkinsResult } from '@/lib/games/skins';
import { calculateNassau, NassauResult } from '@/lib/games/nassau';
import { calculateWolfStandings, WolfStanding } from '@/lib/games/wolf';
import { calculateVegas, VegasResult } from '@/lib/games/vegas';
import { calculateNines, NinesResult } from '@/lib/games/nines';
import { calculateDefender, DefenderResult } from '@/lib/games/defender';
import { calculateSixes, SixesResult } from '@/lib/games/sixes';
import { calculateHouseGame, HouseGameResult } from '@/lib/games/houseGame';
import { buildScoringConfig } from '@/lib/houseGame/engine';

export interface GameResults {
  skinsResult?: SkinsResult;
  nassauResult?: NassauResult;
  wolfStandings?: WolfStanding[];
  vegasResult?: VegasResult;
  ninesResult?: NinesResult;
  defenderResult?: DefenderResult;
  sixesResult?: SixesResult;
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

    const skinsGame    = round.games?.find(g => g.type === 'skins');
    const nassauGame   = round.games?.find(g => g.type === 'nassau');
    const wolfGame     = round.games?.find(g => g.type === 'wolf');
    const vegasGame    = round.games?.find(g => g.type === 'vegas');
    const ninesGame    = round.games?.find(g => g.type === 'nines');
    const defenderGame = round.games?.find(g => g.type === 'defender');
    const sixesGame    = round.games?.find(g => g.type === 'sixes');
    const houseGame    = round.games?.find(g => g.type === 'house');

    let skinsResult: SkinsResult | undefined;
    let nassauResult: NassauResult | undefined;
    let wolfStandings: WolfStanding[] | undefined;
    let vegasResult: VegasResult | undefined;
    let ninesResult: NinesResult | undefined;
    let defenderResult: DefenderResult | undefined;
    let sixesResult: SixesResult | undefined;
    let houseGameResult: HouseGameResult | undefined;

    const holesPlayed = Math.max(...playersWithScores.map(p => p.holesPlayed));

    // Build strokes map for net scoring (shared across games that need it)
    let strokesPerHole: Map<string, Map<number, number>> | undefined;
    const anyNetGame = [skinsGame, nassauGame].some(g => g?.useNet);
    if (anyNetGame) {
      strokesPerHole = new Map();
      for (const player of playersWithScores) {
        if (player.strokesPerHole) {
          strokesPerHole.set(player.id, player.strokesPerHole);
        }
      }
      if (strokesPerHole.size === 0) strokesPerHole = undefined;
    }

    if (skinsGame) {
      skinsResult = calculateSkins(
        scores,
        players,
        holesPlayed,
        skinsGame.stakes || 1,
        skinsGame.carryover !== false,
        skinsGame.useNet ? strokesPerHole : undefined
      );
    }

    if (nassauGame) {
      nassauResult = calculateNassau(
        scores,
        players,
        nassauGame.stakes || 1,
        presses,
        round.holes,
        nassauGame.useNet ? strokesPerHole : undefined
      );
    }

    if (wolfGame && (players.length === 3 || players.length === 4)) {
      wolfStandings = calculateWolfStandings(wolfGame.wolfResults || [], players, wolfGame.stakes || 1);
    }

    if (vegasGame && players.length === 4) {
      vegasResult = calculateVegas(scores, playersWithScores, round.holeInfo, vegasGame.stakes || 1, vegasGame.carryover ?? false);
    }

    if (ninesGame && players.length === 3) {
      const netMap = ninesGame.useNet ? strokesPerHole : undefined;
      ninesResult = calculateNines(scores, playersWithScores, round.holeInfo, ninesGame.stakes || 1, netMap);
    }

    if (defenderGame && (players.length === 3 || players.length === 4)) {
      const netMap = defenderGame.useNet ? strokesPerHole : undefined;
      defenderResult = calculateDefender(scores, playersWithScores, round.holeInfo, defenderGame.stakes || 1, netMap);
    }

    if (sixesGame && players.length === 4) {
      const netMap = sixesGame.useNet ? strokesPerHole : undefined;
      sixesResult = calculateSixes(scores, playersWithScores, round.holeInfo, sixesGame.stakes || 1, netMap);
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
          houseGame.bbbResults,
        );
      } catch (err) {
        console.error('[useGameResults] calculateHouseGame failed:', err);
      }
    }

    return { skinsResult, nassauResult, wolfStandings, vegasResult, ninesResult, defenderResult, sixesResult, houseGameResult };
  }, [round, playersWithScores, scores, players, presses]);
}
