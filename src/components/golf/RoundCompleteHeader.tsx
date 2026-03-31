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
    <header className="flex-shrink-0 relative z-10 pt-safe-content pb-4 px-4">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, y: [0, -4, 0] }}
          transition={{
            scale: { type: 'spring', stiffness: 300, delay: 0.1 },
            y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
          }}
          className="w-16 h-16 rounded-2xl bg-[#F0EE3A] flex items-center justify-center mx-auto mb-3"
        >
          <Trophy className="w-8 h-8 text-[#0A0A0A]" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#F0EE3A] mb-1"
        >
          Round Complete
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[22px] font-black tracking-[-0.04em] text-foreground text-center"
        >
          {round.courseName}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-2 mt-1 text-[12px] text-muted-foreground text-center"
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
