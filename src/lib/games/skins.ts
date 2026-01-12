import { Player, Score, SkinResult } from '@/types/golf';

export interface SkinsStanding {
  playerId: string;
  playerName: string;
  skins: number;
  earnings: number;
}

export interface SkinsResult {
  results: SkinResult[];
  standings: SkinsStanding[];
  carryover: number;
  potPerSkin: number;
  totalPot: number;
}

export function calculateSkins(
  scores: Score[],
  players: Player[],
  holesPlayed: number,
  stakesPerSkin: number,
  carryover: boolean = true
): SkinsResult {
  const results: SkinResult[] = [];
  let currentCarryover = 0;
  const playerSkins: Record<string, number> = {};
  
  players.forEach(p => playerSkins[p.id] = 0);
  
  for (let hole = 1; hole <= holesPlayed; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    
    // Skip if not all players have scored this hole
    if (holeScores.length < players.length) {
      continue;
    }
    
    const sorted = [...holeScores].sort((a, b) => a.strokes - b.strokes);
    const lowest = sorted[0].strokes;
    const winners = sorted.filter(s => s.strokes === lowest);
    
    if (winners.length === 1) {
      // Clear winner takes the skin + any carryovers
      const winnerId = winners[0].playerId;
      const value = 1 + currentCarryover;
      results.push({ holeNumber: hole, winnerId, value });
      playerSkins[winnerId] += value;
      currentCarryover = 0;
    } else {
      // Tie - skin carries over (or is lost if carryover disabled)
      results.push({ holeNumber: hole, winnerId: null, value: 0 });
      if (carryover) {
        currentCarryover += 1;
      }
    }
  }
  
  // Calculate pot value - each player contributes stakes per hole
  const potPerSkin = stakesPerSkin * players.length;
  const totalSkinsWon = Object.values(playerSkins).reduce((a, b) => a + b, 0);
  const totalPot = holesPlayed * potPerSkin;
  
  // Calculate earnings (net winnings/losses)
  // Each player contributes stakesPerSkin per hole played
  const playerContribution = holesPlayed * stakesPerSkin;
  
  const standings: SkinsStanding[] = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    skins: playerSkins[p.id],
    earnings: (playerSkins[p.id] * potPerSkin) - playerContribution
  })).sort((a, b) => b.skins - a.skins);
  
  return { 
    results, 
    standings, 
    carryover: currentCarryover, 
    potPerSkin,
    totalPot
  };
}

export function getSkinsHoleResult(
  results: SkinResult[],
  holeNumber: number,
  players: Player[]
): { winnerId: string | null; winnerName: string | null; value: number; isCarryover: boolean } {
  const result = results.find(r => r.holeNumber === holeNumber);
  
  if (!result) {
    return { winnerId: null, winnerName: null, value: 0, isCarryover: false };
  }
  
  if (result.winnerId) {
    const winner = players.find(p => p.id === result.winnerId);
    return {
      winnerId: result.winnerId,
      winnerName: winner?.name || 'Unknown',
      value: result.value,
      isCarryover: false
    };
  }
  
  return { winnerId: null, winnerName: null, value: 0, isCarryover: true };
}

// Get hole-specific context for skins game
export interface SkinsHoleContext {
  potValue: number;       // Total $ on the line for this hole
  carryovers: number;     // Number of carried over skins
  message: string;        // Human-readable context
}

export function getSkinsHoleContext(
  scores: Score[],
  players: Player[],
  currentHole: number,
  stakesPerSkin: number,
  carryover: boolean,
  totalHoles: number
): SkinsHoleContext {
  // Calculate carryovers up to current hole
  let carryoverCount = 0;
  
  for (let hole = 1; hole < currentHole; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    
    if (holeScores.length < players.length) {
      continue; // Not all scored yet
    }
    
    const sorted = [...holeScores].sort((a, b) => a.strokes - b.strokes);
    const lowest = sorted[0].strokes;
    const winners = sorted.filter(s => s.strokes === lowest);
    
    if (winners.length === 1) {
      // Someone won, reset carryover
      carryoverCount = 0;
    } else if (carryover) {
      // Tie, add to carryover
      carryoverCount += 1;
    }
  }
  
  const baseValue = stakesPerSkin * players.length;
  const potValue = baseValue * (1 + carryoverCount);
  
  return {
    potValue,
    carryovers: carryoverCount,
    message: carryoverCount > 0 
      ? `$${potValue} (${carryoverCount} carryover${carryoverCount > 1 ? 's' : ''})`
      : `$${baseValue}`
  };
}
