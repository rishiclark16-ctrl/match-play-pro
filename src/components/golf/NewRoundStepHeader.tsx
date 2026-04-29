import { motion } from 'framer-motion';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewRoundStepHeaderProps<TStep extends string> {
  steps: TStep[];
  step: TStep;
  /** Title + icon per step. Icon currently unused in the rendered header but kept for future use. */
  stepConfig: Record<TStep, { title: string; icon: LucideIcon }>;
  /** Called when the back button is tapped. Page decides whether to go back a step or navigate home. */
  onBack: () => void;
}

/**
 * Fixed step-progress header for the New Round flow.
 * Renders: back button, "Step N of M" caption, current step title, and a segmented progress bar.
 */
export function NewRoundStepHeader<TStep extends string>({
  steps,
  step,
  stepConfig,
  onBack,
}: NewRoundStepHeaderProps<TStep>) {
  const currentStepIndex = steps.indexOf(step);

  return (
    <header className="flex-shrink-0 relative z-10 px-6 pb-3 pt-safe-content border-b-2 border-foreground">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>

        <div className="flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
          <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">
            {stepConfig[step].title}
          </h1>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-[3px] mt-2">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            className={cn(
              'h-[3px] flex-1 rounded-full',
              i < currentStepIndex
                ? 'bg-foreground'
                : i === currentStepIndex
                  ? 'bg-foreground/35'
                  : 'bg-border'
            )}
            initial={i < currentStepIndex ? { scaleX: 0 } : false}
            animate={i < currentStepIndex ? { scaleX: 1 } : {}}
            style={{ transformOrigin: 'left' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          />
        ))}
      </div>
    </header>
  );
}
