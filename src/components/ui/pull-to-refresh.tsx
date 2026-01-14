import { useState, useRef, ReactNode, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 60;

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pull if scrolled to top
    if (scrollRef.current && scrollRef.current.scrollTop <= 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || !scrollRef.current || isRefreshing) return;
    
    // Cancel pull if user scrolled down
    if (scrollRef.current.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance
      const resistance = 0.4;
      const newDistance = Math.min(diff * resistance, PULL_THRESHOLD * 1.5);
      setPullDistance(newDistance);
      
      // Prevent default scroll when pulling
      if (newDistance > 5) {
        e.preventDefault();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD); // Keep indicator visible
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const indicatorProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div 
      ref={scrollRef}
      className={cn("h-full overflow-y-auto overscroll-y-contain", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="flex items-center justify-center pointer-events-none"
          style={{ 
            height: pullDistance,
            transition: isPulling.current ? 'none' : 'height 0.2s ease-out',
          }}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center",
              isRefreshing && "bg-primary/20"
            )}
            style={{ 
              opacity: indicatorProgress,
              transform: `scale(${0.5 + indicatorProgress * 0.5})`,
            }}
          >
            <RefreshCw 
              className={cn("w-4 h-4 text-primary", isRefreshing && "animate-spin")}
              style={{ 
                transform: isRefreshing ? undefined : `rotate(${indicatorProgress * 180}deg)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}
