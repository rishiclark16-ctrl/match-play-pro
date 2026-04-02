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

// Type for net scoring: Map<playerId, Map<holeNumber, strokes>>
export type StrokesPerHoleMap = Map<string, Map<number, number>>;

// Helper to get net score for a player on a hole
function getNetScore(score: Score, strokesPerHole?: StrokesPerHoleMap): number {
  if (!strokesPerHole) return score.strokes;
  const playerStrokes = strokesPerHole.get(score.playerId);
  const holeStrokes = playerStrokes?.get(score.holeNumber) || 0;
  return score.strokes - holeStrokes;
}

export function calculateSkins(
  scores: Score[],
  players: Player[],
  holesPlayed: number,
  stakesPerSkin: number,
  carryover: boolean = true,
  strokesPerHole?: StrokesPerHoleMap,
  carryoverCap?: number | null,
  jackpot18?: boolean,
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
    
    // Sort by net score when using handicaps
    const sorted = [...holeScores].sort((a, b) => 
      getNetScore(a, strokesPerHole) - getNetScore(b, strokesPerHole)
    );
    const lowestNet = getNetScore(sorted[0], strokesPerHole);
    const winners = sorted.filter(s => getNetScore(s, strokesPerHole) === lowestNet);
    
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
        // Apply carryover cap if configured
        if (carryoverCap != null && carryoverCap > 0 && currentCarryover > carryoverCap) {
          currentCarryover = carryoverCap;
        }
      }
    }
  }

  // Jackpot on 18: if carryover remains after the last hole, award to hole 18 winner
  if (jackpot18 && currentCarryover > 0 && holesPlayed >= 18) {
    const hole18Scores = scores.filter(s => s.holeNumber === 18);
    if (hole18Scores.length >= players.length) {
      const sorted18 = [...hole18Scores].sort((a, b) =>
        getNetScore(a, strokesPerHole) - getNetScore(b, strokesPerHole)
      );
      const lowestNet = getNetScore(sorted18[0], strokesPerHole);
      const winners18 = sorted18.filter(s => getNetScore(s, strokesPerHole) === lowestNet);
      if (winners18.length === 1) {
        const winnerId = winners18[0].playerId;
        playerSkins[winnerId] += currentCarryover;
        // Update last result to reflect jackpot
        const lastResult = results.find(r => r.holeNumber === 18);
        if (lastResult && lastResult.winnerId === winnerId) {
          lastResult.value += currentCarryover;
        } else {
          results.push({ holeNumber: 18, winnerId, value: currentCarryover });
        }
        currentCarryover = 0;
      }
    }
  }
  
  // Calculate pot value - each player contributes stakes per hole
  const potPerSkin = stakesPerSkin * players.length;
  const totalPot = holesPlayed * potPerSkin;

  // Calculate earnings (net winnings/losses)
  // Each player contributes stakesPerSkin only for the holes they actually scored
  const standings: SkinsStanding[] = players.map(p => {
    const holesScored = scores.filter(s => s.playerId === p.id).length;
    const playerContribution = holesScored * stakesPerSkin;
    return {
      playerId: p.id,
      playerName: p.name,
      skins: playerSkins[p.id],
      earnings: (playerSkins[p.id] * potPerSkin) - playerContribution
    };
  }).sort((a, b) => b.skins - a.skins);
  
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
  totalHoles: number,
  strokesPerHole?: StrokesPerHoleMap
): SkinsHoleContext {
  // Delegate to calculateSkins for all holes before currentHole so the
  // carryover count stays in sync with the canonical implementation.
  const scoresBeforeCurrent = scores.filter(s => s.holeNumber < currentHole);
  const { carryover: carryoverCount } = calculateSkins(
    scoresBeforeCurrent,
    players,
    currentHole - 1,
    stakesPerSkin,
    carryover,
    strokesPerHole
  );

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
