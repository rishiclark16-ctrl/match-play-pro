import { describe, it, expect } from 'vitest';
import { calculateQuota, QuotaStanding } from './quota';
import { Player, Score, HoleInfo } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

const TEST_ROUND_ID = 'test-round-123';

const createPlayer = (id: string, name: string, handicap = 0, orderIndex = 0): Player => ({
  id,
  name,
  handicap,
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

const makeHoleInfo = (count: number): HoleInfo[] =>
  Array.from({ length: count }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));

describe('calculateQuota', () => {
  const holeInfo = makeHoleInfo(18);

  describe('quota calculation', () => {
    it('should set quota as 36 minus handicap', () => {
      const players = [
        createPlayer('p1', 'Alice', 10),
        createPlayer('p2', 'Bob', 20),
      ];
      const result = calculateQuota([], players, holeInfo, 1);
      expect(result.standings.find(s => s.playerId === 'p1')?.quota).toBe(26);
      expect(result.standings.find(s => s.playerId === 'p2')?.quota).toBe(16);
    });

    it('should floor quota at 0 for very high handicaps', () => {
      const players = [createPlayer('p1', 'Alice', 40)];
      const result = calculateQuota([], players, holeInfo, 1);
      expect(result.standings[0].quota).toBe(0);
    });

    it('should treat null handicap as 0 (quota = 36)', () => {
      const players: Player[] = [{ id: 'p1', name: 'Alice', roundId: TEST_ROUND_ID, orderIndex: 0 }];
      const result = calculateQuota([], players, holeInfo, 1);
      expect(result.standings[0].quota).toBe(36);
    });
  });

  describe('points accumulation', () => {
    it('should award 2 points for par (net strokes = par)', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const scores = [createScore('p1', 1, 4)]; // par 4, score 4
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].totalPoints).toBe(2);
    });

    it('should award 4 points for birdie', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const scores = [createScore('p1', 1, 3)]; // par 4, score 3
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].totalPoints).toBe(4);
    });

    it('should award 8 points for eagle', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const scores = [createScore('p1', 1, 2)]; // par 4, score 2
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].totalPoints).toBe(8);
    });

    it('should award 1 point for bogey', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const scores = [createScore('p1', 1, 5)]; // par 4, score 5
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].totalPoints).toBe(1);
    });

    it('should award 0 points for double bogey or worse', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const scores = [createScore('p1', 1, 6)]; // par 4, score 6
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].totalPoints).toBe(0);
    });

    it('should accumulate points across multiple holes', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const scores = [
        createScore('p1', 1, 4), // par = 2 pts
        createScore('p1', 2, 3), // birdie = 4 pts
        createScore('p1', 3, 5), // bogey = 1 pt
      ];
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].totalPoints).toBe(7);
    });
  });

  describe('over/under calculation', () => {
    it('should calculate positive over/under when points exceed quota', () => {
      const players = [createPlayer('p1', 'Alice', 30)]; // quota = 6
      // Score 4 pars = 8 points → over/under = +2
      const scores = [
        createScore('p1', 1, 4),
        createScore('p1', 2, 4),
        createScore('p1', 3, 4),
        createScore('p1', 4, 4),
      ];
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].overUnder).toBe(2);
    });

    it('should calculate negative over/under when points below quota', () => {
      const players = [createPlayer('p1', 'Alice', 0)]; // quota = 36
      // Score 1 par = 2 points → over/under = -34
      const scores = [createScore('p1', 1, 4)];
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].overUnder).toBe(-34);
    });
  });

  describe('pairwise settlement', () => {
    it('should settle pairwise based on over/under difference', () => {
      const players = [
        createPlayer('p1', 'Alice', 34), // quota = 2
        createPlayer('p2', 'Bob', 34),   // quota = 2
      ];
      // Alice pars hole 1 (2 pts, over/under = 0), Bob bogeys (1 pt, over/under = -1)
      const scores = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
      ];
      const result = calculateQuota(scores, players, holeInfo, 5);
      const alice = result.standings.find(s => s.playerId === 'p1')!;
      const bob = result.standings.find(s => s.playerId === 'p2')!;
      // diff = (0 - (-1)) * 5 = 5
      expect(alice.earnings).toBe(5);
      expect(bob.earnings).toBe(-5);
    });

    it('should handle 3-player pairwise settlement', () => {
      const players = [
        createPlayer('p1', 'Alice', 34), // quota = 2
        createPlayer('p2', 'Bob', 34),   // quota = 2
        createPlayer('p3', 'Charlie', 34), // quota = 2
      ];
      // Alice birdie (4pts, o/u=+2), Bob par (2pts, o/u=0), Charlie bogey (1pt, o/u=-1)
      const scores = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
      ];
      const result = calculateQuota(scores, players, holeInfo, 1);
      const alice = result.standings.find(s => s.playerId === 'p1')!;
      const bob = result.standings.find(s => s.playerId === 'p2')!;
      const charlie = result.standings.find(s => s.playerId === 'p3')!;
      // Alice: vs Bob (+2)*1 + vs Charlie (+3)*1 = 5
      // Bob: vs Alice (-2)*1 + vs Charlie (+1)*1 = -1
      // Charlie: vs Alice (-3)*1 + vs Bob (-1)*1 = -4
      expect(alice.earnings).toBe(5);
      expect(bob.earnings).toBe(-1);
      expect(charlie.earnings).toBe(-4);
    });

    it('should zero-sum across all players', () => {
      const players = [
        createPlayer('p1', 'Alice', 10),
        createPlayer('p2', 'Bob', 20),
        createPlayer('p3', 'Charlie', 15),
        createPlayer('p4', 'Diana', 25),
      ];
      const scores = [
        createScore('p1', 1, 3), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 6),
        createScore('p1', 2, 4), createScore('p2', 2, 4),
        createScore('p3', 2, 5), createScore('p4', 2, 3),
      ];
      const result = calculateQuota(scores, players, holeInfo, 2);
      const totalEarnings = result.standings.reduce((sum, s) => sum + s.earnings, 0);
      expect(totalEarnings).toBeCloseTo(0);
    });
  });

  describe('net scoring with strokes', () => {
    it('should apply handicap strokes to net score before calculating points', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      // Gross 5 on par 4 = bogey (1 pt). With 1 stroke → net 4 = par (2 pts)
      const scores = [createScore('p1', 1, 5)];
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 1]])],
      ]);
      const result = calculateQuota(scores, players, holeInfo, 1, strokesPerHole);
      expect(result.standings[0].totalPoints).toBe(2);
    });
  });

  describe('holes scored', () => {
    it('should count unique scored holes', () => {
      const players = [
        createPlayer('p1', 'Alice', 0),
        createPlayer('p2', 'Bob', 0),
      ];
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p1', 2, 4), createScore('p2', 2, 4),
        createScore('p1', 3, 3),
      ];
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.holesScored).toBe(3);
    });

    it('should return 0 for no scores', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const result = calculateQuota([], players, holeInfo, 1);
      expect(result.holesScored).toBe(0);
    });

    it('should ignore scores for holes not in holeInfo', () => {
      const players = [createPlayer('p1', 'Alice', 0)];
      const shortHoleInfo = makeHoleInfo(9);
      const scores = [
        createScore('p1', 1, 4),
        createScore('p1', 10, 4), // not in 9-hole info
      ];
      const result = calculateQuota(scores, players, shortHoleInfo, 1);
      expect(result.holesScored).toBe(1);
    });
  });

  describe('sorting', () => {
    it('should sort standings by over/under descending', () => {
      const players = [
        createPlayer('p1', 'Alice', 34), // quota = 2
        createPlayer('p2', 'Bob', 35),   // quota = 1
        createPlayer('p3', 'Charlie', 33), // quota = 3
      ];
      // All par: 2 pts each. o/u: Alice=0, Bob=+1, Charlie=-1
      const scores = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 4),
        createScore('p3', 1, 4),
      ];
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings[0].playerId).toBe('p2');
      expect(result.standings[1].playerId).toBe('p1');
      expect(result.standings[2].playerId).toBe('p3');
    });
  });

  describe('edge cases', () => {
    it('should handle single player', () => {
      const players = [createPlayer('p1', 'Alice', 18)]; // quota = 18
      const scores = [createScore('p1', 1, 4)];
      const result = calculateQuota(scores, players, holeInfo, 1);
      expect(result.standings).toHaveLength(1);
      expect(result.standings[0].earnings).toBe(0); // no opponents
    });

    it('should handle empty scores array', () => {
      const players = [
        createPlayer('p1', 'Alice', 10),
        createPlayer('p2', 'Bob', 20),
      ];
      const result = calculateQuota([], players, holeInfo, 1);
      expect(result.standings.every(s => s.totalPoints === 0)).toBe(true);
      expect(result.holesScored).toBe(0);
    });

    it('should handle unitValue of 0', () => {
      const players = [
        createPlayer('p1', 'Alice', 34),
        createPlayer('p2', 'Bob', 35),
      ];
      const scores = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
      ];
      const result = calculateQuota(scores, players, holeInfo, 0);
      expect(result.standings.every(s => s.earnings === 0)).toBe(true);
    });
  });
});
