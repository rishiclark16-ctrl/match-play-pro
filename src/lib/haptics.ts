// Haptic feedback utilities for mobile devices
// Uses Capacitor Haptics on native, falls back to Vibration API on web

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

// Light tap - for selections, toggles, navigation
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

// Medium tap - for button presses, confirmations
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

// Heavy tap - for important actions, emphasis
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

// Success - score saved, round complete, positive actions
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

// Error - validation failed, action blocked
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

// Warning - offline status, sync pending
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

// Selection feedback - scrolling through holes, list items
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
