import { describe, it, expect } from 'vitest';
import { buildGamesFromToggles } from './buildGamesFromToggles';
import type { Team } from '@/types/golf';

const player = (id: string, name: string) => ({ id, name });

const baseArgs = {
  validPlayerCount: 4,
  validPlayers: [player('a', 'Alice'), player('b', 'Bob'), player('c', 'Charlie'), player('d', 'Dave')],
  matchPlay: false,
  matchPlayFormat: 'singles' as const,
  matchPlayTeamA: [],
  matchPlayTeamB: [],
  stakes: '',
  skinsEnabled: false, skinsStakes: '2', skinsCarryover: false,
  nassauEnabled: false, nassauStakes: '5', nassauAutoPress: false,
  stablefordEnabled: false, stablefordModified: false,
  bestBallEnabled: false, bestBallTeams: [] as Team[],
  wolfEnabled: false, wolfStakes: '2', wolfCarryover: false,
  vegasEnabled: false, vegasStakes: '1', vegasCarryover: false,
  ninesEnabled: false, ninesStakes: '1',
  defenderEnabled: false, defenderStakes: '1',
  sixesEnabled: false, sixesStakes: '1',
  houseGame: null,
  houseGameEnabled: false,
  selectedPersonalFormat: null,
  generateId: () => 'gid',
};

describe('buildGamesFromToggles', () => {
  describe('empty state', () => {
    it('returns no games when nothing is enabled', () => {
      const { games, hasHouseGame } = buildGamesFromToggles(baseArgs);
      expect(games).toEqual([]);
      expect(hasHouseGame).toBe(false);
    });
  });

  describe('Skins / Nassau / Stableford (no player-count gates)', () => {
    it('parses skins stakes as a number and includes carryover flag', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, skinsEnabled: true, skinsStakes: '5', skinsCarryover: true,
      });
      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({ type: 'skins', stakes: 5, carryover: true });
    });

    it('falls back to default skins stakes when blank', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, skinsEnabled: true, skinsStakes: '', skinsCarryover: false,
      });
      expect(games[0]).toMatchObject({ type: 'skins', stakes: 2 });
    });

    it('includes Nassau auto-press flag', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, nassauEnabled: true, nassauStakes: '10', nassauAutoPress: true,
      });
      expect(games[0]).toMatchObject({ type: 'nassau', stakes: 10, autoPress: true });
    });

    it('passes modified Stableford flag through', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, stablefordEnabled: true, stablefordModified: true,
      });
      expect(games[0]).toMatchObject({ type: 'stableford', modifiedStableford: true });
    });
  });

  describe('Player-count gates', () => {
    it('skips Wolf when fewer than 3 players', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, validPlayerCount: 2, wolfEnabled: true,
      });
      expect(games).toHaveLength(0);
    });

    it('includes Wolf at 3 players', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, validPlayerCount: 3, wolfEnabled: true,
      });
      expect(games[0]?.type).toBe('wolf');
    });

    it('includes Wolf at 4 players', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, validPlayerCount: 4, wolfEnabled: true,
      });
      expect(games[0]?.type).toBe('wolf');
    });

    it('skips Vegas unless exactly 4 players', () => {
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 3, vegasEnabled: true }).games).toHaveLength(0);
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 4, vegasEnabled: true }).games[0]?.type).toBe('vegas');
    });

    it('skips Nines unless exactly 3 players', () => {
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 4, ninesEnabled: true }).games).toHaveLength(0);
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 3, ninesEnabled: true }).games[0]?.type).toBe('nines');
    });

    it('skips Sixes unless exactly 4 players', () => {
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 3, sixesEnabled: true }).games).toHaveLength(0);
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 4, sixesEnabled: true }).games[0]?.type).toBe('sixes');
    });

    it('Defender accepts 3 or 4 but not 2', () => {
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 2, defenderEnabled: true }).games).toHaveLength(0);
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 3, defenderEnabled: true }).games[0]?.type).toBe('defender');
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 4, defenderEnabled: true }).games[0]?.type).toBe('defender');
    });

    it('Best Ball requires at least 2 players', () => {
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 1, bestBallEnabled: true }).games).toHaveLength(0);
      expect(buildGamesFromToggles({ ...baseArgs, validPlayerCount: 2, bestBallEnabled: true }).games[0]?.type).toBe('bestball');
    });
  });

  describe('Match play', () => {
    it('skips match play when enabled but stakes blank', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, matchPlay: true, stakes: '',
      });
      expect(games).toHaveLength(0);
    });

    it('falls back to singles format when fewer than 3 players', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, validPlayerCount: 2, matchPlay: true, matchPlayFormat: 'fourball', stakes: '5',
      });
      expect(games[0]).toMatchObject({ type: 'match', stakes: 5, matchPlayFormat: 'singles' });
    });

    it('includes match-play teams in fourball when both teams populated', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs,
        matchPlay: true, matchPlayFormat: 'fourball', stakes: '10',
        matchPlayTeamA: ['a', 'b'], matchPlayTeamB: ['c', 'd'],
      });
      expect(games[0]?.type).toBe('match');
      expect(games[0]).toHaveProperty('matchPlayTeams');
      const teams = (games[0] as { matchPlayTeams: { id: string; playerIds: string[] }[] }).matchPlayTeams;
      expect(teams).toHaveLength(2);
      expect(teams[0]?.playerIds).toEqual(['a', 'b']);
      expect(teams[1]?.playerIds).toEqual(['c', 'd']);
    });
  });

  describe('House game / personal format', () => {
    const fmt = {
      id: 'pf1',
      name: 'My Format',
      description: '',
      activePrimitives: [{ id: 'skin_basic', value: 1 }],
    } as unknown as NonNullable<typeof baseArgs.houseGame>;

    it('hasHouseGame becomes true when a personal format is selected', () => {
      const { hasHouseGame } = buildGamesFromToggles({
        ...baseArgs, selectedPersonalFormat: fmt,
      });
      expect(hasHouseGame).toBe(true);
    });

    it('skips house game when houseGameEnabled is false', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs, houseGame: fmt, houseGameEnabled: false,
      });
      expect(games).toHaveLength(0);
    });

    it('includes house game when enabled and primitives present', () => {
      const { games, hasHouseGame } = buildGamesFromToggles({
        ...baseArgs, houseGame: fmt, houseGameEnabled: true,
      });
      expect(games[0]?.type).toBe('house');
      expect(hasHouseGame).toBe(true);
    });
  });

  describe('Multiple games', () => {
    it('emits in deterministic order: side games first, house, then match', () => {
      const { games } = buildGamesFromToggles({
        ...baseArgs,
        skinsEnabled: true,
        nassauEnabled: true,
        matchPlay: true, stakes: '5',
      });
      expect(games.map(g => g.type)).toEqual(['skins', 'nassau', 'match']);
    });
  });
});
