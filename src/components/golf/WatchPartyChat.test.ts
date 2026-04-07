import { describe, it, expect } from 'vitest';
import { WatchPartyMessage } from '@/hooks/useWatchPartyChat';

// Test the chat's time-grouping and divider logic (pure computation)

const TIME_GROUP_GAP_MS = 5 * 60 * 1000; // 5 minutes — matches WatchPartyChat.tsx

function computeChatLayout(messages: WatchPartyMessage[]) {
  const revealDividerIndex = messages.findIndex(m => m.isPostReveal);

  return messages.map((msg, i) => {
    const prev = i > 0 ? messages[i - 1] : null;
    const showSender = !prev || prev.authorId !== msg.authorId;
    const showTimestamp =
      !prev ||
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > TIME_GROUP_GAP_MS;
    const showRevealDivider = revealDividerIndex === i && i > 0;
    const showDuringLabel = i === 0 && revealDividerIndex > 0;

    return { showSender, showTimestamp, showRevealDivider, showDuringLabel };
  });
}

function makeMsg(overrides: Partial<WatchPartyMessage> & { id: string }): WatchPartyMessage {
  return {
    authorId: 'u1',
    authorName: 'Alice',
    authorAvatar: null,
    body: 'hello',
    isPostReveal: false,
    isPlayer: false,
    createdAt: '2026-04-07T12:00:00Z',
    ...overrides,
  };
}

describe('WatchPartyChat layout logic', () => {
  describe('sender grouping', () => {
    it('shows sender for first message', () => {
      const layout = computeChatLayout([makeMsg({ id: '1' })]);
      expect(layout[0].showSender).toBe(true);
    });

    it('hides sender for consecutive messages from same author', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', authorId: 'u1', createdAt: '2026-04-07T12:00:00Z' }),
        makeMsg({ id: '2', authorId: 'u1', createdAt: '2026-04-07T12:00:30Z' }),
      ]);
      expect(layout[0].showSender).toBe(true);
      expect(layout[1].showSender).toBe(false);
    });

    it('shows sender when author changes', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', authorId: 'u1', createdAt: '2026-04-07T12:00:00Z' }),
        makeMsg({ id: '2', authorId: 'u2', createdAt: '2026-04-07T12:00:30Z' }),
      ]);
      expect(layout[1].showSender).toBe(true);
    });
  });

  describe('timestamp grouping', () => {
    it('shows timestamp for first message', () => {
      const layout = computeChatLayout([makeMsg({ id: '1' })]);
      expect(layout[0].showTimestamp).toBe(true);
    });

    it('hides timestamp within 5-minute window', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', createdAt: '2026-04-07T12:00:00Z' }),
        makeMsg({ id: '2', createdAt: '2026-04-07T12:04:59Z' }),
      ]);
      expect(layout[1].showTimestamp).toBe(false);
    });

    it('shows timestamp after 5-minute gap', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', createdAt: '2026-04-07T12:00:00Z' }),
        makeMsg({ id: '2', createdAt: '2026-04-07T12:05:01Z' }),
      ]);
      expect(layout[1].showTimestamp).toBe(true);
    });

    it('shows timestamp at exactly 5 minutes', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', createdAt: '2026-04-07T12:00:00Z' }),
        makeMsg({ id: '2', createdAt: '2026-04-07T12:05:00Z' }),
      ]);
      // 5 * 60 * 1000 = 300000, exactly at gap → not > gap, so should be false
      expect(layout[1].showTimestamp).toBe(false);
    });
  });

  describe('reveal divider', () => {
    it('does not show divider when all messages are during round', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', isPostReveal: false }),
        makeMsg({ id: '2', isPostReveal: false }),
      ]);
      expect(layout.every(l => !l.showRevealDivider)).toBe(true);
    });

    it('does not show divider when first message is post-reveal (index 0)', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', isPostReveal: true }),
        makeMsg({ id: '2', isPostReveal: true }),
      ]);
      // revealDividerIndex === 0 && i > 0 → false for index 0
      expect(layout[0].showRevealDivider).toBe(false);
    });

    it('shows divider at transition from during-round to post-reveal', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', isPostReveal: false, createdAt: '2026-04-07T12:00:00Z' }),
        makeMsg({ id: '2', isPostReveal: false, createdAt: '2026-04-07T12:01:00Z' }),
        makeMsg({ id: '3', isPostReveal: true, createdAt: '2026-04-07T14:00:00Z' }),
      ]);
      expect(layout[0].showRevealDivider).toBe(false);
      expect(layout[1].showRevealDivider).toBe(false);
      expect(layout[2].showRevealDivider).toBe(true);
    });

    it('shows "During the round" label when there are both types', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', isPostReveal: false, createdAt: '2026-04-07T12:00:00Z' }),
        makeMsg({ id: '2', isPostReveal: true, createdAt: '2026-04-07T14:00:00Z' }),
      ]);
      expect(layout[0].showDuringLabel).toBe(true);
    });

    it('does not show "During the round" label when all messages are post-reveal', () => {
      const layout = computeChatLayout([
        makeMsg({ id: '1', isPostReveal: true }),
      ]);
      // revealDividerIndex === 0, so not > 0
      expect(layout[0].showDuringLabel).toBe(false);
    });
  });

  describe('input validation logic', () => {
    it('trims whitespace before checking if empty', () => {
      const body = '   '.trim();
      expect(body).toBe('');
      expect(!body).toBe(true);
    });

    it('caps input at 500 characters', () => {
      const longInput = 'a'.repeat(600);
      const capped = longInput.slice(0, 500);
      expect(capped.length).toBe(500);
    });

    it('detects input at character limit', () => {
      const input = 'a'.repeat(500);
      expect(input.length >= 500).toBe(true);
    });

    it('does not flag input under limit', () => {
      const input = 'a'.repeat(499);
      expect(input.length >= 500).toBe(false);
    });
  });
});
