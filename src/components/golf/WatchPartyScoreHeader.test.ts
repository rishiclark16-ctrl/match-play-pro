import { describe, it, expect } from 'vitest';
import { GameConfig } from '@/types/golf';

// Pure functions extracted from WatchPartyScoreHeader.tsx for unit testing

function formatScoreVsPar(score: number): string {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function getGameTypeLabels(games: GameConfig[]): string[] {
  return games.map(g => {
    switch (g.type) {
      case 'nassau': return 'Nassau';
      case 'skins': return 'Skins';
      case 'match': return 'Match Play';
      case 'stableford': return 'Stableford';
      case 'bestball': return 'Best Ball';
      case 'wolf': return 'Wolf';
      case 'vegas': return 'Vegas';
      case 'nines': return 'Nines';
      case 'defender': return 'Defender';
      case 'sixes': return 'Sixes';
      case 'house': return 'House Game';
      default: return g.type;
    }
  });
}

describe('WatchPartyScoreHeader pure functions', () => {
  describe('formatScoreVsPar', () => {
    it('returns "E" for even par', () => {
      expect(formatScoreVsPar(0)).toBe('E');
    });

    it('returns "+N" for over par', () => {
      expect(formatScoreVsPar(1)).toBe('+1');
      expect(formatScoreVsPar(5)).toBe('+5');
      expect(formatScoreVsPar(12)).toBe('+12');
    });

    it('returns "-N" for under par', () => {
      expect(formatScoreVsPar(-1)).toBe('-1');
      expect(formatScoreVsPar(-3)).toBe('-3');
      expect(formatScoreVsPar(-10)).toBe('-10');
    });
  });

  describe('getGameTypeLabels', () => {
    it('returns empty array for no games', () => {
      expect(getGameTypeLabels([])).toEqual([]);
    });

    it('maps nassau to "Nassau"', () => {
      const games = [{ type: 'nassau' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Nassau']);
    });

    it('maps skins to "Skins"', () => {
      const games = [{ type: 'skins' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Skins']);
    });

    it('maps match to "Match Play"', () => {
      const games = [{ type: 'match' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Match Play']);
    });

    it('maps stableford to "Stableford"', () => {
      const games = [{ type: 'stableford' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Stableford']);
    });

    it('maps bestball to "Best Ball"', () => {
      const games = [{ type: 'bestball' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Best Ball']);
    });

    it('maps wolf to "Wolf"', () => {
      const games = [{ type: 'wolf' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Wolf']);
    });

    it('maps vegas to "Vegas"', () => {
      const games = [{ type: 'vegas' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Vegas']);
    });

    it('maps nines to "Nines"', () => {
      const games = [{ type: 'nines' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Nines']);
    });

    it('maps defender to "Defender"', () => {
      const games = [{ type: 'defender' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Defender']);
    });

    it('maps sixes to "Sixes"', () => {
      const games = [{ type: 'sixes' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Sixes']);
    });

    it('maps house to "House Game"', () => {
      const games = [{ type: 'house' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['House Game']);
    });

    it('falls through to raw type for unknown games', () => {
      const games = [{ type: 'custom_game' }] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['custom_game']);
    });

    it('handles multiple games', () => {
      const games = [
        { type: 'nassau' },
        { type: 'skins' },
        { type: 'wolf' },
      ] as GameConfig[];
      expect(getGameTypeLabels(games)).toEqual(['Nassau', 'Skins', 'Wolf']);
    });
  });
});
