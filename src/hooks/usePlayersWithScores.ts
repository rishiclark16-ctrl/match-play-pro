import { useMemo } from 'react';
import { Round, Player, Score, PlayerWithScores } from '@/types/golf';
import {
  calculatePlayingHandicap,
  getStrokesPerHole,
  calculateTotalNetStrokes,
  getManualStrokesPerHole,
  calculateMatchPlayStrokes,
  buildMatchPlayStrokesMap,
} from '@/lib/handicapUtils';

interface UsePlayersWithScoresOptions {
  round: Round | null;
  players: Player[];
  scores: Score[];
  isLoading: boolean;
}

/**
 * Hook to compute players with their scores and handicap calculations.
 * Handles both auto and manual handicap modes, plus 2-player match play differential strokes.
 */
export function usePlayersWithScores({
  round,
  players,
  scores,
  isLoading,
}: UsePlayersWithScoresOptions): PlayerWithScores[] {
  return useMemo(() => {
    if (!round) return [];
    if (isLoading && players.length === 0) return [];

    // Check if this is a 2-player match play scenario for differential strokes
    const isMatchPlay = round.matchPlay || round.games?.some(g => g.type === 'match' || g.type === 'nassau');
    const isTwoPlayerMatch = isMatchPlay && players.length === 2;
    const isManualMode = round.handicapMode === 'manual';

    // For 2-player match play, calculate differential strokes
    let matchPlayStrokesMap: Map<string, Map<number, number>> | undefined;

    // Compute total par for course rating adjustment
    const totalPar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);

    // Helper: get a player's tee set (only relevant in mixedTees mode)
    const getPlayerTee = (player: Player) =>
      (round.mixedTees && round.teeSets)
        ? round.teeSets.find(t => t.id === player.teeSetId)
        : undefined;

    if (isTwoPlayerMatch) {
      const [p1, p2] = players;
      if (round.mixedTees && round.teeSets) {
        // Mixed tees: compute adjusted handicap per player using their own tee
        const p1Tee = getPlayerTee(p1);
        const p2Tee = getPlayerTee(p2);
        const p1Slope = p1Tee?.slope ?? round.slope ?? 113;
        const p1Rating = p1Tee?.courseRating ?? round.rating;
        const p1Par = p1Tee?.par ?? totalPar;
        const p2Slope = p2Tee?.slope ?? round.slope ?? 113;
        const p2Rating = p2Tee?.courseRating ?? round.rating;
        const p2Par = p2Tee?.par ?? totalPar;

        const p1AdjHcp = (p1.handicap !== undefined && !isManualMode)
          ? calculatePlayingHandicap(p1.handicap, p1Slope, round.holes, p1Rating, p1Par)
          : (p1.manualStrokes ?? 0);
        const p2AdjHcp = (p2.handicap !== undefined && !isManualMode)
          ? calculatePlayingHandicap(p2.handicap, p2Slope, round.holes, p2Rating, p2Par)
          : (p2.manualStrokes ?? 0);

        const diff = Math.abs(p1AdjHcp - p2AdjHcp);
        const higherPlayer = p1AdjHcp >= p2AdjHcp ? p1 : p2;
        const lowerPlayer = p1AdjHcp >= p2AdjHcp ? p2 : p1;

        const lowerMap = new Map<number, number>();
        round.holeInfo.forEach(h => lowerMap.set(h.number, 0));

        matchPlayStrokesMap = new Map([
          [higherPlayer.id, getStrokesPerHole(diff, round.holeInfo)],
          [lowerPlayer.id, lowerMap],
        ]);
      } else {
        // Standard single-tee match play (existing code)
        const matchInfo = calculateMatchPlayStrokes(
          { id: p1.id, name: p1.name, handicap: p1.handicap, manualStrokes: p1.manualStrokes },
          { id: p2.id, name: p2.name, handicap: p2.handicap, manualStrokes: p2.manualStrokes },
          round.slope || 113,
          round.holes,
          isManualMode ? 'manual' : 'auto',
          round.rating,
          totalPar
        );
        matchPlayStrokesMap = buildMatchPlayStrokesMap(matchInfo, round.holeInfo);
      }
    }

    return players.map(player => {
      const playerScores = scores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);
      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);

      let playingHandicap: number | undefined;
      let strokesPerHole: Map<number, number> | undefined;
      let totalNetStrokes: number | undefined;
      let netRelativeToPar: number | undefined;

      // Use match play differential strokes if applicable
      if (matchPlayStrokesMap) {
        strokesPerHole = matchPlayStrokesMap.get(player.id);
        // Calculate the effective handicap (sum of strokes received)
        playingHandicap = strokesPerHole
          ? Array.from(strokesPerHole.values()).reduce((sum, s) => sum + s, 0)
          : 0;
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const playedPar1 = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - playedPar1;
      } else if (isManualMode) {
        // Manual mode for non-match-play: use manually entered strokes
        playingHandicap = player.manualStrokes ?? 0;
        strokesPerHole = getManualStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const playedPar2 = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - playedPar2;
      } else if (player.handicap !== undefined && player.handicap !== null) {
        // Auto mode: check for per-player tee (mixed tees) or use round defaults
        const playerTee = getPlayerTee(player);
        const slope = playerTee?.slope ?? round.slope ?? 113;
        const rating = playerTee?.courseRating ?? round.rating;
        const par = playerTee?.par ?? totalPar;

        playingHandicap = calculatePlayingHandicap(player.handicap, slope, round.holes, rating, par);
        strokesPerHole = getStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const playedPar3 = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - playedPar3;
      }

      return {
        ...player,
        scores: playerScores,
        totalStrokes,
        totalRelativeToPar,
        holesPlayed: playerScores.length,
        playingHandicap,
        strokesPerHole,
        totalNetStrokes,
        netRelativeToPar,
        manualStrokes: player.manualStrokes,
      };
    });
  }, [round, players, scores, isLoading]);
}
