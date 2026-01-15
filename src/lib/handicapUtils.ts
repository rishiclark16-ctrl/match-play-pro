import { HoleInfo, Player } from '@/types/golf';

/**
 * Calculate Course Handicap from player's Handicap Index and course Slope Rating
 * Formula: Course Handicap = (Handicap Index × Slope Rating) / 113
 * 113 is the standard slope rating
 */
export function calculateCourseHandicap(
  handicapIndex: number, 
  slopeRating: number = 113
): number {
  return Math.round((handicapIndex * slopeRating) / 113);
}

/**
 * Calculate Playing Handicap (for 18 holes)
 * For 9 holes, we use half the handicap
 */
export function calculatePlayingHandicap(
  handicapIndex: number,
  slopeRating: number = 113,
  holes: 9 | 18 = 18
): number {
  const courseHandicap = calculateCourseHandicap(handicapIndex, slopeRating);
  return holes === 9 ? Math.round(courseHandicap / 2) : courseHandicap;
}

/**
 * Distribute handicap strokes across holes based on hole handicap ratings
 * Strokes are assigned starting from the hardest hole (handicap 1)
 */
export function getStrokesPerHole(
  playingHandicap: number,
  holeInfo: HoleInfo[]
): Map<number, number> {
  const strokesMap = new Map<number, number>();
  
  // Initialize all holes with 0 strokes
  holeInfo.forEach(hole => strokesMap.set(hole.number, 0));
  
  if (playingHandicap <= 0) return strokesMap;
  
  // Sort holes by handicap rating (1 = hardest, gets stroke first)
  // If no handicap rating, use hole number as fallback
  const sortedHoles = [...holeInfo].sort((a, b) => {
    const aHcp = a.handicap ?? a.number;
    const bHcp = b.handicap ?? b.number;
    return aHcp - bHcp;
  });
  
  let remainingStrokes = playingHandicap;
  let round = 0;
  
  // Distribute strokes - go through sorted holes, giving one stroke per pass
  while (remainingStrokes > 0) {
    for (const hole of sortedHoles) {
      if (remainingStrokes <= 0) break;
      
      const currentStrokes = strokesMap.get(hole.number) || 0;
      // Only add stroke if we're on the right round (allows for 2+ strokes on very high handicaps)
      if (currentStrokes === round) {
        strokesMap.set(hole.number, currentStrokes + 1);
        remainingStrokes--;
      }
    }
    round++;
  }
  
  return strokesMap;
}

/**
 * Calculate net score for a single hole
 */
export function calculateNetScore(
  grossScore: number,
  handicapStrokes: number
): number {
  return grossScore - handicapStrokes;
}

/**
 * Calculate total net strokes from gross strokes
 */
export function calculateTotalNetStrokes(
  totalGrossStrokes: number,
  playingHandicap: number,
  holesPlayed: number,
  totalHoles: 9 | 18
): number {
  // Prorate handicap if not all holes played
  const proratedHandicap = Math.round((playingHandicap * holesPlayed) / totalHoles);
  return totalGrossStrokes - proratedHandicap;
}

/**
 * Format handicap display string
 */
export function formatHandicap(handicap: number | undefined): string {
  if (handicap === undefined || handicap === null) return '–';
  if (handicap === 0) return '0';
  return handicap > 0 ? `+${handicap}` : `${handicap}`;
}

/**
 * Get a description of strokes received
 */
export function getStrokesDescription(playingHandicap: number): string {
  if (playingHandicap === 0) return 'Scratch';
  if (playingHandicap === 1) return '1 stroke';
  return `${playingHandicap} strokes`;
}

/**
 * Get strokes per hole for manual mode
 * Same distribution logic as auto mode, but uses manually entered strokes directly
 */
export function getManualStrokesPerHole(
  manualStrokes: number,
  holeInfo: HoleInfo[]
): Map<number, number> {
  return getStrokesPerHole(manualStrokes, holeInfo);
}

// ============================================================================
// MATCH PLAY DIFFERENTIAL HANDICAP FUNCTIONS
// ============================================================================

export interface MatchPlayHandicapInfo {
  lowerPlayerId: string;
  higherPlayerId: string;
  lowerPlayerName: string;
  higherPlayerName: string;
  strokesGiven: number;
  lowerCourseHandicap: number;
  higherCourseHandicap: number;
}

