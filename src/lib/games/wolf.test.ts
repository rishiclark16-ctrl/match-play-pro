import { describe, it, expect } from 'vitest';
import {
  getWolfForHole,
  getHuntingOrder,
  calculateWolfHoleResult,
  calculateWolfStandings,
  calculateWolf,
  getWolfHoleContext,
  isWolfDecisionPending,
  calculateWolfSettlements,
  WolfHoleResult,
} from './wolf';
import { Player, Score } from '@/types/golf';

const TEST_ROUND_ID = 'test-round-123';

const createPlayer = (id: string, name: string, orderIndex: number): Player => ({
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

// Standard 4 players in order
const fourPlayers: Player[] = [
  createPlayer('p1', 'Alice', 0),
  createPlayer('p2', 'Bob', 1),
  createPlayer('p3', 'Charlie', 2),
  createPlayer('p4', 'Diana', 3),
];

describe('getWolfForHole', () => {
  it('should return first player for hole 1', () => {
    const wolf = getWolfForHole(fourPlayers, 1);
    expect(wolf?.id).toBe('p1');
    expect(wolf?.name).toBe('Alice');
  });

  it('should return second player for hole 2', () => {
    const wolf = getWolfForHole(fourPlayers, 2);
    expect(wolf?.id).toBe('p2');
  });

  it('should return third player for hole 3', () => {
    const wolf = getWolfForHole(fourPlayers, 3);
    expect(wolf?.id).toBe('p3');
  });

  it('should return fourth player for hole 4', () => {
    const wolf = getWolfForHole(fourPlayers, 4);
    expect(wolf?.id).toBe('p4');
  });

  it('should cycle back to first player for hole 5', () => {
    const wolf = getWolfForHole(fourPlayers, 5);
    expect(wolf?.id).toBe('p1');
  });

  it('should handle hole 9 (second full rotation)', () => {
    const wolf = getWolfForHole(fourPlayers, 9);
    expect(wolf?.id).toBe('p1'); // (9-1) % 4 = 0
  });

  it('should handle hole 18', () => {
    const wolf = getWolfForHole(fourPlayers, 18);
    expect(wolf?.id).toBe('p2'); // (18-1) % 4 = 1
  });

  it('should sort players by orderIndex', () => {
    const shuffledPlayers = [
      createPlayer('p3', 'Charlie', 2),
      createPlayer('p1', 'Alice', 0),
      createPlayer('p4', 'Diana', 3),
      createPlayer('p2', 'Bob', 1),
    ];

    const wolf = getWolfForHole(shuffledPlayers, 1);
    expect(wolf?.id).toBe('p1'); // Still Alice (orderIndex 0)
  });

  it('should return null for non-4-player games', () => {
    const threePlayers = fourPlayers.slice(0, 3);
    expect(getWolfForHole(threePlayers, 1)).toBeNull();
    expect(getWolfForHole([], 1)).toBeNull();
  });
});

describe('getHuntingOrder', () => {
  it('should place wolf last for hole 1', () => {
    const order = getHuntingOrder(fourPlayers, 1);

    expect(order).toHaveLength(4);
    expect(order[3].id).toBe('p1'); // Wolf (Alice) goes last
    expect(order[0].id).toBe('p2'); // First hunter
    expect(order[1].id).toBe('p3'); // Second hunter
    expect(order[2].id).toBe('p4'); // Third hunter
  });

  it('should place wolf last for hole 2', () => {
    const order = getHuntingOrder(fourPlayers, 2);

    expect(order[3].id).toBe('p2'); // Wolf (Bob) goes last
  });

  it('should maintain hunter order', () => {
    const order = getHuntingOrder(fourPlayers, 4);

    // Wolf is Diana (p4), so hunters are Alice, Bob, Charlie in order
    expect(order[0].id).toBe('p1');
    expect(order[1].id).toBe('p2');
    expect(order[2].id).toBe('p3');
    expect(order[3].id).toBe('p4'); // Wolf last
  });

  it('should return players as-is for non-4-player games', () => {
    const threePlayers = fourPlayers.slice(0, 3);
    const order = getHuntingOrder(threePlayers, 1);
    expect(order).toEqual(threePlayers);
  });
});

describe('calculateWolfHoleResult', () => {
  describe('lone wolf scenarios', () => {
    it('should return wolf win when lone wolf has lowest score', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3), // Wolf - lowest
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', null, false, scores, fourPlayers, 4
      );

      expect(result).not.toBeNull();
      expect(result?.winningTeam).toBe('wolf');
      expect(result?.partnerId).toBeNull();
    });

    it('should return hunters win when lone wolf does not have lowest', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Wolf - not lowest
        createScore('p2', 1, 3), // Best hunter
        createScore('p3', 1, 4),
        createScore('p4', 1, 4),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', null, false, scores, fourPlayers, 4
      );

      expect(result?.winningTeam).toBe('hunters');
    });

    it('should return push when lone wolf ties with best hunter', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), // Wolf
        createScore('p2', 1, 4), // Hunter ties
        createScore('p3', 1, 5),
        createScore('p4', 1, 6),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', null, false, scores, fourPlayers, 4
      );

      expect(result?.winningTeam).toBe('push');
      expect(result?.points).toBe(0);
    });

    it('should calculate correct points for lone wolf (4 per hunter)', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', null, false, scores, fourPlayers, 4
      );

      // 4 points per hunter * 3 hunters = 12 points
      expect(result?.points).toBe(12);
    });

    it('should double points for blind wolf', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', null, true, scores, fourPlayers, 4
      );

      // 8 points per hunter * 3 hunters = 24 points
      expect(result?.points).toBe(24);
      expect(result?.isBlindWolf).toBe(true);
    });

    it('should include carryover in points', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', null, false, scores, fourPlayers, 4, false, undefined, 8
      );

      expect(result?.points).toBe(20); // 12 base + 8 carryover
    });
  });

  describe('2v2 scenarios', () => {
    it('should return wolf team win when wolf team has best ball', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), // Wolf
        createScore('p2', 1, 3), // Wolf partner - best
        createScore('p3', 1, 4), // Hunter
        createScore('p4', 1, 5), // Hunter
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', 'p2', false, scores, fourPlayers, 4
      );

      expect(result?.winningTeam).toBe('wolf');
      expect(result?.partnerId).toBe('p2');
    });

    it('should return hunters win when hunters have best ball', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Wolf
        createScore('p2', 1, 5), // Wolf partner
        createScore('p3', 1, 3), // Hunter - best
        createScore('p4', 1, 4), // Hunter
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', 'p2', false, scores, fourPlayers, 4
      );

      expect(result?.winningTeam).toBe('hunters');
    });

    it('should return push when teams tie', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Wolf
        createScore('p2', 1, 4), // Wolf partner - best
        createScore('p3', 1, 4), // Hunter - ties
        createScore('p4', 1, 5), // Hunter
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', 'p2', false, scores, fourPlayers, 4
      );

      expect(result?.winningTeam).toBe('push');
    });

    it('should calculate correct points for 2v2 (2 per player)', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 5),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', 'p2', false, scores, fourPlayers, 4
      );

      // 2 points per player * 2 players = 4 points
      expect(result?.points).toBe(4);
    });

    it('should not allow blind wolf in 2v2', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3),
        createScore('p2', 1, 4),
        createScore('p3', 1, 5),
        createScore('p4', 1, 5),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', 'p2', true, scores, fourPlayers, 4
      );

      expect(result?.isBlindWolf).toBe(false);
    });
  });

  describe('net scoring', () => {
    it('should use net scores when handicap strokes provided', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Wolf: gross 5, net 3 (gets 2 strokes)
        createScore('p2', 1, 4), // Hunter: gross 4
        createScore('p3', 1, 4),
        createScore('p4', 1, 4),
      ];

      const strokesPerHole = new Map([
        ['p1', new Map([[1, 2]])],
      ]);

      const result = calculateWolfHoleResult(
        1, 'p1', null, false, scores, fourPlayers, 4, true, strokesPerHole
      );

      // Wolf net 3 < hunters net 4, wolf wins
      expect(result?.winningTeam).toBe('wolf');
    });
  });

  describe('edge cases', () => {
    it('should return null if not all 4 players scored', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
      ];

      const result = calculateWolfHoleResult(
        1, 'p1', null, false, scores, fourPlayers, 4
      );

      expect(result).toBeNull();
    });

    it('should return null if wolf not found', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4),
        createScore('p2', 1, 5),
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      const result = calculateWolfHoleResult(
        1, 'unknown', null, false, scores, fourPlayers, 4
      );

      expect(result).toBeNull();
    });
  });
});

