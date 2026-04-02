import { describe, it, expect } from 'vitest';
import { calculateVegas, VegasResult } from './vegas';
import { Player, Score, HoleInfo } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

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

const makeHoleInfo = (count: number): HoleInfo[] =>
  Array.from({ length: count }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));

describe('calculateVegas', () => {
  const players = [
    createPlayer('p1', 'Alice', 0),   // Team A
    createPlayer('p2', 'Bob', 1),     // Team A
    createPlayer('p3', 'Charlie', 2), // Team B
    createPlayer('p4', 'Diana', 3),   // Team B
  ];
  const holeInfo = makeHoleInfo(18);

  describe('score combining', () => {
    it('should combine two scores with lower digit first (no birdie, no flip)', () => {
      // Par 4. Team A: 4, 5 → 45. Team B: 4, 6 → 46. No birdie, no flip.
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 6),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].teamAScore).toBe(45);
      expect(result.holeResults[0].teamBScore).toBe(46);
    });

    it('should handle identical scores on a team', () => {
      // Par 4. Team A: 4, 4 → 44. Team B: 5, 5 → 55. No birdie.
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 4),
        createScore('p3', 1, 5), createScore('p4', 1, 5),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].teamAScore).toBe(44);
      expect(result.holeResults[0].teamBScore).toBe(55);
    });
  });

  describe('point difference', () => {
    it('should calculate positive pointDiff when Team A wins (no birdie)', () => {
      // Par 4. Team A: 4,4 → 44. Team B: 5,6 → 56. No birdie. pointDiff = 56 - 44 = 12
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 4),
        createScore('p3', 1, 5), createScore('p4', 1, 6),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].pointDiff).toBe(12);
    });

    it('should calculate negative pointDiff when Team B wins (no birdie)', () => {
      // Par 4. Team A: 5,6 → 56. Team B: 4,4 → 44. No birdie. pointDiff = 44 - 56 = -12
      const scores = [
        createScore('p1', 1, 5), createScore('p2', 1, 6),
        createScore('p3', 1, 4), createScore('p4', 1, 4),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].pointDiff).toBe(-12);
    });

    it('should calculate zero pointDiff on a tie', () => {
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 5),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].pointDiff).toBe(0);
    });
  });

  describe('birdie flip', () => {
    it('should flip the losing team score when any player has a birdie', () => {
      // Par 4. Team A: 3(birdie),4 → 34. Team B: 4,5 → 45.
      // Team B is losing (45 > 34), flip Team B: 45 → 54.
      // pointDiff = 54 - 34 = 20
      const scores = [
        createScore('p1', 1, 3), createScore('p2', 1, 4),
        createScore('p3', 1, 4), createScore('p4', 1, 5),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].teamBFlipped).toBe(true);
      expect(result.holeResults[0].teamAFlipped).toBe(false);
      expect(result.holeResults[0].teamBScore).toBe(54);
      expect(result.holeResults[0].pointDiff).toBe(20);
    });

    it('should flip Team A when Team A is losing and birdie exists', () => {
      // Par 4. Team A: 5,6 → 56. Team B: 3(birdie),4 → 34.
      // Team A is losing (56 > 34), flip Team A: 56 → 65.
      const scores = [
        createScore('p1', 1, 5), createScore('p2', 1, 6),
        createScore('p3', 1, 3), createScore('p4', 1, 4),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].teamAFlipped).toBe(true);
      expect(result.holeResults[0].teamAScore).toBe(65);
    });

    it('should not flip when no birdie exists', () => {
      // Par 4. All scores 4 or higher → no birdie
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p3', 1, 6), createScore('p4', 1, 7),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].teamAFlipped).toBe(false);
      expect(result.holeResults[0].teamBFlipped).toBe(false);
    });

    it('should not flip when teams are tied even with birdie', () => {
      // Par 4. Team A: 3,5 → 35. Team B: 3,5 → 35. Tied, no flip
      const scores = [
        createScore('p1', 1, 3), createScore('p2', 1, 5),
        createScore('p3', 1, 3), createScore('p4', 1, 5),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults[0].teamAFlipped).toBe(false);
      expect(result.holeResults[0].teamBFlipped).toBe(false);
    });
  });

  describe('totals and earnings', () => {
    it('should accumulate totals across multiple holes', () => {
      // No birdies (all par or worse on par 4)
      const scores = [
        // Hole 1: Team A 44, Team B 56 → diff +12
        createScore('p1', 1, 4), createScore('p2', 1, 4),
        createScore('p3', 1, 5), createScore('p4', 1, 6),
        // Hole 2: Team A 55, Team B 44 → diff -11
        createScore('p1', 2, 5), createScore('p2', 2, 5),
        createScore('p3', 2, 4), createScore('p4', 2, 4),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 2);
      expect(result.teamATotal).toBe(1); // 12 - 11
      expect(result.teamBTotal).toBe(-1);
    });

    it('should multiply total by unitValue for earnings', () => {
      // No birdie: all at or above par 4
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 4),
        createScore('p3', 1, 5), createScore('p4', 1, 6),
      ];
      const result = calculateVegas(scores, players, holeInfo, 0.5, 1);
      // Team A: 44, Team B: 56. pointDiff = 56-44 = 12. earnings = 12 * 0.5 = 6
      expect(result.teamAEarnings).toBe(6);
      expect(result.teamBEarnings).toBe(-6);
    });

    it('should have symmetric earnings (zero-sum)', () => {
      const scores: Score[] = [];
      for (let h = 1; h <= 5; h++) {
        scores.push(
          createScore('p1', h, 3 + (h % 3)), createScore('p2', h, 4 + (h % 2)),
          createScore('p3', h, 5 - (h % 2)), createScore('p4', h, 4 + (h % 3)),
        );
      }
      const result = calculateVegas(scores, players, holeInfo, 2, 5);
      expect(result.teamAEarnings + result.teamBEarnings).toBe(0);
    });
  });

  describe('net scoring with strokes', () => {
    it('should apply handicap strokes before combining', () => {
      // p1 gross 5 - 1 stroke = net 4. p2 gross 5 = net 5. Team A: 45
      // p3 gross 4 = net 4. p4 gross 4 = net 4. Team B: 44
      const scores = [
        createScore('p1', 1, 5), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 4),
      ];
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 1]])],
        ['p2', new Map()],
        ['p3', new Map()],
        ['p4', new Map()],
      ]);
      const result = calculateVegas(scores, players, holeInfo, 1, 1, strokesPerHole);
      expect(result.holeResults[0].teamAScore).toBe(45);
      expect(result.holeResults[0].teamBScore).toBe(44);
    });
  });

  describe('missing scores', () => {
    it('should skip holes where any player is missing a score', () => {
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p3', 1, 4),
        // p4 missing
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 1);
      expect(result.holeResults).toHaveLength(0);
    });
  });

  describe('fewer than 4 players', () => {
    it('should return empty results for 3 players', () => {
      const threePlayers = players.slice(0, 3);
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 5), createScore('p3', 1, 4),
      ];
      const result = calculateVegas(scores, threePlayers, holeInfo, 1, 1);
      expect(result.holeResults).toHaveLength(0);
      expect(result.teamATotal).toBe(0);
      expect(result.teamBTotal).toBe(0);
    });

    it('should return empty results for 2 players', () => {
      const twoPlayers = players.slice(0, 2);
      const result = calculateVegas([], twoPlayers, holeInfo, 1, 1);
      expect(result.holeResults).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle holesPlayed of 0', () => {
      const result = calculateVegas([], players, holeInfo, 1, 0);
      expect(result.holeResults).toHaveLength(0);
      expect(result.holesPlayed).toBe(0);
    });

    it('should handle unitValue of 0', () => {
      const scores = [
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p3', 1, 5), createScore('p4', 1, 6),
      ];
      const result = calculateVegas(scores, players, holeInfo, 0, 1);
      expect(result.teamAEarnings).toBe(0);
      expect(result.teamBEarnings).toBe(-0);
    });

    it('should use par 4 as default when hole not found in holeInfo', () => {
      // Hole 99 not in holeInfo → defaults to par 4
      const scores = [
        createScore('p1', 99, 3), createScore('p2', 99, 4),
        createScore('p3', 99, 5), createScore('p4', 99, 6),
      ];
      const result = calculateVegas(scores, players, holeInfo, 1, 99);
      // p1 has 3 which is < par 4, so birdie exists
      // Team A: 34, Team B: 56. B is losing, flip B: 56 → 65
      const holeResult = result.holeResults.find(r => r.holeNumber === 99);
      expect(holeResult).toBeDefined();
    });

    it('should handle par 3 holes correctly for birdie detection', () => {
      const par3Info: HoleInfo[] = [{ number: 1, par: 3, handicap: 1 }];
      // Score of 2 = birdie on par 3
      const scores = [
        createScore('p1', 1, 2), createScore('p2', 1, 4),
        createScore('p3', 1, 3), createScore('p4', 1, 4),
      ];
      const result = calculateVegas(scores, players, par3Info, 1, 1);
      // Birdie exists (p1 scored 2 < par 3)
      // Team A: 24, Team B: 34. B losing, flip B: 34 → 43
      expect(result.holeResults[0].teamBFlipped).toBe(true);
      expect(result.holeResults[0].teamBScore).toBe(43);
    });
  });
});
