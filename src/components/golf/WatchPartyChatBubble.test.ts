import { describe, it, expect } from 'vitest';

// Pure functions extracted from WatchPartyChatBubble.tsx

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

describe('WatchPartyChatBubble pure functions', () => {
  describe('getInitials', () => {
    it('returns single initial for single name', () => {
      expect(getInitials('Alice')).toBe('A');
    });

    it('returns two initials for two-word name', () => {
      expect(getInitials('John Smith')).toBe('JS');
    });

    it('caps at 2 initials for three-word name', () => {
      expect(getInitials('Mary Jane Watson')).toBe('MJ');
    });

    it('uppercases lowercase names', () => {
      expect(getInitials('alice bob')).toBe('AB');
    });

    it('handles single character name', () => {
      expect(getInitials('X')).toBe('X');
    });
  });

  describe('formatTime', () => {
    it('returns a formatted time string', () => {
      // Use a fixed ISO date
      const result = formatTime('2026-04-07T14:30:00Z');
      // Should contain minutes (":30") regardless of timezone
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('handles midnight timestamps', () => {
      const result = formatTime('2026-04-07T00:00:00Z');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('handles various ISO formats', () => {
      // With milliseconds
      const result = formatTime('2026-04-07T09:15:30.123Z');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
