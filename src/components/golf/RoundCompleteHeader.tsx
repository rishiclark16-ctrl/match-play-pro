import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { Round } from '@/types/golf';

interface RoundCompleteHeaderProps {
  round: Round;
}

export function RoundCompleteHeader({ round }: RoundCompleteHeaderProps) {
  const totalPar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
  const dateStr = format(new Date(round.createdAt), 'MMM d, yyyy');
  const navigate = useNavigate();

  return (
    <header className="flex-shrink-0 relative z-10 pt-safe-content pb-3 px-5 flex items-start gap-3">
      <div className="flex-1 min-w-0">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#14532D]"
      >
        <span className="w-2 h-2 rounded-full bg-[#BEF264] ring-2 ring-[#14532D]/15" aria-hidden />
        Round complete
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[28px] font-extrabold tracking-[-0.02em] leading-tight text-foreground mt-1 truncate"
      >
        {round.courseName}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-[13px] text-muted-foreground mt-0.5"
      >
        {round.holes} holes · Par {totalPar} · {dateStr}
      </motion.p>
      </div>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          hapticLight();
          navigate('/');
        }}
        aria-label="Home"
        className="w-11 h-11 mt-1 rounded-full bg-card border border-border flex items-center justify-center shrink-0"
      >
        <Home className="w-5 h-5 text-foreground" />
      </motion.button>
    </header>
  );
}
