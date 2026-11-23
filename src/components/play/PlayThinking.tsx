import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Reading your round', 'Finding the course', 'Matching your group', 'Setting the games'];

/** Shown while the sentence becomes a draft (usually 2–5 seconds). */
export function PlayThinking({ text }: { text: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex-1 px-5 pt-4" role="status" aria-live="polite">
      <div className="rounded-[20px] bg-card border border-border px-4 py-4">
        <p className="text-[12px] font-semibold text-muted-foreground">You said</p>
        <p className="mt-1 text-[17px] font-semibold leading-snug text-foreground">“{text}”</p>
      </div>
      <ul className="mt-6 space-y-3.5">
        {STEPS.map((label, i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: i <= step ? 1 : 0.35, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3"
          >
            <span className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center',
              i < step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              {i < step ? <Check className="h-4 w-4" strokeWidth={3} /> : i === step ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            </span>
            <span className="text-[16px] font-semibold text-foreground">{label}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
