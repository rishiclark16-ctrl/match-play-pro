import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, formatResetTime } from './rateLimiter';

const STORAGE_KEY = 'match-golf-rate-limits';

// Use unique action names per test to avoid shared module-level Map pollution
let testId = 0;
function uniqueAction(prefix = 'rl') {
  return `${prefix}-${++testId}`;
}

beforeEach(() => {
  vi.useFakeTimers();
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createRateLimiter', () => {
  it('allows requests up to the limit', () => {
    const limiter = createRateLimiter(uniqueAction(), { maxRequests: 3, windowMs: 60_000 });
    expect(limiter.checkAndRecord('u1').allowed).toBe(true);
    expect(limiter.checkAndRecord('u1').allowed).toBe(true);
    expect(limiter.checkAndRecord('u1').allowed).toBe(true);
    expect(limiter.checkAndRecord('u1').allowed).toBe(false);
  });

  it('tracks remaining requests correctly', () => {
    const limiter = createRateLimiter(uniqueAction(), { maxRequests: 3, windowMs: 60_000 });
    expect(limiter.checkAndRecord('u1').remainingRequests).toBe(2);
    expect(limiter.checkAndRecord('u1').remainingRequests).toBe(1);
    expect(limiter.checkAndRecord('u1').remainingRequests).toBe(0);
  });

  it('different users have independent limits', () => {
    const limiter = createRateLimiter(uniqueAction(), { maxRequests: 1, windowMs: 60_000 });
    expect(limiter.checkAndRecord('u1').allowed).toBe(true);
    expect(limiter.checkAndRecord('u1').allowed).toBe(false);
    expect(limiter.checkAndRecord('u2').allowed).toBe(true);
  });

  it('allows requests again after window expires', () => {
    const limiter = createRateLimiter(uniqueAction(), { maxRequests: 1, windowMs: 60_000 });
    expect(limiter.checkAndRecord('u1').allowed).toBe(true);
    expect(limiter.checkAndRecord('u1').allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(limiter.checkAndRecord('u1').allowed).toBe(true);
  });

  it('check() does not consume a request', () => {
    const limiter = createRateLimiter(uniqueAction(), { maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check('u1').allowed).toBe(true);
    expect(limiter.check('u1').allowed).toBe(true); // still allowed — not consumed
    expect(limiter.checkAndRecord('u1').allowed).toBe(true); // now consume it
    expect(limiter.check('u1').allowed).toBe(false);
  });

  it('reset() clears limit for a user', () => {
    const limiter = createRateLimiter(uniqueAction(), { maxRequests: 1, windowMs: 60_000 });
    limiter.checkAndRecord('u1');
    expect(limiter.check('u1').allowed).toBe(false);
    limiter.reset('u1');
    expect(limiter.check('u1').allowed).toBe(true);
  });

  it('clearAll() clears all users for the action type', () => {
    const action = uniqueAction();
    const limiter = createRateLimiter(action, { maxRequests: 1, windowMs: 60_000 });
    limiter.checkAndRecord('u1');
    limiter.checkAndRecord('u2');
    limiter.clearAll();
    expect(limiter.check('u1').allowed).toBe(true);
    expect(limiter.check('u2').allowed).toBe(true);
  });

  it('different action types are independent', () => {
    const authLimiter = createRateLimiter(uniqueAction('auth'), { maxRequests: 1, windowMs: 60_000 });
    const searchLimiter = createRateLimiter(uniqueAction('search'), { maxRequests: 1, windowMs: 60_000 });
    authLimiter.checkAndRecord('u1');
    expect(searchLimiter.check('u1').allowed).toBe(true);
  });
});

describe('state management', () => {
  it('checkAndRecord persists across separate limiter instances', () => {
    const action = uniqueAction('persist');
    const limiter1 = createRateLimiter(action, { maxRequests: 2, windowMs: 60_000 });
    limiter1.checkAndRecord('u1');
    // A new limiter with the same action reads the shared module state
    const limiter2 = createRateLimiter(action, { maxRequests: 2, windowMs: 60_000 });
    expect(limiter2.check('u1').remainingRequests).toBe(1);
  });

  it('reset restores availability', () => {
    const action = uniqueAction('persist');
    const limiter = createRateLimiter(action, { maxRequests: 1, windowMs: 60_000 });
    limiter.checkAndRecord('u1');
    expect(limiter.check('u1').allowed).toBe(false);
    limiter.reset('u1');
    expect(limiter.check('u1').allowed).toBe(true);
  });

  it('clearAll restores availability for all users', () => {
    const action = uniqueAction('persist');
    const limiter = createRateLimiter(action, { maxRequests: 1, windowMs: 60_000 });
    limiter.checkAndRecord('u1');
    limiter.checkAndRecord('u2');
    limiter.clearAll();
    expect(limiter.check('u1').allowed).toBe(true);
    expect(limiter.check('u2').allowed).toBe(true);
  });
});

describe('formatResetTime', () => {
  it('formats seconds', () => {
    expect(formatResetTime(5000)).toBe('5 seconds');
    expect(formatResetTime(1000)).toBe('1 second');
  });

  it('formats minutes', () => {
    expect(formatResetTime(60_000)).toBe('1 minute');
    expect(formatResetTime(120_000)).toBe('2 minutes');
    expect(formatResetTime(90_000)).toBe('2 minutes'); // rounds up
  });

  it('rounds up partial seconds', () => {
    expect(formatResetTime(1500)).toBe('2 seconds');
  });
});
