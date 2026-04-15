import { describe, it, expect } from 'vitest';

// Test the pure data parsing logic from WatchPartyRevealCard.tsx

interface WatchPartyStats {
  spectatorCount: number;
  messageCount: number;
  firstMessageBody: string | null;
  firstMessageAuthor: string | null;
}

function parseStats(row: Record<string, unknown>): WatchPartyStats | null {
  if (!row || Number(row.message_count) === 0) return null;

  return {
    spectatorCount: Number(row.spectator_count),
    messageCount: Number(row.message_count),
    firstMessageBody: row.first_message_body,
    firstMessageAuthor: row.first_message_author,
  };
}

function formatStatsText(stats: WatchPartyStats): string {
  const friendWord = stats.spectatorCount === 1 ? 'friend' : 'friends';
  const messageWord = stats.messageCount === 1 ? 'message' : 'messages';
  return `${stats.spectatorCount} ${friendWord} watched · ${stats.messageCount} ${messageWord}`;
}

describe('WatchPartyRevealCard logic', () => {
  describe('parseStats', () => {
    it('returns null for null row', () => {
      expect(parseStats(null)).toBeNull();
    });

    it('returns null for 0 messages', () => {
      expect(parseStats({ message_count: 0, spectator_count: 1 })).toBeNull();
    });

    it('returns null for string "0" messages', () => {
      expect(parseStats({ message_count: '0', spectator_count: '1' })).toBeNull();
    });

    it('parses valid stats correctly', () => {
      const result = parseStats({
        spectator_count: '3',
        message_count: '12',
        first_message_body: 'Nice birdie!',
        first_message_author: 'Alice',
      });
      expect(result).toEqual({
        spectatorCount: 3,
        messageCount: 12,
        firstMessageBody: 'Nice birdie!',
        firstMessageAuthor: 'Alice',
      });
    });

    it('handles null first message fields', () => {
      const result = parseStats({
        spectator_count: 1,
        message_count: 5,
        first_message_body: null,
        first_message_author: null,
      });
      expect(result).not.toBeNull();
      expect(result!.firstMessageBody).toBeNull();
      expect(result!.firstMessageAuthor).toBeNull();
    });

    it('converts string counts to numbers', () => {
      const result = parseStats({
        spectator_count: '2',
        message_count: '7',
        first_message_body: 'Hello',
        first_message_author: 'Bob',
      });
      expect(result!.spectatorCount).toBe(2);
      expect(result!.messageCount).toBe(7);
    });
  });

  describe('formatStatsText', () => {
    it('singular friend and message', () => {
      expect(formatStatsText({ spectatorCount: 1, messageCount: 1, firstMessageBody: null, firstMessageAuthor: null }))
        .toBe('1 friend watched · 1 message');
    });

    it('plural friends and messages', () => {
      expect(formatStatsText({ spectatorCount: 3, messageCount: 12, firstMessageBody: null, firstMessageAuthor: null }))
        .toBe('3 friends watched · 12 messages');
    });

    it('singular friend, plural messages', () => {
      expect(formatStatsText({ spectatorCount: 1, messageCount: 5, firstMessageBody: null, firstMessageAuthor: null }))
        .toBe('1 friend watched · 5 messages');
    });

    it('plural friends, singular message', () => {
      expect(formatStatsText({ spectatorCount: 4, messageCount: 1, firstMessageBody: null, firstMessageAuthor: null }))
        .toBe('4 friends watched · 1 message');
    });
  });
});
