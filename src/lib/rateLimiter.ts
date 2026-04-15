/**
 * Rate limiter using sliding window approach with localStorage persistence.
 * Survives page refreshes and app restarts within the configured window.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetInMs: number;
}

const STORAGE_KEY = 'match-golf-rate-limits';

// In-memory cache backed by localStorage
const actionTimestamps: Map<string, number[]> = new Map();

function hydrateFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const data: Record<string, number[]> = JSON.parse(stored);
    const now = Date.now();
    for (const [key, timestamps] of Object.entries(data)) {
      // Only restore timestamps from the last 15 minutes (max window)
      const valid = timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (valid.length > 0) actionTimestamps.set(key, valid);
    }
  } catch {
    // Corrupted data — start fresh
  }
}

function persistToStorage(): void {
  try {
    const data: Record<string, number[]> = {};
    for (const [key, timestamps] of actionTimestamps.entries()) {
      if (timestamps.length > 0) data[key] = timestamps;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — continue with in-memory only
  }
}

// Hydrate on module load
hydrateFromStorage();

/**
 * Creates a rate limiter for a specific action type
 * @param actionType - Unique identifier for the action (e.g., 'friend-request', 'search')
 * @param config - Rate limit configuration
 */
export function createRateLimiter(actionType: string, config: RateLimitConfig) {
  const getKey = (userId: string) => `${actionType}:${userId}`;

  return {
    /**
     * Check if an action is allowed and record it if so
     * @param userId - The user attempting the action
     * @returns Object with allowed status, remaining requests, and reset time
     */
    checkAndRecord(userId: string): RateLimitResult {
      const key = getKey(userId);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get existing timestamps or initialize
      let timestamps = actionTimestamps.get(key) || [];

      // Filter out timestamps outside the current window
      timestamps = timestamps.filter((ts) => ts > windowStart);

      // Calculate remaining requests and reset time
      const remainingRequests = Math.max(0, config.maxRequests - timestamps.length);
      const oldestTimestamp = timestamps[0];
      const resetInMs = oldestTimestamp
        ? Math.max(0, oldestTimestamp + config.windowMs - now)
        : 0;

      // Check if action is allowed
      if (timestamps.length >= config.maxRequests) {
        actionTimestamps.set(key, timestamps);
        persistToStorage();
        return {
          allowed: false,
          remainingRequests: 0,
          resetInMs,
        };
      }

      // Record the action
      timestamps.push(now);
      actionTimestamps.set(key, timestamps);
      persistToStorage();

      return {
        allowed: true,
        remainingRequests: config.maxRequests - timestamps.length,
        resetInMs: config.windowMs,
      };
    },

    /**
     * Check if an action would be allowed without recording it
     * @param userId - The user attempting the action
     * @returns Object with allowed status, remaining requests, and reset time
     */
    check(userId: string): RateLimitResult {
      const key = getKey(userId);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      let timestamps = actionTimestamps.get(key) || [];
      timestamps = timestamps.filter((ts) => ts > windowStart);

      const remainingRequests = Math.max(0, config.maxRequests - timestamps.length);
      const oldestTimestamp = timestamps[0];
      const resetInMs = oldestTimestamp
        ? Math.max(0, oldestTimestamp + config.windowMs - now)
        : 0;

      return {
        allowed: timestamps.length < config.maxRequests,
        remainingRequests,
        resetInMs,
      };
    },

    /**
     * Reset the rate limit for a specific user
     * @param userId - The user to reset
     */
    reset(userId: string): void {
      const key = getKey(userId);
      actionTimestamps.delete(key);
      persistToStorage();
    },

    /**
     * Clear all rate limit data for this action type
     */
    clearAll(): void {
      const prefix = `${actionType}:`;
      for (const key of actionTimestamps.keys()) {
        if (key.startsWith(prefix)) {
          actionTimestamps.delete(key);
        }
      }
      persistToStorage();
    },
  };
}

// Pre-configured rate limiters for common use cases
const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;

export const friendRequestRateLimiter = createRateLimiter('friend-request', {
  maxRequests: 10,
  windowMs: ONE_MINUTE_MS,
});

export const searchRateLimiter = createRateLimiter('search', {
  maxRequests: 20,
  windowMs: ONE_MINUTE_MS,
});

// Authentication rate limiter: 5 attempts per 15 minutes
// Uses email as the key since user is not authenticated yet
export const authRateLimiter = createRateLimiter('auth', {
  maxRequests: 5,
  windowMs: FIFTEEN_MINUTES_MS,
});

// Password reset rate limiter: 3 attempts per 15 minutes
export const passwordResetRateLimiter = createRateLimiter('password-reset', {
  maxRequests: 3,
  windowMs: FIFTEEN_MINUTES_MS,
});

/**
 * Format the reset time into a human-readable string
 * @param resetInMs - Time in milliseconds until reset
 */
export function formatResetTime(resetInMs: number): string {
  const seconds = Math.ceil(resetInMs / 1000);
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
