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

    if (isTwoPlayerMatch) {
      const [p1, p2] = players;
      const matchInfo = calculateMatchPlayStrokes(
        { id: p1.id, name: p1.name, handicap: p1.handicap, manualStrokes: p1.manualStrokes },
        { id: p2.id, name: p2.name, handicap: p2.handicap, manualStrokes: p2.manualStrokes },
        round.slope || 113,
        round.holes,
        isManualMode ? 'manual' : 'auto'
      );
      matchPlayStrokesMap = buildMatchPlayStrokesMap(matchInfo, round.holeInfo);
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
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      } else if (isManualMode) {
        // Manual mode for non-match-play: use manually entered strokes
        playingHandicap = player.manualStrokes ?? 0;
        strokesPerHole = getManualStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      } else if (player.handicap !== undefined && player.handicap !== null) {
        // Auto mode for non-match-play: calculate from handicap index and course slope
        playingHandicap = calculatePlayingHandicap(player.handicap, round.slope || 113, round.holes);
        strokesPerHole = getStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
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
