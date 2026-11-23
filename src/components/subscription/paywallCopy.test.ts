import { describe, it, expect } from 'vitest';
import { annualSavingsPercent, paywallHeadline, PRO_FEATURES } from './paywallCopy';
import { TIER_LIMITS } from '@/hooks/useSubscription';

describe('annualSavingsPercent', () => {
  it('computes current pricing ($3.99/mo vs $24.99/yr) as 47%, never rounding up', () => {
    expect(annualSavingsPercent(3.99, 24.99)).toBe(47);
  });
  it('returns 0 for missing or non-saving prices', () => {
    expect(annualSavingsPercent(0, 24.99)).toBe(0);
    expect(annualSavingsPercent(1, 20)).toBe(0);
  });
});

describe('paywallHeadline', () => {
  it('tailors copy to the feature that triggered the paywall', () => {
    expect(paywallHeadline('House Game').title).toBe('Build any game with AI');
    expect(paywallHeadline('Unlimited Friends').title).toBe('Bring the whole crew');
    expect(paywallHeadline('Wolf').title).toBe('Play Wolf with MATCH Pro');
    expect(paywallHeadline().title).toBe('Unlock the full experience');
  });
});

describe('PRO_FEATURES stays truthful', () => {
  it('advertises the real player cap', () => {
    expect(PRO_FEATURES.some(f => f.label.includes(`Up to ${TIER_LIMITS.pro.maxPlayers} players`))).toBe(true);
    expect(PRO_FEATURES.some(f => f.free.includes(`${TIER_LIMITS.free.maxPlayers} players`))).toBe(true);
  });
  it('counts the extra Pro games correctly ("and 5 more")', () => {
    const named = ['nassau', 'wolf', 'vegas', 'stableford', 'bestball'];
    const extra = TIER_LIMITS.pro.availableGames.filter(
      g => !TIER_LIMITS.free.availableGames.includes(g) && !named.includes(g),
    );
    expect(extra.length).toBe(5);
    expect(PRO_FEATURES.some(f => f.label.includes(`and ${extra.length} more`))).toBe(true);
  });
});
