import { describe, it, expect } from 'vitest';
import { calculateSkins, getSkinsHoleResult, getSkinsHoleContext, StrokesPerHoleMap } from './skins';
import { Player, Score, SkinResult } from '@/types/golf';

// Test helpers
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

describe('calculateSkins', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
    createPlayer('p3', 'Charlie'),
    createPlayer('p4', 'Diana'),
  ];

  describe('basic skin wins', () => {
    it('should award skin to lowest score on a hole', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
        createScore('p3', 1, 5),
        createScore('p4', 1, 6),
      ];

      const result = calculateSkins(scores, players, 1, 5);

      expect(result.results[0].winnerId).toBe('p1');
      expect(result.results[0].value).toBe(1);
      expect(result.standings.find(s => s.playerId === 'p1')?.skins).toBe(1);
    });

    it('should handle ties with no winner', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 6),
      ];

      const result = calculateSkins(scores, players, 1, 5);

      expect(result.results[0].winnerId).toBeNull();
      expect(result.results[0].value).toBe(0);
    });

    it('should handle multiple winners across holes', () => {
      const scores: Score[] = [
        // Hole 1 - Alice wins
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
        // Hole 2 - Bob wins
        createScore('p1', 2, 5),
        createScore('p2', 2, 3),
        createScore('p3', 2, 4),
        createScore('p4', 2, 4),
        // Hole 3 - Charlie wins
        createScore('p1', 3, 4),
        createScore('p2', 3, 4),
        createScore('p3', 3, 3),
        createScore('p4', 3, 5),
      ];

      const result = calculateSkins(scores, players, 3, 5);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].winnerId).toBe('p1');
      expect(result.results[1].winnerId).toBe('p2');
      expect(result.results[2].winnerId).toBe('p3');

      expect(result.standings.find(s => s.playerId === 'p1')?.skins).toBe(1);
      expect(result.standings.find(s => s.playerId === 'p2')?.skins).toBe(1);
      expect(result.standings.find(s => s.playerId === 'p3')?.skins).toBe(1);
      expect(result.standings.find(s => s.playerId === 'p4')?.skins).toBe(0);
    });
  });

  describe('carryover functionality', () => {
    it('should carry over skins when enabled and tied', () => {
      const scores: Score[] = [
        // Hole 1 - Tie
        createScore('p1', 1, 4),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 5),
        // Hole 2 - Alice wins (gets 2 skins)
        createScore('p1', 2, 3),
        createScore('p2', 2, 4),
        createScore('p3', 2, 5),
        createScore('p4', 2, 4),
      ];

      const result = calculateSkins(scores, players, 2, 5, true);

      expect(result.results[0].winnerId).toBeNull();
      expect(result.results[1].winnerId).toBe('p1');
      expect(result.results[1].value).toBe(2); // 1 skin + 1 carryover
      expect(result.standings.find(s => s.playerId === 'p1')?.skins).toBe(2);
    });

    it('should not carry over skins when disabled', () => {
      const scores: Score[] = [
        // Hole 1 - Tie
        createScore('p1', 1, 4),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 5),
        // Hole 2 - Alice wins
        createScore('p1', 2, 3),
        createScore('p2', 2, 4),
        createScore('p3', 2, 5),
        createScore('p4', 2, 4),
      ];

      const result = calculateSkins(scores, players, 2, 5, false);

      expect(result.results[1].winnerId).toBe('p1');
      expect(result.results[1].value).toBe(1); // Only 1 skin, no carryover
      expect(result.carryover).toBe(0);
    });

    it('should accumulate multiple carryovers', () => {
      const scores: Score[] = [
        // Holes 1-3 all tie
        createScore('p1', 1, 4), createScore('p2', 1, 4), createScore('p3', 1, 5), createScore('p4', 1, 5),
        createScore('p1', 2, 4), createScore('p2', 2, 4), createScore('p3', 2, 5), createScore('p4', 2, 5),
        createScore('p1', 3, 4), createScore('p2', 3, 4), createScore('p3', 3, 5), createScore('p4', 3, 5),
        // Hole 4 - Bob wins (gets 4 skins)
        createScore('p1', 4, 5), createScore('p2', 4, 3), createScore('p3', 4, 5), createScore('p4', 4, 5),
      ];

      const result = calculateSkins(scores, players, 4, 5, true);

      expect(result.results[3].winnerId).toBe('p2');
      expect(result.results[3].value).toBe(4); // 1 + 3 carryovers
      expect(result.standings.find(s => s.playerId === 'p2')?.skins).toBe(4);
    });

    it('should track remaining carryover at end of round', () => {
      const scores: Score[] = [
        // Hole 1 - Tie
        createScore('p1', 1, 4),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 5),
      ];

      const result = calculateSkins(scores, players, 1, 5, true);

      expect(result.carryover).toBe(1);
    });
  });

  describe('earnings calculation', () => {
    it('should calculate earnings correctly for winner', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      // Stakes: $5 per skin, 4 players = $20 pot per skin
      // 1 hole played, each contributes $5
      // Alice wins 1 skin = $20, contributed $5, earnings = +$15
      const result = calculateSkins(scores, players, 1, 5);

      const alice = result.standings.find(s => s.playerId === 'p1')!;
      expect(alice.earnings).toBe(15); // Won $20, paid $5
    });

    it('should calculate earnings correctly for losers', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      const result = calculateSkins(scores, players, 1, 5);

      const bob = result.standings.find(s => s.playerId === 'p2')!;
      expect(bob.earnings).toBe(-5); // Won $0, paid $5
    });

    it('should balance to zero (zero-sum game)', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3), createScore('p2', 1, 4), createScore('p3', 1, 5), createScore('p4', 1, 4),
        createScore('p1', 2, 4), createScore('p2', 2, 3), createScore('p3', 2, 5), createScore('p4', 2, 4),
        createScore('p1', 3, 4), createScore('p2', 3, 4), createScore('p3', 3, 3), createScore('p4', 3, 5),
      ];

      const result = calculateSkins(scores, players, 3, 5);

      const totalEarnings = result.standings.reduce((sum, s) => sum + s.earnings, 0);
      expect(totalEarnings).toBe(0);
    });

    it('should calculate correct pot values', () => {
      const result = calculateSkins([], players, 18, 10);

      expect(result.potPerSkin).toBe(40); // 4 players * $10
      expect(result.totalPot).toBe(720); // 18 holes * $40
    });
  });

  describe('net scoring with handicaps', () => {
    it('should use net scores when strokesPerHole provided', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Gross 5, Net 4 (gets 1 stroke)
        createScore('p2', 1, 4), // Gross 4, Net 4
        createScore('p3', 1, 5),
        createScore('p4', 1, 6),
      ];

      // p1 gets a stroke on hole 1
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 1]])],
      ]);

      const result = calculateSkins(scores, players, 1, 5, true, strokesPerHole);

      // Both p1 and p2 have net 4, should be a tie
      expect(result.results[0].winnerId).toBeNull();
    });

    it('should award skin to lower net score', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Gross 5, Net 4
        createScore('p2', 1, 5), // Gross 5, Net 5
        createScore('p3', 1, 6),
        createScore('p4', 1, 6),
      ];

      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 1]])],
      ]);

      const result = calculateSkins(scores, players, 1, 5, true, strokesPerHole);

      expect(result.results[0].winnerId).toBe('p1');
    });
  });

  describe('partial scoring', () => {
    it('should skip holes where not all players scored', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
        // p3 and p4 haven't scored hole 1
      ];

      const result = calculateSkins(scores, players, 1, 5);

      expect(result.results).toHaveLength(0);
    });

    it('should only process complete holes', () => {
      const scores: Score[] = [
        // Hole 1 - All scored
        createScore('p1', 1, 3), createScore('p2', 1, 4), createScore('p3', 1, 5), createScore('p4', 1, 4),
        // Hole 2 - Only 2 scored
        createScore('p1', 2, 4), createScore('p2', 2, 4),
      ];

      const result = calculateSkins(scores, players, 2, 5);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].holeNumber).toBe(1);
    });
  });

  describe('standings sorting', () => {
    it('should sort standings by skins descending', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3), createScore('p2', 1, 4), createScore('p3', 1, 5), createScore('p4', 1, 4),
        createScore('p1', 2, 5), createScore('p2', 2, 3), createScore('p3', 2, 5), createScore('p4', 2, 4),
        createScore('p1', 3, 5), createScore('p2', 3, 3), createScore('p3', 3, 5), createScore('p4', 3, 4),
      ];

      const result = calculateSkins(scores, players, 3, 5);

      expect(result.standings[0].playerId).toBe('p2'); // 2 skins
      expect(result.standings[1].playerId).toBe('p1'); // 1 skin
    });
  });
});

