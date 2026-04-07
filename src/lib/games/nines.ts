/**
 * Nines (5-3-1 / 9-Point / Split Sixes variant)
 *
 * Exactly 3 players. 9 points distributed per hole by net score rank:
 *   - All three different: 5 / 3 / 1
 *   - Two tied for low + one high: 4 / 4 / 1
 *   - One low + two tied for high: 5 / 2 / 2
 *   - All three tied: 3 / 3 / 3
 *
 * Settlement: pairwise — each player owes every player above them the
 * point difference × unit value.
 */

import { Score, Player } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

export interface NinesHoleResult {
  holeNumber: number;
  playerPoints: Record<string, number>; // playerId → points this hole
  netScores: Record<string, number>;
  pattern: 'all_different' | 'two_low' | 'two_high' | 'all_tied';
}

export interface NinesStanding {
  playerId: string;
  playerName: string;
  totalPoints: number;
  earnings: number;
}

export interface NinesResult {
  holeResults: NinesHoleResult[];
  standings: NinesStanding[];
  holesScored: number;
}

function getNetScore(score: Score, strokesPerHole?: StrokesPerHoleMap): number {
  if (!strokesPerHole) return score.strokes;
  const playerStrokes = strokesPerHole.get(score.playerId);
  const holeStrokes = playerStrokes?.get(score.holeNumber) || 0;
  return score.strokes - holeStrokes;
}

export function calculateNines(
  scores: Score[],
  players: Player[],
  holesPlayed: number,
  unitValue: number,
  strokesPerHole?: StrokesPerHoleMap,
): NinesResult {
  if (players.length !== 3) {
    return { holeResults: [], standings: [], holesScored: 0 };
  }

  const holeResults: NinesHoleResult[] = [];
  const totalPoints: Record<string, number> = {};
  players.forEach(p => { totalPoints[p.id] = 0; });

  for (let hole = 1; hole <= holesPlayed; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    if (holeScores.length < 3) continue;

    // Get net scores for each player
    const entries = players.map(p => {
      const score = holeScores.find(s => s.playerId === p.id);
      return {
        playerId: p.id,
        net: score ? getNetScore(score, strokesPerHole) : 999,
      };
    }).sort((a, b) => a.net - b.net);

    const [first, second, third] = entries;
    const netScores: Record<string, number> = {};
    entries.forEach(e => { netScores[e.playerId] = e.net; });

    const points: Record<string, number> = {};
    let pattern: NinesHoleResult['pattern'];

    if (first.net === second.net && second.net === third.net) {
      // All tied: 3 / 3 / 3
      pattern = 'all_tied';
      points[first.playerId] = 3;
      points[second.playerId] = 3;
      points[third.playerId] = 3;
    } else if (first.net === second.net) {
      // Two tied for low: 4 / 4 / 1
      pattern = 'two_low';
      points[first.playerId] = 4;
      points[second.playerId] = 4;
      points[third.playerId] = 1;
    } else if (second.net === third.net) {
      // One low + two tied for high: 5 / 2 / 2
      pattern = 'two_high';
      points[first.playerId] = 5;
      points[second.playerId] = 2;
      points[third.playerId] = 2;
    } else {
      // All different: 5 / 3 / 1
      pattern = 'all_different';
      points[first.playerId] = 5;
      points[second.playerId] = 3;
      points[third.playerId] = 1;
    }

    // Accumulate
    Object.entries(points).forEach(([pid, pts]) => {
      totalPoints[pid] += pts;
    });

    holeResults.push({ holeNumber: hole, playerPoints: points, netScores, pattern });
  }

  // Pairwise settlement: each pair settles the point difference × unitValue
  const earnings: Record<string, number> = {};
  players.forEach(p => { earnings[p.id] = 0; });

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const diff = (totalPoints[players[i].id] - totalPoints[players[j].id]) * unitValue;
      earnings[players[i].id] += diff;
      earnings[players[j].id] -= diff;
    }
  }

  const standings: NinesStanding[] = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    totalPoints: totalPoints[p.id],
    earnings: Math.round(earnings[p.id] * 100) / 100,
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  return { holeResults, standings, holesScored: holeResults.length };
}
