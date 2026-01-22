import { describe, it, expect } from 'vitest';
import {
  calculateStableford,
  getStablefordPoints,
  getPointsLabel,
  formatStablefordPoints,
  getStablefordPointsColor,
  StrokesPerHoleMap
} from './stableford';
import { Player, Score, HoleInfo } from '@/types/golf';

const TEST_ROUND_ID = 'test-round-123';

const createPlayer = (id: string, name: string, orderIndex = 0): Player => ({
  id,
  name,
  handicap: 0,
  roundId: TEST_ROUND_ID,
  orderIndex,
});

const createScore = (playerId: string, holeNumber: number, strokes: number): Score => ({
  id: `${playerId}-${holeNumber}`,
  playerId,
  holeNumber,
  strokes,
  roundId: TEST_ROUND_ID,
});

const createHoleInfo = (number: number, par: number): HoleInfo => ({
  number,
  par,
  handicap: number,
  distance: 350 + (par - 3) * 100,
});

const defaultHoles: HoleInfo[] = [
  createHoleInfo(1, 4),
  createHoleInfo(2, 4),
  createHoleInfo(3, 3),
  createHoleInfo(4, 5),
  createHoleInfo(5, 4),
  createHoleInfo(6, 4),
  createHoleInfo(7, 3),
  createHoleInfo(8, 5),
  createHoleInfo(9, 4),
];

describe('getStablefordPoints', () => {
  describe('standard scoring', () => {
    it('should return 5 points for albatross (3 under par)', () => {
      expect(getStablefordPoints(1, 4)).toBe(5); // Hole in one on par 4
      expect(getStablefordPoints(2, 5)).toBe(5); // Eagle on par 5 with net -3
    });

    it('should return 4 points for eagle (2 under par)', () => {
      expect(getStablefordPoints(2, 4)).toBe(4);
      expect(getStablefordPoints(3, 5)).toBe(4);
      expect(getStablefordPoints(1, 3)).toBe(4); // Hole in one on par 3
    });

    it('should return 3 points for birdie (1 under par)', () => {
      expect(getStablefordPoints(3, 4)).toBe(3);
      expect(getStablefordPoints(2, 3)).toBe(3);
      expect(getStablefordPoints(4, 5)).toBe(3);
    });

    it('should return 2 points for par', () => {
      expect(getStablefordPoints(3, 3)).toBe(2);
      expect(getStablefordPoints(4, 4)).toBe(2);
      expect(getStablefordPoints(5, 5)).toBe(2);
    });

    it('should return 1 point for bogey (1 over par)', () => {
      expect(getStablefordPoints(4, 3)).toBe(1);
      expect(getStablefordPoints(5, 4)).toBe(1);
      expect(getStablefordPoints(6, 5)).toBe(1);
    });

    it('should return 0 points for double bogey (2 over par)', () => {
      expect(getStablefordPoints(5, 3)).toBe(0);
      expect(getStablefordPoints(6, 4)).toBe(0);
      expect(getStablefordPoints(7, 5)).toBe(0);
    });

    it('should return 0 points for worse than double bogey', () => {
      expect(getStablefordPoints(6, 3)).toBe(0);
      expect(getStablefordPoints(7, 4)).toBe(0);
      expect(getStablefordPoints(10, 4)).toBe(0);
    });
  });

  describe('modified scoring', () => {
    it('should return 8 points for albatross', () => {
      expect(getStablefordPoints(1, 4, true)).toBe(8);
    });

    it('should return 5 points for eagle', () => {
      expect(getStablefordPoints(2, 4, true)).toBe(5);
    });

    it('should return 3 points for birdie', () => {
      expect(getStablefordPoints(3, 4, true)).toBe(3);
    });

    it('should return 1 point for par', () => {
      expect(getStablefordPoints(4, 4, true)).toBe(1);
    });

    it('should return 0 points for bogey', () => {
      expect(getStablefordPoints(5, 4, true)).toBe(0);
    });

    it('should return -1 for double bogey', () => {
      expect(getStablefordPoints(6, 4, true)).toBe(-1);
    });

    it('should return -3 for triple bogey or worse', () => {
      expect(getStablefordPoints(7, 4, true)).toBe(-3);
      expect(getStablefordPoints(10, 4, true)).toBe(-3);
    });
  });
});

