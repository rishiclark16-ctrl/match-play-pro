import { Player, Score, HoleInfo, GameConfig } from '@/types/golf';

// Wolf hole result tracking
export interface WolfHoleResult {
  holeNumber: number;
  wolfId: string;                 // Who was the Wolf
  partnerId: string | null;       // Who Wolf picked (null = Lone Wolf)
  isBlindWolf: boolean;           // Declared before anyone hit
  winningTeam: 'wolf' | 'hunters' | 'push';
  points: number;                 // Points for this hole (including carryovers)
}

// Wolf game standings
export interface WolfStanding {
  playerId: string;
  playerName: string;
  totalPoints: number;
  timesAsWolf: number;
  loneWolfWins: number;
  blindWolfWins: number;
  earnings: number;
}

export interface WolfHoleContext {
  wolfId: string;
  wolfName: string;
  partnerId: string | null;
  partnerName: string | null;
  isBlindWolf: boolean;
  isLoneWolf: boolean;
  decisionMade: boolean;
  potValue: number;
  carryovers: number;
  message: string;
}

export interface WolfResult {
  results: WolfHoleResult[];
  standings: WolfStanding[];
  carryover: number;
  holesPlayed: number;
}

// Determine who is Wolf for a given hole (4-player rotation)
export function getWolfForHole(players: Player[], holeNumber: number): Player | null {
  if (players.length !== 4) return null;
  
  // Sort by orderIndex to ensure consistent rotation
  const sortedPlayers = [...players].sort((a, b) => a.orderIndex - b.orderIndex);
  
  // Wolf rotates each hole: hole 1 = player 0, hole 2 = player 1, etc.
  const wolfIndex = (holeNumber - 1) % 4;
  return sortedPlayers[wolfIndex];
}

// Get hunting order for a hole (Wolf goes last)
export function getHuntingOrder(players: Player[], holeNumber: number): Player[] {
  if (players.length !== 4) return players;
  
  const sortedPlayers = [...players].sort((a, b) => a.orderIndex - b.orderIndex);
  const wolfIndex = (holeNumber - 1) % 4;
  
  // Hunters tee off in order, Wolf goes last
  const hunters: Player[] = [];
  for (let i = 0; i < 4; i++) {
    if (i !== wolfIndex) {
      hunters.push(sortedPlayers[i]);
    }
  }
  hunters.push(sortedPlayers[wolfIndex]);
  
  return hunters;
}

// Calculate Wolf result for a completed hole
export function calculateWolfHoleResult(
  holeNumber: number,
  wolfId: string,
  partnerId: string | null,
  isBlindWolf: boolean,
  scores: Score[],
  players: Player[],
  par: number,
  useNet: boolean = false,
  strokesPerHole?: Map<string, Map<number, number>>,
  carryover: number = 0
): WolfHoleResult | null {
  const holeScores = scores.filter(s => s.holeNumber === holeNumber);
  if (holeScores.length !== 4) return null;
  
  const wolf = players.find(p => p.id === wolfId);
  if (!wolf) return null;
  
  const isLoneWolf = partnerId === null;
  
  // Get net scores if using handicaps
  const getNetScore = (playerId: string) => {
    const score = holeScores.find(s => s.playerId === playerId);
    if (!score) return 999;
    
    if (useNet && strokesPerHole) {
      const playerStrokes = strokesPerHole.get(playerId);
      const strokesThisHole = playerStrokes?.get(holeNumber) || 0;
      return score.strokes - strokesThisHole;
    }
    return score.strokes;
  };
  
  const wolfNetScore = getNetScore(wolfId);
  
  if (isLoneWolf) {
    // Lone Wolf: Wolf vs all 3 hunters
    // Wolf wins if they have the lowest score
    const hunterIds = players.filter(p => p.id !== wolfId).map(p => p.id);
    const hunterScores = hunterIds.map(id => getNetScore(id));
    const bestHunterScore = Math.min(...hunterScores);
    
    let winningTeam: 'wolf' | 'hunters' | 'push';
    if (wolfNetScore < bestHunterScore) {
      winningTeam = 'wolf';
    } else if (wolfNetScore > bestHunterScore) {
      winningTeam = 'hunters';
    } else {
      winningTeam = 'push';
    }
    
    // Points: Lone Wolf = 4 points per hunter (12 total), Blind Wolf = 2x
    const basePoints = isBlindWolf ? 8 : 4;
    const totalPoints = basePoints * 3 + carryover; // 3 hunters
    
    return {
      holeNumber,
      wolfId,
      partnerId: null,
      isBlindWolf,
      winningTeam,
      points: winningTeam === 'push' ? 0 : totalPoints,
    };
  } else {
    // 2v2: Wolf + Partner vs 2 Hunters
    const partner = players.find(p => p.id === partnerId);
    if (!partner) return null;
    
    const partnerNetScore = getNetScore(partnerId);
    const wolfTeamBest = Math.min(wolfNetScore, partnerNetScore);
    
    const hunterIds = players.filter(p => p.id !== wolfId && p.id !== partnerId).map(p => p.id);
    const hunterScores = hunterIds.map(id => getNetScore(id));
    const hunterTeamBest = Math.min(...hunterScores);
    
    let winningTeam: 'wolf' | 'hunters' | 'push';
    if (wolfTeamBest < hunterTeamBest) {
      winningTeam = 'wolf';
    } else if (wolfTeamBest > hunterTeamBest) {
      winningTeam = 'hunters';
    } else {
      winningTeam = 'push';
    }
    
    // Points: 2v2 = 2 points per player (4 total per team)
    const totalPoints = 2 * 2 + carryover; // 2 players * 2 points
    
    return {
      holeNumber,
      wolfId,
      partnerId,
      isBlindWolf: false, // Can't be blind wolf in 2v2
      winningTeam,
      points: winningTeam === 'push' ? 0 : totalPoints,
    };
  }
}

