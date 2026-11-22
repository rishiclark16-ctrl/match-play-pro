import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

/** Slide-in wrapper for one onboarding step. */
export function OnboardingStep({ stepKey, children }: { stepKey: string; children: ReactNode }) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
      className="flex flex-col pt-2"
    >
      {children}
    </motion.div>
  );
}

/** "Step n of N" caption, title and supporting line. */
export function OnboardingIntro({ step, total, title, body }: { step: number; total: number; title: string; body: string }) {
  return (
    <div className="mb-7">
      <p className="text-[13px] font-semibold text-primary mb-2">Step {step} of {total}</p>
      <h1 className="text-[30px] font-extrabold tracking-[-0.02em] text-foreground leading-[1.1] mb-2.5">{title}</h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

/** Big white input card (radius 20, hairline) that turns Forest on focus. */
export function OnboardingField({ label, icon, hint, children }: { label: string; icon?: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block bg-card rounded-[20px] border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 px-5 pt-3.5 pb-4 transition-all">
        <span className="block text-[12px] font-semibold text-muted-foreground mb-1">{label}</span>
        <span className="flex items-center gap-3">
          {icon}
          {children}
        </span>
      </label>
      {hint && <p className="text-[13px] text-muted-foreground mt-2 ml-1">{hint}</p>}
    </div>
  );
}

/** Segmented progress bar: completed + current segments are Forest. */
export function OnboardingProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5 flex-1 max-w-[220px]" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', i <= current ? 'bg-primary' : 'bg-border')}
        />
      ))}
    </div>
  );
}

/** Text input styles for the big onboarding fields (bare input inside OnboardingField). */
export const onboardingInputClass =
  'w-full min-w-0 bg-transparent outline-none focus-visible:outline-none text-foreground font-extrabold tracking-[-0.01em] placeholder:text-muted-foreground/35 placeholder:font-bold';
