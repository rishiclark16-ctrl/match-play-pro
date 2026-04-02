import { Score, Player } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

export interface RabbitHoleResult {
  holeNumber: number;
  winnerId: string | null;
  holderId: string | null;
}

export interface RabbitStanding {
  playerId: string;
  playerName: string;
  earnings: number;
  timesHeld: number;
}

export interface RabbitResult {
  holeResults: RabbitHoleResult[];
  frontRabbitHolder: string | null;
  backRabbitHolder: string | null;
  standings: RabbitStanding[];
}

// Helper to get net score for a player on a hole
function getNetScore(score: Score, strokesPerHole?: StrokesPerHoleMap): number {
  if (!strokesPerHole) return score.strokes;
  const playerStrokes = strokesPerHole.get(score.playerId);
  const holeStrokes = playerStrokes?.get(score.holeNumber) || 0;
  return score.strokes - holeStrokes;
}

export function calculateRabbit(
  scores: Score[],
  players: Player[],
  holesPlayed: number,
  unitValue: number,
  totalHoles: 9 | 18,
  strokesPerHole?: StrokesPerHoleMap,
): RabbitResult {
  const holeResults: RabbitHoleResult[] = [];
  let currentHolder: string | null = null;
  let frontRabbitHolder: string | null = null;
  let backRabbitHolder: string | null = null;
  const timesHeld: Record<string, number> = {};
  players.forEach(p => timesHeld[p.id] = 0);

  for (let hole = 1; hole <= holesPlayed; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);

    if (holeScores.length < players.length) {
      holeResults.push({ holeNumber: hole, winnerId: null, holderId: currentHolder });
      continue;
    }

    const sorted = [...holeScores].sort((a, b) =>
      getNetScore(a, strokesPerHole) - getNetScore(b, strokesPerHole)
    );
    const lowestNet = getNetScore(sorted[0], strokesPerHole);
    const winners = sorted.filter(s => getNetScore(s, strokesPerHole) === lowestNet);

    const winnerId = winners.length === 1 ? winners[0].playerId : null;
    if (winnerId) currentHolder = winnerId;

    holeResults.push({ holeNumber: hole, winnerId, holderId: currentHolder });

    // Check segment boundaries
    if (hole === 9) frontRabbitHolder = currentHolder;
    if (hole === 18) backRabbitHolder = currentHolder;

    // Reset rabbit for back 9
    if (hole === 9 && totalHoles === 18) currentHolder = null;
  }

  // For 9-hole rounds, front is the only segment
  if (totalHoles === 9) frontRabbitHolder = currentHolder;

  // Calculate earnings
  const otherCount = players.length - 1;
  const standings: RabbitStanding[] = players.map(p => {
    let segments = 0;
    if (frontRabbitHolder === p.id) segments++;
    if (totalHoles === 18 && backRabbitHolder === p.id) segments++;
    timesHeld[p.id] = segments;

    // Loser pays unitValue to each other player per segment held
    const lost = segments * unitValue * otherCount;
    // Collect from each segment where someone else held the rabbit
    let gained = 0;
    if (frontRabbitHolder && frontRabbitHolder !== p.id) gained += unitValue;
    if (totalHoles === 18 && backRabbitHolder && backRabbitHolder !== p.id) gained += unitValue;

    return {
      playerId: p.id,
      playerName: p.name,
      earnings: gained - lost,
      timesHeld: segments,
    };
  }).sort((a, b) => b.earnings - a.earnings);

  return { holeResults, frontRabbitHolder, backRabbitHolder, standings };
}
