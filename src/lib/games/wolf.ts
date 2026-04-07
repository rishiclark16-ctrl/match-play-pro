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

/**
 * Determine who is Wolf for a given hole.
 * Supports 3 or 4 players.
 * Optionally uses catch-up mechanic on holes 17-18: lowest-point player becomes wolf.
 */
export function getWolfForHole(
  players: Player[],
  holeNumber: number,
  standings?: WolfStanding[],
): Player | null {
  const n = players.length;
  if (n !== 3 && n !== 4) return null;

  // Sort by orderIndex to ensure consistent rotation
  const sortedPlayers = [...players].sort((a, b) => a.orderIndex - b.orderIndex);

  // Catch-up mechanic: on holes 17-18 (for 18-hole rounds), lowest-point player is wolf
  if (standings && standings.length > 0 && holeNumber >= 17) {
    const lowestStanding = [...standings].sort((a, b) => a.totalPoints - b.totalPoints)[0];
    const lowestPlayer = sortedPlayers.find(p => p.id === lowestStanding.playerId);
    if (lowestPlayer) return lowestPlayer;
  }

  // Standard rotation
  const wolfIndex = (holeNumber - 1) % n;
  return sortedPlayers[wolfIndex];
}

// Get hunting order for a hole (Wolf goes last). Supports 3 or 4 players.
export function getHuntingOrder(players: Player[], holeNumber: number, standings?: WolfStanding[]): Player[] {
  const n = players.length;
  if (n !== 3 && n !== 4) return players;

  const wolf = getWolfForHole(players, holeNumber, standings);
  if (!wolf) return players;

  const sortedPlayers = [...players].sort((a, b) => a.orderIndex - b.orderIndex);

  // Hunters tee off in order, Wolf goes last
  const hunters = sortedPlayers.filter(p => p.id !== wolf.id);
  hunters.push(wolf);
  return hunters;
}

// Calculate Wolf result for a completed hole. Supports 3 or 4 players.
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
  const n = players.length;
  if (n !== 3 && n !== 4) return null;
  const holeScores = scores.filter(s => s.holeNumber === holeNumber);
  if (holeScores.length !== n) return null;
  
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
    
    // Points scale by hunter count: 4 per hunter (3-player: 2 hunters, 4-player: 3 hunters)
    const hunterCount = n - 1;
    const basePoints = isBlindWolf ? 8 : 4;
    const totalPoints = basePoints * hunterCount + carryover;
    
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

  // Accumulate raw (un-divided) lone-wolf hunter points separately to avoid
  // floating-point drift from dividing by 3 on every hole. We divide once at
  // the end and snap to the nearest integer with Math.round().
  const rawLoneWolfHunterPoints = new Map<string, number>(
    players.map(p => [p.id, 0])
  );

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

        // Accumulate raw hunter loss (divide by 3 once at the end)
        standings.forEach(s => {
          if (s.playerId !== result.wolfId) {
            rawLoneWolfHunterPoints.set(
              s.playerId,
              (rawLoneWolfHunterPoints.get(s.playerId) ?? 0) - result.points
            );
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

        // Accumulate raw hunter win (divide by 3 once at the end)
        standings.forEach(s => {
          if (s.playerId !== result.wolfId) {
            rawLoneWolfHunterPoints.set(
              s.playerId,
              (rawLoneWolfHunterPoints.get(s.playerId) ?? 0) + result.points
            );
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

  // Apply accumulated lone-wolf hunter points divided by hunter count,
  // then snap to the nearest integer to eliminate any residual floating-point error.
  const hunterCount = players.length - 1; // 2 for 3-player, 3 for 4-player
  standings.forEach(s => {
    const raw = rawLoneWolfHunterPoints.get(s.playerId) ?? 0;
    if (raw !== 0) {
      s.totalPoints += Math.round(raw / hunterCount);
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
  if (players.length !== 3 && players.length !== 4) return null;

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
  
  // Track remaining budget for each winner to prevent overpayment
  const winnerBudget = new Map<string, number>();
  winners.forEach(w => winnerBudget.set(w.playerId, w.earnings));

  losers.forEach(loser => {
    let remaining = Math.abs(loser.earnings);
    winners.forEach(winner => {
      const budget = winnerBudget.get(winner.playerId) ?? 0;
      if (remaining > 0 && budget > 0) {
        const payment = Math.min(remaining, budget);
        if (payment > 0.01) {
          settlements.push({
            fromPlayerId: loser.playerId,
            toPlayerId: winner.playerId,
            amount: Math.round(payment * 100) / 100,
          });
          remaining -= payment;
          winnerBudget.set(winner.playerId, budget - payment);
        }
      }
    });
  });
  
  return settlements;
}
