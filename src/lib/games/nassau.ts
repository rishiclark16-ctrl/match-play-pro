import { Player, Score, Press, Settlement } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

export interface NassauSegment {
  winnerId: string | null;
  scores: Record<string, number>;
  holesPlayed: number;
  margin: number;  // Positive = player1 leading, negative = player2 leading
}

export interface NassauResult {
  front9: NassauSegment;
  back9: NassauSegment;
  overall: NassauSegment;
  presses: Press[];
  settlements: Settlement[];
  currentHoleStatus: {
    front9Leader: string | null;
    front9Margin: number;
    back9Leader: string | null;
    back9Margin: number;
    overallLeader: string | null;
    overallMargin: number;
  };
}

// Helper to get net score for a player on a hole
function getNetScore(score: Score, strokesPerHole?: StrokesPerHoleMap): number {
  if (!strokesPerHole) return score.strokes;
  const playerStrokes = strokesPerHole.get(score.playerId);
  const holeStrokes = playerStrokes?.get(score.holeNumber) || 0;
  return score.strokes - holeStrokes;
}

export function calculateNassau(
  scores: Score[],
  players: Player[],
  stakes: number,
  presses: Press[] = [],
  holesInRound: 9 | 18 = 18,
  strokesPerHole?: StrokesPerHoleMap
): NassauResult {
  const front9: Record<string, number> = {};
  const back9: Record<string, number> = {};
  const overall: Record<string, number> = {};
  
  let front9HolesPlayed = 0;
  let back9HolesPlayed = 0;
  
  players.forEach(p => {
    front9[p.id] = 0;
    back9[p.id] = 0;
    overall[p.id] = 0;
  });
  
  // Calculate totals for each segment using net scores when applicable
  for (let hole = 1; hole <= (holesInRound === 18 ? 18 : 9); hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    if (holeScores.length === players.length) {
      holeScores.forEach(s => {
        const netScore = getNetScore(s, strokesPerHole);
        overall[s.playerId] += netScore;
        if (hole <= 9) {
          front9[s.playerId] += netScore;
        } else {
          back9[s.playerId] += netScore;
        }
      });
      
      if (hole <= 9) front9HolesPlayed++;
      else back9HolesPlayed++;
    }
  }
  
  const findWinnerAndMargin = (scoreMap: Record<string, number>): { winnerId: string | null; margin: number } => {
    const entries = Object.entries(scoreMap).filter(([_, s]) => s > 0);
    if (entries.length < 2) return { winnerId: null, margin: 0 };
    
    const sorted = entries.sort((a, b) => a[1] - b[1]);
    const [leaderId, leaderScore] = sorted[0];
    const [_, secondScore] = sorted[1];
    
    if (leaderScore === secondScore) {
      return { winnerId: null, margin: 0 }; // Tied
    }
    
    return { 
      winnerId: leaderId, 
      margin: secondScore - leaderScore 
    };
  };
  
  const front9Result = findWinnerAndMargin(front9);
  const back9Result = findWinnerAndMargin(back9);
  const overallResult = findWinnerAndMargin(overall);
  
  const settlements: Settlement[] = [];
  
  // For 2 players, calculate head-to-head settlements
  if (players.length === 2) {
    const [p1, p2] = players;
    
    // Front 9 settlement (only if all 9 holes played)
    if (front9HolesPlayed === 9 && front9Result.winnerId) {
      const loser = front9Result.winnerId === p1.id ? p2 : p1;
      const winner = players.find(p => p.id === front9Result.winnerId)!;
      settlements.push({
        fromPlayerId: loser.id,
        fromPlayerName: loser.name,
        toPlayerId: winner.id,
        toPlayerName: winner.name,
        amount: stakes,
        description: 'Front 9'
      });
    }
    
    // Back 9 settlement (only if all 9 holes played)
    if (back9HolesPlayed === 9 && back9Result.winnerId) {
      const loser = back9Result.winnerId === p1.id ? p2 : p1;
      const winner = players.find(p => p.id === back9Result.winnerId)!;
      settlements.push({
        fromPlayerId: loser.id,
        fromPlayerName: loser.name,
        toPlayerId: winner.id,
        toPlayerName: winner.name,
        amount: stakes,
        description: 'Back 9'
      });
    }
    
    // Overall settlement (only if all holes played)
    if (front9HolesPlayed + back9HolesPlayed === holesInRound && overallResult.winnerId) {
      const loser = overallResult.winnerId === p1.id ? p2 : p1;
      const winner = players.find(p => p.id === overallResult.winnerId)!;
      settlements.push({
        fromPlayerId: loser.id,
        fromPlayerName: loser.name,
        toPlayerId: winner.id,
        toPlayerName: winner.name,
        amount: stakes,
        description: 'Overall'
      });
    }
    
    // Process presses - also use net scores
    presses.forEach(press => {
      const pressScores: Record<string, number> = { [p1.id]: 0, [p2.id]: 0 };
      let pressHolesPlayed = 0;
      
      for (let hole = press.startHole; hole <= holesInRound; hole++) {
        const holeScores = scores.filter(s => s.holeNumber === hole);
        if (holeScores.length === 2) {
          holeScores.forEach(s => {
            pressScores[s.playerId] += getNetScore(s, strokesPerHole);
          });
          pressHolesPlayed++;
        }
      }
      
      if (pressHolesPlayed > 0 && press.status === 'active') {
        const pressResult = findWinnerAndMargin(pressScores);
        if (pressResult.winnerId && pressHolesPlayed === (holesInRound - press.startHole + 1)) {
          const loser = pressResult.winnerId === p1.id ? p2 : p1;
          const winner = players.find(p => p.id === pressResult.winnerId)!;
          settlements.push({
            fromPlayerId: loser.id,
            fromPlayerName: loser.name,
            toPlayerId: winner.id,
            toPlayerName: winner.name,
            amount: press.stakes,
            description: `Press (hole ${press.startHole})`
          });
        }
      }
    });
  }
  
  return {
    front9: { 
      winnerId: front9Result.winnerId, 
      scores: front9, 
      holesPlayed: front9HolesPlayed,
      margin: front9Result.margin
    },
    back9: { 
      winnerId: back9Result.winnerId, 
      scores: back9, 
      holesPlayed: back9HolesPlayed,
      margin: back9Result.margin
    },
    overall: { 
      winnerId: overallResult.winnerId, 
      scores: overall, 
      holesPlayed: front9HolesPlayed + back9HolesPlayed,
      margin: overallResult.margin
    },
    presses,
    settlements,
    currentHoleStatus: {
      front9Leader: front9Result.winnerId,
      front9Margin: front9Result.margin,
      back9Leader: back9Result.winnerId,
      back9Margin: back9Result.margin,
      overallLeader: overallResult.winnerId,
      overallMargin: overallResult.margin
    }
  };
}

