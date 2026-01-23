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
  } catch (error) {
    console.warn('[StatusBar] Not available:', error);
  }
}

/**
 * Set default status bar style for the app
 * Light style (dark text) with white background - matches our white theme
 */
export async function setStatusBarDefault(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
  } catch (error) {
    console.warn('[StatusBar] Not available:', error);
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
  } catch (error) {
    console.warn('[StatusBar] Not available:', error);
  }
}

/**
 * Hide the status bar for immersive/fullscreen mode
 */
export async function hideStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.hide();
  } catch (error) {
    console.warn('[StatusBar] Not available:', error);
  }
}

/**
 * Show the status bar after hiding
 */
export async function showStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.show();
  } catch (error) {
    console.warn('[StatusBar] Not available:', error);
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
  } catch (error) {
    console.warn('[StatusBar] Not available:', error);
  }
}
