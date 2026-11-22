import { cn } from '@/lib/utils';

type ScoreMarkSize = 'lg' | 'md' | 'sm';

interface ScoreMarkProps {
  /** Gross strokes; undefined renders the "not entered" dash. */
  strokes?: number;
  par: number;
  size?: ScoreMarkSize;
  className?: string;
}

const BOX: Record<ScoreMarkSize, string> = {
  lg: 'w-[46px] h-[46px] text-[28px] font-extrabold',
  md: 'w-8 h-8 text-[16px] font-extrabold',
  sm: 'w-6 h-6 text-[12px] font-bold',
};

const RADIUS_SQUARE: Record<ScoreMarkSize, string> = {
  lg: 'rounded-[12px]',
  md: 'rounded-[9px]',
  sm: 'rounded-[6px]',
};

// Second outline for eagle-or-better / double-or-worse, drawn with a box-shadow
// so the mark keeps its footprint.
const DOUBLE_FOREST = '0 0 0 2px #FFFFFF, 0 0 0 4px #14532D';
const DOUBLE_INK = '0 0 0 2px #FFFFFF, 0 0 0 4px #0F1F17';

/**
 * Golf scorecard mark (Fairway Day, board 08):
 * - birdie or better: circle, Forest 2px border, lime-tint fill (eagle: double circle)
 * - par: bare numeral
 * - bogey or worse: rounded square, Ink 2px border (double+: double square)
 * - not entered: muted dash
 */
export function ScoreMark({ strokes, par, size = 'lg', className }: ScoreMarkProps) {
  const base = cn('inline-flex items-center justify-center tabular-nums leading-none shrink-0', BOX[size], className);

  if (strokes === undefined) {
    return (
      <span className={cn(base, 'text-[#B4BDB7]')} aria-hidden="true">
        –
      </span>
    );
  }

  const diff = strokes - par;

  if (diff <= -1) {
    return (
      <span
        className={cn(base, 'rounded-full border-2 border-[#14532D] bg-[#ECFCCB] text-[#14532D]')}
        style={diff <= -2 ? { boxShadow: DOUBLE_FOREST } : undefined}
      >
        {strokes}
      </span>
    );
  }

  if (diff === 0) {
    return <span className={cn(base, 'text-[#0F1F17]')}>{strokes}</span>;
  }

  return (
    <span
      className={cn(base, RADIUS_SQUARE[size], 'border-2 border-[#0F1F17] text-[#0F1F17]')}
      style={diff >= 2 ? { boxShadow: DOUBLE_INK } : undefined}
    >
      {strokes}
    </span>
  );
}

/** Sentence-case name for a score relative to par ("Birdie", "Double bogey"). */
export function scoreName(strokes: number, par: number): string {
  const diff = strokes - par;
  if (strokes === 1) return 'Hole in one';
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double bogey';
  if (diff === 3) return 'Triple bogey';
  return `+${diff}`;
}
