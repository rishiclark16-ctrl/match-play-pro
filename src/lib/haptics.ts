// Haptic feedback utilities for mobile devices
// Uses Capacitor Haptics on native, falls back to Vibration API on web

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

/**
 * Light tap - for selections, toggles, navigation
 * Use for: nav items, switches, checkboxes, minor interactions
 */
export async function hapticLight(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}

/**
 * Medium tap - for button presses, confirmations
 * Use for: primary buttons, form submissions, important actions
 */
export async function hapticMedium(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}

/**
 * Heavy tap - for important actions, emphasis
 * Use for: destructive actions, completing rounds, significant events
 */
export async function hapticHeavy(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}

/**
 * Success - score saved, round complete, positive actions
 * Use for: score entry, winning, achievements, successful actions
 */
export async function hapticSuccess(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}

/**
 * Error - validation failed, action blocked
 * Use for: form errors, failed actions, invalid input
 */
export async function hapticError(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Error });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}

/**
 * Warning - offline status, sync pending
 * Use for: warnings, alerts, attention needed
 */
export async function hapticWarning(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([30, 20, 30]);
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}

/**
 * Selection feedback - scrolling through holes, list items
 * Use for: picker scrolling, subtle selection changes
 */
export async function hapticSelection(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.selectionChanged();
    }
    // No web fallback - selection haptics are too subtle for vibration API
  } catch (error) {
    // Silently fail if haptics not available
  }
}

/**
 * Score haptic - contextual feedback based on score relative to par
 * Use for: score entry to provide instant feedback on performance
 */
export async function hapticScore(score: number, par: number): Promise<void> {
  const diff = score - par;
  
  if (diff <= -2) {
    // Eagle or better - celebration!
    await hapticSuccess();
    // Double tap for eagle
    setTimeout(() => hapticSuccess(), 100);
  } else if (diff === -1) {
    // Birdie - positive feedback
    await hapticSuccess();
  } else if (diff === 0) {
    // Par - neutral medium tap
    await hapticMedium();
  } else if (diff === 1) {
    // Bogey - light warning
    await hapticLight();
  } else {
    // Double bogey or worse - warning
    await hapticWarning();
  }
}

/**
 * Celebration haptic - for major achievements
 * Use for: winning a skin, round complete, personal best
 */
export async function hapticCelebrate(): Promise<void> {
  try {
    if (isNative) {
      // Triple success tap for celebration
      await Haptics.notification({ type: NotificationType.Success });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }, 100);
      setTimeout(async () => {
        await Haptics.notification({ type: NotificationType.Success });
      }, 200);
    } else if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20, 50, 40]);
    }
  } catch (error) {
    // Silently fail if haptics not available
  }
}
