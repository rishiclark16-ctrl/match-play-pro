import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface DashboardTabBarProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function DashboardTabBar({ tabs, activeIndex, onChange }: DashboardTabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const btn = buttonRefs.current[activeIndex];
    if (btn && scrollRef.current) {
      const container = scrollRef.current;
      const left = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeIndex]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide bg-[#F8F8F6] border-b border-border/30"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {tabs.map((tab, i) => (
        <button
          key={tab}
          ref={(el) => { buttonRefs.current[i] = el; }}
          onClick={() => { hapticLight(); onChange(i); }}
          className={cn(
            'relative px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors flex-shrink-0',
            activeIndex === i
              ? 'text-white'
              : 'text-muted-foreground'
          )}
        >
          {activeIndex === i && (
            <motion.div
              layoutId="dashboard-tab"
              className="absolute inset-0 bg-foreground rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  );
}
