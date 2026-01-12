import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, MapPin, Loader2, Globe, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { Course } from '@/types/golf';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useGolfCourseSearch, GolfCourseResult } from '@/hooks/useGolfCourseSearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CourseSearchProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCreateNew: () => void;
  onSelectApiCourse?: (apiCourse: GolfCourseResult) => void;
}

export function CourseSearch({ courses, onSelectCourse, onCreateNew, onSelectApiCourse }: CourseSearchProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'saved' | 'search'>('search');
  const { searchCourses, searchResults, isSearching, error, clearResults } = useGolfCourseSearch();

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'search') return;
    
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchCourses(query);
      } else {
        clearResults();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, activeTab, searchCourses, clearResults]);

  const filteredLocalCourses = query.trim()
    ? courses.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.location?.toLowerCase().includes(query.toLowerCase())
      )
    : courses.slice(0, 5);

  const handleApiCourseSelect = (apiCourse: GolfCourseResult) => {
    if (onSelectApiCourse) {
      onSelectApiCourse(apiCourse);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search golf courses..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 py-6 text-base"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'saved' | 'search')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Search Online
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            My Courses
          </TabsTrigger>
        </TabsList>

        {/* Online Search Results */}
        <TabsContent value="search" className="space-y-2 mt-4">
          {error && (
            <p className="text-center text-destructive py-4 text-sm">
              {error}
            </p>
          )}
          
          {searchResults.length > 0 ? (
            searchResults.map((course) => (
              <motion.button
                key={course.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleApiCourseSelect(course)}
                className="w-full card-premium p-4 text-left hover:shadow-md transition-shadow"
              >
                <h4 className="font-medium">{course.course_name}</h4>
                {course.club_name !== course.course_name && (
                  <p className="text-sm text-muted-foreground">{course.club_name}</p>
                )}
                {course.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {[course.location.city, course.location.state, course.location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </motion.button>
            ))
          ) : query.trim().length >= 2 && !isSearching ? (
            <p className="text-center text-muted-foreground py-6">
              No courses found matching "{query}"
            </p>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              Enter at least 2 characters to search
            </p>
          )}
        </TabsContent>

        {/* Saved Courses */}
        <TabsContent value="saved" className="space-y-2 mt-4">
          {filteredLocalCourses.length > 0 ? (
            filteredLocalCourses.map((course) => (
              <motion.button
                key={course.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectCourse(course)}
                className="w-full card-premium p-4 text-left hover:shadow-md transition-shadow"
              >
                <h4 className="font-medium">{course.name}</h4>
                {course.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {course.location}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {course.holes.length} holes • Par {course.holes.reduce((sum, h) => sum + h.par, 0)}
                </p>
              </motion.button>
            ))
          ) : query.trim() ? (
            <p className="text-center text-muted-foreground py-6">
              No saved courses matching "{query}"
            </p>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              No saved courses yet
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Add New Course Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCreateNew}
        className={cn(
          "w-full py-4 px-6 rounded-xl border-2 border-dashed border-primary/30",
          "text-primary font-medium flex items-center justify-center gap-2",
          "hover:bg-primary-light transition-colors"
        )}
      >
        <Plus className="w-5 h-5" />
        Add Course Manually
      </motion.button>
    </div>
  );
}
