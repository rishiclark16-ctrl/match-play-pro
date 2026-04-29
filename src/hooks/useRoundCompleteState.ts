import { useMemo } from 'react';
import { Player, PlayerWithScores, Round, Score } from '@/types/golf';
import { PropBet } from '@/types/betting';
import { StrokesPerHoleMap } from '@/lib/games/skins';
import {
  calculateSettlement,
  NetSettlement,
} from '@/lib/games/settlement';
import {
  calculateMatchPlay,
  MatchPlayResult,
} from '@/lib/games/matchPlay';
import {
  calculateMatchPlayStrokes,
  buildMatchPlayStrokesMap,
  calculatePlayingHandicap,
  calculateTotalNetStrokes,
} from '@/lib/handicapUtils';
import { buildConfig } from '@/engine/HouseGameEngine';
import type { useGameResults } from '@/hooks/useGameResults';

type GameResults = ReturnType<typeof useGameResults>;
type HouseGameConfig = ReturnType<typeof buildConfig>;

const JUNK_TYPES: ReadonlySet<string> = new Set(['greenie', 'sandie', 'barkie', 'oozle', 'chippy']);

export interface JunkSummaryEntry {
  name: string;
  won: number;
  net: number;
}

export interface RoundCompletePlayersState {
  playersWithScores: PlayerWithScores[];
  strokesPerHoleMap: StrokesPerHoleMap | undefined;
  matchPlayResult: MatchPlayResult | null;
  sortedPlayers: PlayerWithScores[];
  winner: PlayerWithScores | undefined;
  hasTie: boolean;
  ghostPlayerIds: Set<string>;
}

export interface RoundCompleteSettlementsState {
  settlements: NetSettlement[];
  ghostPotEntries: NetSettlement[];
  ghostPotAmount: number;
  nonGhostSettlements: NetSettlement[];
  houseGameConfig: HouseGameConfig | null;
  houseGameSettlements: NetSettlement[];
  isRainShortened: boolean;
  wonJunkBets: PropBet[];
  junkSummary: JunkSummaryEntry[];
}

interface UseRoundCompletePlayersArgs {
  round: Round | null;
  rawPlayers: Player[];
  rawScores: Score[];
  useNetScoring: boolean;
}

/**
 * Computes the player-side derived state for the RoundComplete page that does
 * NOT depend on game-results: playersWithScores (incl. net scoring), match-play
 * strokes map, sort order, winner, tie state, and ghost-player ids.
 *
 * Behavior is identical to the inline useMemos that previously lived in the
 * page — this hook only reorganizes the calculation.
 */
