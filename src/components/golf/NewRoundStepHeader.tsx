import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackButton } from './setupUi';

interface NewRoundStepHeaderProps<TStep extends string> {
  steps: TStep[];
  step: TStep;
  /** Title + icon per step. Icon currently unused in the rendered header but kept for future use. */
  stepConfig: Record<TStep, { title: string; icon: LucideIcon }>;
  /** Called when the back button is tapped. Page decides whether to go back a step or navigate home. */
  onBack: () => void;
}

/**
 * Fixed step-progress header for the New Round flow (Fairway Day).
 * Back button, current step title with "Step N of M", and a segmented Forest progress bar.
 * The step's big headline lives in the Forest hero card inside each step.
 */
export function NewRoundStepHeader<TStep extends string>({
  steps,
  step,
  stepConfig,
  onBack,
}: NewRoundStepHeaderProps<TStep>) {
  const currentStepIndex = steps.indexOf(step);

  return (
    <header className="flex-shrink-0 relative z-10 bg-background px-5 pb-3 pt-safe-content">
      <div className="flex items-center gap-3 min-h-[44px]">
        <BackButton onClick={onBack} label={currentStepIndex > 0 ? 'Previous step' : 'Close'} />
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-extrabold tracking-[-0.02em] leading-tight text-foreground truncate">
            {stepConfig[step].title}
          </h1>
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground tabular-nums flex-shrink-0">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mt-3" aria-hidden>
        {steps.map((s, i) => (
          <div key={s} className="h-1 flex-1 rounded-full bg-border overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', i <= currentStepIndex ? 'bg-primary' : 'bg-transparent')}
              initial={false}
              animate={{ scaleX: i <= currentStepIndex ? 1 : 0 }}
              style={{ transformOrigin: 'left' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        ))}
      </div>
    </header>
  );
}
