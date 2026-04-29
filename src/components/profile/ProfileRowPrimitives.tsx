import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Row layout primitives shared across Profile.tsx and any future
 * settings-style screens. Kept presentation-only — no domain logic.
 */

export function RowLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-[14px] font-medium text-foreground', className)}>{children}</span>;
}

export function Row({ children, last, onClick }: { children: React.ReactNode; last?: boolean; onClick?: () => void }) {
  if (onClick) {
    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          'w-full px-5 py-4 flex items-center justify-between gap-4 text-left',
          !last && 'border-b border-border/30',
        )}
      >
        {children}
      </motion.button>
    );
  }
  return (
    <div className={cn('px-5 py-4 flex items-center justify-between gap-4', !last && 'border-b border-border/30')}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-1 mb-2 mt-5 first:mt-0">
      {children}
    </p>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]', className)}>
      {children}
    </div>
  );
}
