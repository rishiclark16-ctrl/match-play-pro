import { cn } from '@/lib/utils';

export type ScoreMarkKind = 'eagle' | 'birdie' | 'par' | 'bogey' | 'double';

/**
 * Golf scorecard mark (Fairway Day): birdie or better = circle (Forest
 * border, lime-tint fill; eagle gets a second ring), bogey or worse = rounded
 * square (Ink border; double+ gets a second square), par = no mark.
 */
export function ScoreMark({
  kind,
  children,
  size = 30,
  className,
}: {
  kind: ScoreMarkKind;
  children?: React.ReactNode;
  size?: number;
  className?: string;
}) {
  const inner = (
    <span
      className={cn(
        'flex items-center justify-center font-extrabold tabular-nums leading-none text-foreground',
        (kind === 'eagle' || kind === 'birdie') && 'rounded-full border-2 border-[#14532D] bg-[#ECFCCB] text-[#14532D]',
        (kind === 'bogey' || kind === 'double') && 'rounded-[8px] border-2 border-foreground bg-card',
      )}
      style={{
        width: kind === 'eagle' || kind === 'double' ? size - 8 : size,
        height: kind === 'eagle' || kind === 'double' ? size - 8 : size,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {children}
    </span>
  );

  if (kind === 'eagle' || kind === 'double') {
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
