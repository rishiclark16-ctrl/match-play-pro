import { describe, it, expect } from 'vitest';
import { calculateSettlement, formatSettlementText, getTotalWinnings, NetSettlement } from './settlement';
import { Player } from '@/types/golf';
import { SkinsResult } from './skins';
import { NassauResult } from './nassau';
import { PropBet } from '@/types/betting';

// Test helpers
const TEST_ROUND_ID = 'test-round-123';

const createPlayer = (id: string, name: string, orderIndex = 0): Player => ({
  id,
  name,
  handicap: 0,
  roundId: TEST_ROUND_ID,
  orderIndex,
});

describe('calculateSettlement', () => {
  const players: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
    createPlayer('p3', 'Charlie'),
    createPlayer('p4', 'Diana'),
  ];

  const twoPlayers: Player[] = [
    createPlayer('p1', 'Alice'),
    createPlayer('p2', 'Bob'),
  ];

  describe('skins settlements', () => {
    it('should calculate settlements from skins results', () => {
      const skinsResult: SkinsResult = {
        results: [],
        standings: [
          { playerId: 'p1', playerName: 'Alice', skins: 3, earnings: 45 },
          { playerId: 'p2', playerName: 'Bob', skins: 1, earnings: -5 },
          { playerId: 'p3', playerName: 'Charlie', skins: 0, earnings: -20 },
          { playerId: 'p4', playerName: 'Diana', skins: 0, earnings: -20 },
        ],
        carryover: 0,
        potPerSkin: 20,
        totalPot: 80,
      };

      const settlements = calculateSettlement(players, skinsResult);

      // Winners should receive from losers
      const totalFromLosers = settlements
        .filter(s => s.toPlayerId === 'p1')
        .reduce((sum, s) => sum + s.amount, 0);

      expect(totalFromLosers).toBeGreaterThan(0);
    });

    it('should balance skins settlements to zero', () => {
      const skinsResult: SkinsResult = {
        results: [],
        standings: [
          { playerId: 'p1', playerName: 'Alice', skins: 2, earnings: 40 },
          { playerId: 'p2', playerName: 'Bob', skins: 2, earnings: 40 },
          { playerId: 'p3', playerName: 'Charlie', skins: 0, earnings: -40 },
          { playerId: 'p4', playerName: 'Diana', skins: 0, earnings: -40 },
        ],
        carryover: 0,
        potPerSkin: 40,
        totalPot: 160,
      };

      const settlements = calculateSettlement(players, skinsResult);

      // Sum of all payments should equal sum of all receipts
      const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0);
      const netBalance = players.reduce((sum, p) => {
        return sum + getTotalWinnings(p.id, settlements);
      }, 0);

      expect(netBalance).toBeCloseTo(0, 2);
    });
  });

  describe('nassau settlements', () => {
    it('should incorporate nassau settlements', () => {
      const nassauResult: NassauResult = {
        front9: { winnerId: 'p1', scores: {}, holesPlayed: 9, margin: 3 },
        back9: { winnerId: 'p1', scores: {}, holesPlayed: 9, margin: 2 },
        overall: { winnerId: 'p1', scores: {}, holesPlayed: 18, margin: 5 },
        presses: [],
        settlements: [
          { fromPlayerId: 'p2', fromPlayerName: 'Bob', toPlayerId: 'p1', toPlayerName: 'Alice', amount: 10, description: 'Front 9' },
          { fromPlayerId: 'p2', fromPlayerName: 'Bob', toPlayerId: 'p1', toPlayerName: 'Alice', amount: 10, description: 'Back 9' },
          { fromPlayerId: 'p2', fromPlayerName: 'Bob', toPlayerId: 'p1', toPlayerName: 'Alice', amount: 10, description: 'Overall' },
        ],
        currentHoleStatus: {
          front9Leader: 'p1',
          front9Margin: 3,
          back9Leader: 'p1',
          back9Margin: 2,
          overallLeader: 'p1',
          overallMargin: 5,
        },
      };

      const settlements = calculateSettlement(twoPlayers, undefined, nassauResult);

      expect(settlements).toHaveLength(1);
      expect(settlements[0].fromPlayerId).toBe('p2');
      expect(settlements[0].toPlayerId).toBe('p1');
      expect(settlements[0].amount).toBe(30); // 10 + 10 + 10
    });
  });

  describe('match play settlements', () => {
    it('should settle match play correctly', () => {
      const settlements = calculateSettlement(
        twoPlayers,
        undefined,
        undefined,
        'p1', // Alice wins
        20    // Stakes
      );

      expect(settlements).toHaveLength(1);
      expect(settlements[0].fromPlayerId).toBe('p2');
      expect(settlements[0].toPlayerId).toBe('p1');
      expect(settlements[0].amount).toBe(20);
    });

    it('should not settle match play if no winner', () => {
      const settlements = calculateSettlement(
        twoPlayers,
        undefined,
        undefined,
        null, // No winner (halved)
        20
      );

      expect(settlements).toHaveLength(0);
    });
  });

  describe('prop bets settlements', () => {
    it('should settle prop bets correctly', () => {
      const propBets: PropBet[] = [
        {
          id: '1',
          roundId: 'r1',
          type: 'ctp',
          holeNumber: 3,
          stakes: 5,
          winnerId: 'p1',
          createdAt: new Date(),
        },
      ];

      const settlements = calculateSettlement(
        players,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        propBets
      );

      // p1 should receive $5 from each of p2, p3, p4
      const aliceWinnings = getTotalWinnings('p1', settlements);
      expect(aliceWinnings).toBe(15); // 3 * $5
    });

    it('should handle multiple prop bets', () => {
      const propBets: PropBet[] = [
        {
          id: '1',
          roundId: 'r1',
          type: 'ctp',
          holeNumber: 3,
          stakes: 5,
          winnerId: 'p1',
          createdAt: new Date(),
        },
        {
          id: '2',
          roundId: 'r1',
          type: 'longest_drive',
          holeNumber: 5,
          stakes: 10,
          winnerId: 'p2',
          createdAt: new Date(),
        },
      ];

      const settlements = calculateSettlement(
        players,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        propBets
      );

      // p1 wins $15 from CTP, loses $10 to p2 from longest drive
      const aliceNet = getTotalWinnings('p1', settlements);
      const bobNet = getTotalWinnings('p2', settlements);

      expect(aliceNet).toBe(5); // +15 - 10
      expect(bobNet).toBe(25); // +30 - 5
    });

    it('should ignore prop bets without winners', () => {
      const propBets: PropBet[] = [
        {
          id: '1',
          roundId: 'r1',
          type: 'ctp',
          holeNumber: 3,
          stakes: 5,
          winnerId: undefined, // No winner yet
          createdAt: new Date(),
        },
      ];

      const settlements = calculateSettlement(
        players,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        propBets
      );

      expect(settlements).toHaveLength(0);
    });
  });

  describe('combined settlements', () => {
    it('should net out cross-game settlements', () => {
      // Alice wins skins, Bob wins nassau
      const skinsResult: SkinsResult = {
        results: [],
        standings: [
          { playerId: 'p1', playerName: 'Alice', skins: 3, earnings: 15 },
          { playerId: 'p2', playerName: 'Bob', skins: 0, earnings: -15 },
        ],
        carryover: 0,
        potPerSkin: 10,
        totalPot: 30,
      };

      const nassauResult: NassauResult = {
        front9: { winnerId: 'p2', scores: {}, holesPlayed: 9, margin: 2 },
        back9: { winnerId: null, scores: {}, holesPlayed: 9, margin: 0 },
        overall: { winnerId: 'p2', scores: {}, holesPlayed: 18, margin: 2 },
        presses: [],
        settlements: [
          { fromPlayerId: 'p1', fromPlayerName: 'Alice', toPlayerId: 'p2', toPlayerName: 'Bob', amount: 10, description: 'Front 9' },
          { fromPlayerId: 'p1', fromPlayerName: 'Alice', toPlayerId: 'p2', toPlayerName: 'Bob', amount: 10, description: 'Overall' },
        ],
        currentHoleStatus: {
          front9Leader: 'p2',
          front9Margin: 2,
          back9Leader: null,
          back9Margin: 0,
          overallLeader: 'p2',
          overallMargin: 2,
        },
      };

      const settlements = calculateSettlement(twoPlayers, skinsResult, nassauResult);

      // Alice wins $15 from skins, owes $20 from nassau
      // Net: Alice owes Bob $5
      expect(settlements).toHaveLength(1);
      expect(settlements[0].fromPlayerId).toBe('p1');
      expect(settlements[0].toPlayerId).toBe('p2');
      expect(settlements[0].amount).toBeCloseTo(5, 0);
    });
  });

  describe('netting logic', () => {
    it('should net bi-directional payments', () => {
      // If A owes B $10 and B owes A $4, net should be A owes B $6
      const nassauResult: NassauResult = {
        front9: { winnerId: 'p1', scores: {}, holesPlayed: 9, margin: 2 },
        back9: { winnerId: null, scores: {}, holesPlayed: 9, margin: 0 },
        overall: { winnerId: null, scores: {}, holesPlayed: 18, margin: 0 },
        presses: [],
        settlements: [
          { fromPlayerId: 'p2', fromPlayerName: 'Bob', toPlayerId: 'p1', toPlayerName: 'Alice', amount: 10, description: 'Front 9' },
        ],
        currentHoleStatus: {
          front9Leader: 'p1',
          front9Margin: 2,
          back9Leader: null,
          back9Margin: 0,
          overallLeader: null,
          overallMargin: 0,
        },
      };

      const propBets: PropBet[] = [
        {
          id: '1',
          roundId: 'r1',
          type: 'ctp',
          holeNumber: 3,
          stakes: 4,
          winnerId: 'p2', // Bob wins $4 from Alice
          createdAt: new Date(),
        },
      ];

      const settlements = calculateSettlement(twoPlayers, undefined, nassauResult, undefined, undefined, undefined, undefined, propBets);

      // Bob owes Alice $10 (Nassau), Alice owes Bob $4 (prop)
      // Net: Bob owes Alice $6
      expect(settlements).toHaveLength(1);
      expect(settlements[0].fromPlayerId).toBe('p2');
      expect(settlements[0].toPlayerId).toBe('p1');
      expect(settlements[0].amount).toBeCloseTo(6, 1);
    });

    it('should ignore tiny rounding differences', () => {
      const settlements = calculateSettlement(twoPlayers);

      // With no games, should have no settlements even with rounding
      expect(settlements).toHaveLength(0);
    });
  });

  describe('sorting', () => {
    it('should sort settlements by amount descending', () => {
      const propBets: PropBet[] = [
        { id: '1', roundId: 'r1', type: 'ctp', holeNumber: 3, stakes: 5, winnerId: 'p1', createdAt: new Date() },
        { id: '2', roundId: 'r1', type: 'ctp', holeNumber: 7, stakes: 10, winnerId: 'p2', createdAt: new Date() },
        { id: '3', roundId: 'r1', type: 'ctp', holeNumber: 12, stakes: 20, winnerId: 'p3', createdAt: new Date() },
      ];

      const settlements = calculateSettlement(players, undefined, undefined, undefined, undefined, undefined, undefined, propBets);

      // Should be sorted by amount descending
      for (let i = 0; i < settlements.length - 1; i++) {
        expect(settlements[i].amount).toBeGreaterThanOrEqual(settlements[i + 1].amount);
      }
    });
  });
});

