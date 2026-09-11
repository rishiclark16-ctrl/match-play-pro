import { motion } from 'framer-motion';
import { ChevronRight, Target, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

type RoundMode = 'solo' | 'multi';

interface NewRoundModeStepProps {
  /** Called with the chosen mode after the user taps a card. Page handles step advance. */
  onSelect: (mode: RoundMode) => void;
}

/**
 * The first step of New Round — "How do you want to play today?".
 * Two cards: With Others (multi) and Solo. Triggers `hapticLight()` on tap and
 * calls `onSelect` so the page decides what to do with the choice.
 */
export function NewRoundModeStep({ onSelect }: NewRoundModeStepProps) {
  return (
    <motion.div
      key="mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="pt-4 space-y-3"
    >
      <p className="text-[13px] text-muted-foreground mb-1 px-1">
        How do you want to play today?
      </p>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { hapticLight(); onSelect('multi'); }}
        className={cn(
          'w-full rounded-2xl border-2 px-4 py-5 flex items-center gap-4 text-left transition-colors',
          'bg-[#0A0A0A] border-[#0A0A0A]'
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-[#F0EE3A] flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-[#0A0A0A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white">With Others</p>
          <p className="text-[12px] text-white/60 leading-snug">
            Scoring, betting games, match play
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { hapticLight(); onSelect('solo'); }}
        className={cn(
          'w-full rounded-2xl border-2 px-4 py-5 flex items-center gap-4 text-left transition-colors',
          'bg-white border-border/40'
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-foreground">Solo</p>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Track just your stats — no bets, no teams
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </motion.button>
    </motion.div>
  );
}
