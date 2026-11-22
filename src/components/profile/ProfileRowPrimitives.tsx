import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Row layout primitives shared across Profile.tsx and any future
 * settings-style screens. Kept presentation-only — no domain logic.
 *
 * Fairway Day: white radius-20 cards with hairline borders, 56px rows,
 * sentence-case 12px/600 muted section labels.
 */

export function RowLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-[15px] font-semibold text-foreground', className)}>{children}</span>;
}

export function Row({ children, last, onClick }: { children: React.ReactNode; last?: boolean; onClick?: () => void }) {
  const base = 'w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-4';
  const divider = !last && 'border-b border-border';
  if (onClick) {
    return (
      <motion.button
        whileTap={{ scale: 0.985 }}
        onClick={onClick}
        className={cn(base, 'text-left active:bg-muted/60 transition-colors', divider)}
      >
        {children}
      </motion.button>
    );
  }
  return <div className={cn(base, divider)}>{children}</div>;
}

/** Title + caption stack used on the left side of toggle rows. */
export function RowText({ title, caption }: { title: React.ReactNode; caption?: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      {caption && <p className="text-[12px] text-muted-foreground mt-0.5">{caption}</p>}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-semibold text-muted-foreground px-1 mb-2 mt-1">
      {children}
    </p>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card border border-border rounded-[20px] overflow-hidden', className)}>
      {children}
    </div>
  );
}