describe('9-hole rounds', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
    createPlayer('p3', 'Charlie'),
    createPlayer('p4', 'Diana'),
  ];

  it('should calculate skins correctly for 9-hole rounds', () => {
    const scores: Score[] = [
      // Hole 1 - Alice wins with birdie
      createScore('p1', 1, 3), createScore('p2', 1, 4), createScore('p3', 1, 4), createScore('p4', 1, 5),
      // Hole 2 - Tie (carryover)
      createScore('p1', 2, 4), createScore('p2', 2, 4), createScore('p3', 2, 5), createScore('p4', 2, 5),
      // Hole 3 - Alice wins with birdie (gets 2 skins from carryover)
      createScore('p1', 3, 3), createScore('p2', 3, 4), createScore('p3', 3, 5), createScore('p4', 3, 4),
      // Hole 4 - Tie (carryover)
      createScore('p1', 4, 4), createScore('p2', 4, 4), createScore('p3', 4, 5), createScore('p4', 4, 5),
      // Hole 5 - Alice wins with birdie (gets 2 skins from carryover)
      createScore('p1', 5, 3), createScore('p2', 5, 4), createScore('p3', 5, 4), createScore('p4', 5, 5),
      // Hole 6 - Tie (carryover)
      createScore('p1', 6, 4), createScore('p2', 6, 4), createScore('p3', 6, 5), createScore('p4', 6, 5),
      // Hole 7 - Alice wins with birdie (gets 2 skins from carryover)
      createScore('p1', 7, 3), createScore('p2', 7, 4), createScore('p3', 7, 5), createScore('p4', 7, 4),
      // Hole 8 - Tie (carryover)
      createScore('p1', 8, 4), createScore('p2', 8, 4), createScore('p3', 8, 5), createScore('p4', 8, 5),
      // Hole 9 - Alice wins with birdie (gets 2 skins from carryover)
      createScore('p1', 9, 3), createScore('p2', 9, 4), createScore('p3', 9, 4), createScore('p4', 9, 5),
    ];

    const result = calculateSkins(scores, players, 9, 2, true);

    // Alice wins holes 1, 3, 5, 7, 9
    // Hole 1: 1 skin (no carryover), Holes 3/5/7/9: 2 skins each (carryover from tied holes)
    // Total skins for Alice: 1 + 2 + 2 + 2 + 2 = 9
    expect(result.standings.find(s => s.playerId === 'p1')?.skins).toBe(9);
    // Bob, Charlie, Diana win no skins
    expect(result.standings.find(s => s.playerId === 'p2')?.skins).toBe(0);
    expect(result.standings.find(s => s.playerId === 'p3')?.skins).toBe(0);
    expect(result.standings.find(s => s.playerId === 'p4')?.skins).toBe(0);
    // No remaining carryover at end
    expect(result.carryover).toBe(0);
  });

  it('should scale the total pot to 9 holes', () => {
    const result = calculateSkins([], players, 9, 1);

    // totalPot = holesPlayed * stakes * numPlayers = 9 * 1 * 4 = 36
    expect(result.totalPot).toBe(36);
    expect(result.potPerSkin).toBe(4); // 4 players * $1
  });
});

