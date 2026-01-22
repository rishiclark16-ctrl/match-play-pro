import { describe, it, expect } from 'vitest';
import {
  calculateMatchPlay,
  getMatchPlayStatusBrief,
  getMatchPlayStatusColor,
  StrokesPerHoleMap,
} from './matchPlay';
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

const nineHoles: HoleInfo[] = Array.from({ length: 9 }, (_, i) =>
  createHoleInfo(i + 1, i % 3 === 2 ? 3 : i % 3 === 0 ? 5 : 4)
);

const eighteenHoles: HoleInfo[] = Array.from({ length: 18 }, (_, i) =>
  createHoleInfo(i + 1, i % 3 === 2 ? 3 : i % 3 === 0 ? 5 : 4)
);

const twoPlayers: Player[] = [
  createPlayer('p1', 'Jack'),
  createPlayer('p2', 'Tim'),
];

describe('calculateMatchPlay', () => {
  describe('basic hole results', () => {
    it('should determine hole winner by lower net score', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
      ];

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.holeResults).toHaveLength(1);
      expect(result.holeResults[0].winnerId).toBe('p1');
    });

    it('should halve hole when scores are equal', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 4),
      ];

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.holeResults[0].winnerId).toBeNull();
    });

    it('should track gross and net scores', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5),
        createScore('p2', 1, 4),
      ];

      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 1]])], // p1 gets 1 stroke on hole 1
      ]);

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, strokesPerHole, 9);

      expect(result.holeResults[0].grossScores['p1']).toBe(5);
      expect(result.holeResults[0].netScores['p1']).toBe(4); // 5 - 1
      expect(result.holeResults[0].strokesReceived['p1']).toBe(1);
      expect(result.holeResults[0].netScores['p2']).toBe(4);
    });

    it('should use net scores for determining winner', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Gross 5
        createScore('p2', 1, 4), // Gross 4
      ];

      // p1 gets 2 strokes, so net is 3
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 2]])],
      ]);

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, strokesPerHole, 9);

      // p1 net 3 < p2 net 4, so p1 wins
      expect(result.holeResults[0].winnerId).toBe('p1');
    });
  });

  describe('match status', () => {
    it('should show not_started when no scores', () => {
      const result = calculateMatchPlay([], twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('not_started');
      expect(result.holesPlayed).toBe(0);
      expect(result.statusText).toBe('Match not started');
    });

    it('should show All Square when tied', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
        createScore('p1', 2, 5),
        createScore('p2', 2, 4),
      ];

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.holesUp).toBe(0);
      expect(result.leaderId).toBeNull();
      expect(result.statusText).toBe('All Square');
    });

    it('should show leader with holes up', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 5),
        createScore('p1', 2, 4),
        createScore('p2', 2, 5),
      ];

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.leaderId).toBe('p1');
      expect(result.holesUp).toBe(2);
      expect(result.statusText).toBe('Jack 2 UP');
    });

    it('should handle other player leading', () => {
      const scores: Score[] = [
        createScore('p1', 1, 6),
        createScore('p2', 1, 4),
      ];

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.leaderId).toBe('p2');
      expect(result.statusText).toBe('Tim 1 UP');
    });
  });

  describe('dormie status', () => {
    it('should show dormie when up by holes remaining', () => {
      // 7 holes played, 2 remaining, p1 is 2 up
      const scores: Score[] = [];
      for (let i = 1; i <= 7; i++) {
        if (i <= 2) {
          // p1 wins first 2 holes
          scores.push(createScore('p1', i, 3));
          scores.push(createScore('p2', i, 5));
        } else {
          // Rest are halved
          scores.push(createScore('p1', i, 4));
          scores.push(createScore('p2', i, 4));
        }
      }

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('dormie');
      expect(result.holesUp).toBe(2);
      expect(result.holesRemaining).toBe(2);
      expect(result.statusText).toContain('Dormie');
    });

    it('should show dormie when 1 up with 1 to play', () => {
      const scores: Score[] = [];
      // 8 holes, p1 wins just 1
      for (let i = 1; i <= 8; i++) {
        if (i === 1) {
          scores.push(createScore('p1', i, 3));
          scores.push(createScore('p2', i, 5));
        } else {
          scores.push(createScore('p1', i, 4));
          scores.push(createScore('p2', i, 4));
        }
      }

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('dormie');
      expect(result.statusText).toBe('Jack 1 UP (Dormie)');
    });
  });

  describe('match won', () => {
    it('should declare winner when mathematically won', () => {
      // p1 wins 6 of first 7 holes (6 up with 2 to play)
      const scores: Score[] = [];
      for (let i = 1; i <= 7; i++) {
        if (i <= 6) {
          scores.push(createScore('p1', i, 3));
          scores.push(createScore('p2', i, 5));
        } else {
          scores.push(createScore('p1', i, 4));
          scores.push(createScore('p2', i, 4));
        }
      }

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('won');
      expect(result.winnerId).toBe('p1');
      expect(result.winMargin).toBe('6&2'); // 6 up with 2 to play
    });

    it('should show correct margin for close finish', () => {
      // p1 wins 3 of first 7 (3 up with 2 to play = won 3&2)
      const scores: Score[] = [];
      for (let i = 1; i <= 7; i++) {
        if (i <= 3) {
          scores.push(createScore('p1', i, 3));
          scores.push(createScore('p2', i, 5));
        } else {
          scores.push(createScore('p1', i, 4));
          scores.push(createScore('p2', i, 4));
        }
      }

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('won');
      expect(result.winMargin).toBe('3&2');
      expect(result.statusText).toBe('Jack wins 3&2');
    });

    it('should show 1 UP for winning on final hole', () => {
      // All 9 holes played, p1 wins by 1
      const scores: Score[] = [];
      for (let i = 1; i <= 9; i++) {
        if (i === 1) {
          scores.push(createScore('p1', i, 3));
          scores.push(createScore('p2', i, 5));
        } else {
          scores.push(createScore('p1', i, 4));
          scores.push(createScore('p2', i, 4));
        }
      }

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('won');
      expect(result.winMargin).toBe('1 UP');
    });
  });

  describe('match halved', () => {
    it('should show halved when all holes played and tied', () => {
      const scores: Score[] = [];
      for (let i = 1; i <= 9; i++) {
        scores.push(createScore('p1', i, 4));
        scores.push(createScore('p2', i, 4));
      }

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('halved');
      expect(result.statusText).toBe('Match Halved');
      expect(result.winnerId).toBeNull();
    });

    it('should show halved when wins cancel out', () => {
      const scores: Score[] = [];
      for (let i = 1; i <= 9; i++) {
        if (i <= 4) {
          // p1 wins first 4
          scores.push(createScore('p1', i, 3));
          scores.push(createScore('p2', i, 5));
        } else if (i <= 8) {
          // p2 wins next 4
          scores.push(createScore('p1', i, 5));
          scores.push(createScore('p2', i, 3));
        } else {
          // Last hole halved
          scores.push(createScore('p1', i, 4));
          scores.push(createScore('p2', i, 4));
        }
      }

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('halved');
    });
  });

  describe('18-hole match', () => {
    it('should handle 18-hole match correctly', () => {
      const scores: Score[] = [];
      // p1 wins first 10 holes (10 up with 8 to play = won 10&8)
      for (let i = 1; i <= 10; i++) {
        scores.push(createScore('p1', i, 3));
        scores.push(createScore('p2', i, 5));
      }

      const result = calculateMatchPlay(scores, twoPlayers, eighteenHoles, undefined, 18);

      expect(result.matchStatus).toBe('won');
      expect(result.winnerId).toBe('p1');
      expect(result.winMargin).toBe('10&8');
    });
  });

  describe('edge cases', () => {
    it('should require exactly 2 players', () => {
      const threePlayers = [
        createPlayer('p1', 'A'),
        createPlayer('p2', 'B'),
        createPlayer('p3', 'C'),
      ];

      const result = calculateMatchPlay([], threePlayers, nineHoles, undefined, 9);

      expect(result.matchStatus).toBe('not_started');
      expect(result.statusText).toBe('Match Play requires 2 players');
    });

    it('should skip holes where both players have not scored', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        // p2 hasn't scored hole 1
        createScore('p1', 2, 4),
        createScore('p2', 2, 5),
      ];

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      // Only hole 2 should be counted
      expect(result.holesPlayed).toBe(1);
      expect(result.holeResults).toHaveLength(1);
      expect(result.holeResults[0].holeNumber).toBe(2);
    });

    it('should handle strokesPerHole being undefined', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
      ];

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

      expect(result.holeResults[0].strokesReceived['p1']).toBe(0);
      expect(result.holeResults[0].strokesReceived['p2']).toBe(0);
    });

    it('should handle empty strokesPerHole map', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
      ];

      const emptyMap: StrokesPerHoleMap = new Map();

      const result = calculateMatchPlay(scores, twoPlayers, nineHoles, emptyMap, 9);

      expect(result.holeResults[0].netScores['p1']).toBe(4);
    });
  });
});

