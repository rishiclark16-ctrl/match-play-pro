import { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Loader2, Globe, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { Course } from '@/types/golf';
import { Input } from '@/components/ui/input';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
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
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search golf courses..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 py-6 text-base bg-card border-border"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'saved' | 'search')}>
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger 
            value="search" 
            className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg font-semibold"
          >
            <Globe className="w-4 h-4" />
            Search Online
          </TabsTrigger>
          <TabsTrigger 
            value="saved" 
            className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg font-semibold"
          >
            <Database className="w-4 h-4" />
            My Courses
          </TabsTrigger>
        </TabsList>

        {/* Online Search Results */}
        <TabsContent value="search" className="space-y-2 mt-4">
          {error && (
            <TechCard>
              <TechCardContent className="py-4 text-center text-destructive text-sm">
                {error}
              </TechCardContent>
            </TechCard>
          )}
          
          {searchResults.length > 0 ? (
            searchResults.map((course) => (
              <motion.button
                key={course.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleApiCourseSelect(course)}
                className="w-full text-left"
              >
                <TechCard hover>
                  <TechCardContent className="p-4">
                    <p className="font-semibold">{course.course_name}</p>
                    {course.club_name !== course.course_name && (
                      <p className="text-sm text-muted-foreground">{course.club_name}</p>
                    )}
                    {course.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {[course.location.city, course.location.state, course.location.country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </TechCardContent>
                </TechCard>
              </motion.button>
            ))
          ) : query.trim().length >= 2 && !isSearching ? (
            <TechCard>
              <TechCardContent className="py-8 text-center text-muted-foreground">
                No courses found matching "{query}"
              </TechCardContent>
            </TechCard>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Enter at least 2 characters to search
            </div>
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
                className="w-full text-left"
              >
                <TechCard hover>
                  <TechCardContent className="p-4">
                    <p className="font-semibold">{course.name}</p>
                    {course.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {course.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {course.holes.length} holes • Par {course.holes.reduce((sum, h) => sum + h.par, 0)}
                    </p>
                  </TechCardContent>
                </TechCard>
              </motion.button>
            ))
          ) : query.trim() ? (
            <TechCard>
              <TechCardContent className="py-8 text-center text-muted-foreground">
                No saved courses matching "{query}"
              </TechCardContent>
            </TechCard>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No saved courses yet
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add New Course Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCreateNew}
        className="w-full py-4 px-6 rounded-xl border-2 border-dashed border-primary/30 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-light hover:border-primary/50 transition-all"
      >
        <Plus className="w-5 h-5" />
        Add Course Manually
      </motion.button>
    </div>
  );
}