describe('calculateWolfStandings', () => {
  it('should track times as wolf', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
      { holeNumber: 2, wolfId: 'p2', partnerId: null, isBlindWolf: false, winningTeam: 'hunters', points: 12 },
      { holeNumber: 5, wolfId: 'p1', partnerId: 'p2', isBlindWolf: false, winningTeam: 'wolf', points: 4 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);

    const alice = standings.find(s => s.playerId === 'p1');
    expect(alice?.timesAsWolf).toBe(2);

    const bob = standings.find(s => s.playerId === 'p2');
    expect(bob?.timesAsWolf).toBe(1);
  });

  it('should track lone wolf wins', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
      { holeNumber: 5, wolfId: 'p1', partnerId: 'p2', isBlindWolf: false, winningTeam: 'wolf', points: 4 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);
    const alice = standings.find(s => s.playerId === 'p1');

    expect(alice?.loneWolfWins).toBe(1); // Only the first result was lone wolf
  });

  it('should track blind wolf wins', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: true, winningTeam: 'wolf', points: 24 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);
    const alice = standings.find(s => s.playerId === 'p1');

    expect(alice?.blindWolfWins).toBe(1);
    expect(alice?.loneWolfWins).toBe(1);
  });

  it('should calculate points for lone wolf win', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);

    const alice = standings.find(s => s.playerId === 'p1');
    expect(alice?.totalPoints).toBe(12); // Wolf wins all

    // Each hunter loses 4 points
    const bob = standings.find(s => s.playerId === 'p2');
    expect(bob?.totalPoints).toBe(-4);
  });

  it('should calculate points for 2v2 wolf win', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: 'p2', isBlindWolf: false, winningTeam: 'wolf', points: 4 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);

    const alice = standings.find(s => s.playerId === 'p1');
    const bob = standings.find(s => s.playerId === 'p2');
    expect(alice?.totalPoints).toBe(2); // Half of 4
    expect(bob?.totalPoints).toBe(2);

    const charlie = standings.find(s => s.playerId === 'p3');
    const diana = standings.find(s => s.playerId === 'p4');
    expect(charlie?.totalPoints).toBe(-2);
    expect(diana?.totalPoints).toBe(-2);
  });

  it('should calculate points for hunters win (lone wolf)', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'hunters', points: 12 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);

    const alice = standings.find(s => s.playerId === 'p1');
    expect(alice?.totalPoints).toBe(-12); // Wolf loses all

    // Each hunter wins 4 points
    const bob = standings.find(s => s.playerId === 'p2');
    expect(bob?.totalPoints).toBe(4);
  });

  it('should ignore pushes in point calculation', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'push', points: 0 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);

    standings.forEach(s => {
      expect(s.totalPoints).toBe(0);
    });
  });

  it('should calculate earnings correctly', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 2); // $2 stakes

    const alice = standings.find(s => s.playerId === 'p1');
    expect(alice?.earnings).toBe(24); // 12 points * $2
  });

  it('should sort standings by total points descending', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);

    expect(standings[0].playerId).toBe('p1'); // Winner first
  });

  it('should balance to zero (zero-sum game)', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
      { holeNumber: 2, wolfId: 'p2', partnerId: 'p3', isBlindWolf: false, winningTeam: 'hunters', points: 4 },
    ];

    const standings = calculateWolfStandings(results, fourPlayers, 1);
    const totalPoints = standings.reduce((sum, s) => sum + s.totalPoints, 0);

    expect(totalPoints).toBeCloseTo(0, 2);
  });
});

