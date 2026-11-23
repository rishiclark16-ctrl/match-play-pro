/** Fairway Day class constants for round setup + AI Game Builder. See docs/design/fairway-day.md. */

export const fdSpring = { type: 'spring' as const, stiffness: 300, damping: 28 };

/** On-forest secondary text. */
export const onForestMuted = 'text-[#CFE3D6]';

/** 12px/600 muted sentence-case label. */
export const fdLabel = 'text-[12px] font-semibold text-muted-foreground';

/** White radius-20 row/card with a hairline border. */
export const fdCard = 'bg-card rounded-[20px] border border-border';

/** Ink 60px primary CTA. */
export const fdPrimaryCta =
  'w-full h-[60px] rounded-[20px] bg-ink text-white text-[16px] font-bold tracking-[-0.01em] flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity';

/** Text-style input on a muted fill, 48px tall, 16px text (no iOS zoom). */
export const fdInput =
  'w-full h-12 rounded-[14px] bg-muted px-4 text-[16px] font-semibold text-foreground placeholder:text-muted-foreground/70 placeholder:font-normal outline-none focus-visible:outline-none border-2 border-transparent focus:border-primary/40 transition-colors';
