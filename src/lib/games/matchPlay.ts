import { Score, Player, HoleInfo } from '@/types/golf';

export type StrokesPerHoleMap = Map<string, Map<number, number>>;

export interface MatchPlayHoleResult {
  holeNumber: number;
  winnerId: string | null; // null = halved
  grossScores: Record<string, number>;
  netScores: Record<string, number>;
  strokesReceived: Record<string, number>;
}

export interface MatchPlayResult {
  holeResults: MatchPlayHoleResult[];
  leaderId: string | null;
  holesUp: number; // positive = leader is up by this many
  holesPlayed: number;
  holesRemaining: number;
  matchStatus: 'ongoing' | 'dormie' | 'won' | 'halved' | 'not_started';
  winnerId: string | null;
  statusText: string; // "Jack 2 UP", "All Square", "Tim 3&2"
  winMargin?: string; // "3&2", "1 UP", etc.
}

/**
 * Calculate match play results for a 2-player match
 * Uses net scores based on strokesPerHole (differential strokes)
 */
export function calculateMatchPlay(
  scores: Score[],
  players: Player[],
  holeInfo: HoleInfo[],
  strokesPerHole: StrokesPerHoleMap | undefined,
  totalHoles: 9 | 18
): MatchPlayResult {
  if (players.length !== 2) {
    return {
      holeResults: [],
      leaderId: null,
      holesUp: 0,
      holesPlayed: 0,
      holesRemaining: totalHoles,
      matchStatus: 'not_started',
      winnerId: null,
      statusText: 'Match Play requires 2 players',
    };
  }

  const [player1, player2] = players;
  const holeResults: MatchPlayHoleResult[] = [];
  
  let player1HolesWon = 0;
  let player2HolesWon = 0;
  let holesPlayed = 0;

  // Process each hole
  for (let holeNum = 1; holeNum <= totalHoles; holeNum++) {
    const holeData = holeInfo.find(h => h.number === holeNum);
    if (!holeData) continue;

    const p1Score = scores.find(s => s.playerId === player1.id && s.holeNumber === holeNum);
    const p2Score = scores.find(s => s.playerId === player2.id && s.holeNumber === holeNum);

    // Skip if either player hasn't scored this hole
    if (!p1Score || !p2Score) continue;

    holesPlayed++;

    // Get strokes received for this hole
    const p1Strokes = strokesPerHole?.get(player1.id)?.get(holeNum) ?? 0;
    const p2Strokes = strokesPerHole?.get(player2.id)?.get(holeNum) ?? 0;

    // Calculate net scores
    const p1Net = p1Score.strokes - p1Strokes;
    const p2Net = p2Score.strokes - p2Strokes;

    let winnerId: string | null = null;
    if (p1Net < p2Net) {
      winnerId = player1.id;
      player1HolesWon++;
    } else if (p2Net < p1Net) {
      winnerId = player2.id;
      player2HolesWon++;
    }
    // If equal, hole is halved (winnerId stays null)

    holeResults.push({
      holeNumber: holeNum,
      winnerId,
      grossScores: {
        [player1.id]: p1Score.strokes,
        [player2.id]: p2Score.strokes,
      },
      netScores: {
        [player1.id]: p1Net,
        [player2.id]: p2Net,
      },
      strokesReceived: {
        [player1.id]: p1Strokes,
        [player2.id]: p2Strokes,
      },
    });
  }

  const holesRemaining = totalHoles - holesPlayed;
  const holeDiff = player1HolesWon - player2HolesWon;
  const holesUp = Math.abs(holeDiff);
  const leaderId = holeDiff > 0 ? player1.id : holeDiff < 0 ? player2.id : null;
  const leaderName = leaderId === player1.id ? player1.name : leaderId === player2.id ? player2.name : null;

  // Determine match status
  let matchStatus: MatchPlayResult['matchStatus'] = 'ongoing';
  let winnerId: string | null = null;
  let statusText = 'All Square';
  let winMargin: string | undefined;

  if (holesPlayed === 0) {
    matchStatus = 'not_started';
    statusText = 'Match not started';
  } else if (holesUp > holesRemaining) {
    // Match is won - leader has more holes up than holes remaining
    matchStatus = 'won';
    winnerId = leaderId;
    winMargin = holesRemaining === 0 ? `${holesUp} UP` : `${holesUp}&${holesRemaining}`;
    statusText = `${leaderName} wins ${winMargin}`;
  } else if (holesUp === holesRemaining && holesUp > 0) {
    // Dormie - leader is up by exactly the number of holes remaining
    matchStatus = 'dormie';
    statusText = `${leaderName} ${holesUp} UP (Dormie)`;
  } else if (holesRemaining === 0 && holesUp === 0) {
    // Match ended in a tie
    matchStatus = 'halved';
    statusText = 'Match Halved';
  } else if (holesUp === 0) {
    statusText = 'All Square';
  } else {
    statusText = `${leaderName} ${holesUp} UP`;
  }

  return {
    holeResults,
    leaderId,
    holesUp,
    holesPlayed,
    holesRemaining,
    matchStatus,
    winnerId,
    statusText,
    winMargin,
  };
}

/**
 * Get a brief status string for the match (e.g., "2 UP", "AS", "3&2")
 */
export function getMatchPlayStatusBrief(result: MatchPlayResult): string {
  if (result.matchStatus === 'won') {
    return result.winMargin || 'Won';
  }
  if (result.matchStatus === 'halved') {
    return 'Halved';
  }
  if (result.holesUp === 0) {
    return 'AS'; // All Square
  }
  return `${result.holesUp} UP`;
}

/**
 * Get the color class for displaying match status
 */
export function getMatchPlayStatusColor(result: MatchPlayResult, playerId: string): string {
  if (result.matchStatus === 'halved' || result.holesUp === 0) {
    return 'text-muted-foreground';
  }
  if (result.leaderId === playerId) {
    return 'text-success';
  }
  return 'text-danger';
}
