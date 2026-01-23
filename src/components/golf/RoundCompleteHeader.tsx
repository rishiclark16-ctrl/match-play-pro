import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { Round } from '@/types/golf';

interface RoundCompleteHeaderProps {
  round: Round;
}

export function RoundCompleteHeader({ round }: RoundCompleteHeaderProps) {
  const totalPar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
  const dateStr = format(new Date(round.createdAt), 'MMM d, yyyy');

  return (
    <header className="flex-shrink-0 relative z-10 pt-3 pb-4 px-4">
      {/* Corner Accents */}
      <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary/30" />
      <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary/20" />

      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3"
        >
          <Trophy className="w-7 h-7 text-primary-foreground" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1"
        >
          Round Complete
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-bold tracking-tight"
        >
          {round.courseName}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-2 mt-1 text-xs text-muted-foreground"
        >
          <span>{round.holes} holes</span>
          <span>•</span>
          <span>Par {totalPar}</span>
          <span>•</span>
          <span>{dateStr}</span>
        </motion.div>
      </div>
    </header>
  );
}
