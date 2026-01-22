import { describe, it, expect } from 'vitest';
import {
  calculateNassau,
  canPress,
  createPress,
  formatNassauStatus,
  checkAutoPress,
  getNassauHoleContext
} from './nassau';
import { Player, Score, Press } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

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

describe('calculateNassau', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
  ];

  describe('front 9 calculation', () => {
    it('should determine front 9 winner correctly', () => {
      const scores: Score[] = [];
      // Alice shoots better on front 9 (lower total)
      for (let hole = 1; hole <= 9; hole++) {
        scores.push(createScore('p1', hole, 4)); // Alice: 36 total
        scores.push(createScore('p2', hole, 5)); // Bob: 45 total
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.front9.winnerId).toBe('p1');
      expect(result.front9.holesPlayed).toBe(9);
    });

    it('should handle front 9 tie', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 9; hole++) {
        scores.push(createScore('p1', hole, 4));
        scores.push(createScore('p2', hole, 4));
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.front9.winnerId).toBeNull();
      expect(result.front9.margin).toBe(0);
    });
  });

  describe('back 9 calculation', () => {
    it('should determine back 9 winner correctly', () => {
      const scores: Score[] = [];
      // Front 9 - tie
      for (let hole = 1; hole <= 9; hole++) {
        scores.push(createScore('p1', hole, 4));
        scores.push(createScore('p2', hole, 4));
      }
      // Back 9 - Bob wins
      for (let hole = 10; hole <= 18; hole++) {
        scores.push(createScore('p1', hole, 5));
        scores.push(createScore('p2', hole, 4));
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.back9.winnerId).toBe('p2');
      expect(result.back9.holesPlayed).toBe(9);
    });
  });

  describe('overall calculation', () => {
    it('should determine overall winner correctly', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 18; hole++) {
        scores.push(createScore('p1', hole, 4)); // Alice: 72
        scores.push(createScore('p2', hole, 5)); // Bob: 90
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.overall.winnerId).toBe('p1');
      expect(result.overall.margin).toBe(18); // 18 strokes difference
    });

    it('should handle overall tie', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 18; hole++) {
        scores.push(createScore('p1', hole, 4));
        scores.push(createScore('p2', hole, 4));
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.overall.winnerId).toBeNull();
    });
  });

  describe('settlements', () => {
    it('should create settlement for front 9 winner when complete', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 9; hole++) {
        scores.push(createScore('p1', hole, 4));
        scores.push(createScore('p2', hole, 5));
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.settlements).toHaveLength(1);
      expect(result.settlements[0].fromPlayerId).toBe('p2');
      expect(result.settlements[0].toPlayerId).toBe('p1');
      expect(result.settlements[0].amount).toBe(10);
      expect(result.settlements[0].description).toBe('Front 9');
    });

    it('should create all three settlements when all segments complete', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 18; hole++) {
        scores.push(createScore('p1', hole, 4)); // Alice wins all
        scores.push(createScore('p2', hole, 5));
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.settlements).toHaveLength(3);

      const descriptions = result.settlements.map(s => s.description);
      expect(descriptions).toContain('Front 9');
      expect(descriptions).toContain('Back 9');
      expect(descriptions).toContain('Overall');
    });

    it('should not create settlement for tied segments', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 18; hole++) {
        scores.push(createScore('p1', hole, 4));
        scores.push(createScore('p2', hole, 4));
      }

      const result = calculateNassau(scores, players, 10, [], 18);

      expect(result.settlements).toHaveLength(0);
    });
  });

  describe('press handling', () => {
    it('should calculate press settlements', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 18; hole++) {
        scores.push(createScore('p1', hole, 4));
        scores.push(createScore('p2', hole, 5));
      }

      const presses: Press[] = [{
        id: 'press1',
        startHole: 10,
        initiatedBy: 'p2',
        stakes: 10,
        status: 'active',
      }];

      const result = calculateNassau(scores, players, 10, presses, 18);

      // Alice wins the press too (holes 10-18)
      const pressSettlement = result.settlements.find(s => s.description?.includes('Press'));
      expect(pressSettlement).toBeDefined();
      expect(pressSettlement?.toPlayerId).toBe('p1');
    });
  });

  describe('net scoring', () => {
    it('should use net scores when strokesPerHole provided', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 9; hole++) {
        scores.push(createScore('p1', hole, 5)); // Gross 5
        scores.push(createScore('p2', hole, 4)); // Gross 4
      }

      // p1 gets 1 stroke on each hole
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1]])],
        ['p2', new Map()],
      ]);

      const result = calculateNassau(scores, players, 10, [], 18, strokesPerHole);

      // With strokes, both have net 36 on front 9 - should be tie
      expect(result.front9.winnerId).toBeNull();
    });
  });

  describe('9-hole rounds', () => {
    it('should handle 9-hole rounds correctly', () => {
      const scores: Score[] = [];
      for (let hole = 1; hole <= 9; hole++) {
        scores.push(createScore('p1', hole, 4));
        scores.push(createScore('p2', hole, 5));
      }

      const result = calculateNassau(scores, players, 10, [], 9);

      expect(result.front9.holesPlayed).toBe(9);
      expect(result.back9.holesPlayed).toBe(0);
      expect(result.overall.holesPlayed).toBe(9);
    });
  });
});