export function useRoundCompletePlayers({
  round,
  rawPlayers,
  rawScores,
  useNetScoring,
}: UseRoundCompletePlayersArgs): RoundCompletePlayersState {
  // Calculate players with scores (including net scores)
  const playersWithScores = useMemo((): PlayerWithScores[] => {
    if (!round || rawPlayers.length === 0) return [];

    return rawPlayers.map(player => {
      const playerScores = rawScores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);

      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);

      // Calculate net scores — respect manual handicap mode and mixed tees
      const parTotal = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
      const isManualMode = round.handicapMode === 'manual';
      let playingHandicap: number;
      if (isManualMode) {
        playingHandicap = player.manualStrokes ?? 0;
      } else if (player.handicap !== undefined) {
        // In mixed tees mode, use the player's specific tee data
        const playerTee = (round.mixedTees && round.teeSets)
          ? round.teeSets.find(t => t.id === player.teeSetId)
          : undefined;
        const slope = playerTee?.slope ?? round.slope ?? 113;
        const rating = playerTee?.courseRating ?? round.rating;
        const par = playerTee?.par ?? parTotal;
        playingHandicap = calculatePlayingHandicap(player.handicap, slope, round.holes, rating, par);
      } else {
        playingHandicap = 0;
      }
      const totalNetStrokes = calculateTotalNetStrokes(
        totalStrokes,
        playingHandicap,
        playerScores.length,
        round.holes
      );
      // Use par prorated to holes actually played
      const playedPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (hole?.par || 4);
      }, 0);
      const netRelativeToPar = totalNetStrokes - playedPar;

      return {
        ...player,
        scores: playerScores,
        totalStrokes,
        totalRelativeToPar,
        holesPlayed: playerScores.length,
        playingHandicap,
        totalNetStrokes,
        netRelativeToPar,
      };
    });
  }, [round, rawPlayers, rawScores]);

  // Build strokes map for match play net scoring
  const strokesPerHoleMap = useMemo((): StrokesPerHoleMap | undefined => {
    if (!round || rawPlayers.length !== 2) return undefined;

    const [p1, p2] = rawPlayers;
    const totalCoursePar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
    const matchInfo = calculateMatchPlayStrokes(
      { id: p1.id, name: p1.name, handicap: p1.handicap, manualStrokes: p1.manualStrokes },
      { id: p2.id, name: p2.name, handicap: p2.handicap, manualStrokes: p2.manualStrokes },
      round.slope || 113,
      round.holes,
      round.handicapMode || 'auto',
      round.rating,
      totalCoursePar
    );
    return buildMatchPlayStrokesMap(matchInfo, round.holeInfo);
  }, [round, rawPlayers]);

  // Calculate match play result using proper net scoring
  const matchPlayResult = useMemo((): MatchPlayResult | null => {
    if (!round?.matchPlay || playersWithScores.length !== 2) return null;
    return calculateMatchPlay(
      rawScores,
      playersWithScores,
      round.holeInfo,
      useNetScoring ? strokesPerHoleMap : undefined,
      round.holes
    );
  }, [round, playersWithScores, rawScores, strokesPerHoleMap, useNetScoring]);

  // Sort by net or gross strokes based on settings (lowest first)
  const sortedPlayers = useMemo(() => {
    return [...playersWithScores].sort((a, b) => {
      if (useNetScoring) {
        return (a.totalNetStrokes ?? a.totalStrokes) - (b.totalNetStrokes ?? b.totalStrokes);
      }
      return a.totalStrokes - b.totalStrokes;
    });
  }, [playersWithScores, useNetScoring]);

  // Determine winner - use match play result if match play is enabled
  const winner = useMemo(() => {
    if (round?.matchPlay && matchPlayResult?.winnerId) {
      return playersWithScores.find(p => p.id === matchPlayResult.winnerId) || sortedPlayers[0];
    }
    return sortedPlayers[0];
  }, [round, matchPlayResult, playersWithScores, sortedPlayers]);

  const hasTie = useMemo(() => {
    if (round?.matchPlay && matchPlayResult) {
      return matchPlayResult.matchStatus === 'halved';
    }
    if (sortedPlayers.length < 2) return false;
    if (useNetScoring) {
      return (sortedPlayers[0]?.totalNetStrokes ?? 0) === (sortedPlayers[1]?.totalNetStrokes ?? 0);
    }
    return sortedPlayers[0]?.totalStrokes === sortedPlayers[1]?.totalStrokes;
  }, [round, matchPlayResult, sortedPlayers, useNetScoring]);

  // Ghost player ids (used for filtering settlements)
  const ghostPlayerIds = useMemo(
    () => new Set(rawPlayers.filter(p => p.isGhost).map(p => p.id)),
    [rawPlayers]
  );

  return {
    playersWithScores,
    strokesPerHoleMap,
    matchPlayResult,
    sortedPlayers,
    winner,
    hasTie,
    ghostPlayerIds,
  };
}

interface UseRoundCompleteSettlementsArgs {
  round: Round | null;
  rawPlayers: Player[];
  rawScores: Score[];
  playersWithScores: PlayerWithScores[];
  matchPlayResult: MatchPlayResult | null;
  ghostPlayerIds: Set<string>;
  gameResults: GameResults;
  propBets: PropBet[];
}

/**
 * Computes settlements + the ghost-pot split + house-game derived state +
 * junk-bet summary. Depends on game-results so it MUST be called after
 * `useGameResults` in the page.
 */
