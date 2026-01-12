import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  className?: string;
  variant?: 'default' | 'scorecard' | 'list';
}

export function PageSkeleton({ className, variant = 'default' }: PageSkeletonProps) {
  if (variant === 'scorecard') {
    return (
      <div className={cn("min-h-screen bg-background animate-pulse", className)}>
        {/* Header skeleton */}
        <div className="pt-12 pb-4 px-6">
          <div className="h-8 bg-muted rounded-lg w-1/2 mx-auto" />
        </div>
        
        {/* Hole navigator skeleton */}
        <div className="px-6 py-4">
          <div className="h-16 bg-muted rounded-xl" />
        </div>
        
        {/* Player cards skeleton */}
        <div className="px-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn("min-h-screen bg-background animate-pulse", className)}>
        {/* Header skeleton */}
        <div className="pt-12 pb-6 px-6">
          <div className="h-10 bg-muted rounded-lg w-32" />
        </div>
        
        {/* List items skeleton */}
        <div className="px-6 space-y-3">
          <div className="h-5 bg-muted rounded w-28 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("min-h-screen bg-background animate-pulse p-6", className)}>
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded-lg w-1/2" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