describe('calculateWolf', () => {
  it('should return complete wolf result', () => {
    const scores: Score[] = [];
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
      { holeNumber: 2, wolfId: 'p2', partnerId: 'p3', isBlindWolf: false, winningTeam: 'hunters', points: 4 },
    ];

    const result = calculateWolf(scores, fourPlayers, results, 1, false, 18);

    expect(result.results).toEqual(results);
    expect(result.standings).toHaveLength(4);
    expect(result.holesPlayed).toBe(2);
  });

  it('should calculate carryover from pushes', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'push', points: 0 },
      { holeNumber: 2, wolfId: 'p2', partnerId: null, isBlindWolf: false, winningTeam: 'push', points: 0 },
    ];

    const result = calculateWolf([], fourPlayers, results, 1, true, 18);

    expect(result.carryover).toBe(8); // 2 pushes * 4 base points
  });

  it('should not carry over when disabled', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'push', points: 0 },
    ];

    const result = calculateWolf([], fourPlayers, results, 1, false, 18);

    expect(result.carryover).toBe(0);
  });
});

describe('getWolfHoleContext', () => {
  it('should identify wolf for current hole', () => {
    const context = getWolfHoleContext(fourPlayers, 1, [], 5, false);

    expect(context).not.toBeNull();
    expect(context?.wolfId).toBe('p1');
    expect(context?.wolfName).toBe('Alice');
  });

  it('should show decision not made when no result', () => {
    const context = getWolfHoleContext(fourPlayers, 1, [], 5, false);

    expect(context?.decisionMade).toBe(false);
    expect(context?.partnerId).toBeNull();
    expect(context?.message).toBe('Alice is Wolf');
  });

  it('should show lone wolf decision', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
    ];

    const context = getWolfHoleContext(fourPlayers, 1, results, 5, false);

    expect(context?.decisionMade).toBe(true);
    expect(context?.isLoneWolf).toBe(true);
    expect(context?.message).toBe('🐺 Lone Wolf!');
  });

  it('should show blind wolf decision', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: true, winningTeam: 'wolf', points: 24 },
    ];

    const context = getWolfHoleContext(fourPlayers, 1, results, 5, false);

    expect(context?.isBlindWolf).toBe(true);
    expect(context?.message).toBe('🐺 Blind Wolf!');
  });

  it('should show partner in 2v2', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: 'p2', isBlindWolf: false, winningTeam: 'wolf', points: 4 },
    ];

    const context = getWolfHoleContext(fourPlayers, 1, results, 5, false);

    expect(context?.partnerId).toBe('p2');
    expect(context?.partnerName).toBe('Bob');
    expect(context?.message).toBe('Partnered with Bob');
  });

  it('should calculate pot value', () => {
    const context = getWolfHoleContext(fourPlayers, 1, [], 5, false);

    expect(context?.potValue).toBe(20); // 5 stakes * 4
  });

  it('should include carryover in pot value', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'push', points: 0 },
    ];

    const context = getWolfHoleContext(fourPlayers, 2, results, 5, true);

    expect(context?.carryovers).toBe(1);
    expect(context?.potValue).toBe(40); // 20 base + 20 carryover
  });

  it('should return null for non-4-player game', () => {
    const threePlayers = fourPlayers.slice(0, 3);
    const context = getWolfHoleContext(threePlayers, 1, [], 5, false);

    expect(context).toBeNull();
  });
});

