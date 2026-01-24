// Safe Area Manager
// Hardcoded values for iOS - env() is unreliable during SPA navigation

import { Capacitor } from '@capacitor/core';

let isLocked = false;

/**
 * Lock safe area insets with hardcoded values for iOS.
 *
 * iPhone safe areas:
 * - Dynamic Island (iPhone 14 Pro - 16 Pro): top = 59px
 * - Notch (iPhone X - 14): top = 47-48px
 * - Bottom home indicator: 34px (but we set 0 since nav handles it)
 */
export function lockSafeAreaInsets(): void {
  if (!Capacitor.isNativePlatform() || isLocked) {
    return;
  }

  const root = document.documentElement;

  // Hardcoded: 59px works for Dynamic Island, acceptable for notch phones
  root.style.setProperty('--safe-area-top', '59px');
  root.style.setProperty('--safe-area-bottom', '0px');
  root.style.setProperty('--safe-area-left', '0px');
  root.style.setProperty('--safe-area-right', '0px');

  isLocked = true;
}
