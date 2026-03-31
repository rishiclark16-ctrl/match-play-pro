import { cn } from '@/lib/utils';

interface MoneyBadgeProps {
  amount: number; // positive = won, negative = lost
  className?: string;
}

export function MoneyBadge({ amount, className }: MoneyBadgeProps) {
  if (amount === 0) return null;
  const positive = amount > 0;
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-black tracking-tight',
      positive
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-red-100 text-red-600',
      className
    )}>
      {positive ? '+' : ''}{amount < 0 ? '-' : ''}${Math.abs(amount).toFixed(0)}
    </span>
  );
}
