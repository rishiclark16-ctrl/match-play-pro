import { useState, useRef, ReactNode, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || !containerRef.current) return;
    
    // Only allow pull when at the top
    if (containerRef.current.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance to the pull
      const resistance = 0.5;
      setPullDistance(Math.min(diff * resistance, PULL_THRESHOLD * 1.5));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  }, [pullDistance, isRefreshing, onRefresh]);

  const indicatorProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const indicatorRotation = indicatorProgress * 180;

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto overscroll-contain", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      {/* Pull indicator */}
      <motion.div 
        className="absolute left-0 right-0 top-0 flex items-center justify-center pointer-events-none z-10"
        style={{ 
          opacity: indicatorProgress,
          transform: `translateY(${pullDistance > 0 ? pullDistance - 40 : -40}px)`,
        }}
      >
        <motion.div
          className={cn(
            "w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center",
            isRefreshing && "bg-primary/20"
          )}
          style={{ 
            scale: 0.5 + indicatorProgress * 0.5,
          }}
        >
          <motion.div
            style={{ rotate: isRefreshing ? undefined : indicatorRotation }}
            className={isRefreshing ? "animate-spin" : ""}
          >
            <RefreshCw className="w-5 h-5 text-primary" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <div
        style={{ 
          transform: pullDistance > 0 || isRefreshing ? `translateY(${isRefreshing ? 60 : pullDistance}px)` : undefined,
          transition: !isPulling.current ? 'transform 0.3s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
