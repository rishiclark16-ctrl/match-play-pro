import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface ProBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'outline';
}

export function ProBadge({ className, size = 'sm', variant = 'default' }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const variantClasses = {
    default: 'bg-[#BEF264] text-[#0F1F17]',
    subtle: 'bg-[#BEF264]/20 text-[#0F1F17] border border-[#BEF264]/40',
    outline: 'bg-transparent text-[#0F1F17] border border-[#BEF264]/60',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-black uppercase tracking-[0.06em] rounded-full',
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
