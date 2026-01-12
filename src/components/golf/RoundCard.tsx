import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';
import { Round } from '@/types/golf';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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
}

export function RoundCard({ round, onClick, onDelete, isDeleting }: RoundCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isActive = round.status === 'active';
  const dateStr = format(new Date(round.createdAt), 'MMM d, yyyy');

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
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="card-premium p-4 cursor-pointer hover:shadow-md transition-shadow group"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{round.courseName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {round.holes} holes • {dateStr}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              isActive 
                ? "bg-success/10 text-success" 
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
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100",
                  "bg-danger/10 text-danger hover:bg-danger/20",
                  "sm:opacity-100" // Always visible on mobile
                )}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Round?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the round at {round.courseName} and all associated scores. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-danger hover:bg-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