describe('isWolfDecisionPending', () => {
  it('should return true when scores exist but no result', () => {
    const results: WolfHoleResult[] = [];

    expect(isWolfDecisionPending(1, results, true)).toBe(true);
  });

  it('should return false when result exists', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
    ];

    expect(isWolfDecisionPending(1, results, true)).toBe(false);
  });

  it('should return false when no scores', () => {
    expect(isWolfDecisionPending(1, [], false)).toBe(false);
  });
});

describe('calculateWolfSettlements', () => {
  it('should create settlements from losers to winners', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
    ];

    const settlements = calculateWolfSettlements(results, fourPlayers, 2);

    expect(settlements.length).toBeGreaterThan(0);

    // Check that all settlements go to Alice (the winner)
    settlements.forEach(s => {
      expect(s.toPlayerId).toBe('p1');
    });
  });

  it('should handle multiple winners and losers', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: 'p2', isBlindWolf: false, winningTeam: 'wolf', points: 4 },
    ];

    const settlements = calculateWolfSettlements(results, fourPlayers, 2);

    // Settlements should be from losers (p3/p4) to winners (p1/p2)
    // The algorithm pairs winners with losers - verify total flow is correct
    expect(settlements.length).toBeGreaterThan(0);

    const losersInSettlements = new Set(settlements.map(s => s.fromPlayerId));
    expect(losersInSettlements.has('p3') || losersInSettlements.has('p4')).toBe(true);

    const winnersInSettlements = new Set(settlements.map(s => s.toPlayerId));
    expect(winnersInSettlements.has('p1') || winnersInSettlements.has('p2')).toBe(true);
  });

  it('should return empty array when all zero', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'push', points: 0 },
    ];

    const settlements = calculateWolfSettlements(results, fourPlayers, 2);

    expect(settlements).toHaveLength(0);
  });

  it('should round amounts to 2 decimal places', () => {
    const results: WolfHoleResult[] = [
      { holeNumber: 1, wolfId: 'p1', partnerId: null, isBlindWolf: false, winningTeam: 'wolf', points: 12 },
    ];

    const settlements = calculateWolfSettlements(results, fourPlayers, 0.33);

    settlements.forEach(s => {
      const decimals = (s.amount.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });
});
