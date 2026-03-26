import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Course, HoleInfo, generateId } from '@/types/golf';

const COURSES_KEY = 'match_courses';

// Standard USGA stroke index distribution for a generic 18-hole course.
// Odd SI (1,3,5,...) are front-heavy, even SI (2,4,6,...) are back-heavy,
// alternating difficulty — mirrors the most common club-level allocation.
// Real courses pulled from the API will always override these with their actual SI.
const defaultHoles18: HoleInfo[] = [
  { number: 1,  par: 4, handicap: 11 },
  { number: 2,  par: 4, handicap: 3  },
  { number: 3,  par: 3, handicap: 15 },
  { number: 4,  par: 5, handicap: 7  },
  { number: 5,  par: 4, handicap: 1  },
  { number: 6,  par: 4, handicap: 13 },
  { number: 7,  par: 3, handicap: 5  },
  { number: 8,  par: 4, handicap: 17 },
  { number: 9,  par: 5, handicap: 9  },
  { number: 10, par: 4, handicap: 2  },
  { number: 11, par: 4, handicap: 16 },
  { number: 12, par: 3, handicap: 12 },
  { number: 13, par: 5, handicap: 8  },
  { number: 14, par: 4, handicap: 4  },
  { number: 15, par: 4, handicap: 18 },
  { number: 16, par: 3, handicap: 14 },
  { number: 17, par: 4, handicap: 6  },
  { number: 18, par: 5, handicap: 10 },
];

const defaultHoles9: HoleInfo[] = defaultHoles18.slice(0, 9);

export function useCourses() {
  const [courses, setCourses] = useLocalStorage<Course[]>(COURSES_KEY, []);

  const createCourse = useCallback((
    name: string,
    location?: string,
    holes?: HoleInfo[],
    slope?: number,
    rating?: number
  ): Course => {
    const holeCount = holes?.length || 18;
    const newCourse: Course = {
      id: generateId(),
      name,
      location,
      holes: holes || (holeCount === 9 ? defaultHoles9 : defaultHoles18),
      slope,
      rating,
      isUserCreated: true,
      createdAt: new Date(),
    };
    setCourses(prev => [newCourse, ...prev]);
    return newCourse;
  }, [setCourses]);

  const getCourseById = useCallback((courseId: string): Course | undefined => {
    return courses.find(c => c.id === courseId);
  }, [courses]);

  const searchCourses = useCallback((query: string): Course[] => {
    if (!query.trim()) return courses;
    const lowerQuery = query.toLowerCase();
    return courses.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.location?.toLowerCase().includes(lowerQuery)
    );
  }, [courses]);

  const getDefaultHoles = useCallback((count: 9 | 18): HoleInfo[] => {
    return count === 9 ? [...defaultHoles9] : [...defaultHoles18];
  }, []);

  const deleteCourse = useCallback((courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
  }, [setCourses]);

  const updateCourseHoles = useCallback((courseId: string, holes: HoleInfo[]) => {
    setCourses(prev => prev.map(c => 
      c.id === courseId ? { ...c, holes } : c
    ));
  }, [setCourses]);

  return {
    courses,
    createCourse,
    getCourseById,
    searchCourses,
    getDefaultHoles,
    deleteCourse,
    updateCourseHoles,
  };
}
