// Typography utility classes for consistent text styling across MATCH
export const typography = {
  // Headings
  h1: 'text-3xl font-bold tracking-tight text-foreground',
  h2: 'text-2xl font-semibold tracking-tight text-foreground',
  h3: 'text-xl font-semibold text-foreground',
  h4: 'text-lg font-medium text-foreground',
  
  // Body text
  body: 'text-base text-foreground',
  bodySmall: 'text-sm text-muted-foreground',
  caption: 'text-xs text-muted-foreground',
  
  // Labels
  label: 'text-sm font-medium text-muted-foreground uppercase tracking-wide',
  
  // Scores (always tabular-nums for alignment)
  score: 'text-2xl font-semibold tabular-nums',
  scoreLarge: 'text-5xl font-bold tabular-nums text-primary',
  scoreXL: 'text-4xl font-bold tabular-nums',
} as const;

export type TypographyVariant = keyof typeof typography;
