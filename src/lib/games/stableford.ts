import { Score, Player, HoleInfo, StablefordPoints } from '@/types/golf';

// Standard Stableford points
const STANDARD_POINTS: StablefordPoints = {
  albatross: 5,
  eagle: 4,
  birdie: 3,
  par: 2,
  bogey: 1,
  doubleBogey: 0,
  worse: 0
};

// Modified Stableford (more aggressive, used in some tournaments)
const MODIFIED_POINTS: StablefordPoints = {
  albatross: 8,
  eagle: 5,
  birdie: 3,
  par: 1,
  bogey: 0,
  doubleBogey: -1,
  worse: -3
};

export function getStablefordPoints(
  strokes: number,
  par: number,
  modified: boolean = false
): number {
  const points = modified ? MODIFIED_POINTS : STANDARD_POINTS;
  const relativeToPar = strokes - par;
  
  if (relativeToPar <= -3) return points.albatross;
  if (relativeToPar === -2) return points.eagle;
  if (relativeToPar === -1) return points.birdie;
  if (relativeToPar === 0) return points.par;
  if (relativeToPar === 1) return points.bogey;
  if (relativeToPar === 2) return points.doubleBogey;
  return points.worse;
}

export function getPointsLabel(points: number): string {
  if (points >= 5) return 'Albatross!';
  if (points === 4) return 'Eagle';
  if (points === 3) return 'Birdie';
  if (points === 2) return 'Par';
  if (points === 1) return 'Bogey';
  if (points === 0) return 'No Points';
  return `${points} pts`;
}

export interface StablefordStanding {
  playerId: string;
  playerName: string;
  totalPoints: number;
  holePoints: { hole: number; points: number }[];
}

export interface StablefordResult {
  standings: StablefordStanding[];
  modified: boolean;
  holesScored: number;
}

export function calculateStableford(
  scores: Score[],
  players: Player[],
  holeInfo: HoleInfo[],
  modified: boolean = false
): StablefordResult {
  const standings: StablefordStanding[] = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    totalPoints: 0,
    holePoints: []
  }));
  
  let holesScored = 0;
  
  scores.forEach(score => {
    const hole = holeInfo.find(h => h.number === score.holeNumber);
    if (!hole) return;
    
    const points = getStablefordPoints(score.strokes, hole.par, modified);
    const standing = standings.find(s => s.playerId === score.playerId);
    if (standing) {
      standing.totalPoints += points;
      standing.holePoints.push({ hole: score.holeNumber, points });
    }
  });
  
  // Count unique holes scored
  const uniqueHoles = new Set(scores.map(s => s.holeNumber));
  holesScored = uniqueHoles.size;
  
  return {
    standings: standings.sort((a, b) => b.totalPoints - a.totalPoints),
    modified,
    holesScored
  };
}

// Format Stableford points display
export function formatStablefordPoints(points: number): string {
  if (points >= 0) return `${points} pts`;
  return `${points} pts`;
}

// Get color class for Stableford points
export function getStablefordPointsColor(points: number): string {
  if (points >= 4) return 'text-success';
  if (points >= 2) return 'text-foreground';
  if (points === 1) return 'text-warning';
  return 'text-danger';
}
