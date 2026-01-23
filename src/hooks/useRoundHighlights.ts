import { useMemo } from 'react';
import { Round, Player, Score } from '@/types/golf';
import { getScoreType } from '@/types/golf';
import { GameResults } from './useGameResults';

export interface Highlight {
  icon: string;
  text: string;
  type: 'great' | 'bad' | 'neutral';
}

interface UseRoundHighlightsOptions {
  round: Round | null;
  players: Player[];
  scores: Score[];
  gameResults: GameResults | null;
}

/**
 * Hook to calculate round highlights (birdies, eagles, worst holes, etc.)
 */
export function useRoundHighlights({
  round,
  players,
  scores,
  gameResults,
}: UseRoundHighlightsOptions): Highlight[] {
  return useMemo(() => {
    if (!round || scores.length === 0) return [];

    const highlights: Highlight[] = [];

    // Find birdies, eagles, pars
    scores.forEach(score => {
      const hole = round.holeInfo.find(h => h.number === score.holeNumber);
      if (!hole) return;

      const player = players.find(p => p.id === score.playerId);
      if (!player) return;

      const scoreType = getScoreType(score.strokes, hole.par);

      if (scoreType === 'eagle' || scoreType === 'albatross') {
        highlights.push({
          icon: '🦅',
          text: `${player.name} made ${scoreType} on hole ${score.holeNumber}!`,
          type: 'great'
        });
      } else if (scoreType === 'birdie') {
        highlights.push({
          icon: '🐦',
          text: `${player.name} birdied hole ${score.holeNumber}`,
          type: 'great'
        });
      }
    });

    // Find worst holes (triple bogey or worse)
    scores.forEach(score => {
      const hole = round.holeInfo.find(h => h.number === score.holeNumber);
      if (!hole) return;

      const player = players.find(p => p.id === score.playerId);
      if (!player) return;

      if (score.strokes >= hole.par + 3) {
        highlights.push({
          icon: '💀',
          text: `${player.name} scored ${score.strokes} on hole ${score.holeNumber} (par ${hole.par})`,
          type: 'bad'
        });
      }
    });

    // Count birdies per player
    const birdiesPerPlayer: Record<string, number> = {};
    scores.forEach(score => {
      const hole = round.holeInfo.find(h => h.number === score.holeNumber);
      if (!hole) return;

      if (score.strokes < hole.par) {
        birdiesPerPlayer[score.playerId] = (birdiesPerPlayer[score.playerId] || 0) + 1;
      }
    });

    const mostBirdies = Object.entries(birdiesPerPlayer).sort((a, b) => b[1] - a[1])[0];
    if (mostBirdies && mostBirdies[1] > 1) {
      const player = players.find(p => p.id === mostBirdies[0]);
      if (player) {
        highlights.push({
          icon: '🔥',
          text: `${player.name} had the most under-par holes (${mostBirdies[1]})`,
          type: 'great'
        });
      }
    }

    // Skins highlights
    if (gameResults?.skinsResult) {
      const topSkins = gameResults.skinsResult.standings[0];
      if (topSkins && topSkins.skins > 0) {
        highlights.push({
          icon: '🏆',
          text: `${topSkins.playerName} won ${topSkins.skins} skin${topSkins.skins > 1 ? 's' : ''} ($${topSkins.earnings > 0 ? '+' : ''}${topSkins.earnings.toFixed(0)})`,
          type: 'neutral'
        });
      }
    }

    return highlights.slice(0, 8);
  }, [round, scores, players, gameResults]);
}