describe('getSkinsHoleResult', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
  ];

  it('should return winner info for won hole', () => {
    const results = [{ holeNumber: 1, winnerId: 'p1', value: 2 }];

    const result = getSkinsHoleResult(results, 1, players);

    expect(result.winnerId).toBe('p1');
    expect(result.winnerName).toBe('Alice');
    expect(result.value).toBe(2);
    expect(result.isCarryover).toBe(false);
  });

  it('should indicate carryover for tied hole', () => {
    const results: SkinResult[] = [{ holeNumber: 1, winnerId: null, value: 0 }];

    const result = getSkinsHoleResult(results, 1, players);

    expect(result.winnerId).toBeNull();
    expect(result.isCarryover).toBe(true);
  });

  it('should return default for non-existent hole', () => {
    const results = [{ holeNumber: 1, winnerId: 'p1', value: 1 }];

    const result = getSkinsHoleResult(results, 5, players);

    expect(result.winnerId).toBeNull();
    expect(result.value).toBe(0);
    expect(result.isCarryover).toBe(false);
  });
});

describe('getSkinsHoleContext', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
    createPlayer('p3', 'Charlie'),
    createPlayer('p4', 'Diana'),
  ];

  it('should calculate base pot value with no carryovers', () => {
    const scores: Score[] = [];

    const context = getSkinsHoleContext(scores, players, 1, 5, true, 18);

    expect(context.potValue).toBe(20); // 4 players * $5
    expect(context.carryovers).toBe(0);
    expect(context.message).toBe('$20');
  });

  it('should calculate pot value with carryovers', () => {
    const scores: Score[] = [
      // Hole 1 - Tie
      createScore('p1', 1, 4),
      createScore('p2', 1, 4),
      createScore('p3', 1, 5),
      createScore('p4', 1, 5),
    ];

    const context = getSkinsHoleContext(scores, players, 2, 5, true, 18);

    expect(context.potValue).toBe(40); // $20 base + $20 carryover
    expect(context.carryovers).toBe(1);
    expect(context.message).toBe('$40 (1 carryover)');
  });

  it('should reset carryover counter after a win', () => {
    const scores: Score[] = [
      // Hole 1 - Tie
      createScore('p1', 1, 4), createScore('p2', 1, 4), createScore('p3', 1, 5), createScore('p4', 1, 5),
      // Hole 2 - Alice wins
      createScore('p1', 2, 3), createScore('p2', 2, 4), createScore('p3', 2, 5), createScore('p4', 2, 4),
    ];

    const context = getSkinsHoleContext(scores, players, 3, 5, true, 18);

    expect(context.carryovers).toBe(0);
    expect(context.potValue).toBe(20);
  });
});
