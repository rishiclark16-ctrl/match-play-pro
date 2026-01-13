import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onSyncClick?: () => void;
}

/**
 * Visual indicator for offline status and sync state
 * Shows in the header when offline or has pending syncs
 */
export function OfflineIndicator({
  isOnline,
  isSyncing,
  pendingCount,
  onSyncClick,
}: OfflineIndicatorProps) {
  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        onClick={onSyncClick}
        disabled={!isOnline || isSyncing}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors",
          !isOnline 
            ? "bg-warning/20 text-warning border border-warning/30" 
            : isSyncing
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
        )}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <span className="bg-warning text-warning-foreground px-1.5 py-0.5 rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Cloud className="w-3.5 h-3.5" />
            <span>Sync {pendingCount}</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5" />
            <span>Online</span>
          </>
        )}
      </motion.button>
    </AnimatePresence>
  );
}

/**
 * Compact version for tight spaces
 */
export function OfflineIndicatorCompact({
  isOnline,
  isSyncing,
  pendingCount,
}: Omit<OfflineIndicatorProps, 'onSyncClick'>) {
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full",
        !isOnline 
          ? "bg-warning/20 text-warning" 
          : isSyncing
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
      )}
    >
      {!isOnline ? (
        <WifiOff className="w-3.5 h-3.5" />
      ) : isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <span className="text-[10px] font-bold">{pendingCount}</span>
      )}
    </motion.div>
  );
}
