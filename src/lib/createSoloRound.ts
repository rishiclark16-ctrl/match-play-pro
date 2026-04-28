import type { Course, HoleInfo } from '@/types/golf';

interface CreateRoundParams {
  courseId: string;
  courseName: string;
  holes: number;
  holeInfo: HoleInfo[];
  strokePlay: boolean;
  matchPlay: boolean;
  slope?: number;
  rating?: number;
  handicapMode: 'auto' | 'manual';
  games: never[];
  players: Array<{
    name: string;
    handicap: number | undefined;
    manualStrokes: number;
    profileId: string | undefined;
    isGhost: boolean;
  }>;
}

interface CreateRoundResult {
  round?: { id: string };
  error?: { message: string; isAuthError?: boolean };
}

interface SoloRoundArgs {
  selectedCourse: Course;
  holeCount: number;
  profile: { full_name?: string | null; handicap?: number | null } | null;
  createRound: (params: CreateRoundParams) => Promise<CreateRoundResult>;
}

export interface SoloRoundOutcome {
  ok: true;
  roundId: string;
}
export interface SoloRoundFailure {
  ok: false;
  message: string;
  isAuthError?: boolean;
}

/**
 * Creates a solo round (single player, no games, defaults from profile).
 *
 * Pure async helper extracted from NewRound — caller owns the
 * "isCreating" UI state, the toast surface, and the navigation choice.
 */
export async function createSoloRound({
  selectedCourse,
  holeCount,
  profile,
  createRound,
}: SoloRoundArgs): Promise<SoloRoundOutcome | SoloRoundFailure> {
  try {
    const holeInfo: HoleInfo[] = selectedCourse.holes.slice(0, holeCount);
    const soloName = (profile?.full_name?.trim()) || 'Me';
    const result = await createRound({
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      holes: holeCount,
      holeInfo,
      strokePlay: true,
      matchPlay: false,
      slope: selectedCourse.slope,
      rating: selectedCourse.rating,
      handicapMode: 'auto',
      games: [],
      players: [{
        name: soloName,
        handicap: profile?.handicap ?? undefined,
        manualStrokes: 0,
        profileId: undefined,
        isGhost: false,
      }],
    });

    if (result.round) {
      return { ok: true, roundId: result.round.id };
    }
    if (result.error) {
      return { ok: false, message: result.error.message, isAuthError: result.error.isAuthError };
    }
    return { ok: false, message: 'Failed to create round. Please try again.' };
  } catch {
    return { ok: false, message: 'Failed to create round. Please try again.' };
  }
}