describe('getPointsLabel', () => {
  it('should return "Albatross!" for 5+ points', () => {
    expect(getPointsLabel(5)).toBe('Albatross!');
    expect(getPointsLabel(8)).toBe('Albatross!');
  });

  it('should return "Eagle" for 4 points', () => {
    expect(getPointsLabel(4)).toBe('Eagle');
  });

  it('should return "Birdie" for 3 points', () => {
    expect(getPointsLabel(3)).toBe('Birdie');
  });

  it('should return "Par" for 2 points', () => {
    expect(getPointsLabel(2)).toBe('Par');
  });

  it('should return "Bogey" for 1 point', () => {
    expect(getPointsLabel(1)).toBe('Bogey');
  });

  it('should return "No Points" for 0 points', () => {
    expect(getPointsLabel(0)).toBe('No Points');
  });

  it('should return pts format for negative points', () => {
    expect(getPointsLabel(-1)).toBe('-1 pts');
    expect(getPointsLabel(-3)).toBe('-3 pts');
  });
});

describe('formatStablefordPoints', () => {
  it('should format positive points', () => {
    expect(formatStablefordPoints(5)).toBe('5 pts');
  });

  it('should format zero points', () => {
    expect(formatStablefordPoints(0)).toBe('0 pts');
  });

  it('should format negative points', () => {
    expect(formatStablefordPoints(-1)).toBe('-1 pts');
  });
});

describe('getStablefordPointsColor', () => {
  it('should return success color for 4+ points', () => {
    expect(getStablefordPointsColor(4)).toBe('text-success');
    expect(getStablefordPointsColor(5)).toBe('text-success');
  });

  it('should return foreground color for 2-3 points', () => {
    expect(getStablefordPointsColor(2)).toBe('text-foreground');
    expect(getStablefordPointsColor(3)).toBe('text-foreground');
  });

  it('should return warning color for 1 point', () => {
    expect(getStablefordPointsColor(1)).toBe('text-warning');
  });

  it('should return danger color for 0 or negative', () => {
    expect(getStablefordPointsColor(0)).toBe('text-danger');
    expect(getStablefordPointsColor(-1)).toBe('text-danger');
  });
});

