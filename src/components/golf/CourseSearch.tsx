import { useState } from 'react';
import { Search, Plus, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Course } from '@/types/golf';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CourseSearchProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCreateNew: () => void;
}

export function CourseSearch({ courses, onSelectCourse, onCreateNew }: CourseSearchProps) {
  const [query, setQuery] = useState('');

  const filteredCourses = query.trim()
    ? courses.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.location?.toLowerCase().includes(query.toLowerCase())
      )
    : courses.slice(0, 5); // Show recent courses

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search courses..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 py-6 text-base"
        />
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
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
            No courses found matching "{query}"
          </p>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            No saved courses yet
          </p>
        )}
      </div>

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
        Add New Course
      </motion.button>
    </div>
  );
}
