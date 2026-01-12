import { motion } from 'framer-motion';
import { Round } from '@/types/golf';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RoundCardProps {
  round: Round;
  onClick: () => void;
}

export function RoundCard({ round, onClick }: RoundCardProps) {
  const isActive = round.status === 'active';
  const dateStr = format(new Date(round.createdAt), 'MMM d, yyyy');

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card-premium p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{round.courseName}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {round.holes} holes • {dateStr}
          </p>
        </div>
        
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          isActive 
            ? "bg-success/10 text-success" 
            : "bg-muted text-muted-foreground"
        )}>
          {isActive ? 'In Progress' : 'Complete'}
        </span>
      </div>
    </motion.div>
  );
}
