import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeActionRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  ariaLabel: string;
  /** Lime icon tile (the highlight). Default is a muted tile. */
  highlight?: boolean;
  className?: string;
}

/** White radius-20 row with a 44px icon tile, title, caption and chevron. */
export function HomeActionRow({ icon, title, subtitle, onClick, ariaLabel, highlight, className }: HomeActionRowProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'w-full min-h-[68px] rounded-[20px] border border-border bg-card px-3.5 py-3 flex items-center gap-3 text-left touch-manipulation cursor-pointer select-none',
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className={cn(
          'h-11 w-11 flex-shrink-0 rounded-[14px] flex items-center justify-center',
          highlight ? 'bg-gold text-gold-foreground' : 'bg-muted text-primary'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight text-foreground">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[13px] text-muted-foreground truncate">{subtitle}</span>}
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </motion.button>
  );
}