export function canPress(
  currentHole: number,
  playerStanding: number,  // negative = losing
  existingPresses: Press[],
  holesInRound: 9 | 18 = 18
): boolean {
  // Can press when 2+ down, max 3 presses, and before last hole
  return playerStanding <= -2 && existingPresses.length < 3 && currentHole < holesInRound;
}

export function createPress(
  playerId: string,
  currentHole: number,
  stakes: number
): Press {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    startHole: currentHole,
    initiatedBy: playerId,
    stakes,
    status: 'active'
  };
}

export function formatNassauStatus(
  leaderId: string | null,
  margin: number,
  players: Player[]
): string {
  if (!leaderId || margin === 0) {
    return 'All square';
  }
  
  const leader = players.find(p => p.id === leaderId);
  if (!leader) return 'All square';
  
  return `${leader.name} ${margin} UP`;
}

// Hole-specific context for Nassau game
export interface NassauHoleContext {
  segment: string;          // "Front 9", "Back 9", "Overall"
  status: string;           // "Mike 2 UP", "All square"
  message: string;          // "Win to cut deficit to 1"
  urgency: 'normal' | 'opportunity' | 'critical';
  canPress: boolean;
}

/**
 * Check if an auto-press should be triggered after a score update.
 * Returns a Press if auto-press conditions are met, null otherwise.
 *
 * Auto-press triggers when:
 * - A player becomes exactly 2 down on overall
 * - No existing press already started on this hole
 * - Max 3 presses haven't been reached
 * - Not on the last hole
 */
