import { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Loader2, Globe, Database, ChevronRight, Navigation, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Course } from '@/types/golf';
import { cn } from '@/lib/utils';
import { useGolfCourseSearch, GolfCourseResult } from '@/hooks/useGolfCourseSearch';
import { useUserLocation } from '@/hooks/useUserLocation';
import { fdCard } from './setupStyles';

interface CourseSearchProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCreateNew: () => void;
  onSelectApiCourse?: (apiCourse: GolfCourseResult) => void;
  /** Highlights the matching saved course. */
  selectedCourseId?: string;
}

export function CourseSearch({ courses, onSelectCourse, onCreateNew, onSelectApiCourse, selectedCourseId }: CourseSearchProps) {
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

  const rowClass = cn(fdCard, 'w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 mb-2 text-left');
  const emptyClass = 'rounded-[20px] bg-muted/60 px-4 py-6 text-center text-muted-foreground text-[14px]';

  const renderApiRow = (course: GolfCourseResult, withCountry: boolean) => (
    <motion.button
      key={course.id}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleApiCourseSelect(course)}
      className={rowClass}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[16px] text-foreground truncate">{course.course_name}</p>
        {course.location && (
          <p className="text-[13px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {[course.location.city, course.location.state, withCountry ? course.location.country : null]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {course.distanceMi != null && (
          <span className="text-[12px] font-semibold text-foreground bg-muted px-2.5 py-1 rounded-full tabular-nums">
            {course.distanceMi < 1 ? '<1' : Math.round(course.distanceMi)} mi
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </motion.button>
  );

  return (
    <div>
      {/* Search Input */}
      <div className={cn(fdCard, 'flex items-center px-4 h-14 mb-3 focus-within:border-primary/50 transition-colors')}>
        <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search golf courses..."
          aria-label="Search golf courses"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-full bg-transparent border-0 focus:ring-0 text-[16px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none ml-3"
        />
        {isSearching && (
          <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
        )}
      </div>

      {/* Source chips */}
      <div className="flex gap-2 mb-3" role="tablist">
        {(['search', 'saved'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 h-11 flex items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-colors',
              activeTab === tab ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {tab === 'search' ? (
              <>
                <Globe className="w-4 h-4" />
                Search online
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                My courses
              </>
            )}
          </button>
        ))}
      </div>

      {/* Online Search Results */}
      {activeTab === 'search' && (
        <div>
          {error && (
            <div className="rounded-[20px] bg-[#FEF3F2] border border-[#FECDCA] px-4 py-3 mb-2 text-center text-destructive text-[14px]">
              {error}
            </div>
          )}

          {searchResults.length > 0 ? (
            searchResults.map((course) => renderApiRow(course, true))
          ) : query.trim().length >= 3 && !isSearching ? (
            <div className={emptyClass}>No courses found matching "{query}"</div>
          ) : query.trim().length < 3 && nearbyCourses.length > 0 ? (
            <div>
              <p className="text-[13px] font-semibold text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                Nearby courses
              </p>
              {nearbyCourses.slice(0, 5).map((course) => renderApiRow(course, false))}
            </div>
          ) : (
            <div className={emptyClass}>Type at least 3 letters to search</div>
          )}
        </div>
      )}

      {/* Saved Courses */}
      {activeTab === 'saved' && (
        <div>
          {filteredLocalCourses.length > 0 ? (
            filteredLocalCourses.map((course) => {
              const selected = course.id === selectedCourseId;
              return (
                <motion.button
                  key={course.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectCourse(course)}
                  className={cn(rowClass, selected && 'border-2 border-primary')}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[16px] text-foreground truncate">{course.name}</p>
                    {course.location && (
                      <p className="text-[13px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {course.location}
                      </p>
                    )}
                  </div>
                  {selected
                    ? <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-white" /></span>
                    : <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                </motion.button>
              );
            })
          ) : query.trim() ? (
            <div className={emptyClass}>No saved courses matching "{query}"</div>
          ) : (
            <div className={emptyClass}>No saved courses yet</div>
          )}
        </div>
      )}

      {/* Add New Course Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCreateNew}
        className="w-full min-h-[56px] mt-1 rounded-[20px] border-2 border-dashed border-border flex items-center justify-center gap-2 text-[15px] font-semibold text-foreground"
      >
        <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <Plus className="w-4 h-4 text-white" />
        </span>
        Add course manually
      </motion.button>
    </div>
  );
}
