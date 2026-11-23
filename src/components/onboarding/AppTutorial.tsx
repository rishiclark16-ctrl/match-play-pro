import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    emoji: '👋',
    title: 'Welcome to MATCH',
    body: "The scoring app for golfers who play for something. Here's a quick tour — takes 30 seconds.",
  },
  {
    emoji: '⛳',
    title: 'Start a round',
    body: 'Tap the + button to pick your course, add your crew, and choose your games. Everything is set up in under a minute.',
  },
  {
    emoji: '🎙️',
    title: 'Voice scoring',
    body: 'On any hole, tap the mic and say the score — "birdie" or "5". Hands-free scoring, every hole.',
  },
  {
    emoji: '💰',
    title: 'Every game, automatic',
    body: 'Nassau, Skins, Wolf, Match Play — all tracked at once. Auto-presses fire themselves. Nothing to manage.',
  },
  {
    emoji: '🤝',
    title: 'Settle up instantly',
    body: 'Walk off 18 and MATCH shows exactly who owes who. One tap to settle. No math, no arguments.',
  },
  {
    emoji: '👥',
    title: 'Save your crew',
    body: 'Create a Golf Group for your regular game. Save your house rules and they load automatically every round.',
  },
];

interface AppTutorialProps {
  onDone: () => void;
}

export function AppTutorial({ onDone }: AppTutorialProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    hapticLight();
    if (isLast) {
      hapticSuccess();
      onDone();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/60 backdrop-blur-sm pb-10"
    >
      {/* Dismiss button */}
      <div className="absolute top-0 right-5 pt-safe-content">
        <button
          onClick={() => { hapticLight(); onDone(); }}
          aria-label="Close tour"
          className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="px-5 pb-safe">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="bg-card rounded-[28px] p-6 mb-3 shadow-[0_24px_64px_rgba(15,31,23,0.25)]"
          >
            {/* Emoji */}
            <div className="w-14 h-14 rounded-[20px] bg-muted flex items-center justify-center text-[28px] mb-5">
              {current.emoji}
            </div>

            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-foreground mb-2 leading-tight">
              {current.title}
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              {current.body}
            </p>

            {/* Progress dots */}
            <div className="flex gap-1.5 mt-5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === step
                      ? 'bg-primary w-6'
                      : i < step
                      ? 'bg-primary/35 w-2'
                      : 'bg-border w-2'
                  )}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="w-full bg-ink text-ink-foreground rounded-[20px] h-[60px] font-bold text-[16px] flex items-center justify-center"
        >
          {isLast ? "Let's Play! ⛳" : 'Next'}
        </motion.button>
      </div>
    </motion.div>
  );
}
