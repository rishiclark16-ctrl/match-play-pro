import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  className?: string;
  variant?: 'default' | 'scorecard' | 'list';
}

export function PageSkeleton({ className, variant = 'default' }: PageSkeletonProps) {
  if (variant === 'scorecard') {
    return (
      <div className={cn("min-h-screen bg-[#F8F8F6]", className)}>
        {/* Header skeleton */}
        <div className="h-[60px] border-b-2 border-foreground flex items-center px-6 gap-4">
          <div className="w-9 h-9 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-5 w-32 rounded-xl bg-muted/60 animate-pulse" />
        </div>

        {/* Hole navigator skeleton */}
        <div className="px-6 py-4">
          <div className="bg-muted/40 rounded-2xl h-16 animate-pulse" />
        </div>

        {/* Player cards skeleton */}
        <div className="space-y-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted/40 rounded-2xl h-16 mx-6 mb-3 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn("min-h-screen bg-[#F8F8F6]", className)}>
        {/* Header skeleton */}
        <div className="h-[60px] border-b-2 border-foreground flex items-center px-6 gap-4">
          <div className="w-9 h-9 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-5 w-32 rounded-xl bg-muted/60 animate-pulse" />
        </div>

        {/* Section label ghost */}
        <div className="px-6 pt-5 pb-3">
          <div className="h-3 w-20 rounded-xl bg-muted/60 animate-pulse" />
        </div>

        {/* List card ghosts */}
        <div className="space-y-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-muted/40 rounded-2xl h-16 mx-6 mb-3 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("min-h-screen bg-[#F8F8F6] p-6", className)}>
      {/* Header ghost */}
      <div className="h-[60px] border-b-2 border-foreground flex items-center gap-4 -mx-6 px-6 mb-6">
        <div className="w-9 h-9 rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-5 w-32 rounded-xl bg-muted/60 animate-pulse" />
      </div>

      {/* Content card ghosts */}
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/40 rounded-2xl h-16 mb-3 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