describe('getMatchPlayStatusBrief', () => {
  it('should return win margin for won match', () => {
    const result = calculateMatchPlay(
      [
        ...Array.from({ length: 7 }, (_, i) => [
          createScore('p1', i + 1, 3),
          createScore('p2', i + 1, 5),
        ]).flat(),
      ],
      twoPlayers,
      nineHoles,
      undefined,
      9
    );

    expect(getMatchPlayStatusBrief(result)).toBe('7&2');
  });

  it('should return Halved for halved match', () => {
    const scores = Array.from({ length: 9 }, (_, i) => [
      createScore('p1', i + 1, 4),
      createScore('p2', i + 1, 4),
    ]).flat();

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

    expect(getMatchPlayStatusBrief(result)).toBe('Halved');
  });

  it('should return AS for all square', () => {
    const scores: Score[] = [
      createScore('p1', 1, 4),
      createScore('p2', 1, 5),
      createScore('p1', 2, 5),
      createScore('p2', 2, 4),
    ];

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

    expect(getMatchPlayStatusBrief(result)).toBe('AS');
  });

  it('should return X UP for ongoing match', () => {
    const scores: Score[] = [
      createScore('p1', 1, 3),
      createScore('p2', 1, 5),
      createScore('p1', 2, 3),
      createScore('p2', 2, 5),
    ];

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

    expect(getMatchPlayStatusBrief(result)).toBe('2 UP');
  });
});

