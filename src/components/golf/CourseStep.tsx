import { motion } from 'framer-motion';
import { Check, Loader2, MapPin } from 'lucide-react';
import { CourseSearch } from '@/components/golf/CourseSearch';
import { Course } from '@/types/golf';
import { GolfCourseResult } from '@/hooks/useGolfCourseSearch';
import { cn } from '@/lib/utils';
import { ChipGroup, HeroCard, HeroTile } from './setupUi';
import { fdCard, fdInput, fdPrimaryCta } from './setupStyles';

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
  const holesLabel = selectedCourse ? selectedCourse.holes.length : holeCount;
  const par = selectedCourse ? selectedCourse.holes.reduce((sum, h) => sum + h.par, 0) : 0;
  const holeOptions = [
    { value: 9 as const, label: '9 holes' },
    { value: 18 as const, label: '18 holes' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-2"
    >
      {!showCourseForm ? (
        <>
          {selectedCourse ? (
            <HeroCard
              eyebrow={<span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Playing at</span>}
              title={selectedCourse.name}
              body={selectedCourse.location || undefined}
            >
              <div className="grid grid-cols-4 gap-2 mt-4">
                <HeroTile hot value={par} label="Par" />
                <HeroTile value={holesLabel} label="Holes" />
                <HeroTile value={selectedCourse.rating ? selectedCourse.rating.toFixed(1) : '—'} label="Rating" />
                <HeroTile value={selectedCourse.slope ?? '—'} label="Slope" />
              </div>
            </HeroCard>
          ) : (
            <HeroCard
              eyebrow="Course"
              title="Where are you playing?"
              body="Search for real pars, tees and slope, or add your own course."
              icon={
                <div className="w-12 h-12 rounded-[14px] bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-[22px] h-[22px] text-gold" />
                </div>
              }
            />
          )}

          {/* Hole Count */}
          <div className={cn(fdCard, 'mt-3.5 p-2 pl-4 flex items-center gap-3')}>
            <p className="text-[15px] font-semibold text-foreground flex-shrink-0">Holes</p>
            <ChipGroup
              ariaLabel="Number of holes"
              className="flex-1"
              options={holeOptions}
              value={holeCount}
              onChange={onHoleCountChange}
            />
          </div>

          <div className="mt-3.5">
            {isLoadingApiCourse ? (
              <div className={cn(fdCard, 'py-8 flex items-center justify-center gap-3')}>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-muted-foreground font-medium text-[14px]">Loading course details…</span>
              </div>
            ) : (
              <CourseSearch
                courses={courses}
                selectedCourseId={selectedCourse?.id}
                onSelectCourse={onSelectCourse}
                onCreateNew={() => onShowCourseForm(true)}
                onSelectApiCourse={onSelectApiCourse}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <HeroCard
            eyebrow="Course"
            title="Add new course"
            body="We'll use standard pars and stroke index. You can still score every hole."
          />
          <div className={cn(fdCard, 'mt-3.5 p-4 space-y-3')}>
            <div>
              <label htmlFor="new-course-name" className="block text-[13px] font-semibold text-muted-foreground mb-1.5 px-1">Course name</label>
              <input
                id="new-course-name"
                placeholder="Course name"
                value={courseName}
                onChange={e => onCourseNameChange(e.target.value)}
                className={fdInput}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="new-course-location" className="block text-[13px] font-semibold text-muted-foreground mb-1.5 px-1">Location</label>
              <input
                id="new-course-location"
                placeholder="Location (optional)"
                value={courseLocation}
                onChange={e => onCourseLocationChange(e.target.value)}
                className={fdInput}
              />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-muted-foreground mb-1.5 px-1">Holes</p>
              <ChipGroup ariaLabel="Number of holes" options={holeOptions} value={holeCount} onChange={onHoleCountChange} />
            </div>
          </div>

          <div className="flex gap-2 mt-3.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onShowCourseForm(false)}
              className="flex-1 h-[60px] rounded-[20px] bg-muted text-foreground text-[16px] font-bold"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onCreateCourse}
              disabled={!courseName.trim()}
              className={cn(fdPrimaryCta, 'flex-[1.6] w-auto')}
            >
              Save course
            </motion.button>
          </div>
        </>
      )}
    </motion.div>
  );
}
