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
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center',
        highlighted
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card',
        selected && 'border-primary ring-2 ring-primary/20',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:border-primary/50'
      )}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-success text-success-foreground text-[10px] font-bold uppercase tracking-wide rounded-full whitespace-nowrap">
          {badge}
        </span>
      )}

      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* Content */}
      <span className="text-sm font-semibold text-muted-foreground mb-1">{title}</span>
      <span className="text-2xl font-bold text-foreground">{price}</span>
      <span className="text-xs text-muted-foreground">/{period}</span>
    </motion.button>
  );
}
