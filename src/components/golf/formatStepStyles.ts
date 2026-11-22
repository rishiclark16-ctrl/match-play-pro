import { cn } from '@/lib/utils';

/**
 * Shared visual primitives used by `FormatStep` and its extracted per-game
 * sections (Fairway Day: white radius-20 rows, hairline borders, Forest active).
 */

export const springTransition = { type: 'spring' as const, stiffness: 300, damping: 28 };

export const sectionLabel =
  'text-[13px] font-semibold text-muted-foreground mb-2 mt-6 px-1';

export const gameCardBase =
  'bg-card rounded-[20px] border border-border p-4 mb-2 cursor-pointer w-full text-left transition-colors';

export const gameCardSelected = 'border-primary ring-1 ring-primary';

/** Expanded options panel inside a selected game card. */
export const gameDetailPanel = 'pt-3 mt-3 border-t border-border space-y-2';

/** "$ [5] per hole" stake row. */
export const stakeRow = 'flex items-center gap-2.5';
export const stakeCurrency = 'text-[16px] font-bold text-foreground';
export const stakeInput =
  'w-24 h-11 text-center text-[16px] font-bold tabular-nums bg-muted rounded-[14px] border-0 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0';
export const stakeSuffix = 'text-[14px] text-muted-foreground';

/** Checkbox option row (44px touch target). */
export const optionRow = 'flex items-center gap-3 min-h-[44px] text-[14px] text-foreground';
export const optionCheckbox = 'w-5 h-5 rounded-[6px] border-border data-[state=checked]:border-primary';

/** Short rules summary (e.g. "Lone wolf: 3x · Blind wolf: 6x"). */
export const ruleNote = 'text-[13px] text-muted-foreground bg-muted px-3 py-2.5 rounded-[14px] leading-snug';

/** Team boxes (Best Ball / Fourball). */
export const teamBoxA = 'p-3 rounded-[14px] bg-primary/[0.06] border border-primary/25';
export const teamBoxB = 'p-3 rounded-[14px] bg-muted border border-border';
export const teamLabelA = 'text-[12px] font-semibold text-primary';
export const teamLabelB = 'text-[12px] font-semibold text-muted-foreground';

export const iconBoxClass = (active: boolean, locked?: boolean) =>
  cn(
    'w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-colors',
    active && !locked ? 'bg-primary' : 'bg-muted'
  );

export const iconClass = (active: boolean, locked?: boolean) =>
  cn(
    'w-5 h-5',
    active && !locked ? 'text-gold' : locked ? 'text-muted-foreground' : 'text-foreground'
  );