export function useRoundCompleteSettlements({
  round,
  rawPlayers,
  rawScores,
  playersWithScores,
  matchPlayResult,
  ghostPlayerIds,
  gameResults,
  propBets,
}: UseRoundCompleteSettlementsArgs): RoundCompleteSettlementsState {
  // Calculate settlements
  const settlements = useMemo(() => {
    if (!round || playersWithScores.length === 0) return [];

    const matchPlayWinnerId = matchPlayResult?.winnerId || null;
    const wolfGame = round.games?.find(g => g.type === 'wolf');

    return calculateSettlement(
      rawPlayers,
      gameResults?.skinsResult,
      gameResults?.nassauResult,
      matchPlayWinnerId,
      round.stakes,
      wolfGame?.wolfResults,
      wolfGame?.stakes,
      propBets,
      gameResults?.houseGameResult,
      gameResults?.vegasResult,
      gameResults?.ninesResult,
      gameResults?.defenderResult,
      gameResults?.sixesResult,
    );
  }, [round, playersWithScores, rawPlayers, gameResults, matchPlayResult, propBets]);

  // Ghost pot: amounts that would flow TO ghost players — real players owe this to the pot
  const ghostPotEntries = useMemo(
    () => settlements.filter(s => ghostPlayerIds.has(s.toPlayerId)),
    [settlements, ghostPlayerIds]
  );

  const ghostPotAmount = useMemo(
    () => ghostPotEntries.reduce((sum, s) => sum + s.amount, 0),
    [ghostPotEntries]
  );

  // Exclude all ghost-involving settlements from regular settlement tracking
  const nonGhostSettlements = useMemo(
    () => settlements.filter(s => !ghostPlayerIds.has(s.fromPlayerId) && !ghostPlayerIds.has(s.toPlayerId)),
    [settlements, ghostPlayerIds]
  );

  // House game derived config (used for banners + rain-shortened detection)
  const houseGameConfig = useMemo<HouseGameConfig | null>(() => {
    const houseGameEntry = round?.games?.find(g => g.type === 'house');
    if (!houseGameEntry?.activePrimitives?.length) return null;
    return buildConfig(houseGameEntry.activePrimitives);
  }, [round]);

  // House game settlements derived from the standings (winners pay losers proportionally)
  const houseGameSettlements = useMemo((): NetSettlement[] => {
    const result = gameResults?.houseGameResult;
    if (!result) return [];
    const { standings } = result;
    const winners = standings.filter(s => s.netEarnings > 0);
    const losers  = standings.filter(s => s.netEarnings < 0);
    if (winners.length === 0 || losers.length === 0) return [];
    const totalWinnings = winners.reduce((sum, w) => sum + w.netEarnings, 0);
    const out: NetSettlement[] = [];
    losers.forEach(loser => {
      winners.forEach(winner => {
        const proportion = totalWinnings > 0 ? winner.netEarnings / totalWinnings : 1 / winners.length;
        const amount = Math.round(proportion * Math.abs(loser.netEarnings) * 100) / 100;
        if (amount > 0.01) {
          out.push({
            fromPlayerId: loser.playerId,
            fromPlayerName: loser.playerName,
            toPlayerId: winner.playerId,
            toPlayerName: winner.playerName,
            amount,
          });
        }
      });
    });
    return out;
  }, [gameResults?.houseGameResult]);

  // Rain-shortened: did the round end early (< holes played for back 9)?
  const isRainShortened = useMemo(() => {
    if (!houseGameConfig?.settlementConfig.rainShortened) return false;
    const holesPlayed = Math.max(0, ...rawPlayers.map(p =>
      rawScores.filter(s => s.playerId === p.id).length
    ));
    return holesPlayed < (round?.holes ?? 18);
  }, [houseGameConfig, rawPlayers, rawScores, round]);

  // Won junk bets (greenie/sandie/barkie/oozle/chippy) from prop_bets table
  const wonJunkBets = useMemo(
    () => propBets.filter(b => JUNK_TYPES.has(b.type) && !!b.winnerId),
    [propBets]
  );

  // Per-player junk summary: net earnings (won bets - paid bets)
  const junkSummary = useMemo<JunkSummaryEntry[]>(() => {
    const map = new Map<string, JunkSummaryEntry>();
    rawPlayers.forEach(p => map.set(p.id, { name: p.name, won: 0, net: 0 }));
    wonJunkBets.forEach(bet => {
      if (!bet.winnerId) return;
      const winner = map.get(bet.winnerId);
      if (winner) { winner.won++; winner.net += bet.stakes * (rawPlayers.length - 1); }
      rawPlayers.filter(p => p.id !== bet.winnerId).forEach(p => {
        const entry = map.get(p.id);
        if (entry) entry.net -= bet.stakes;
      });
    });
    return Array.from(map.values()).filter(e => e.won > 0 || e.net !== 0);
  }, [wonJunkBets, rawPlayers]);

  return {
    settlements,
    ghostPotEntries,
    ghostPotAmount,
    nonGhostSettlements,
    houseGameConfig,
    houseGameSettlements,
    isRainShortened,
    wonJunkBets,
    junkSummary,
  };
}
