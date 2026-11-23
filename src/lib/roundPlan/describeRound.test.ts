import { describe, it, expect } from 'vitest';
import { describeRound } from './describeRound';
import { localParse } from './localParse';

describe('describeRound', () => {
  it('recreates a round as a sentence the parser reads back', () => {
    const s = describeRound({
      courseName: 'Sonoma GC (II)',
      otherPlayers: ['Jack Turner', 'James Reid', 'Tim Shaw'],
      games: [{ id: 'a', type: 'skins', stakes: 5, carryover: true }, { id: 'b', type: 'nassau', stakes: 10, autoPress: true }],
    });
    expect(s).toBe('Sonoma GC from the II tees with Jack Turner, James Reid and Tim Shaw. $5 skins with carryovers and $10 nassau with auto presses');
    const p = localParse(s!);
    expect(p.course.query).toBe('Sonoma GC');
    expect(p.course.tee).toBe('II');
    expect(p.players.map(x => x.name)).toEqual(['Jack Turner', 'James Reid', 'Tim Shaw']);
    expect(p.games.map(g => [g.type, g.stake])).toEqual([['skins', 5], ['nassau', 10]]);
  });
  it('skips house games and works with no games', () => {
    expect(describeRound({ courseName: 'Harding Park', otherPlayers: ['Sam'], games: [{ id: 'h', type: 'house', stakes: 2 }] }))
      .toBe('Harding Park with Sam');
  });
});
