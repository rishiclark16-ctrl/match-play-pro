import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

/**
 * Hook to keep the screen awake during active golf rounds.
 * Essential for on-course use - prevents screen dimming while scoring.
 * 
 * @param enabled - Whether to keep the screen awake (default: true)
 */
export function useKeepAwake(enabled: boolean = true) {
  useEffect(() => {
    // Only works on native platforms
    if (!Capacitor.isNativePlatform()) return;

    const manageAwake = async () => {
      try {
        const { isSupported } = await KeepAwake.isSupported();
        if (!isSupported) return;

        if (enabled) {
          await KeepAwake.keepAwake();
        } else {
          await KeepAwake.allowSleep();
        }
      } catch {
        // KeepAwake not available on this platform
      }
    };

    manageAwake();

    // Allow sleep when component unmounts or round ends
    return () => {
      if (Capacitor.isNativePlatform()) {
        KeepAwake.allowSleep().catch(() => {});
      }
    };
  }, [enabled]);
}
