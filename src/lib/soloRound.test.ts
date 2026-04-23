import { describe, it, expect } from 'vitest';
import { isSoloRound } from './soloRound';
import type { Round, Player, GameConfig } from '@/types/golf';

const player = (id: string, isGhost = false): Player => ({
  id,
  roundId: 'r1',
  name: `P${id}`,
  orderIndex: 0,
  isGhost,
});

const round = (games: GameConfig[] = []): Pick<Round, 'games'> => ({ games });

describe('isSoloRound', () => {
  it('returns true for 1 real player and no games', () => {
    expect(isSoloRound(round([]), [player('1')])).toBe(true);
  });

  it('returns false for 1 player but with a game configured', () => {
    const g: GameConfig = { id: 'g', type: 'skins', stakes: 1 };
    expect(isSoloRound(round([g]), [player('1')])).toBe(false);
  });

  it('returns false for multiple players even with no games', () => {
    expect(isSoloRound(round([]), [player('1'), player('2')])).toBe(false);
  });

  it('returns false for a normal multiplayer betting round', () => {
    const g: GameConfig = { id: 'g', type: 'nassau', stakes: 5 };
    expect(isSoloRound(round([g]), [player('1'), player('2'), player('3')])).toBe(false);
  });

  it('ignores ghost players when counting real players', () => {
    expect(isSoloRound(round([]), [player('1'), player('2', true)])).toBe(true);
  });

  it('returns false when 0 real players (all ghosts)', () => {
    expect(isSoloRound(round([]), [player('1', true)])).toBe(false);
  });

  it('handles missing games field (undefined) as no games', () => {
    expect(isSoloRound({ games: undefined as unknown as GameConfig[] }, [player('1')])).toBe(true);
  });

  it('returns false for null round', () => {
    expect(isSoloRound(null, [player('1')])).toBe(false);
  });

  it('returns false for null players', () => {
    expect(isSoloRound(round([]), null)).toBe(false);
  });

  it('returns false for empty players array', () => {
    expect(isSoloRound(round([]), [])).toBe(false);
  });
});
