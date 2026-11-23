import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  className?: string;
  variant?: 'default' | 'scorecard' | 'list';
}

const pulse = 'animate-pulse';

/** Title row ghost: back button + page title, matching Fairway Day page headers. */
function HeaderGhost() {
  return (
    <div className="flex items-center gap-3 px-5 pt-safe-content pb-4">
      <div className={cn('w-11 h-11 rounded-full bg-muted', pulse)} />
      <div className={cn('h-6 w-36 rounded-full bg-muted', pulse)} />
    </div>
  );
}

/** White hairline row ghost (radius 20) with an avatar and two text lines. */
function RowGhost({ tall = false }: { tall?: boolean }) {
  return (
    <div className={cn('bg-card border border-border rounded-[20px] px-4 flex items-center gap-3', tall ? 'h-[76px]' : 'h-16')}>
      <div className={cn('w-10 h-10 rounded-full bg-muted', pulse)} />
      <div className="flex-1 space-y-2">
        <div className={cn('h-3.5 w-2/5 rounded-full bg-muted', pulse)} />
        <div className={cn('h-3 w-1/4 rounded-full bg-muted/70', pulse)} />
      </div>
    </div>
  );
}

export function PageSkeleton({ className, variant = 'default' }: PageSkeletonProps) {
  if (variant === 'scorecard') {
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        <HeaderGhost />
        <div className="px-5 space-y-2">
          {/* Forest hero ghost (hole number card) */}
          <div className={cn('h-40 rounded-[28px] bg-primary/15', pulse)} />
          <div className="pt-1.5 space-y-2">
            {[1, 2, 3, 4].map((i) => <RowGhost key={i} tall />)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        <HeaderGhost />
        <div className="px-5">
          <div className="flex gap-2 mb-4">
            {[64, 80, 56].map((w) => (
              <div key={w} className={cn('h-9 rounded-full bg-muted', pulse)} style={{ width: w }} />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <RowGhost key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <HeaderGhost />
      <div className="px-5 space-y-2">
        <div className={cn('h-32 rounded-[28px] bg-muted', pulse)} />
        <div className="pt-1.5 space-y-2">
          {[1, 2, 3].map((i) => <RowGhost key={i} />)}
        </div>
      </div>
    </div>
  );
}