// Calculate current Wolf standings
export function calculateWolfStandings(
  results: WolfHoleResult[],
  players: Player[],
  stakes: number
): WolfStanding[] {
  const standings: WolfStanding[] = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    totalPoints: 0,
    timesAsWolf: 0,
    loneWolfWins: 0,
    blindWolfWins: 0,
    earnings: 0,
  }));
  
  results.forEach(result => {
    const wolfStanding = standings.find(s => s.playerId === result.wolfId);
    if (wolfStanding) {
      wolfStanding.timesAsWolf++;
    }
    
    if (result.winningTeam === 'push') return;
    
    const isLoneWolf = result.partnerId === null;
    
    if (result.winningTeam === 'wolf') {
      // Wolf team wins
      if (isLoneWolf) {
        // Lone Wolf wins from all hunters
        const wolf = standings.find(s => s.playerId === result.wolfId);
        if (wolf) {
          wolf.totalPoints += result.points;
          wolf.loneWolfWins++;
          if (result.isBlindWolf) wolf.blindWolfWins++;
        }
        
        // Hunters lose
        standings.forEach(s => {
          if (s.playerId !== result.wolfId) {
            s.totalPoints -= result.points / 3;
          }
        });
      } else {
        // 2v2 Wolf team wins
        const wolf = standings.find(s => s.playerId === result.wolfId);
        const partner = standings.find(s => s.playerId === result.partnerId);
        
        if (wolf) wolf.totalPoints += result.points / 2;
        if (partner) partner.totalPoints += result.points / 2;
        
        // Hunters lose
        standings.forEach(s => {
          if (s.playerId !== result.wolfId && s.playerId !== result.partnerId) {
            s.totalPoints -= result.points / 2;
          }
        });
      }
    } else {
      // Hunters win
      if (isLoneWolf) {
        // Lone Wolf loses to all hunters
        const wolf = standings.find(s => s.playerId === result.wolfId);
        if (wolf) wolf.totalPoints -= result.points;
        
        // Hunters win
        standings.forEach(s => {
          if (s.playerId !== result.wolfId) {
            s.totalPoints += result.points / 3;
          }
        });
      } else {
        // 2v2 Hunters win
        const wolf = standings.find(s => s.playerId === result.wolfId);
        const partner = standings.find(s => s.playerId === result.partnerId);
        
        if (wolf) wolf.totalPoints -= result.points / 2;
        if (partner) partner.totalPoints -= result.points / 2;
        
        // Hunters win
        standings.forEach(s => {
          if (s.playerId !== result.wolfId && s.playerId !== result.partnerId) {
            s.totalPoints += result.points / 2;
          }
        });
      }
    }
  });
  
  // Calculate earnings
  standings.forEach(s => {
    s.earnings = Math.round(s.totalPoints * stakes * 100) / 100;
  });
  
  return standings.sort((a, b) => b.totalPoints - a.totalPoints);
}

