import { useState, useRef, forwardRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Loader2, ChevronRight, Flag } from 'lucide-react';
import { Round } from '@/types/golf';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RoundCardProps {
  round: Round;
  onClick: () => void;
  onDelete?: (roundId: string) => Promise<void>;
  isDeleting?: boolean;
  playerCount?: number;
  currentHole?: number;
}

const SWIPE_THRESHOLD = -100;

export const RoundCard = forwardRef<HTMLDivElement, RoundCardProps>(
  function RoundCard({ round, onClick, onDelete, isDeleting, playerCount, currentHole }, ref) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isMobile = useIsMobile();
  const constraintsRef = useRef(null);
  
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [SWIPE_THRESHOLD, 0],
    ['hsl(var(--danger))', 'hsl(var(--danger) / 0.3)']
  );
  const deleteIconOpacity = useTransform(x, [SWIPE_THRESHOLD, -50, 0], [1, 0.5, 0]);
  const deleteIconScale = useTransform(x, [SWIPE_THRESHOLD, -50, 0], [1.2, 1, 0.8]);
  
  const isActive = round.status === 'active';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete(round.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < SWIPE_THRESHOLD && onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <>
      <div ref={constraintsRef} className="relative overflow-hidden rounded-2xl">
        {/* Delete background revealed on swipe */}
        {isMobile && onDelete && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-end pr-6 rounded-2xl"
            style={{ background }}
          >
            <motion.div
              style={{ opacity: deleteIconOpacity, scale: deleteIconScale }}
            >
              <Trash2 className="w-6 h-6 text-white" />
            </motion.div>
          </motion.div>
        )}
        
        <motion.div
          style={{ x: isMobile && onDelete ? x : 0 }}
          drag={isMobile && onDelete ? "x" : false}
          dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
          dragElastic={{ left: 0.1, right: 0 }}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 0.99 }}
          onClick={onClick}
          className="bg-card rounded-xl p-4 cursor-pointer border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 group relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate pr-3 text-sm">{round.courseName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {round.holes} holes
                </span>
                
                {isActive && currentHole !== undefined && currentHole > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Flag className="w-3 h-3" />
                    Hole {currentHole}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <span className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                isActive 
                  ? "bg-success/10 text-success border border-success/20" 
                  : "bg-muted text-muted-foreground"
              )}>
                {isActive ? 'In Progress' : 'Complete'}
              </span>
              
              {/* Show button on desktop, hide on mobile (swipe instead) */}
              {onDelete && !isMobile && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                    "opacity-0 group-hover:opacity-100 focus:opacity-100",
                    "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  )}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </motion.button>
              )}
              
              <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </motion.div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Round?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the round at {round.courseName} and all associated scores. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