/**
 * Calculate strokes given between two players for match play
 * The lower handicap player gives strokes to the higher handicap player
 * based on the DIFFERENCE in their course handicaps.
 * 
 * Example: Jack (course hcp 9) vs Tim (course hcp 13)
 * Jack gives Tim 4 strokes (13 - 9 = 4)
 * Those strokes go on hole handicaps 1, 2, 3, 4 (hardest 4 holes)
 */
export function calculateMatchPlayStrokes(
  player1: { id: string; name: string; handicap?: number; manualStrokes?: number },
  player2: { id: string; name: string; handicap?: number; manualStrokes?: number },
  slopeRating: number = 113,
  holes: 9 | 18 = 18,
  handicapMode: 'auto' | 'manual' = 'auto'
): MatchPlayHandicapInfo {
  let p1CourseHcp: number;
  let p2CourseHcp: number;

  if (handicapMode === 'manual') {
    // In manual mode, use the manualStrokes directly as the "course handicap"
    p1CourseHcp = player1.manualStrokes ?? 0;
    p2CourseHcp = player2.manualStrokes ?? 0;
  } else {
    // In auto mode, calculate course handicap from handicap index
    p1CourseHcp = player1.handicap !== undefined 
      ? calculatePlayingHandicap(player1.handicap, slopeRating, holes) 
      : 0;
    p2CourseHcp = player2.handicap !== undefined 
      ? calculatePlayingHandicap(player2.handicap, slopeRating, holes) 
      : 0;
  }

  // Determine who gives and who receives strokes
  if (p1CourseHcp <= p2CourseHcp) {
    return {
      lowerPlayerId: player1.id,
      higherPlayerId: player2.id,
      lowerPlayerName: player1.name,
      higherPlayerName: player2.name,
      strokesGiven: p2CourseHcp - p1CourseHcp,
      lowerCourseHandicap: p1CourseHcp,
      higherCourseHandicap: p2CourseHcp,
    };
  } else {
    return {
      lowerPlayerId: player2.id,
      higherPlayerId: player1.id,
      lowerPlayerName: player2.name,
      higherPlayerName: player1.name,
      strokesGiven: p1CourseHcp - p2CourseHcp,
      lowerCourseHandicap: p2CourseHcp,
      higherCourseHandicap: p1CourseHcp,
    };
  }
}

/**
 * Build a strokes map for match play with DIFFERENTIAL strokes
 * Only the higher handicap player receives strokes
 * The lower handicap player gets 0 strokes on all holes
 * 
 * Returns: Map<playerId, Map<holeNumber, strokesReceived>>
 */
export function buildMatchPlayStrokesMap(
  matchInfo: MatchPlayHandicapInfo,
  holeInfo: HoleInfo[]
): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>();
  
  // Lower handicap player gets 0 strokes on all holes
  const lowerPlayerMap = new Map<number, number>();
  holeInfo.forEach(hole => lowerPlayerMap.set(hole.number, 0));
  map.set(matchInfo.lowerPlayerId, lowerPlayerMap);
  
  // Higher handicap player gets the differential strokes distributed
  const higherPlayerMap = getStrokesPerHole(matchInfo.strokesGiven, holeInfo);
  map.set(matchInfo.higherPlayerId, higherPlayerMap);
  
  return map;
}

/**
 * Build strokes map for stroke play (each player uses their full course handicap)
 * This is for net stroke play competitions where everyone's net is compared
 */
export function buildStrokePlayStrokesMap(
  players: Array<{ id: string; handicap?: number; manualStrokes?: number }>,
  holeInfo: HoleInfo[],
  slopeRating: number = 113,
  holes: 9 | 18 = 18,
  handicapMode: 'auto' | 'manual' = 'auto'
): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>();
  
  for (const player of players) {
    let courseHcp: number;
    
    if (handicapMode === 'manual') {
      courseHcp = player.manualStrokes ?? 0;
    } else {
      courseHcp = player.handicap !== undefined 
        ? calculatePlayingHandicap(player.handicap, slopeRating, holes) 
        : 0;
    }
    
    const playerStrokesMap = getStrokesPerHole(courseHcp, holeInfo);
    map.set(player.id, playerStrokesMap);
  }
  
  return map;
}
