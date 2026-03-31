import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CourseSearch } from '@/components/golf/CourseSearch';
import { Course } from '@/types/golf';
import { GolfCourseResult } from '@/hooks/useGolfCourseSearch';
import { cn } from '@/lib/utils';

interface CourseStepProps {
  courses: Course[];
  selectedCourse: Course | null;
  showCourseForm: boolean;
  courseName: string;
  courseLocation: string;
  holeCount: 9 | 18;
  isLoadingApiCourse: boolean;
  onSelectCourse: (course: Course) => void;
  onSelectApiCourse: (apiCourse: GolfCourseResult) => void;
  onShowCourseForm: (show: boolean) => void;
  onCourseNameChange: (name: string) => void;
  onCourseLocationChange: (location: string) => void;
  onHoleCountChange: (count: 9 | 18) => void;
  onCreateCourse: () => void;
}

export function CourseStep({
  courses,
  selectedCourse,
  showCourseForm,
  courseName,
  courseLocation,
  holeCount,
  isLoadingApiCourse,
  onSelectCourse,
  onSelectApiCourse,
  onShowCourseForm,
  onCourseNameChange,
  onCourseLocationChange,
  onHoleCountChange,
  onCreateCourse,
}: CourseStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-4"
    >
      {!showCourseForm ? (
        <>
          {isLoadingApiCourse && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] py-8 flex items-center justify-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground font-medium text-sm">Loading course details...</span>
            </div>
          )}

          {!isLoadingApiCourse && (
            <CourseSearch
              courses={courses}
              onSelectCourse={onSelectCourse}
              onCreateNew={() => onShowCourseForm(true)}
              onSelectApiCourse={onSelectApiCourse}
            />
          )}

          {selectedCourse && (
            <div className="bg-white rounded-2xl shadow-[0_0_0_2px_#0A0A0A,0_2px_8px_rgba(0,0,0,0.08)] p-4 mb-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Check className="w-5 h-5 text-[#22C55E] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-black text-base tracking-[-0.02em] text-foreground truncate">
                      {selectedCourse.name}
                    </p>
                    {selectedCourse.location && (
                      <p className="text-[12px] text-muted-foreground">{selectedCourse.location}</p>
                    )}
                  </div>
                </div>

                {(selectedCourse.rating || selectedCourse.slope) && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    {selectedCourse.rating && (
                      <span className="bg-muted text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {selectedCourse.rating.toFixed(1)}
                      </span>
                    )}
                    {selectedCourse.slope && (
                      <span className="bg-muted text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {selectedCourse.slope}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium">{selectedCourse.holes.length} holes</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="font-medium">
                  Par {selectedCourse.holes.reduce((sum, h) => sum + h.par, 0)}
                </span>
              </div>
            </div>
          )}

          {/* Hole Count Toggle */}
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Number of Holes
            </p>
            <div className="bg-muted rounded-xl p-1 flex gap-1 mb-4">
              {([9, 18] as const).map(count => (
                <motion.button
                  key={count}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onHoleCountChange(count)}
                  className={cn(
                    'flex-1 text-center text-sm py-2 rounded-lg font-medium transition-all',
                    holeCount === count
                      ? 'bg-foreground text-background font-bold'
                      : 'text-muted-foreground'
                  )}
                >
                  {count} Holes
                </motion.button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5 space-y-4">
          <p className="font-black text-base tracking-[-0.02em]">Add New Course</p>

          <Input
            placeholder="Course name"
            value={courseName}
            onChange={e => onCourseNameChange(e.target.value)}
            className="py-6 text-base"
          />
          <Input
            placeholder="Location (optional)"
            value={courseLocation}
            onChange={e => onCourseLocationChange(e.target.value)}
            className="py-6 text-base"
          />

          <div className="bg-muted rounded-xl p-1 flex gap-1">
            {([9, 18] as const).map(count => (
              <motion.button
                key={count}
                whileTap={{ scale: 0.98 }}
                onClick={() => onHoleCountChange(count)}
                className={cn(
                  'flex-1 text-center text-sm py-2 rounded-lg font-medium transition-all',
                  holeCount === count
                    ? 'bg-foreground text-background font-bold'
                    : 'text-muted-foreground'
                )}
              >
                {count} Holes
              </motion.button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onShowCourseForm(false)} className="flex-1 py-6">
              Cancel
            </Button>
            <Button onClick={onCreateCourse} disabled={!courseName.trim()} className="flex-1 py-6">
              Save Course
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
