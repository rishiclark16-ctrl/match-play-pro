import { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Loader2, ChevronRight, Flag } from 'lucide-react';
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
      <div ref={ref} className="relative overflow-hidden rounded-2xl">
        <motion.div
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
              
              {onDelete && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all",
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