describe('getMatchPlayStatusColor', () => {
  it('should return muted for halved match', () => {
    const scores = Array.from({ length: 9 }, (_, i) => [
      createScore('p1', i + 1, 4),
      createScore('p2', i + 1, 4),
    ]).flat();

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

    expect(getMatchPlayStatusColor(result, 'p1')).toBe('text-muted-foreground');
    expect(getMatchPlayStatusColor(result, 'p2')).toBe('text-muted-foreground');
  });

  it('should return muted for all square', () => {
    const scores: Score[] = [
      createScore('p1', 1, 4),
      createScore('p2', 1, 5),
      createScore('p1', 2, 5),
      createScore('p2', 2, 4),
    ];

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

    expect(getMatchPlayStatusColor(result, 'p1')).toBe('text-muted-foreground');
  });

  it('should return success for leader', () => {
    const scores: Score[] = [
      createScore('p1', 1, 3),
      createScore('p2', 1, 5),
    ];

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

    expect(getMatchPlayStatusColor(result, 'p1')).toBe('text-success');
  });

  it('should return danger for trailer', () => {
    const scores: Score[] = [
      createScore('p1', 1, 3),
      createScore('p2', 1, 5),
    ];

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, undefined, 9);

    expect(getMatchPlayStatusColor(result, 'p2')).toBe('text-danger');
  });
});

describe('net scoring scenarios', () => {
  it('should flip hole winner with handicap strokes', () => {
    const scores: Score[] = [
      createScore('p1', 1, 6), // Gross 6
      createScore('p2', 1, 5), // Gross 5
    ];

    // p1 gets 2 strokes on hole 1
    const strokesPerHole: StrokesPerHoleMap = new Map([
      ['p1', new Map([[1, 2]])],
    ]);

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, strokesPerHole, 9);

    // p1 net 4 < p2 net 5, p1 wins despite higher gross
    expect(result.holeResults[0].winnerId).toBe('p1');
    expect(result.leaderId).toBe('p1');
  });

  it('should handle both players receiving strokes', () => {
    const scores: Score[] = [
      createScore('p1', 1, 6),
      createScore('p2', 1, 5),
    ];

    // p1 gets 2, p2 gets 1
    const strokesPerHole: StrokesPerHoleMap = new Map([
      ['p1', new Map([[1, 2]])],
      ['p2', new Map([[1, 1]])],
    ]);

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, strokesPerHole, 9);

    // p1 net 4, p2 net 4 = halved
    expect(result.holeResults[0].winnerId).toBeNull();
  });

  it('should track strokes per hole correctly across multiple holes', () => {
    const scores: Score[] = [
      createScore('p1', 1, 5),
      createScore('p2', 1, 4),
      createScore('p1', 2, 5),
      createScore('p2', 2, 5),
    ];

    // p1 gets 1 stroke on hole 1 only
    const strokesPerHole: StrokesPerHoleMap = new Map([
      ['p1', new Map([[1, 1]])],
    ]);

    const result = calculateMatchPlay(scores, twoPlayers, nineHoles, strokesPerHole, 9);

    // Hole 1: p1 net 4 = p2 net 4 = halved
    expect(result.holeResults[0].winnerId).toBeNull();

    // Hole 2: p1 net 5 = p2 net 5 = halved (no strokes on hole 2)
    expect(result.holeResults[1].winnerId).toBeNull();
    expect(result.holeResults[1].strokesReceived['p1']).toBe(0);
  });
});
