import { describe, it, expect } from 'vitest';

// Test the visibility logic of WatchPartyFeedBadge (pure logic)

function shouldShowBadge(messageCount: number): boolean {
  return messageCount > 0;
}

describe('WatchPartyFeedBadge visibility', () => {
  it('returns false for 0 messages', () => {
    expect(shouldShowBadge(0)).toBe(false);
  });

  it('returns false for negative messages', () => {
    expect(shouldShowBadge(-1)).toBe(false);
  });

  it('returns true for 1 message', () => {
    expect(shouldShowBadge(1)).toBe(true);
  });

  it('returns true for many messages', () => {
    expect(shouldShowBadge(42)).toBe(true);
  });
});
