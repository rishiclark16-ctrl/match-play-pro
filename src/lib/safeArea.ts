import { Capacitor } from '@capacitor/core';

/**
 * Safe Area Inset Manager
 *
 * iOS WebView has a bug where env(safe-area-inset-*) values can change
 * during SPA navigation. This utility captures the values once at startup
 * and locks them as CSS custom properties to prevent shifting.
 */

let isLocked = false;

/**
 * Measures and locks safe area insets as CSS custom properties.
 * Should be called once at app startup, after the native container is ready.
 */
export function lockSafeAreaInsets(): void {
  if (!Capacitor.isNativePlatform() || isLocked) {
    return;
  }

  // Create a measuring element positioned in the safe area
  const measure = document.createElement('div');
  measure.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    pointer-events: none;
    visibility: hidden;
    z-index: -9999;
  `;

  document.body.appendChild(measure);

  // Use requestAnimationFrame to ensure layout is complete
  requestAnimationFrame(() => {
    const computed = window.getComputedStyle(measure);
    const top = parseInt(computed.paddingTop, 10) || 0;
    const bottom = parseInt(computed.paddingBottom, 10) || 0;
    const left = parseInt(computed.paddingLeft, 10) || 0;
    const right = parseInt(computed.paddingRight, 10) || 0;

    document.body.removeChild(measure);

    // Only lock if we got valid values (top should be non-zero on devices with notch)
    if (top > 0 || bottom > 0) {
      const root = document.documentElement;
      root.style.setProperty('--safe-area-top', `${top}px`);
      root.style.setProperty('--safe-area-bottom', `${bottom}px`);
      root.style.setProperty('--safe-area-left', `${left}px`);
      root.style.setProperty('--safe-area-right', `${right}px`);
      isLocked = true;
    } else {
      // Values not ready yet, retry after a delay
      setTimeout(() => {
        if (!isLocked) {
          lockSafeAreaInsetsWithRetry();
        }
      }, 100);
    }
  });
}

/**
 * Retry locking safe area with increasing delays
 */
function lockSafeAreaInsetsWithRetry(attempt = 0): void {
  if (isLocked || attempt > 5) {
    return;
  }

  const measure = document.createElement('div');
  measure.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    pointer-events: none;
    visibility: hidden;
    z-index: -9999;
  `;

  document.body.appendChild(measure);

  requestAnimationFrame(() => {
    const computed = window.getComputedStyle(measure);
    const top = parseInt(computed.paddingTop, 10) || 0;
    const bottom = parseInt(computed.paddingBottom, 10) || 0;
    const left = parseInt(computed.paddingLeft, 10) || 0;
    const right = parseInt(computed.paddingRight, 10) || 0;

    document.body.removeChild(measure);

    if (top > 0 || bottom > 0) {
      const root = document.documentElement;
      root.style.setProperty('--safe-area-top', `${top}px`);
      root.style.setProperty('--safe-area-bottom', `${bottom}px`);
      root.style.setProperty('--safe-area-left', `${left}px`);
      root.style.setProperty('--safe-area-right', `${right}px`);
      isLocked = true;
    } else {
      // Retry with exponential backoff
      setTimeout(() => {
        lockSafeAreaInsetsWithRetry(attempt + 1);
      }, 100 * Math.pow(2, attempt));
    }
  });
}
