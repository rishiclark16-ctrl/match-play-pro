import { describe, it, expect } from 'vitest';
import { shouldAskForReview, REVIEW_COOLDOWN_DAYS } from './reviewPrompt';

const DAY = 86_400_000;
const base = { completedRounds: 5, netWinnings: 12, isSoloRound: false, lastPromptedAt: null, now: 1_000 * DAY };

describe('shouldAskForReview', () => {
  it('asks a returning player who just won money', () => {
    expect(shouldAskForReview(base)).toBe(true);
  });
  it('never asks after a loss or break-even', () => {
    expect(shouldAskForReview({ ...base, netWinnings: 0 })).toBe(false);
    expect(shouldAskForReview({ ...base, netWinnings: -5 })).toBe(false);
  });
  it('waits until the player has a few rounds in', () => {
    expect(shouldAskForReview({ ...base, completedRounds: 2 })).toBe(false);
  });
  it('skips solo rounds', () => {
    expect(shouldAskForReview({ ...base, isSoloRound: true })).toBe(false);
  });
  it('respects the cooldown', () => {
    expect(shouldAskForReview({ ...base, lastPromptedAt: base.now - 10 * DAY })).toBe(false);
    expect(shouldAskForReview({ ...base, lastPromptedAt: base.now - (REVIEW_COOLDOWN_DAYS + 1) * DAY })).toBe(true);
  });
});
