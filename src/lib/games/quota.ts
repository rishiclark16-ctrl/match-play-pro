import { Score, Player, HoleInfo } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';
import { getStablefordPoints } from './stableford';

export interface QuotaStanding {
  playerId: string;
  playerName: string;
  quota: number;
  totalPoints: number;
  overUnder: number;
  earnings: number;
}

export interface QuotaResult {
  standings: QuotaStanding[];
  holesScored: number;
}

// Helper to get net score for a player on a hole
function getNetScore(
  playerId: string,
  holeNumber: number,
  grossStrokes: number,
  strokesPerHole?: StrokesPerHoleMap
): number {
  if (!strokesPerHole) return grossStrokes;
  const playerStrokes = strokesPerHole.get(playerId);
  const holeStrokes = playerStrokes?.get(holeNumber) || 0;
  return grossStrokes - holeStrokes;
}

export function calculateQuota(
  scores: Score[],
  players: Player[],
  holeInfo: HoleInfo[],
  unitValue: number,
  strokesPerHole?: StrokesPerHoleMap,
): QuotaResult {
  const standings: QuotaStanding[] = players.map(p => {
    const handicap = p.handicap ?? 0;
    const quota = Math.max(36 - handicap, 0);
    return {
      playerId: p.id,
      playerName: p.name,
      quota,
      totalPoints: 0,
      overUnder: 0,
      earnings: 0,
    };
  });

  scores.forEach(score => {
    const hole = holeInfo.find(h => h.number === score.holeNumber);
    if (!hole) return;

    const netStrokes = getNetScore(score.playerId, score.holeNumber, score.strokes, strokesPerHole);
    const points = getStablefordPoints(netStrokes, hole.par);
    const standing = standings.find(s => s.playerId === score.playerId);
    if (standing) {
      standing.totalPoints += points;
    }
  });

  // Calculate over/under
  standings.forEach(s => {
    s.overUnder = s.totalPoints - s.quota;
  });

  // Pairwise settlement: each pair settles the difference in over/under
  for (let i = 0; i < standings.length; i++) {
    for (let j = i + 1; j < standings.length; j++) {
      const diff = (standings[i].overUnder - standings[j].overUnder) * unitValue;
      standings[i].earnings += diff;
      standings[j].earnings -= diff;
    }
  }

  // Count unique scored holes
  const scoredHoleNumbers = new Set(
    scores
      .filter(s => holeInfo.some(h => h.number === s.holeNumber))
      .map(s => s.holeNumber)
  );

  return {
    standings: standings.sort((a, b) => b.overUnder - a.overUnder),
    holesScored: scoredHoleNumbers.size,
  };
}