// Calculate full Wolf result
export function calculateWolf(
  scores: Score[],
  players: Player[],
  results: WolfHoleResult[],
  stakes: number,
  carryover: boolean,
  totalHoles: number
): WolfResult {
  // Calculate current carryover (pushes)
  let currentCarryover = 0;
  if (carryover) {
    results.forEach(r => {
      if (r.winningTeam === 'push') {
        currentCarryover += 4; // Base points carry
      }
    });
  }
  
  return {
    results,
    standings: calculateWolfStandings(results, players, stakes),
    carryover: currentCarryover,
    holesPlayed: results.length,
  };
}

// Get hole context for HoleSummary
export function getWolfHoleContext(
  players: Player[],
  currentHole: number,
  results: WolfHoleResult[],
  stakes: number,
  carryoverEnabled: boolean
): WolfHoleContext | null {
  if (players.length !== 4) return null;
  
  const wolf = getWolfForHole(players, currentHole);
  if (!wolf) return null;
  
  const currentResult = results.find(r => r.holeNumber === currentHole);
  
  // Calculate carryover from pushes
  let carryovers = 0;
  if (carryoverEnabled) {
    for (let i = 1; i < currentHole; i++) {
      const holeResult = results.find(r => r.holeNumber === i);
      if (holeResult?.winningTeam === 'push') {
        carryovers++;
      }
    }
  }
  
  const baseValue = stakes * 4; // Base pot value
  const potValue = baseValue + (carryovers * baseValue);
  
  if (currentResult) {
    // Decision already made
    const partner = currentResult.partnerId 
      ? players.find(p => p.id === currentResult.partnerId) 
      : null;
    
    return {
      wolfId: wolf.id,
      wolfName: wolf.name.split(' ')[0],
      partnerId: currentResult.partnerId,
      partnerName: partner?.name.split(' ')[0] || null,
      isBlindWolf: currentResult.isBlindWolf,
      isLoneWolf: currentResult.partnerId === null,
      decisionMade: true,
      potValue,
      carryovers,
      message: currentResult.isBlindWolf 
        ? '🐺 Blind Wolf!' 
        : currentResult.partnerId 
          ? `Partnered with ${partner?.name.split(' ')[0]}` 
          : '🐺 Lone Wolf!',
    };
  }
  
  return {
    wolfId: wolf.id,
    wolfName: wolf.name.split(' ')[0],
    partnerId: null,
    partnerName: null,
    isBlindWolf: false,
    isLoneWolf: false,
    decisionMade: false,
    potValue,
    carryovers,
    message: `${wolf.name.split(' ')[0]} is Wolf`,
  };
}

// Check if Wolf decision is pending (all players have teed off but no decision recorded)
export function isWolfDecisionPending(
  holeNumber: number,
  results: WolfHoleResult[],
  hasScores: boolean
): boolean {
  const hasResult = results.some(r => r.holeNumber === holeNumber);
  return hasScores && !hasResult;
}

// Get settlements for Wolf game
export function calculateWolfSettlements(
  results: WolfHoleResult[],
  players: Player[],
  stakes: number
): { fromPlayerId: string; toPlayerId: string; amount: number }[] {
  const standings = calculateWolfStandings(results, players, stakes);
  const settlements: { fromPlayerId: string; toPlayerId: string; amount: number }[] = [];
  
  // Simple net settlement - everyone settles with everyone
  const netAmounts = new Map<string, number>();
  standings.forEach(s => netAmounts.set(s.playerId, s.earnings));
  
  // Pair up winners with losers
  const winners = standings.filter(s => s.earnings > 0).sort((a, b) => b.earnings - a.earnings);
  const losers = standings.filter(s => s.earnings < 0).sort((a, b) => a.earnings - b.earnings);
  
  losers.forEach(loser => {
    let remaining = Math.abs(loser.earnings);
    winners.forEach(winner => {
      if (remaining > 0 && winner.earnings > 0) {
        const payment = Math.min(remaining, winner.earnings);
        if (payment > 0.01) {
          settlements.push({
            fromPlayerId: loser.playerId,
            toPlayerId: winner.playerId,
            amount: Math.round(payment * 100) / 100,
          });
          remaining -= payment;
        }
      }
    });
  });
  
  return settlements;
}