describe('calculateStableford', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
    createPlayer('p3', 'Charlie'),
  ];

  describe('basic scoring', () => {
    it('should calculate points for single hole', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), // Par on par 4 = 2 pts
        createScore('p2', 1, 5), // Bogey = 1 pt
        createScore('p3', 1, 3), // Birdie = 3 pts
      ];

      const result = calculateStableford(scores, players, defaultHoles);

      expect(result.holesScored).toBe(1);
      expect(result.standings[0].playerId).toBe('p3'); // Charlie leads with 3
      expect(result.standings[0].totalPoints).toBe(3);
      expect(result.standings[1].playerId).toBe('p1'); // Alice with 2
      expect(result.standings[1].totalPoints).toBe(2);
      expect(result.standings[2].playerId).toBe('p2'); // Bob with 1
      expect(result.standings[2].totalPoints).toBe(1);
    });

    it('should calculate points for multiple holes', () => {
      const scores: Score[] = [
        // Hole 1 (par 4)
        createScore('p1', 1, 4), // Par = 2
        createScore('p2', 1, 5), // Bogey = 1
        // Hole 2 (par 4)
        createScore('p1', 2, 3), // Birdie = 3
        createScore('p2', 2, 4), // Par = 2
        // Hole 3 (par 3)
        createScore('p1', 3, 4), // Bogey = 1
        createScore('p2', 3, 2), // Birdie = 3
      ];

      const result = calculateStableford(scores, players, defaultHoles);

      expect(result.holesScored).toBe(3);

      const alice = result.standings.find(s => s.playerId === 'p1');
      expect(alice?.totalPoints).toBe(6); // 2+3+1

      const bob = result.standings.find(s => s.playerId === 'p2');
      expect(bob?.totalPoints).toBe(6); // 1+2+3
    });

    it('should track hole points breakdown', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), // 2 pts
        createScore('p1', 2, 3), // 3 pts (birdie)
      ];

      const result = calculateStableford(scores, players, defaultHoles);
      const alice = result.standings.find(s => s.playerId === 'p1');

      expect(alice?.holePoints).toHaveLength(2);
      expect(alice?.holePoints[0]).toEqual({ hole: 1, points: 2 });
      expect(alice?.holePoints[1]).toEqual({ hole: 2, points: 3 });
    });

    it('should sort standings by total points descending', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Bogey = 1
        createScore('p2', 1, 4), // Par = 2
        createScore('p3', 1, 3), // Birdie = 3
      ];

      const result = calculateStableford(scores, players, defaultHoles);

      expect(result.standings[0].playerId).toBe('p3');
      expect(result.standings[1].playerId).toBe('p2');
      expect(result.standings[2].playerId).toBe('p1');
    });
  });

  describe('modified stableford', () => {
    it('should use modified point values', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), // Par = 1 (modified)
        createScore('p2', 1, 6), // Double bogey = -1 (modified)
      ];

      const result = calculateStableford(scores, players, defaultHoles, true);

      expect(result.modified).toBe(true);
      const alice = result.standings.find(s => s.playerId === 'p1');
      expect(alice?.totalPoints).toBe(1);
      const bob = result.standings.find(s => s.playerId === 'p2');
      expect(bob?.totalPoints).toBe(-1);
    });

    it('should handle negative total points', () => {
      const scores: Score[] = [
        createScore('p1', 1, 7), // Triple bogey = -3
        createScore('p1', 2, 7), // Triple bogey = -3
      ];

      const result = calculateStableford(scores, players, defaultHoles, true);
      const alice = result.standings.find(s => s.playerId === 'p1');

      expect(alice?.totalPoints).toBe(-6);
    });
  });

  describe('net scoring with handicaps', () => {
    it('should use net scores when strokesPerHole provided', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Gross 5 on par 4
        createScore('p2', 1, 4), // Gross 4 on par 4
      ];

      // p1 gets 1 stroke on hole 1
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 1]])],
      ]);

      const result = calculateStableford(scores, players, defaultHoles, false, strokesPerHole);

      // p1: gross 5 - 1 stroke = net 4 = par = 2 pts
      // p2: gross 4 = net 4 = par = 2 pts
      const alice = result.standings.find(s => s.playerId === 'p1');
      const bob = result.standings.find(s => s.playerId === 'p2');

      expect(alice?.totalPoints).toBe(2);
      expect(bob?.totalPoints).toBe(2);
    });

    it('should calculate net birdie correctly', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Gross 5, gets 2 strokes = net 3 = birdie
      ];

      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 2]])],
      ]);

      const result = calculateStableford(scores, players, defaultHoles, false, strokesPerHole);
      const alice = result.standings.find(s => s.playerId === 'p1');

      expect(alice?.totalPoints).toBe(3); // Birdie = 3 pts
    });
  });

  describe('edge cases', () => {
    it('should handle empty scores', () => {
      const result = calculateStableford([], players, defaultHoles);

      expect(result.holesScored).toBe(0);
      expect(result.standings).toHaveLength(3);
      result.standings.forEach(s => {
        expect(s.totalPoints).toBe(0);
        expect(s.holePoints).toHaveLength(0);
      });
    });

    it('should handle missing hole info', () => {
      const scores: Score[] = [
        createScore('p1', 99, 4), // Hole 99 doesn't exist
      ];

      const result = calculateStableford(scores, players, defaultHoles);

      // Should not crash, just skip the hole
      const alice = result.standings.find(s => s.playerId === 'p1');
      expect(alice?.totalPoints).toBe(0);
    });

    it('should handle single player', () => {
      const singlePlayer = [createPlayer('p1', 'Solo')];
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p1', 2, 3),
      ];

      const result = calculateStableford(scores, singlePlayer, defaultHoles);

      expect(result.standings).toHaveLength(1);
      expect(result.standings[0].totalPoints).toBe(5); // 2 + 3
    });

    it('should include player names in standings', () => {
      const scores: Score[] = [createScore('p1', 1, 4)];

      const result = calculateStableford(scores, players, defaultHoles);

      expect(result.standings[0].playerName).toBeDefined();
      expect(typeof result.standings[0].playerName).toBe('string');
    });
  });

  describe('full round scenarios', () => {
    it('should calculate 9-hole round', () => {
      const scores: Score[] = [];

      // Alice plays all pars
      for (let i = 1; i <= 9; i++) {
        const par = defaultHoles[i - 1].par;
        scores.push(createScore('p1', i, par));
      }

      const result = calculateStableford(scores, players, defaultHoles);

      expect(result.holesScored).toBe(9);
      const alice = result.standings.find(s => s.playerId === 'p1');
      expect(alice?.totalPoints).toBe(18); // 9 pars * 2 pts
    });

    it('should determine correct winner', () => {
      const scores: Score[] = [
        // Hole 1
        createScore('p1', 1, 3), // Birdie = 3
        createScore('p2', 1, 4), // Par = 2
        createScore('p3', 1, 5), // Bogey = 1
        // Hole 2
        createScore('p1', 2, 4), // Par = 2
        createScore('p2', 2, 3), // Birdie = 3
        createScore('p3', 2, 4), // Par = 2
      ];

      const result = calculateStableford(scores, players, defaultHoles);

      // p1: 3+2 = 5, p2: 2+3 = 5, p3: 1+2 = 3
      expect(result.standings[0].totalPoints).toBe(5);
      expect(result.standings[1].totalPoints).toBe(5);
      expect(result.standings[2].totalPoints).toBe(3);
    });
  });
});
