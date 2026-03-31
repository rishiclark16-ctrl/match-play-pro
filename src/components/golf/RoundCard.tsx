import { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Loader2, ChevronRight } from 'lucide-react';
import { Round } from '@/types/golf';
import { cn } from '@/lib/utils';
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

export const RoundCard = forwardRef<HTMLDivElement, RoundCardProps>(
  function RoundCard({ round, onClick, onDelete, isDeleting, playerCount, currentHole }, ref) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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

  return (
    <>
      <div ref={ref} className="relative rounded-xl overflow-hidden">
        <motion.div
          whileTap={{ scale: 0.99 }}
          onClick={onClick}
          className={cn(
            "bg-card rounded-xl p-4 cursor-pointer border transition-all duration-150 group relative overflow-hidden",
            isActive ? "border-foreground" : "border-border"
          )}
        >
          {/* Left accent bar for active rounds */}
          {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-success" />
          )}

          {/* Status flag line */}
          <div className="flex items-center gap-2 mb-2 pl-1">
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-[0.15em]",
              isActive ? "text-success" : "text-muted-foreground"
            )}>
              {isActive
                ? currentHole && currentHole > 0
                  ? `Live · Hole ${currentHole}/${round.holes}`
                  : 'Live'
                : 'Complete'}
            </span>
            <div className={cn(
              "flex-1 h-px opacity-20",
              isActive ? "bg-success" : "bg-muted-foreground"
            )} />
          </div>

          <div className="flex items-end justify-between pl-1">
            <div className="flex-1 min-w-0 pr-3">
              <h3 className="font-bold text-foreground truncate text-[17px] leading-tight tracking-[-0.02em]">
                {round.courseName}
              </h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {round.holes} holes
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onDelete && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center transition-colors touch-manipulation cursor-pointer select-none bg-muted/60 text-muted-foreground active:bg-destructive/10 active:text-destructive"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </motion.button>
              )}

              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-background" strokeWidth={2.5} />
              </div>
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
