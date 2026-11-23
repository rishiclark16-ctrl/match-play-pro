import { describe, it, expect } from 'vitest';
import { remapTeamPlayerIds } from './remapTeamIds';
import type { GameConfig } from '@/types/golf';

describe('remapTeamPlayerIds', () => {
  it('rewrites fourball and best ball team members to the inserted player ids', () => {
    const games: GameConfig[] = [
      { id: 'm', type: 'match', stakes: 20, matchPlayFormat: 'fourball', matchPlayTeams: [
        { id: 'team-a', name: 'A', playerIds: ['you', 'p1'], color: '#000' },
        { id: 'team-b', name: 'B', playerIds: ['p2', 'p3'], color: '#000' },
      ] },
      { id: 'b', type: 'bestball', stakes: 0, teams: [{ id: 'team-1', name: 'A', playerIds: ['you', 'p1'], color: '#000' }] },
      { id: 's', type: 'skins', stakes: 5 },
    ];
    const map = new Map([['you', 'u-1'], ['p1', 'u-2'], ['p2', 'u-3'], ['p3', 'u-4']]);
    const out = remapTeamPlayerIds(games, map);
    expect(out[0].matchPlayTeams?.map(t => t.playerIds)).toEqual([['u-1', 'u-2'], ['u-3', 'u-4']]);
    expect(out[1].teams?.[0].playerIds).toEqual(['u-1', 'u-2']);
    expect(out[2]).toEqual(games[2]);
    expect(games[0].matchPlayTeams?.[0].playerIds).toEqual(['you', 'p1']); // input untouched
  });
});
