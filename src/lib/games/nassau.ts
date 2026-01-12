import { Player, Score, Press, Settlement } from '@/types/golf';

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

export function calculateNassau(
  scores: Score[],
  players: Player[],
  stakes: number,
  presses: Press[] = [],
  holesInRound: 9 | 18 = 18
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
  
  // Calculate totals for each segment
  for (let hole = 1; hole <= (holesInRound === 18 ? 18 : 9); hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    if (holeScores.length === players.length) {
      holeScores.forEach(s => {
        overall[s.playerId] += s.strokes;
        if (hole <= 9) {
          front9[s.playerId] += s.strokes;
        } else {
          back9[s.playerId] += s.strokes;
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
    
    // Process presses
    presses.forEach(press => {
      const pressScores: Record<string, number> = { [p1.id]: 0, [p2.id]: 0 };
      let pressHolesPlayed = 0;
      
      for (let hole = press.startHole; hole <= holesInRound; hole++) {
        const holeScores = scores.filter(s => s.holeNumber === hole);
        if (holeScores.length === 2) {
          holeScores.forEach(s => {
            pressScores[s.playerId] += s.strokes;
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
