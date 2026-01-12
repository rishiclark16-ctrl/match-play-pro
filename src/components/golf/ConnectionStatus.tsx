import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isOnline: boolean;
  className?: string;
}

export function ConnectionStatus({ isOnline, className }: ConnectionStatusProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
      isOnline 
        ? "bg-success/10 text-success" 
        : "bg-warning/10 text-warning",
      className
    )}>
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
