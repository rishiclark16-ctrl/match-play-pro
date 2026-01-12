import { HoleInfo } from '@/types/golf';

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
