import { Score, Player, HoleInfo } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

export interface VegasHoleResult {
  holeNumber: number;
  teamAScore: number;    // 2-digit combined (e.g., 45)
  teamBScore: number;    // 2-digit combined (e.g., 36)
  teamAFlipped: boolean; // birdie flip applied?
  teamBFlipped: boolean;
  teamAEagle: boolean;   // eagle doubler applied?
  teamBEagle: boolean;
  pointDiff: number;     // positive = Team A wins, negative = Team B wins
  carryoverMultiplier: number; // 1 = normal, 2+ = carried over ties
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

/**
 * Combine two scores into a 2-digit number.
 * Standard rule: lower digit in tens place, higher in ones.
 * 10+ rule: if EITHER score is 10+, the HIGHER goes first (to prevent catastrophic blowouts).
 */
function combineScores(a: number, b: number): number {
  // 10+ rule: if either score is 10 or more, put the higher number first
  if (a >= 10 || b >= 10) {
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    return high * 10 + low;
  }
  // Standard: lower digit first
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
  carryoverEnabled: boolean = false,
): VegasResult {
  const holeResults: VegasHoleResult[] = [];

  if (players.length < 4) {
    return { holeResults, teamATotal: 0, teamBTotal: 0, teamAEarnings: 0, teamBEarnings: 0, holesPlayed };
  }

  const teamA = [players[0], players[1]];
  const teamB = [players[2], players[3]];

  let carryoverMultiplier = 1;

  for (let hole = 1; hole <= holesPlayed; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    const allFour = [...teamA, ...teamB].map(p => holeScores.find(s => s.playerId === p.id));

    // Skip if any player missing a score
    if (allFour.some(s => !s)) continue;

    const netScores = allFour.map(s => getNetScore(s!, strokesPerHole));
    const par = holeInfo.find(h => h.number === hole)?.par ?? 4;

    // Combine scores (handles 10+ rule internally)
    let teamAScore = combineScores(netScores[0], netScores[1]);
    let teamBScore = combineScores(netScores[2], netScores[3]);

    let teamAFlipped = false;
    let teamBFlipped = false;
    let teamAEagle = false;
    let teamBEagle = false;

    // Detect birdies and eagles per team
    const teamABirdie = [netScores[0], netScores[1]].some(ns => ns < par);
    const teamBBirdie = [netScores[2], netScores[3]].some(ns => ns < par);
    const teamAHasEagle = [netScores[0], netScores[1]].some(ns => ns <= par - 2);
    const teamBHasEagle = [netScores[2], netScores[3]].some(ns => ns <= par - 2);
    const mutualBirdies = teamABirdie && teamBBirdie;

    // Birdie flip: when one team has a birdie and the other doesn't,
    // the OPPOSING team's score gets flipped (high digit first).
    // Both teams birdie = flips cancel, no flip applied.
    // Skip flip when 10+ rule is active on the flipped team (digits already high-first).
    if (!mutualBirdies) {
      if (teamABirdie) {
        // Team A has birdie — flip Team B's score
        const teamBHasTenPlus = netScores[2] >= 10 || netScores[3] >= 10;
        if (!teamBHasTenPlus) {
          teamBScore = flipDigits(teamBScore);
          teamBFlipped = true;
        }
      }
      if (teamBBirdie) {
        // Team B has birdie — flip Team A's score
        const teamAHasTenPlus = netScores[0] >= 10 || netScores[1] >= 10;
        if (!teamAHasTenPlus) {
          teamAScore = flipDigits(teamAScore);
          teamAFlipped = true;
        }
      }
    }

    // Calculate point difference
    let pointDiff = teamBScore - teamAScore; // positive = Team A wins

    // Eagle: when one team has an eagle and the other doesn't,
    // the point difference is doubled (on top of the birdie flip already applied).
    if (teamAHasEagle && !teamBHasEagle) {
      pointDiff = pointDiff * 2;
      teamAEagle = true;
    } else if (teamBHasEagle && !teamAHasEagle) {
      pointDiff = pointDiff * 2;
      teamBEagle = true;
    }

    // Apply carryover multiplier from previous tied holes
    const effectiveDiff = pointDiff * carryoverMultiplier;

    // Handle carryover for tied holes
    if (pointDiff === 0 && carryoverEnabled) {
      carryoverMultiplier++;
      holeResults.push({
        holeNumber: hole,
        teamAScore,
        teamBScore,
        teamAFlipped,
        teamBFlipped,
        teamAEagle,
        teamBEagle,
        pointDiff: 0,
        carryoverMultiplier,
      });
    } else {
      holeResults.push({
        holeNumber: hole,
        teamAScore,
        teamBScore,
        teamAFlipped,
        teamBFlipped,
        teamAEagle,
        teamBEagle,
        pointDiff: effectiveDiff,
        carryoverMultiplier: carryoverMultiplier,
      });
      carryoverMultiplier = 1; // Reset after a decided hole
    }
  }

  const teamATotal = holeResults.reduce((sum, r) => sum + r.pointDiff, 0);
  const teamBTotal = -teamATotal;
  const teamAEarnings = teamATotal * unitValue;
  const teamBEarnings = teamBTotal * unitValue;

  return { holeResults, teamATotal, teamBTotal, teamAEarnings, teamBEarnings, holesPlayed };
}
