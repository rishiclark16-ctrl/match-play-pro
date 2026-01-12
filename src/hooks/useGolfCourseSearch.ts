import { useState, useCallback } from 'react';
import { HoleInfo } from '@/types/golf';

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

export function useGolfCourseSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchResults, setSearchResults] = useState<GolfCourseResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchCourses = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/golf-course-lookup?action=search&query=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.courses || []);
    } catch (err) {
      console.error('Course search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const getCourseDetails = useCallback(async (courseId: number): Promise<GolfCourseDetails | null> => {
    setIsLoadingDetails(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/golf-course-lookup?action=details&id=${courseId}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get course details: ${response.status}`);
      }

      const data = await response.json();
      console.log('Course details response:', data);
      
      // Handle both wrapped and unwrapped response formats
      const courseData = data.course || data;
      return courseData;
    } catch (err) {
      console.error('Course details error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get course details');
      return null;
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Convert API course details to our app's HoleInfo format
  const convertToHoleInfo = useCallback((details: GolfCourseDetails, teeName?: string): HoleInfo[] => {
    const tees = details.tees?.male || details.tees?.female || [];
    const selectedTee = teeName 
      ? tees.find(t => t.tee_name === teeName) 
      : tees[0];
    
    if (!selectedTee?.holes) {
      // Return default 18 holes with par 4
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

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchCourses,
    getCourseDetails,
    convertToHoleInfo,
    clearResults,
    searchResults,
    isSearching,
    isLoadingDetails,
    error,
  };
}
