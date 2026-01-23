// Status bar utilities for native iOS/Android apps
// Controls the appearance of the device status bar

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Set dark status bar style (light text on dark background)
 * Used for dark/immersive screens
 */
export async function setStatusBarDark(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark }); // Light text
    await StatusBar.setBackgroundColor({ color: '#09090b' }); // Dark background
  } catch {
    // StatusBar not available on this platform/configuration
  }
}

/**
 * Set default status bar style for the app
 * Light style (dark text) - overlay mode is configured in capacitor.config.ts
 */
export async function setStatusBarDefault(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Note: overlaysWebView is set in capacitor.config.ts, not at runtime
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // StatusBar not available on this platform/configuration
  }
}

/**
 * Set light status bar style (dark text on light background)
 * Used for light mode or white screens
 */
export async function setStatusBarLight(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
  } catch {
    // StatusBar not available on this platform/configuration
  }
}

/**
 * Hide the status bar for immersive/fullscreen mode
 */
export async function hideStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.hide();
  } catch {
    // StatusBar not available on this platform/configuration
  }
}

/**
 * Show the status bar after hiding
 */
export async function showStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.show();
  } catch {
    // StatusBar not available on this platform/configuration
  }
}

/**
 * Set overlay mode - status bar overlaps content
 * Useful for full-bleed hero images or immersive views
 */
export async function setStatusBarOverlay(overlay: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay });
  } catch {
    // StatusBar not available on this platform/configuration
  }
}