export function checkAutoPress(
  scores: Score[],
  players: Player[],
  stakes: number,
  existingPresses: Press[],
  holesInRound: 9 | 18,
  strokesPerHole?: StrokesPerHoleMap
): Press | null {
  if (players.length !== 2) return null;

  const result = calculateNassau(scores, players, stakes, existingPresses, holesInRound, strokesPerHole);

  // Find the current hole (highest hole with all scores)
  let currentHole = 0;
  for (let hole = 1; hole <= holesInRound; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    if (holeScores.length === players.length) {
      currentHole = hole;
    }
  }

  if (currentHole === 0 || currentHole >= holesInRound) return null;

  const [p1, p2] = players;
  const overallMargin = result.overall.margin;
  const leaderId = result.overall.winnerId;

  if (!leaderId || overallMargin < 2) return null;

  // Determine who is down
  const losingPlayer = leaderId === p1.id ? p2 : p1;

  // Check if we already have a press starting on this hole
  const pressOnThisHole = existingPresses.some(p => p.startHole === currentHole + 1);
  if (pressOnThisHole) return null;

  // Check max presses
  if (existingPresses.length >= 3) return null;

  // Check if this is exactly 2 down (not already pressed when they were 2 down before)
  // We create press for next hole
  const nextHole = currentHole + 1;

  // Only auto-press if going 2 down for the first time or after a press has reset
  // Check margin on previous hole to see if they just went 2 down
  const previousHoleScores = scores.filter(s => s.holeNumber < currentHole);
  const previousResult = calculateNassau(previousHoleScores, players, stakes, existingPresses, holesInRound, strokesPerHole);
  const previousMargin = previousResult.overall.margin;

  // Only trigger if we just became 2 down (weren't 2+ down before)
  if (previousMargin >= 2) return null;

  return createPress(losingPlayer.id, nextHole, stakes);
}

export function getNassauHoleContext(
  scores: Score[],
  players: Player[],
  currentHole: number,
  stakes: number,
  presses: Press[],
  holesInRound: 9 | 18 = 18,
  strokesPerHole?: StrokesPerHoleMap
): NassauHoleContext {
  const result = calculateNassau(scores, players, stakes, presses, holesInRound, strokesPerHole);
  
  // Determine which segment we're in
  let segment = 'Front 9';
  let segmentData = result.front9;
  
  if (currentHole > 9 && holesInRound === 18) {
    segment = 'Back 9';
    segmentData = result.back9;
  }
  
  // Format status
  const leaderId = segmentData.winnerId;
  const margin = segmentData.margin;
  let status = 'All square';
  let urgency: 'normal' | 'opportunity' | 'critical' = 'normal';
  let message = '';
  
  if (leaderId && margin > 0) {
    const leader = players.find(p => p.id === leaderId);
    status = `${leader?.name.split(' ')[0] || 'Leader'} ${margin} UP`;
    
    // Check if current player is down
    if (players.length === 2) {
      const loser = players.find(p => p.id !== leaderId);
      const holesRemaining = (currentHole <= 9 ? 10 : holesInRound + 1) - currentHole;
      
      if (margin >= holesRemaining) {
        urgency = 'critical';
        message = 'Must win to stay alive';
      } else if (margin >= 2) {
        urgency = 'critical';
        message = `${margin} down with ${holesRemaining} to play`;
      } else if (margin === 1) {
        urgency = 'opportunity';
        message = 'Win to square up';
      }
    }
  } else {
    status = 'All square';
    urgency = 'opportunity';
    message = 'Win to go 1 UP';
  }
  
  // Check if press is available
  const playerStanding = players.length === 2 
    ? (leaderId === players[0].id ? -margin : margin)
    : 0;
  const pressAvailable = canPress(currentHole, playerStanding, presses, holesInRound);
  
  return {
    segment,
    status,
    message,
    urgency,
    canPress: pressAvailable
  };
}
