import { useState, useEffect } from 'react';
import { MapPin, ChevronRight, X, Search, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGolfCourseSearch } from '@/hooks/useGolfCourseSearch';
import { useUserLocation } from '@/hooks/useUserLocation';
import { cn } from '@/lib/utils';

interface HomeCourseSelectorProps {
  courseId: string | null;
  courseName: string | null;
  onSelect: (courseId: string, courseName: string) => void;
  onClear: () => void;
}

export function HomeCourseSelector({
  courseId,
  courseName,
  onSelect,
  onClear,
}: HomeCourseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { location: userLocation } = useUserLocation();
  const { searchCourses, searchResults, nearbyCourses, isSearching, error, clearResults } = useGolfCourseSearch({ userLocation });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        searchCourses(query);
      } else {
        clearResults();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchCourses, clearResults]);

  const handleSelect = (course: { id: number; course_name: string; club_name?: string }) => {
    const displayName = course.club_name
      ? `${course.course_name} - ${course.club_name}`
      : course.course_name;
    onSelect(course.id.toString(), displayName);
    setOpen(false);
    setQuery('');
    clearResults();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-right"
        >
          <span className={cn('text-sm font-medium truncate max-w-[120px]', courseName ? 'text-foreground' : 'text-muted-foreground')}>
            {courseName ?? 'None'}
          </span>
          {courseName ? (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Select Home Course</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search golf courses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 py-6"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {(query.length >= 3 ? searchResults : nearbyCourses.slice(0, 5)).map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => handleSelect(course)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl',
                  'bg-muted/50 hover:bg-muted transition-colors',
                  'text-left'
                )}
              >
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{course.course_name}</p>
                  {course.club_name && (
                    <p className="text-sm text-muted-foreground">{course.club_name}</p>
                  )}
                  {course.location && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {[course.location.city, course.location.state, course.location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
                {course.distanceMi != null && (
                  <span className="text-[11px] font-semibold text-muted-foreground bg-background px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5">
                    {course.distanceMi < 1 ? '<1' : Math.round(course.distanceMi)} mi
                  </span>
                )}
              </button>
            ))}

            {query.length >= 3 && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No courses found. Try a different search.
              </p>
            )}

            {query.length < 3 && nearbyCourses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Type at least 3 characters to search
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
