import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

type Step = 'mode' | 'course' | 'players' | 'format';
type RoundMode = 'solo' | 'multi';

interface NewRoundBottomCtaProps {
  step: Step;
  mode: RoundMode;
  isCreating: boolean;
  isFinalStep: boolean;
  /** Submit handlers for the two terminal CTAs (solo step or final step). */
  handlers: {
    onStartSoloRound: () => void;
    onStartRound: () => void;
    onNext: () => void;
  };
  /** Disabled flags for each CTA — page owns the validation logic. */
  disabled: {
    next: boolean;
    startSolo: boolean;
    startRound: boolean;
  };
}

/**
 * Sticky bottom CTA bar shown on every step after `mode`. Picks the right button:
 *   - Solo course step → "Start Solo Round"
 *   - Final step       → "Start Round"
 *   - Otherwise        → "Next"
 */
export function NewRoundBottomCta({
  step,
  mode,
  isCreating,
  isFinalStep,
  handlers,
  disabled,
}: NewRoundBottomCtaProps) {
  if (step === 'mode') return null;

  const isSoloCourse = mode === 'solo' && step === 'course';
  const buttonClass = 'w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] flex items-center justify-center gap-2';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-[rgba(0,0,0,0.06)] bg-background px-6 py-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {isSoloCourse ? (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handlers.onStartSoloRound}
          disabled={disabled.startSolo}
          animate={{ opacity: disabled.startSolo ? 0.4 : 1 }}
          transition={{ duration: 0.2 }}
          className={buttonClass}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Starting Solo Round...
            </>
          ) : (
            'Start Solo Round'
          )}
        </motion.button>
      ) : !isFinalStep ? (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handlers.onNext}
          disabled={disabled.next}
          animate={{ opacity: disabled.next ? 0.4 : 1 }}
          transition={{ duration: 0.2 }}
          className={buttonClass}
        >
          Next
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handlers.onStartRound}
          disabled={disabled.startRound}
          animate={{ opacity: disabled.startRound ? 0.4 : 1 }}
          transition={{ duration: 0.2 }}
          className={buttonClass}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Round...
            </>
          ) : (
            'Start Round'
          )}
        </motion.button>
      )}
    </div>
  );
}