describe('canPress', () => {
  it('should allow press when 2+ down', () => {
    const existingPresses: Press[] = [];

    expect(canPress(10, -2, existingPresses, 18)).toBe(true);
    expect(canPress(10, -3, existingPresses, 18)).toBe(true);
  });

  it('should not allow press when less than 2 down', () => {
    const existingPresses: Press[] = [];

    expect(canPress(10, -1, existingPresses, 18)).toBe(false);
    expect(canPress(10, 0, existingPresses, 18)).toBe(false);
  });

  it('should not allow more than 3 presses', () => {
    const existingPresses: Press[] = [
      { id: '1', startHole: 5, initiatedBy: 'p1', stakes: 10, status: 'active' },
      { id: '2', startHole: 8, initiatedBy: 'p1', stakes: 10, status: 'active' },
      { id: '3', startHole: 12, initiatedBy: 'p1', stakes: 10, status: 'active' },
    ];

    expect(canPress(15, -2, existingPresses, 18)).toBe(false);
  });

  it('should not allow press on last hole', () => {
    expect(canPress(18, -2, [], 18)).toBe(false);
    expect(canPress(9, -2, [], 9)).toBe(false);
  });
});

describe('createPress', () => {
  it('should create press with correct properties', () => {
    const press = createPress('p1', 10, 15);

    expect(press.startHole).toBe(10);
    expect(press.initiatedBy).toBe('p1');
    expect(press.stakes).toBe(15);
    expect(press.status).toBe('active');
    expect(press.id).toBeDefined();
  });
});

describe('formatNassauStatus', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
  ];

  it('should format leader status correctly', () => {
    const status = formatNassauStatus('p1', 3, players);
    expect(status).toBe('Alice 3 UP');
  });

  it('should return "All square" for tie', () => {
    expect(formatNassauStatus(null, 0, players)).toBe('All square');
  });

  it('should return "All square" for zero margin', () => {
    expect(formatNassauStatus('p1', 0, players)).toBe('All square');
  });
});

describe('checkAutoPress', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
  ];

  it('should trigger auto-press when player goes 2 down', () => {
    const scores: Score[] = [];
    // Alice wins first 2 holes
    scores.push(createScore('p1', 1, 3), createScore('p2', 1, 4));
    scores.push(createScore('p1', 2, 3), createScore('p2', 2, 4));

    const press = checkAutoPress(scores, players, 10, [], 18);

    expect(press).not.toBeNull();
    expect(press?.initiatedBy).toBe('p2'); // Bob is 2 down
    expect(press?.startHole).toBe(3); // Press starts next hole
  });

  it('should not trigger if already pressed', () => {
    const scores: Score[] = [];
    scores.push(createScore('p1', 1, 3), createScore('p2', 1, 4));
    scores.push(createScore('p1', 2, 3), createScore('p2', 2, 4));

    const existingPresses: Press[] = [{
      id: '1',
      startHole: 3,
      initiatedBy: 'p2',
      stakes: 10,
      status: 'active',
    }];

    const press = checkAutoPress(scores, players, 10, existingPresses, 18);

    expect(press).toBeNull();
  });

  it('should not trigger on last hole', () => {
    const scores: Score[] = [];
    for (let hole = 1; hole <= 18; hole++) {
      scores.push(createScore('p1', hole, 3), createScore('p2', hole, 4));
    }

    const press = checkAutoPress(scores, players, 10, [], 18);

    expect(press).toBeNull();
  });

  it('should not trigger for more than 2 players', () => {
    const threePlayers: Player[] = [
      createPlayer('p1', 'Alice'),
      createPlayer('p2', 'Bob'),
      createPlayer('p3', 'Charlie'),
    ];

    const scores: Score[] = [];
    scores.push(createScore('p1', 1, 3), createScore('p2', 1, 4), createScore('p3', 1, 5));
    scores.push(createScore('p1', 2, 3), createScore('p2', 2, 4), createScore('p3', 2, 5));

    const press = checkAutoPress(scores, threePlayers, 10, [], 18);

    expect(press).toBeNull();
  });
});

describe('getNassauHoleContext', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
  ];

  it('should return correct segment for front 9', () => {
    const context = getNassauHoleContext([], players, 5, 10, [], 18);
    expect(context.segment).toBe('Front 9');
  });

  it('should return correct segment for back 9', () => {
    const context = getNassauHoleContext([], players, 12, 10, [], 18);
    expect(context.segment).toBe('Back 9');
  });

  it('should indicate critical urgency when must win', () => {
    const scores: Score[] = [];
    // Alice is 3 up after 6 holes
    for (let hole = 1; hole <= 6; hole++) {
      scores.push(createScore('p1', hole, 3));
      scores.push(createScore('p2', hole, 4));
    }

    const context = getNassauHoleContext(scores, players, 7, 10, [], 18);

    expect(context.urgency).toBe('critical');
  });

  it('should indicate opportunity for win to go 1 up', () => {
    const scores: Score[] = [];
    // All square
    for (let hole = 1; hole <= 3; hole++) {
      scores.push(createScore('p1', hole, 4));
      scores.push(createScore('p2', hole, 4));
    }

    const context = getNassauHoleContext(scores, players, 4, 10, [], 18);

    expect(context.urgency).toBe('opportunity');
    expect(context.message).toBe('Win to go 1 UP');
  });
});
