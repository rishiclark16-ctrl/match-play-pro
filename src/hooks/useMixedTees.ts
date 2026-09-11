import { useState } from 'react';
import type { TeeSet } from '@/types/golf';

// Loose shape — matches what `useApiCourseSelection` exposes via `courseApiDetails`.
interface TeeInfoLike {
  tee_name?: string;
  slope_rating?: number;
  course_rating?: number;
  par_total?: number;
}

interface CourseApiDetailsLike {
  tees?: {
    male?: TeeInfoLike[];
    female?: TeeInfoLike[];
  };
}

interface UseMixedTeesArgs {
  /** Most-recently-finalized API course details — used to populate tee sets when toggled on. */
  courseApiDetails: CourseApiDetailsLike | null;
}

export interface UseMixedTeesReturn {
  mixedTees: boolean;
  roundTeeSets: TeeSet[];
  setRoundTeeSets: (tees: TeeSet[]) => void;
  playerTeeIds: Map<string, string>;
  /** Toggles mixed tees. When enabled with an API course, expands the API tees into roundTeeSets. */
  handleMixedTeesChange: (v: boolean) => void;
  /** Sets or clears a player's selected tee. Pass undefined to clear. */
  handleUpdatePlayerTee: (playerId: string, teeSetId: string | undefined) => void;
}

/**
 * Encapsulates the mixed-tees state for the New Round flow:
 *   - `mixedTees` toggle
 *   - `roundTeeSets` (list of tees available for this round)
 *   - `playerTeeIds` (per-player tee assignment)
 *   - the "expand from API course" side-effect when toggled on.
 *
 * Defaults match the in-page initial values (Blue / Red).
 */
export function useMixedTees({ courseApiDetails }: UseMixedTeesArgs): UseMixedTeesReturn {
  const [mixedTees, setMixedTees] = useState(false);
  const [roundTeeSets, setRoundTeeSets] = useState<TeeSet[]>([
    { id: 'blue', name: 'Blue', gender: 'mens', slope: 130, courseRating: 71.5, par: 72 },
    { id: 'red', name: 'Red', gender: 'womens', slope: 113, courseRating: 68.2, par: 72 },
  ]);
  const [playerTeeIds, setPlayerTeeIds] = useState<Map<string, string>>(new Map());

  const handleMixedTeesChange = (v: boolean) => {
    setMixedTees(v);
    if (v && courseApiDetails) {
      // Note: `t.tee_name` etc. may be undefined per the `TeeInfoLike` shape, but
      // the originating `useGolfCourseSearch` types are concrete strings/numbers.
      // Cast preserves the original page behavior unchanged.
      const maleTees = (courseApiDetails.tees?.male ?? []).map(t => ({
        id: `male-${(t.tee_name as string).toLowerCase().replace(/\s+/g, '-')}`,
        name: t.tee_name as string,
        gender: 'mens' as const,
        slope: t.slope_rating as number,
        courseRating: t.course_rating as number,
        par: t.par_total as number,
      })) as TeeSet[];
      const femaleTees = (courseApiDetails.tees?.female ?? []).map(t => ({
        id: `female-${(t.tee_name as string).toLowerCase().replace(/\s+/g, '-')}`,
        name: t.tee_name as string,
        gender: 'womens' as const,
        slope: t.slope_rating as number,
        courseRating: t.course_rating as number,
        par: t.par_total as number,
      })) as TeeSet[];
      const allTees = [...maleTees, ...femaleTees];
      if (allTees.length > 0) setRoundTeeSets(allTees);
    }
  };

  const handleUpdatePlayerTee = (playerId: string, teeSetId: string | undefined) => {
    setPlayerTeeIds(prev => {
      const next = new Map(prev);
      if (teeSetId) {
        next.set(playerId, teeSetId);
      } else {
        next.delete(playerId);
      }
      return next;
    });
  };

  return {
    mixedTees,
    roundTeeSets,
    setRoundTeeSets,
    playerTeeIds,
    handleMixedTeesChange,
    handleUpdatePlayerTee,
  };
}
