import { describe, it, expect } from 'vitest';

// Since formatPlayerNames is not exported, we replicate it for unit testing.
// This is the exact logic from watchPartyNotification.ts.
function formatPlayerNames(names: string[]): string {
  if (names.length === 0) return 'Your friends';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length <= 4) {
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  }
  return `${names[0]}, ${names[1]} & ${names.length - 2} others`;
}

describe('watchPartyNotification', () => {
  describe('formatPlayerNames', () => {
    it('returns "Your friends" for empty array', () => {
      expect(formatPlayerNames([])).toBe('Your friends');
    });

    it('returns single name as-is', () => {
      expect(formatPlayerNames(['Alice'])).toBe('Alice');
    });

    it('joins two names with &', () => {
      expect(formatPlayerNames(['Alice', 'Bob'])).toBe('Alice & Bob');
    });

    it('joins three names with comma and &', () => {
      expect(formatPlayerNames(['Alice', 'Bob', 'Charlie'])).toBe('Alice, Bob & Charlie');
    });

    it('joins four names with commas and &', () => {
      expect(formatPlayerNames(['Alice', 'Bob', 'Charlie', 'Diana'])).toBe(
        'Alice, Bob, Charlie & Diana'
      );
    });

    it('truncates 5+ names to first two + "N others"', () => {
      expect(formatPlayerNames(['A', 'B', 'C', 'D', 'E'])).toBe('A, B & 3 others');
    });

    it('truncates 6 names to first two + "4 others"', () => {
      expect(formatPlayerNames(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A, B & 4 others');
    });

    it('handles names with spaces', () => {
      expect(formatPlayerNames(['John Smith', 'Jane Doe'])).toBe('John Smith & Jane Doe');
    });
  });
});
