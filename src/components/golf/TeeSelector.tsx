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
      className="bg-card rounded-[20px] border border-border min-h-[68px] px-4 py-3 flex items-center gap-3 mb-2 w-full text-left"
    >
      <div className={cn('w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-[0_0_0_1px_#E7E9E3]', getTeeDotColor(tee.tee_name))} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[16px] text-foreground">{tee.tee_name}</p>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          {tee.total_yards.toLocaleString()} yds · Par {tee.par_total}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-[16px] font-extrabold tracking-[-0.01em] text-foreground tabular-nums">{tee.course_rating} / {tee.slope_rating}</p>
        <p className="text-[12px] text-muted-foreground">rating / slope</p>
      </div>

      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </motion.button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#0F1F17]/50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-t-[28px] w-full max-w-md max-h-[82vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="px-5 pt-3 pb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[24px] font-extrabold tracking-[-0.02em] leading-tight text-foreground">Choose your tees</h3>
                <p className="text-[14px] text-muted-foreground truncate">{courseDetails.course_name}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                aria-label="Close"
                className="w-11 h-11 rounded-[14px] bg-muted flex items-center justify-center flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Tee Options */}
            <div className="px-5 pb-4 overflow-y-auto max-h-[60vh]">
              {/* Male Tees */}
              {maleTees.length > 0 && (
                <div className="mb-2">
                  {hasBothGenders && (
                    <p className="text-[13px] font-semibold text-muted-foreground mb-2 px-1">
                      Men's tees
                    </p>
                  )}
                  {maleTees.map((tee, index) => renderTeeOption(tee, 'male', index))}
                </div>
              )}

              {/* Female Tees */}
              {femaleTees.length > 0 && (
                <div className="mb-2">
                  {hasBothGenders && (
                    <p className="text-[13px] font-semibold text-muted-foreground mb-2 mt-2 px-1">
                      Women's tees
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

            <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
