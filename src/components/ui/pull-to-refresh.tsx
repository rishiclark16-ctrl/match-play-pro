import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  
  const pullProgress = useTransform(y, [0, PULL_THRESHOLD], [0, 1]);
  const indicatorOpacity = useTransform(y, [0, 40, PULL_THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1]);
  const indicatorRotation = useTransform(y, [0, PULL_THRESHOLD * 2], [0, 360]);

  const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const canPull = () => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  };

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Pull indicator */}
      <motion.div 
        className="absolute left-0 right-0 top-0 flex items-center justify-center pointer-events-none z-10"
        style={{ 
          opacity: indicatorOpacity,
          y: useTransform(y, [0, PULL_THRESHOLD], [-40, 20])
        }}
      >
        <motion.div
          className={cn(
            "w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center",
            isRefreshing && "bg-primary/20"
          )}
          style={{ scale: indicatorScale }}
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
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDrag={(_, info) => {
          if (canPull() && info.offset.y > 0) {
            y.set(info.offset.y);
          }
        }}
        onDragEnd={(e, info) => {
          if (canPull() && info.offset.y > 0) {
            handleDragEnd(e, info);
          }
          y.set(0);
        }}
        style={{ y: isRefreshing ? 60 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}