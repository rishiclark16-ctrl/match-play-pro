import { cn } from '@/lib/utils';

/**
 * Golf scorecard marks (Fairway Day, board 08) — the one shared implementation.
 * - birdie or better: circle, Forest 2px border, lime-tint fill (eagle+: double circle)
 * - par: bare numeral
 * - bogey or worse: rounded square, Ink 2px border (double+: double square)
 * - not entered: muted dash
 */
import { scoreMarkKind, type ScoreMarkKind } from '@/lib/scoreMarks';

export type { ScoreMarkKind };

interface ShapeProps {
  kind: ScoreMarkKind;
  children?: React.ReactNode;
  /** Outer size in px. */
  size?: number;
  /** Numeral size in px; defaults to ~42% of size. */
  fontSize?: number;
  className?: string;
}

/** Draws the mark shape around any content (a numeral, or a legend glyph). */
export function ScoreMarkShape({ kind, children, size = 30, fontSize, className }: ShapeProps) {
  const doubled = kind === 'eagle' || kind === 'double';
  const innerSize = doubled ? size - 8 : size;
  const inner = (
    <span
      className={cn(
        'flex items-center justify-center font-extrabold tabular-nums leading-none text-foreground',
        (kind === 'eagle' || kind === 'birdie') && 'rounded-full border-2 border-[#14532D] bg-[#ECFCCB] text-[#14532D]',
        (kind === 'bogey' || kind === 'double') && 'rounded-[8px] border-2 border-foreground bg-card',
      )}
      style={{ width: innerSize, height: innerSize, fontSize: fontSize ?? Math.round(size * 0.42) }}
    >
      {children}
    </span>
  );

  if (doubled) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center shrink-0 border-2',
          kind === 'eagle' ? 'rounded-full border-[#14532D]' : 'rounded-[10px] border-foreground',
          className,
        )}
        style={{ width: size, height: size }}
      >
        {inner}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center justify-center shrink-0', className)} style={{ width: size, height: size }}>
      {inner}
    </span>
  );
}

type ScoreMarkSize = 'lg' | 'md' | 'sm';
const SIZES: Record<ScoreMarkSize, { box: number; font: number }> = {
  lg: { box: 46, font: 28 },
  md: { box: 32, font: 16 },
  sm: { box: 24, font: 12 },
};

interface ScoreMarkProps {
  /** Gross strokes; undefined renders the "not entered" dash. */
  strokes?: number;
  par: number;
  size?: ScoreMarkSize;
  className?: string;
}

/** A score on a hole, marked by its relation to par. */
export function ScoreMark({ strokes, par, size = 'lg', className }: ScoreMarkProps) {
  const { box, font } = SIZES[size];
  if (strokes === undefined) {
    return (
      <span
        className={cn('inline-flex items-center justify-center shrink-0 leading-none text-[#B4BDB7]', className)}
        style={{ width: box, height: box, fontSize: font }}
        aria-hidden="true"
      >
        –
      </span>
    );
  }
  return (
    <ScoreMarkShape kind={scoreMarkKind(strokes - par)} size={box} fontSize={font} className={className}>
      {strokes}
    </ScoreMarkShape>
  );
}
