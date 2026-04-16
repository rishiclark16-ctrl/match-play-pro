import { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Loader2, Globe, Database, ChevronRight, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { Course } from '@/types/golf';
import { cn } from '@/lib/utils';
import { useGolfCourseSearch, GolfCourseResult } from '@/hooks/useGolfCourseSearch';
import { useUserLocation } from '@/hooks/useUserLocation';

interface CourseSearchProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCreateNew: () => void;
  onSelectApiCourse?: (apiCourse: GolfCourseResult) => void;
}

export function CourseSearch({ courses, onSelectCourse, onCreateNew, onSelectApiCourse }: CourseSearchProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'saved' | 'search'>('search');
  const { location: userLocation } = useUserLocation();
  const { searchCourses, searchResults, nearbyCourses, isSearching, error, clearResults } = useGolfCourseSearch({ userLocation });

  useEffect(() => {
    if (activeTab !== 'search') return;

    const timer = setTimeout(() => {
      if (query.trim().length >= 3) {
        searchCourses(query);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab, searchCourses, clearResults]);

  const filteredLocalCourses = query.trim()
    ? courses.filter(c =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.location?.toLowerCase().includes(query.toLowerCase())
      )
    : courses.slice(0, 5);

  const handleApiCourseSelect = (apiCourse: GolfCourseResult) => {
    if (onSelectApiCourse) {
      onSelectApiCourse(apiCourse);
    }
  };

  return (
    <div>
      {/* Search Input */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center px-4 py-0 mb-4 overflow-hidden">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search golf courses..."
          aria-label="Search golf courses"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 py-4 bg-transparent border-0 focus:ring-0 text-sm placeholder:text-muted-foreground outline-none ml-3"
        />
        {isSearching && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
        )}
      </div>

      {/* Tab Switcher */}
      <div className="bg-muted rounded-xl p-1 flex gap-1 mb-4 relative">
        {(['search', 'saved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-all relative z-10',
              activeTab === tab
                ? 'bg-white shadow-sm text-foreground font-bold'
                : 'text-muted-foreground font-medium'
            )}
          >
            {tab === 'search' ? (
              <>
                <Globe className="w-3.5 h-3.5" />
                Search Online
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5" />
                My Courses
              </>
            )}
          </button>
        ))}
      </div>

      {/* Online Search Results */}
      {activeTab === 'search' && (
        <div>
          {error && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3 mb-2 text-center text-destructive text-sm">
              {error}
            </div>
          )}

          {searchResults.length > 0 ? (
            searchResults.map((course) => (
              <motion.button
                key={course.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleApiCourseSelect(course)}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3.5 flex items-center justify-between mb-2 cursor-pointer w-full text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground">{course.course_name}</p>
                  {course.location && (
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {[course.location.city, course.location.state, course.location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {course.distanceMi != null && (
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                      {course.distanceMi < 1 ? '<1' : Math.round(course.distanceMi)} mi
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.button>
            ))
          ) : query.trim().length >= 3 && !isSearching ? (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-8 text-center text-muted-foreground text-sm">
              No courses found matching "{query}"
            </div>
          ) : query.trim().length < 3 && nearbyCourses.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 flex items-center gap-1.5">
                <Navigation className="w-3 h-3" />
                Nearby Courses
              </p>
              {nearbyCourses.slice(0, 5).map((course) => (
                <motion.button
                  key={course.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleApiCourseSelect(course)}
                  className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3.5 flex items-center justify-between mb-2 cursor-pointer w-full text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground">{course.course_name}</p>
                    {course.location && (
                      <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[course.location.city, course.location.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {course.distanceMi != null && (
                      <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                        {course.distanceMi < 1 ? '<1' : Math.round(course.distanceMi)} mi
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Enter at least 3 characters to search
            </div>
          )}
        </div>
      )}

      {/* Saved Courses */}
      {activeTab === 'saved' && (
        <div>
          {filteredLocalCourses.length > 0 ? (
            filteredLocalCourses.map((course) => (
              <motion.button
                key={course.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectCourse(course)}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3.5 flex items-center justify-between mb-2 cursor-pointer w-full text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground">{course.name}</p>
                  {course.location && (
                    <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {course.location}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
              </motion.button>
            ))
          ) : query.trim() ? (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-8 text-center text-muted-foreground text-sm">
              No saved courses matching "{query}"
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No saved courses yet
            </div>
          )}
        </div>
      )}

      {/* Add New Course Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCreateNew}
        className="bg-muted/50 rounded-2xl py-4 w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground mt-2"
      >
        <Plus className="w-4 h-4" />
        Add Course Manually
      </motion.button>
    </div>
  );
}
