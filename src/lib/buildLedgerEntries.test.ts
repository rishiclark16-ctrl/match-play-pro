import { describe, it, expect } from 'vitest';
import { buildLedgerEntries } from './buildLedgerEntries';
import { Player } from '@/types/golf';

const p = (id: string, name: string, profileId?: string): Player =>
  ({ id, name, profileId, roundId: 'r', orderIndex: 0 } as Player);

const players = [p('a', 'Host', 'prof-a'), p('b', 'Bob', 'prof-b'), p('g', 'Guest Gary')];
const settle = (from: string, to: string, amount: number) =>
  ({ fromPlayerId: from, toPlayerId: to, amount, fromPlayerName: from, toPlayerName: to });

describe('buildLedgerEntries (Notion 09.2 M8)', () => {
  it('attributes a guest balance to the host so the tab sums to zero', () => {
    const r = buildLedgerEntries([settle('g', 'b', 10), settle('a', 'b', 5)], players, 'prof-a');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries.reduce((s, e) => s + e.amount, 0)).toBe(0);
    expect(r.entries.find(e => e.profileId === 'prof-a')!.amount).toBe(-15);
    expect(r.guestNames).toEqual(['Guest Gary']);
  });

  it('refuses when a guest has money and the host is not in the round', () => {
    const r = buildLedgerEntries([settle('g', 'b', 10)], players, 'someone-else');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Guest Gary');
  });

  it('ignores guests who broke even', () => {
    const r = buildLedgerEntries([settle('a', 'b', 4)], players, null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.guestNames).toEqual([]);
  });

  it('errors when nobody has an account', () => {
    expect(buildLedgerEntries([], [p('x', 'X')], null).ok).toBe(false);
  });
});
