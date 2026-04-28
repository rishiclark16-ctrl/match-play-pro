import { useState } from 'react';
import { toast } from 'sonner';
import type { Course, HoleInfo } from '@/types/golf';

// Loose shapes — exact types live on useGolfCourseSearch.
interface GolfCourseResultLike {
  id: string;
  course_name?: string;
}

interface TeeInfoLike {
  slope_rating?: number;
  course_rating?: number;
  par_total?: number;
  tee_name?: string;
}

interface GolfCourseDetailsLike {
  course_name?: string;
  location?: { city?: string; state?: string };
  tees?: {
    male?: TeeInfoLike[];
    female?: TeeInfoLike[];
  };
}

interface UseApiCourseSelectionArgs {
  /** Resolves a course id to its full details (tees, location, etc.). */
  getCourseDetails: (id: string) => Promise<GolfCourseDetailsLike | null>;
  /** Maps course details + chosen tee into the app's HoleInfo[] shape. */
  convertToHoleInfo: (details: GolfCourseDetailsLike, teeName?: string, gender?: 'male' | 'female') => HoleInfo[];
  /** Looks up slope/rating for a specific tee. */
  getTeeInfo: (details: GolfCourseDetailsLike, teeName: string, gender: 'male' | 'female') => TeeInfoLike | null | undefined;
  /** Persists a new local Course record. */
  createCourse: (
    name: string,
    location: string | undefined,
    holes: HoleInfo[],
    slope?: number,
    rating?: number,
  ) => Course;
  /** Page-level setters (state lives on the page so the rest of the form can read it). */
  setSelectedCourse: (course: Course) => void;
  setHoleCount: (n: 9 | 18) => void;
}

export interface UseApiCourseSelectionReturn {
  isLoadingApiCourse: boolean;
  showTeeSelector: boolean;
  setShowTeeSelector: (open: boolean) => void;
  pendingCourseDetails: GolfCourseDetailsLike | null;
  /** The most-recently finalized course's details — used by mixed-tees expansion. */
  courseApiDetails: GolfCourseDetailsLike | null;
  /** Called when the user picks an API course from the search list. */
  handleSelectApiCourse: (apiCourse: GolfCourseResultLike) => Promise<void>;
  /** Called from the tee-selector dialog when a specific tee is chosen. */
  handleTeeSelect: (teeName: string, gender: 'male' | 'female') => void;
}

/**
 * Encapsulates the multi-step "pick a course from the external API" flow:
 *   1. fetch details, decide whether to prompt for a tee
 *   2. (optional) tee-selector dialog
 *   3. finalize: convert holes, create local Course, set page state
 *
 * Extracted from NewRound — the page reads the exposed state for prop wiring
 * but the bookkeeping logic lives here.
 */
export function useApiCourseSelection({
  getCourseDetails,
  convertToHoleInfo,
  getTeeInfo,
  createCourse,
  setSelectedCourse,
  setHoleCount,
}: UseApiCourseSelectionArgs): UseApiCourseSelectionReturn {
  const [isLoadingApiCourse, setIsLoadingApiCourse] = useState(false);
  const [showTeeSelector, setShowTeeSelector] = useState(false);
  const [pendingCourseDetails, setPendingCourseDetails] = useState<GolfCourseDetailsLike | null>(null);
  const [pendingApiCourse, setPendingApiCourse] = useState<GolfCourseResultLike | null>(null);
  const [courseApiDetails, setCourseApiDetails] = useState<GolfCourseDetailsLike | null>(null);

  const finalizeCourseSelection = (
    details: GolfCourseDetailsLike,
    apiCourse: GolfCourseResultLike,
    teeName?: string,
    gender: 'male' | 'female' = 'male',
    teeInfo?: TeeInfoLike | null,
  ) => {
    const holes = convertToHoleInfo(details, teeName, gender);
    const locationStr = [details.location?.city, details.location?.state].filter(Boolean).join(', ');
    const name = details.course_name || apiCourse.course_name || 'Course';
    const displayName = teeName ? `${name} (${teeName})` : name;

    const course = createCourse(
      displayName,
      locationStr || undefined,
      holes,
      teeInfo?.slope_rating || details.tees?.male?.[0]?.slope_rating,
      teeInfo?.course_rating || details.tees?.male?.[0]?.course_rating,
    );

    setSelectedCourse(course);
    setHoleCount(holes.length === 9 ? 9 : 18);
    setCourseApiDetails(details);
    toast.success(`Loaded ${displayName} with real par data!`);
  };

  const handleSelectApiCourse = async (apiCourse: GolfCourseResultLike) => {
    setIsLoadingApiCourse(true);
    try {
      const details = await getCourseDetails(apiCourse.id);
      if (details) {
        const hasTees = (details.tees?.male?.length || 0) + (details.tees?.female?.length || 0) > 0;
        if (hasTees) {
          setPendingCourseDetails(details);
          setPendingApiCourse(apiCourse);
          setShowTeeSelector(true);
        } else {
          finalizeCourseSelection(details, apiCourse);
        }
      }
    } catch {
      toast.error('Failed to load course details');
    } finally {
      setIsLoadingApiCourse(false);
    }
  };

  const handleTeeSelect = (teeName: string, gender: 'male' | 'female') => {
    if (!pendingCourseDetails || !pendingApiCourse) return;
    const teeInfo = getTeeInfo(pendingCourseDetails, teeName, gender);
    finalizeCourseSelection(pendingCourseDetails, pendingApiCourse, teeName, gender, teeInfo);
    setShowTeeSelector(false);
    setPendingCourseDetails(null);
    setPendingApiCourse(null);
  };

  return {
    isLoadingApiCourse,
    showTeeSelector,
    setShowTeeSelector,
    pendingCourseDetails,
    courseApiDetails,
    handleSelectApiCourse,
    handleTeeSelect,
  };
}
