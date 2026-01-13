import React, { createContext, useContext, ReactNode } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  backgroundSyncSupported: boolean;
  syncNow: () => Promise<void>;
  saveScoreOffline: (roundId: string, playerId: string, holeNumber: number, strokes: number) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSync();

  return (
    <OfflineContext.Provider value={offlineSync}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

/**
 * Hook that returns just the online status - safe to use anywhere
 */
export function useOnlineStatus(): boolean {
  const context = useContext(OfflineContext);
  // Default to online if context not available
  return context?.isOnline ?? navigator.onLine;
}
