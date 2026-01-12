// Haptic feedback utilities for mobile devices
// Uses the Vibration API when available

export function hapticLight(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function hapticMedium(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(20);
  }
}

export function hapticHeavy(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(30);
  }
}

export function hapticSuccess(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate([10, 50, 10]);
  }
}

export function hapticError(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate([50, 30, 50]);
  }
}

export function hapticWarning(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate([30, 20, 30]);
  }
}
