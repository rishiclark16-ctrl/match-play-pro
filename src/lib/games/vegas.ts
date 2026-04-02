import { Score, Player, HoleInfo } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

export interface VegasHoleResult {
  holeNumber: number;
  teamAScore: number;    // 2-digit combined (e.g., 45)
  teamBScore: number;    // 2-digit combined (e.g., 36)
  teamAFlipped: boolean; // birdie flip applied?
  teamBFlipped: boolean;
  pointDiff: number;     // positive = Team A wins, negative = Team B wins
}

export interface VegasResult {
  holeResults: VegasHoleResult[];
  teamATotal: number;    // net points for team A
  teamBTotal: number;    // net points for team B
  teamAEarnings: number; // $ per player on team A
  teamBEarnings: number; // $ per player on team B
  holesPlayed: number;
}

// Helper to get net score for a player on a hole
function getNetScore(score: Score, strokesPerHole?: StrokesPerHoleMap): number {
  if (!strokesPerHole) return score.strokes;
  const playerStrokes = strokesPerHole.get(score.playerId);
  const holeStrokes = playerStrokes?.get(score.holeNumber) || 0;
  return score.strokes - holeStrokes;
}

// Combine two scores into a 2-digit number, lower in tens place
function combineScores(a: number, b: number): number {
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  return low * 10 + high;
}

// Reverse the digits of a 2-digit number
function flipDigits(n: number): number {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones * 10 + tens;
}

export function calculateVegas(
  scores: Score[],
  players: Player[],
  holeInfo: HoleInfo[],
  unitValue: number,
  holesPlayed: number,
  strokesPerHole?: StrokesPerHoleMap,
): VegasResult {
  const holeResults: VegasHoleResult[] = [];

  if (players.length < 4) {
    return { holeResults, teamATotal: 0, teamBTotal: 0, teamAEarnings: 0, teamBEarnings: 0, holesPlayed };
  }

  const teamA = [players[0], players[1]];
  const teamB = [players[2], players[3]];

  for (let hole = 1; hole <= holesPlayed; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    const allFour = [...teamA, ...teamB].map(p => holeScores.find(s => s.playerId === p.id));

    // Skip if any player missing a score
    if (allFour.some(s => !s)) continue;

    const netScores = allFour.map(s => getNetScore(s!, strokesPerHole));
    const par = holeInfo.find(h => h.number === hole)?.par ?? 4;
    const hasBirdie = netScores.some(ns => ns < par);

    let teamAScore = combineScores(netScores[0], netScores[1]);
    let teamBScore = combineScores(netScores[2], netScores[3]);

    let teamAFlipped = false;
    let teamBFlipped = false;

    if (hasBirdie) {
      if (teamAScore > teamBScore) {
        teamAScore = flipDigits(teamAScore);
        teamAFlipped = true;
      } else if (teamBScore > teamAScore) {
        teamBScore = flipDigits(teamBScore);
        teamBFlipped = true;
      }
    }

    const pointDiff = teamBScore - teamAScore; // positive = Team A wins

    holeResults.push({ holeNumber: hole, teamAScore, teamBScore, teamAFlipped, teamBFlipped, pointDiff });
  }

  const teamATotal = holeResults.reduce((sum, r) => sum + r.pointDiff, 0);
  const teamBTotal = -teamATotal;
  const teamAEarnings = teamATotal * unitValue;
  const teamBEarnings = teamBTotal * unitValue;

  return { holeResults, teamATotal, teamBTotal, teamAEarnings, teamBEarnings, holesPlayed };
}
