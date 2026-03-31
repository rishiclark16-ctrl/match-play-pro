import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarStackProps {
  names: string[];
  avatarUrls: (string | null)[];
  max?: number;
  size?: 'sm' | 'md';
}

export function AvatarStack({ names, avatarUrls, max = 3, size = 'sm' }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const overflow = names.length - max;
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-[11px]';
  const border = 'ring-2 ring-background';

  return (
    <div className="flex items-center">
      {shown.map((name, i) => (
        <div key={i} className={cn('-ml-2 first:ml-0', border, 'rounded-full overflow-hidden', sz)}>
          <Avatar className={cn('rounded-full', sz)}>
            <AvatarImage src={avatarUrls[i] ?? undefined} />
            <AvatarFallback className={cn('rounded-full text-[10px] bg-muted font-bold', sz)}>
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn(
          '-ml-2 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground',
          sz, border
        )}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
