import { useState } from 'react';
import { MapPin, ChevronRight, X, Search, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGolfCourseSearch } from '@/hooks/useGolfCourseSearch';
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
  const { searchCourses, searchResults, isSearching, error, clearResults } = useGolfCourseSearch();

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length >= 2) {
      await searchCourses(searchQuery);
    } else {
      clearResults();
    }
  };

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
          className={cn(
            'w-full flex items-center justify-between p-4 rounded-xl',
            'bg-card border border-border hover:border-primary/50 transition-colors',
            'text-left'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              {courseName ? (
                <>
                  <p className="font-medium text-foreground">{courseName}</p>
                  <p className="text-sm text-muted-foreground">Home Course</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-muted-foreground">Select Home Course</p>
                  <p className="text-sm text-muted-foreground">Tap to search</p>
                </>
              )}
            </div>
          </div>
          {courseName ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
              onChange={(e) => handleSearch(e.target.value)}
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
            {searchResults.map((course) => (
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
                <div>
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
              </button>
            ))}

            {query.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No courses found. Try a different search.
              </p>
            )}

            {query.length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Type at least 2 characters to search
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
