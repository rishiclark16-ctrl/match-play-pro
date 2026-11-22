import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';


/**
 * Fairway Day presentation primitives for the round-results screens.
 * Display only: nothing here computes money, it only formats and colours it.
 */

/** White card, radius 20, hairline border, no heavy shadow. */
export function ResultsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card rounded-[20px] border border-border overflow-hidden', className)}>
      {children}
    </div>
  );
}

/** Sentence-case section label: 12px / 600 / muted. */
export function SectionLabel({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between px-1 mb-2', className)}>
      <h2 className="text-[13px] font-semibold text-muted-foreground">{children}</h2>
      {right}
    </div>
  );
}

/** Small pill used for counts and statuses. */
export function Pill({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'forest' | 'lime' | 'owed';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[12px] font-semibold tabular-nums',
        tone === 'muted' && 'bg-muted text-foreground',
        tone === 'forest' && 'bg-primary text-primary-foreground',
        tone === 'lime' && 'bg-[#ECFCCB] text-[#14532D]',
        tone === 'owed' && 'bg-[#FEF3F2] text-[#B42318]',
      )}
    >
      {children}
    </span>
  );
}

/** Fade/slide-in wrapper shared by every results section. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 28 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/**
 * Collapsible section: a sentence-case header row (44px+ target) with an
 * optional right-hand summary, and its content below.
 */
export function CollapsibleResults({
  title,
  isOpen,
  onToggle,
  summary,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full min-h-[44px] flex items-center gap-2 px-1 mb-1"
      >
        <h2 className="text-[13px] font-semibold text-muted-foreground">{title}</h2>
        <span className="ml-auto flex items-center gap-2">
          {summary}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Initial avatar used in settlement and standings rows. */
export function InitialBadge({
  name,
  tone = 'muted',
  size = 36,
}: {
  name: string;
  tone?: 'muted' | 'forest' | 'lime';
  size?: number;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 text-[14px] font-bold',
        tone === 'muted' && 'bg-muted text-foreground',
        tone === 'forest' && 'bg-primary text-primary-foreground',
        tone === 'lime' && 'bg-[#BEF264] text-[#14532D]',
      )}
    >
      {(name.trim()[0] || '?').toUpperCase()}
    </span>
  );
}
