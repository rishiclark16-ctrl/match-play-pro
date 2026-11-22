import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  /** Small caption above the title, e.g. "MATCH Golf" */
  eyebrow?: string;
  onBack: () => void;
  /** Optional element on the right, e.g. an action button */
  trailing?: ReactNode;
}

/** Fairway Day page title bar: 44px back button + 28px/800 title on the ground colour. */
export function PageHeader({ title, eyebrow, onBack, trailing }: PageHeaderProps) {
  return (
    <header className="shrink-0 px-5 pt-safe-content pb-3 bg-background">
      <div className="flex items-center gap-3 min-h-[56px]">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        <div className="flex-1 min-w-0">
          {eyebrow && <p className="text-[12px] font-semibold text-muted-foreground leading-tight">{eyebrow}</p>}
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-foreground leading-tight truncate">{title}</h1>
        </div>
        {trailing}
      </div>
    </header>
  );
}
