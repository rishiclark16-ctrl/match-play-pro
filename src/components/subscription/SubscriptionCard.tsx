import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionCardProps {
  title: string;
  price: string;
  period: string;
  badge?: string;
  highlighted?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function SubscriptionCard({
  title,
  price,
  period,
  badge,
  highlighted = false,
  selected = false,
  disabled = false,
  onSelect,
}: SubscriptionCardProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center p-4 rounded-[20px] transition-all text-center bg-card',
        selected
          ? 'border-2 border-primary'
          : 'border border-border m-px',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-gold-foreground text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap">
          {badge}
        </span>
      )}

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Content */}
      <span className="font-semibold text-[14px] text-muted-foreground mb-1">{title}</span>
      <span className="font-extrabold text-[24px] tracking-[-0.02em] text-foreground tabular-nums">{price}</span>
      <span className="text-[12px] text-muted-foreground">/{period}</span>
    </motion.button>
  );
}
