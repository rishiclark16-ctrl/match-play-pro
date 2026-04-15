import { useState, useCallback, useRef, useEffect } from 'react';
import { HoleInfo } from '@/types/golf';
import { supabase } from '@/integrations/supabase/client';
import { withSpan } from '@/lib/sentry';
import { distanceMiles } from '@/hooks/useUserLocation';

export interface GolfCourseResult {
  id: number;
  club_name: string;
  course_name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  /** Client-side computed distance in miles (only if user location available) */
  distanceMi?: number;
}

export interface GolfCourseDetails extends GolfCourseResult {
  tees?: {
    male?: TeeInfo[];
    female?: TeeInfo[];
  };
}

interface TeeInfo {
  tee_name: string;
  course_rating: number;
  slope_rating: number;
  bogey_rating?: number;
  total_yards: number;
  total_meters?: number;
  number_of_holes: number;
  par_total: number;
  holes: {
    par: number;
    yardage: number;
    handicap?: number;
  }[];
}

// ── Client-side search cache (survives across re-renders, cleared on refresh) ──
const searchCache = new Map<string, { results: GolfCourseResult[]; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedSearch(query: string): GolfCourseResult[] | null {
  const key = query.toLowerCase().trim();
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CLIENT_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.results;
}

function setCachedSearch(query: string, results: GolfCourseResult[]): void {
  searchCache.set(query.toLowerCase().trim(), { results, timestamp: Date.now() });
}

// ── Details cache ──
const detailsCache = new Map<number, { details: GolfCourseDetails; timestamp: number }>();
const DETAILS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface UseGolfCourseSearchOptions {
  /** User's GPS coordinates for proximity sorting */
  userLocation?: { latitude: number; longitude: number } | null;
}

export function useGolfCourseSearch(options: UseGolfCourseSearchOptions = {}) {
  const { userLocation } = options;
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchResults, setSearchResults] = useState<GolfCourseResult[]>([]);
  const [nearbyCourses, setNearbyCourses] = useState<GolfCourseResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Track the latest request to avoid stale results
  const latestRequestRef = useRef(0);
  const prefetchedRef = useRef(false);

  /** Attach distance to results and sort by proximity */
  const sortByDistance = useCallback((courses: GolfCourseResult[]): GolfCourseResult[] => {
    if (!userLocation) return courses;

    return courses
      .map(c => ({
        ...c,
        distanceMi: c.location?.latitude && c.location?.longitude
          ? distanceMiles(userLocation.latitude, userLocation.longitude, c.location.latitude, c.location.longitude)
          : undefined,
      }))
      .sort((a, b) => {
        if (a.distanceMi != null && b.distanceMi != null) return a.distanceMi - b.distanceMi;
        if (a.distanceMi != null) return -1;
        if (b.distanceMi != null) return 1;
        return 0;
      });
  }, [userLocation]);

  /** Raw API call — shared between search + prefetch */
  const fetchCourses = useCallback(async (query: string): Promise<GolfCourseResult[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/golf-course-lookup?action=search&query=${encodeURIComponent(query)}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    const data = await response.json();
    return data.courses || [];
  }, []);

  const searchCourses = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    // Check client cache first — instant results
    const cached = getCachedSearch(query);
    if (cached) {
      setSearchResults(sortByDistance(cached));
      return;
    }

    // Check if a shorter prefix is cached and can give partial results instantly.
    // We also keep this list around to merge with the API response — the upstream
    // relevance ranking is inconsistent across prefix lengths (e.g. "son" returns
    // Sonoma GC but "sono" doesn't), so we refuse to drop a course whose name we
    // can locally verify still matches the current query.
    const trimmed = query.trim().toLowerCase();
    const matchesTrimmed = (c: GolfCourseResult) =>
      c.course_name.toLowerCase().includes(trimmed) ||
      !!c.club_name?.toLowerCase().includes(trimmed) ||
      !!c.location?.city?.toLowerCase().includes(trimmed);

    let prefixMatches: GolfCourseResult[] = [];
    for (let len = trimmed.length - 1; len >= 3; len--) {
      const prefix = trimmed.slice(0, len);
      const prefixCached = getCachedSearch(prefix);
      if (prefixCached) {
        prefixMatches = prefixCached.filter(matchesTrimmed);
        if (prefixMatches.length > 0) {
          setSearchResults(sortByDistance(prefixMatches));
        }
        break;
      }
    }

    const requestId = ++latestRequestRef.current;
    setIsSearching(true);
    setError(null);

    try {
      const courses = await withSpan('golf-course-search', 'http.client', () => fetchCourses(query));

      // Only update if this is still the latest request
      if (requestId === latestRequestRef.current) {
        const seenIds = new Set(courses.map(c => c.id));
        const missing = prefixMatches.filter(c => !seenIds.has(c.id));
        const merged = missing.length > 0 ? [...courses, ...missing] : courses;
        const sorted = sortByDistance(merged);
        setSearchResults(sorted);
        setCachedSearch(query, merged);
      }
    } catch (err) {
      if (requestId === latestRequestRef.current) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsSearching(false);
      }
    }
  }, [fetchCourses, sortByDistance]);

  /** Prefetch nearby courses based on user location */
  useEffect(() => {
    if (!userLocation || prefetchedRef.current) return;
    prefetchedRef.current = true;

    const prefetch = async () => {
      try {
        const cached = getCachedSearch('__nearby__');
        if (cached) {
          setNearbyCourses(sortByDistance(cached));
          return;
        }

        const courses = await fetchCourses('golf');
        setCachedSearch('__nearby__', courses);
        setNearbyCourses(sortByDistance(courses));
      } catch {
        // Silent fail — prefetch is best-effort
      }
    };

    prefetch();
  }, [userLocation, fetchCourses, sortByDistance]);

  const getCourseDetails = useCallback(async (courseId: number): Promise<GolfCourseDetails | null> => {
    // Check client cache
    const cached = detailsCache.get(courseId);
    if (cached && Date.now() - cached.timestamp < DETAILS_CACHE_TTL_MS) {
      return cached.details;
    }

    setIsLoadingDetails(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/golf-course-lookup?action=details&id=${courseId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error(`Failed to get course details: ${response.status}`);

      const data = await response.json();
      const courseData = data.course || data;

      // Cache it
      detailsCache.set(courseId, { details: courseData, timestamp: Date.now() });

      return courseData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get course details');
      return null;
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const convertToHoleInfo = useCallback((
    details: GolfCourseDetails,
    teeName?: string,
    gender: 'male' | 'female' = 'male'
  ): HoleInfo[] => {
    const tees = gender === 'male'
      ? (details.tees?.male || details.tees?.female || [])
      : (details.tees?.female || details.tees?.male || []);

    const selectedTee = teeName
      ? tees.find(t => t.tee_name === teeName)
      : tees[0];

    if (!selectedTee?.holes) {
      return Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: 4,
      }));
    }

    return selectedTee.holes.map((hole, index) => ({
      number: index + 1,
      par: hole.par,
      handicap: hole.handicap,
      yardage: hole.yardage,
    }));
  }, []);

  const getTeeInfo = useCallback((
    details: GolfCourseDetails,
    teeName: string,
    gender: 'male' | 'female'
  ) => {
    const tees = gender === 'male' ? details.tees?.male : details.tees?.female;
    return tees?.find(t => t.tee_name === teeName);
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchCourses,
    getCourseDetails,
    convertToHoleInfo,
    getTeeInfo,
    clearResults,
    searchResults,
    nearbyCourses,
    isSearching,
    isLoadingDetails,
    error,
  };
}
