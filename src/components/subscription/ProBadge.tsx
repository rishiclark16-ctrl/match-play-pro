import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface ProBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
}

export function ProBadge({ className, size = 'sm', variant = 'default' }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const variantClasses = {
    default: 'bg-gold text-gold-foreground',
    subtle: 'bg-gold/10 text-gold border border-gold/20',
    outline: 'bg-transparent text-gold border border-gold/40',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase tracking-wider rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Crown className={iconSizes[size]} />
      PRO
    </span>
  );
}
