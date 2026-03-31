import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useOffline } from '@/contexts/OfflineContext';

/**
 * OfflineBanner — slides in at the top of the screen when the user is offline
 * or when back online and actively syncing. Disappears once fully synced.
 *
 * - On native iOS: shown whenever offline (consistent with app experience)
 * - On web: shown whenever offline
 * - When back online and syncing: brief green "Back online · Syncing…" banner
 * - When synced: banner disappears automatically
 */
export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount } = useOffline();
  const isNative = Capacitor.isNativePlatform();

  // Track whether we were previously offline so we can briefly show the
  // "Back online" banner before it disappears.
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    }
  }, [isOnline]);

  // Once back online and done syncing, clear the wasOffline flag after a short delay
  useEffect(() => {
    if (isOnline && !isSyncing && wasOffline) {
      const timer = setTimeout(() => setWasOffline(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, wasOffline]);

  // Determine visibility and message
  const showOffline = !isOnline && (isNative || true); // always show when offline
  const showSyncing = isOnline && (isSyncing || wasOffline) && (isNative || true);
  const isVisible = showOffline || showSyncing;

  const isAmber = !isOnline;
  const message = isAmber
    ? `No connection${pendingCount > 0 ? ` · ${pendingCount} score${pendingCount !== 1 ? 's' : ''} queued` : ''}`
    : `Back online · Syncing…`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="offline-banner"
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -36, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={[
            'fixed top-0 inset-x-0 z-50 h-9 flex items-center justify-center',
            'text-sm font-medium select-none',
            isAmber
              ? 'bg-amber-400 text-amber-950'
              : 'bg-green-500 text-white',
          ].join(' ')}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          aria-live="polite"
          role="status"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