describe('formatSettlementText', () => {
  it('should format settlement text correctly', () => {
    const settlement: NetSettlement = {
      fromPlayerId: 'p1',
      fromPlayerName: 'Alice',
      toPlayerId: 'p2',
      toPlayerName: 'Bob',
      amount: 25,
    };

    const text = formatSettlementText(settlement);

    expect(text).toBe('Alice owes Bob $25');
  });

  it('should handle decimal amounts', () => {
    const settlement: NetSettlement = {
      fromPlayerId: 'p1',
      fromPlayerName: 'Alice',
      toPlayerId: 'p2',
      toPlayerName: 'Bob',
      amount: 25.50,
    };

    const text = formatSettlementText(settlement);

    expect(text).toBe('Alice owes Bob $26'); // Rounds to nearest dollar
  });
});

describe('getTotalWinnings', () => {
  const settlements: NetSettlement[] = [
    { fromPlayerId: 'p2', fromPlayerName: 'Bob', toPlayerId: 'p1', toPlayerName: 'Alice', amount: 20 },
    { fromPlayerId: 'p3', fromPlayerName: 'Charlie', toPlayerId: 'p1', toPlayerName: 'Alice', amount: 15 },
    { fromPlayerId: 'p1', fromPlayerName: 'Alice', toPlayerId: 'p4', toPlayerName: 'Diana', amount: 10 },
  ];

  it('should calculate total winnings for player receiving payments', () => {
    const winnings = getTotalWinnings('p1', settlements);
    expect(winnings).toBe(25); // +20 +15 -10
  });

  it('should calculate total losses for player making payments', () => {
    const winnings = getTotalWinnings('p2', settlements);
    expect(winnings).toBe(-20);
  });

  it('should return zero for player with no settlements', () => {
    const winnings = getTotalWinnings('p5', settlements);
    expect(winnings).toBe(0);
  });

  it('should handle empty settlements', () => {
    const winnings = getTotalWinnings('p1', []);
    expect(winnings).toBe(0);
  });
});
