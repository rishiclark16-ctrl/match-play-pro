import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GolfCourseDetails } from '@/hooks/useGolfCourseSearch';

interface TeeInfo {
  tee_name: string;
  course_rating: number;
  slope_rating: number;
  total_yards: number;
  par_total: number;
  number_of_holes: number;
}

interface TeeSelectorProps {
  isOpen: boolean;
  courseDetails: GolfCourseDetails | null;
  onSelectTee: (teeName: string, gender: 'male' | 'female') => void;
  onClose: () => void;
}

const teeColorDots: Record<string, string> = {
  'Black': 'bg-gray-900',
  'Blue': 'bg-blue-600',
  'White': 'bg-white border border-gray-300',
  'Gold': 'bg-yellow-500',
  'Yellow': 'bg-yellow-400',
  'Green': 'bg-green-600',
  'Red': 'bg-red-600',
  'Orange': 'bg-orange-500',
  'Silver': 'bg-gray-400',
  'Combo': 'bg-purple-600',
};

function getTeeDotColor(teeName: string): string {
  if (teeColorDots[teeName]) return teeColorDots[teeName];

  for (const [color, className] of Object.entries(teeColorDots)) {
    if (teeName.toLowerCase().includes(color.toLowerCase())) {
      return className;
    }
  }

  return 'bg-foreground';
}

export function TeeSelector({ isOpen, courseDetails, onSelectTee, onClose }: TeeSelectorProps) {
  if (!courseDetails) return null;

  const maleTees = courseDetails.tees?.male || [];
  const femaleTees = courseDetails.tees?.female || [];
  const hasBothGenders = maleTees.length > 0 && femaleTees.length > 0;

  const renderTeeOption = (tee: TeeInfo, gender: 'male' | 'female', index: number) => (
    <motion.button
      key={`${gender}-${tee.tee_name}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelectTee(tee.tee_name, gender)}
      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3.5 flex items-center gap-3 mb-2 w-full text-left"
    >
      {/* Tee color dot */}
      <div className={cn('w-3 h-3 rounded-full flex-shrink-0', getTeeDotColor(tee.tee_name))} />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground">{tee.tee_name}</p>
        <p className="font-mono text-sm text-muted-foreground">
          {tee.total_yards.toLocaleString()} yds • Par {tee.par_total}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-foreground">{tee.course_rating} / {tee.slope_rating}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </motion.button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F8F8F6] rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-muted-foreground/25 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-[-0.03em]">Select Tees</h3>
                <p className="text-sm text-muted-foreground">{courseDetails.course_name}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Tee Options */}
            <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
              {/* Male Tees */}
              {maleTees.length > 0 && (
                <div className="mb-2">
                  {hasBothGenders && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                      Men's Tees
                    </p>
                  )}
                  {maleTees.map((tee, index) => renderTeeOption(tee, 'male', index))}
                </div>
              )}

              {/* Female Tees */}
              {femaleTees.length > 0 && (
                <div className="mb-2">
                  {hasBothGenders && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                      Women's Tees
                    </p>
                  )}
                  {femaleTees.map((tee, index) => renderTeeOption(tee, 'female', index))}
                </div>
              )}

              {maleTees.length === 0 && femaleTees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium">No tee information available</p>
                  <p className="text-sm mt-1">Default pars will be used</p>
                </div>
              )}
            </div>

            {/* Rating Legend */}
            <div className="px-5 py-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center font-mono">
                Course Rating / Slope shown on the right
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
