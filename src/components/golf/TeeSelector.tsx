import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
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

// Colors for common tee names
const teeColors: Record<string, string> = {
  'Black': 'bg-gray-900 text-white',
  'Blue': 'bg-blue-600 text-white',
  'White': 'bg-white text-gray-900 border border-gray-300',
  'Gold': 'bg-yellow-500 text-gray-900',
  'Yellow': 'bg-yellow-400 text-gray-900',
  'Green': 'bg-green-600 text-white',
  'Red': 'bg-red-600 text-white',
  'Orange': 'bg-orange-500 text-white',
  'Silver': 'bg-gray-400 text-gray-900',
  'Combo': 'bg-purple-600 text-white',
};

function getTeeColor(teeName: string): string {
  // Check for exact match first
  if (teeColors[teeName]) return teeColors[teeName];
  
  // Check if tee name contains a known color
  for (const [color, className] of Object.entries(teeColors)) {
    if (teeName.toLowerCase().includes(color.toLowerCase())) {
      return className;
    }
  }
  
  return 'bg-primary text-primary-foreground';
}

export function TeeSelector({ isOpen, courseDetails, onSelectTee, onClose }: TeeSelectorProps) {
  if (!courseDetails) return null;

  const maleTees = courseDetails.tees?.male || [];
  const femaleTees = courseDetails.tees?.female || [];
  const hasBothGenders = maleTees.length > 0 && femaleTees.length > 0;

  const renderTeeOption = (tee: TeeInfo, gender: 'male' | 'female') => (
    <motion.button
      key={`${gender}-${tee.tee_name}`}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelectTee(tee.tee_name, gender)}
      className="w-full card-premium p-4 text-left hover:shadow-md transition-all hover:ring-2 hover:ring-primary/30"
    >
      <div className="flex items-center gap-3">
        {/* Tee color indicator */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
          getTeeColor(tee.tee_name)
        )}>
          {tee.tee_name.charAt(0)}
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold">{tee.tee_name}</h4>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{tee.total_yards.toLocaleString()} yds</span>
            <span>•</span>
            <span>Par {tee.par_total}</span>
            <span>•</span>
            <span>{tee.number_of_holes} holes</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium">{tee.course_rating}</div>
          <div className="text-xs text-muted-foreground">/ {tee.slope_rating}</div>
        </div>
      </div>
    </motion.button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Select Tees</h3>
                <p className="text-sm text-muted-foreground">{courseDetails.course_name}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Tee Options */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Male Tees */}
              {maleTees.length > 0 && (
                <div className="space-y-2">
                  {hasBothGenders && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Men's Tees
                    </p>
                  )}
                  <div className="space-y-2">
                    {maleTees.map((tee) => renderTeeOption(tee, 'male'))}
                  </div>
                </div>
              )}

              {/* Female Tees */}
              {femaleTees.length > 0 && (
                <div className="space-y-2">
                  {hasBothGenders && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Women's Tees
                    </p>
                  )}
                  <div className="space-y-2">
                    {femaleTees.map((tee) => renderTeeOption(tee, 'female'))}
                  </div>
                </div>
              )}

              {maleTees.length === 0 && femaleTees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tee information available</p>
                  <p className="text-sm mt-1">Default pars will be used</p>
                </div>
              )}
            </div>

            {/* Rating Legend */}
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Rating / Slope shown on the right
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
