import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
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
      className="space-y-6"
    >
      {!showCourseForm ? (
        <>
          {isLoadingApiCourse && (
            <TechCard>
              <TechCardContent className="py-8 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-muted-foreground font-medium">Loading course details...</span>
              </TechCardContent>
            </TechCard>
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
            <TechCard variant="highlighted" corners>
              <TechCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedCourse.name}</p>
                      {selectedCourse.location && (
                        <p className="text-sm text-muted-foreground">{selectedCourse.location}</p>
                      )}
                    </div>
                  </div>

                  {(selectedCourse.rating || selectedCourse.slope) && (
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {selectedCourse.rating && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-sm font-mono font-semibold rounded">
                            {selectedCourse.rating.toFixed(1)}
                          </span>
                        )}
                        {selectedCourse.slope && (
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-sm font-mono font-semibold rounded">
                            {selectedCourse.slope}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                        Rating / Slope
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium">{selectedCourse.holes.length} holes</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="font-medium">
                    Par {selectedCourse.holes.reduce((sum, h) => sum + h.par, 0)}
                  </span>
                </div>
              </TechCardContent>
            </TechCard>
          )}

          {/* Hole Count */}
          <div className="space-y-3">
            <p className="label-sm">Number of Holes</p>
            <div className="grid grid-cols-2 gap-3">
              {[9, 18].map(count => (
                <motion.button
                  key={count}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onHoleCountChange(count as 9 | 18)}
                  className={cn(
                    'py-4 rounded-xl font-bold text-lg transition-all border-2',
                    holeCount === count
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  )}
                >
                  {count} Holes
                </motion.button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <TechCard>
          <TechCardContent className="p-5 space-y-4">
            <p className="font-semibold text-lg">Add New Course</p>

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

            <div className="grid grid-cols-2 gap-3">
              {[9, 18].map(count => (
                <motion.button
                  key={count}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onHoleCountChange(count as 9 | 18)}
                  className={cn(
                    'py-3 rounded-xl font-semibold transition-all border-2',
                    holeCount === count
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border'
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
          </TechCardContent>
        </TechCard>
      )}
    </motion.div>
  );
}
