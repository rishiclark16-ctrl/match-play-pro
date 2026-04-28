import { cn } from '@/lib/utils';

/**
 * Shared visual primitives used by `FormatStep` and its extracted per-game
 * sections. Keeps the component split decoupled from inline-style duplication.
 */

export const springTransition = { type: 'spring', stiffness: 300, damping: 28 };

export const sectionLabel =
  'text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 mt-5';

export const gameCardBase =
  'bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4 mb-2 cursor-pointer w-full text-left';

export const gameCardSelected = 'ring-2 ring-foreground';

export const iconBoxClass = (active: boolean, locked?: boolean) =>
  cn(
    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
    active && !locked
      ? 'bg-foreground'
      : locked
      ? 'bg-muted'
      : 'bg-muted'
  );

export const iconClass = (active: boolean, locked?: boolean) =>
  cn(
    'w-4 h-4',
    active && !locked ? 'text-white' : locked ? 'text-muted-foreground' : 'text-foreground'
  );
