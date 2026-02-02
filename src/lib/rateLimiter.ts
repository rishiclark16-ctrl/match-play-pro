/**
 * Simple in-memory rate limiter using sliding window approach
 * Tracks timestamps of actions and checks against limits
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

// Store timestamps for each action type
const actionTimestamps: Map<string, number[]> = new Map();

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
        return {
          allowed: false,
          remainingRequests: 0,
          resetInMs,
        };
      }

      // Record the action
      timestamps.push(now);
      actionTimestamps.set(key, timestamps);

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
    },
  };
}

// Pre-configured rate limiters for common use cases
const ONE_MINUTE_MS = 60 * 1000;

export const friendRequestRateLimiter = createRateLimiter('friend-request', {
  maxRequests: 10,
  windowMs: ONE_MINUTE_MS,
});

export const searchRateLimiter = createRateLimiter('search', {
  maxRequests: 20,
  windowMs: ONE_MINUTE_MS,
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
