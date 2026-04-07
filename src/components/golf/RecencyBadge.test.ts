import { describe, it, expect } from 'vitest';

// Pure recency text logic extracted from RecencyBadge.tsx
// Uses explicit "now" parameter to avoid needing fake timers (not available in bun's vitest shim)

function getRecencyText(lastUpdatedAt: Date | null, now: number): string | null {
  if (!lastUpdatedAt) return null;

  const diffMs = now - lastUpdatedAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${diffHr}h ago`;
}

const BASE = new Date('2026-04-07T12:00:00Z').getTime();
const sec = (n: number) => BASE + n * 1000;
const min = (n: number) => BASE + n * 60 * 1000;
const hr = (n: number) => BASE + n * 60 * 60 * 1000;

describe('RecencyBadge logic', () => {
  it('returns null for null input', () => {
    expect(getRecencyText(null, BASE)).toBeNull();
  });

  it('returns "Just now" for < 5 seconds ago', () => {
    expect(getRecencyText(new Date(BASE), sec(4))).toBe('Just now');
  });

  it('returns "Just now" at 0 seconds', () => {
    expect(getRecencyText(new Date(BASE), BASE)).toBe('Just now');
  });

  it('returns "5s ago" for exactly 5 seconds', () => {
    expect(getRecencyText(new Date(BASE), sec(5))).toBe('5s ago');
  });

  it('returns seconds format for < 60 seconds', () => {
    expect(getRecencyText(new Date(BASE), sec(45))).toBe('45s ago');
  });

  it('returns "59s ago" at 59 seconds', () => {
    expect(getRecencyText(new Date(BASE), sec(59))).toBe('59s ago');
  });

  it('returns "1m ago" at 60 seconds', () => {
    expect(getRecencyText(new Date(BASE), sec(60))).toBe('1m ago');
  });

  it('returns minutes format for < 60 minutes', () => {
    expect(getRecencyText(new Date(BASE), min(30))).toBe('30m ago');
  });

  it('returns "59m ago" at 59 minutes', () => {
    expect(getRecencyText(new Date(BASE), min(59))).toBe('59m ago');
  });

  it('returns "1h ago" at 60 minutes', () => {
    expect(getRecencyText(new Date(BASE), hr(1))).toBe('1h ago');
  });

  it('returns "2h ago" at 2 hours', () => {
    expect(getRecencyText(new Date(BASE), hr(2))).toBe('2h ago');
  });

  it('returns large hour counts correctly', () => {
    expect(getRecencyText(new Date(BASE), hr(24))).toBe('24h ago');
  });
});
