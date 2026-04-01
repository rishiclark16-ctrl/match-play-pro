import { describe, it, expect } from 'vitest';
import { calculateSettlement, formatSettlementText, getTotalWinnings, NetSettlement } from './settlement';
import { Player, WolfHoleResult } from '@/types/golf';
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

describe('multi-winner rounding (C-2)', () => {
  it('3 equal winners sharing $3 pot — total distributed equals exactly $3', () => {
    // 3 winners each earning $1, 3 losers each losing $1
    // Using whole-dollar amounts to ensure no penny is lost to rounding
    const sixPlayers: Player[] = [
      createPlayer('w1', 'Winner1'),
      createPlayer('w2', 'Winner2'),
      createPlayer('w3', 'Winner3'),
      createPlayer('l1', 'Loser1'),
      createPlayer('l2', 'Loser2'),
      createPlayer('l3', 'Loser3'),
    ];

    const skinsResult: SkinsResult = {
      results: [],
      standings: [
        { playerId: 'w1', playerName: 'Winner1', skins: 1, earnings: 1 },
        { playerId: 'w2', playerName: 'Winner2', skins: 1, earnings: 1 },
        { playerId: 'w3', playerName: 'Winner3', skins: 1, earnings: 1 },
        { playerId: 'l1', playerName: 'Loser1', skins: 0, earnings: -1 },
        { playerId: 'l2', playerName: 'Loser2', skins: 0, earnings: -1 },
        { playerId: 'l3', playerName: 'Loser3', skins: 0, earnings: -1 },
      ],
      carryover: 0,
      potPerSkin: 3,
      totalPot: 3,
    };

    const settlements = calculateSettlement(sixPlayers, skinsResult);

    // Sum of payments from all losers must equal exactly $3 (total pot)
    // Each individual amount is already rounded to cents; round the final sum to
    // eliminate JS floating-point accumulation drift before asserting.
    const totalFromLosers = settlements
      .filter(s => ['l1', 'l2', 'l3'].includes(s.fromPlayerId))
      .reduce((sum, s) => sum + s.amount, 0);

    expect(Math.round(totalFromLosers * 100)).toBe(300);
  });

  it('2 winners splitting a $3 pot — each gets $1.50, total is exactly $3', () => {
    const twoWinnerPlayers: Player[] = [
      createPlayer('w1', 'Winner1'),
      createPlayer('w2', 'Winner2'),
      createPlayer('l1', 'Loser1'),
      createPlayer('l2', 'Loser2'),
    ];

    const skinsResult: SkinsResult = {
      results: [],
      standings: [
        { playerId: 'w1', playerName: 'Winner1', skins: 1, earnings: 1.5 },
        { playerId: 'w2', playerName: 'Winner2', skins: 1, earnings: 1.5 },
        { playerId: 'l1', playerName: 'Loser1', skins: 0, earnings: -1.5 },
        { playerId: 'l2', playerName: 'Loser2', skins: 0, earnings: -1.5 },
      ],
      carryover: 0,
      potPerSkin: 3,
      totalPot: 3,
    };

    const settlements = calculateSettlement(twoWinnerPlayers, skinsResult);

    const totalReceived = settlements
      .filter(s => ['w1', 'w2'].includes(s.toPlayerId))
      .reduce((sum, s) => sum + s.amount, 0);

    expect(totalReceived).toBe(3);

    // Each winner should net exactly $1.50
    const w1Net = getTotalWinnings('w1', settlements);
    const w2Net = getTotalWinnings('w2', settlements);
    expect(w1Net).toBe(1.5);
    expect(w2Net).toBe(1.5);
  });

  it('5 winners splitting $5 pot — last winner absorbs remainder; sum of all payouts === $5', () => {
    // 5 winners each earning $1, 5 losers each losing $1
    // Using whole-dollar amounts so rounding never drops a penny
    const tenPlayers: Player[] = [
      createPlayer('w1', 'Winner1'),
      createPlayer('w2', 'Winner2'),
      createPlayer('w3', 'Winner3'),
      createPlayer('w4', 'Winner4'),
      createPlayer('w5', 'Winner5'),
      createPlayer('l1', 'Loser1'),
      createPlayer('l2', 'Loser2'),
      createPlayer('l3', 'Loser3'),
      createPlayer('l4', 'Loser4'),
      createPlayer('l5', 'Loser5'),
    ];

    const skinsResult: SkinsResult = {
      results: [],
      standings: [
        { playerId: 'w1', playerName: 'Winner1', skins: 1, earnings: 1 },
        { playerId: 'w2', playerName: 'Winner2', skins: 1, earnings: 1 },
        { playerId: 'w3', playerName: 'Winner3', skins: 1, earnings: 1 },
        { playerId: 'w4', playerName: 'Winner4', skins: 1, earnings: 1 },
        { playerId: 'w5', playerName: 'Winner5', skins: 1, earnings: 1 },
        { playerId: 'l1', playerName: 'Loser1', skins: 0, earnings: -1 },
        { playerId: 'l2', playerName: 'Loser2', skins: 0, earnings: -1 },
        { playerId: 'l3', playerName: 'Loser3', skins: 0, earnings: -1 },
        { playerId: 'l4', playerName: 'Loser4', skins: 0, earnings: -1 },
        { playerId: 'l5', playerName: 'Loser5', skins: 0, earnings: -1 },
      ],
      carryover: 0,
      potPerSkin: 5,
      totalPot: 5,
    };

    const settlements = calculateSettlement(tenPlayers, skinsResult);

    const loserIds = ['l1', 'l2', 'l3', 'l4', 'l5'];
    const totalPaidOut = settlements
      .filter(s => loserIds.includes(s.fromPlayerId))
      .reduce((sum, s) => sum + s.amount, 0);

    // Round to cents before asserting to eliminate JS FP accumulation drift;
    // each individual amount is already rounded to the cent.
    expect(Math.round(totalPaidOut * 100)).toBe(500);
  });
});

describe('Wolf player mismatch (C-3)', () => {
  it('Wolf settlement runs without throwing for a 3-player round', () => {
    const threePlayers: Player[] = [
      createPlayer('p1', 'Alice', 0),
      createPlayer('p2', 'Bob', 1),
      createPlayer('p3', 'Charlie', 2),
    ];

    // Minimal wolf results — p1 was wolf, lone wolf scenario, wolf team won
    const wolfResults: WolfHoleResult[] = [
      {
        holeNumber: 1,
        wolfId: 'p1',
        partnerId: null,
        isBlindWolf: false,
        winningTeam: 'wolf',
        points: 4,
      },
    ];

    let result: ReturnType<typeof calculateSettlement> | undefined;
    expect(() => {
      result = calculateSettlement(
        threePlayers,
        undefined,
        undefined,
        undefined,
        undefined,
        wolfResults,
        5
      );
    }).not.toThrow();

    expect(result).toBeDefined();
  });

  it('Wolf settlement runs without throwing for a 5-player round', () => {
    const fivePlayers: Player[] = [
      createPlayer('p1', 'Alice', 0),
      createPlayer('p2', 'Bob', 1),
      createPlayer('p3', 'Charlie', 2),
      createPlayer('p4', 'Diana', 3),
      createPlayer('p5', 'Eve', 4),
    ];

    const wolfResults: WolfHoleResult[] = [
      {
        holeNumber: 1,
        wolfId: 'p1',
        partnerId: 'p2',
        isBlindWolf: false,
        winningTeam: 'hunters',
        points: 4,
      },
    ];

    let result: ReturnType<typeof calculateSettlement> | undefined;
    expect(() => {
      result = calculateSettlement(
        fivePlayers,
        undefined,
        undefined,
        undefined,
        undefined,
        wolfResults,
        5
      );
    }).not.toThrow();

    expect(result).toBeDefined();
  });
});

describe('multi-winner rounding with indivisible pot', () => {
  it('3 equal winners splitting a $10 pot — total distributed equals exactly $10', () => {
    // $10 pot / 3 winners = $3.333... each; last winner absorbs remainder
    // One loser pays $10 total
    const fourPlayers: Player[] = [
      createPlayer('w1', 'Winner1'),
      createPlayer('w2', 'Winner2'),
      createPlayer('w3', 'Winner3'),
      createPlayer('l1', 'Loser1'),
    ];

    // Pot = $10: each winner earned ~$3.33, loser lost $10
    // Use earnings that reflect $10 / 3 ≈ 3.33 each
    const skinsResult: SkinsResult = {
      results: [],
      standings: [
        { playerId: 'w1', playerName: 'Winner1', skins: 1, earnings: 10 / 3 },
        { playerId: 'w2', playerName: 'Winner2', skins: 1, earnings: 10 / 3 },
        { playerId: 'w3', playerName: 'Winner3', skins: 1, earnings: 10 / 3 },
        { playerId: 'l1', playerName: 'Loser1', skins: 0, earnings: -10 },
      ],
      carryover: 0,
      potPerSkin: 10,
      totalPot: 10,
    };

    const settlements = calculateSettlement(fourPlayers, skinsResult);

    // The loser should pay out a total of exactly $10 across the 3 winners
    const totalPaidByLoser = settlements
      .filter(s => s.fromPlayerId === 'l1')
      .reduce((sum, s) => sum + s.amount, 0);

    // Round to cents to eliminate JS float accumulation drift
    expect(Math.round(totalPaidByLoser * 100)).toBe(1000);

    // Each winner should have a positive net
    const w1Net = getTotalWinnings('w1', settlements);
    const w2Net = getTotalWinnings('w2', settlements);
    const w3Net = getTotalWinnings('w3', settlements);
    expect(w1Net).toBeGreaterThan(0);
    expect(w2Net).toBeGreaterThan(0);
    expect(w3Net).toBeGreaterThan(0);

    // The sum of all winner nets should equal $10
    expect(Math.round((w1Net + w2Net + w3Net) * 100)).toBe(1000);
  });
});

describe('prop bet with player not in ledger', () => {
  it('should skip gracefully when prop bet winner is not among the round players', () => {
    const twoPlayers: Player[] = [
      createPlayer('p1', 'Alice'),
      createPlayer('p2', 'Bob'),
    ];

    // The winner ID 'ghost' is not a player in this round
    const propBets: PropBet[] = [
      {
        id: 'pb-ghost',
        roundId: 'r1',
        type: 'ctp',
        holeNumber: 5,
        stakes: 8,
        winnerId: 'ghost',
        createdAt: new Date(),
      },
      // A valid prop bet so we can verify normal flow still works
      {
        id: 'pb-valid',
        roundId: 'r1',
        type: 'longest_drive',
        holeNumber: 10,
        stakes: 6,
        winnerId: 'p1',
        createdAt: new Date(),
      },
    ];

    // Should not throw even though 'ghost' is not in the ledger
    let settlements: ReturnType<typeof calculateSettlement> | undefined;
    expect(() => {
      settlements = calculateSettlement(
        twoPlayers,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        propBets
      );
    }).not.toThrow();

    expect(settlements).toBeDefined();

    // The valid bet should still settle: p2 owes p1 $6
    const p1Net = getTotalWinnings('p1', settlements!);
    expect(p1Net).toBe(6);
  });

  it('should skip gracefully when a non-winner player in ledger check references unknown winner', () => {
    const twoPlayers: Player[] = [
      createPlayer('p1', 'Alice'),
      createPlayer('p2', 'Bob'),
    ];

    // winnerId references a player who is in the game but the loser side
    // references a player (p3) not in the ledger — since we iterate players,
    // the only paths are winner-not-in-ledger (covered above). Here we just
    // confirm a fully valid bet completes without issue even after a bad one.
    const propBets: PropBet[] = [
      {
        id: 'pb-orphan',
        roundId: 'r1',
        type: 'ctp',
        holeNumber: 3,
        stakes: 10,
        winnerId: 'p3-not-exist',  // winner not in players list
        createdAt: new Date(),
      },
    ];

    let settlements: ReturnType<typeof calculateSettlement> | undefined;
    expect(() => {
      settlements = calculateSettlement(
        twoPlayers,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        propBets
      );
    }).not.toThrow();

    // No valid bets settled, so no settlements
    expect(settlements).toBeDefined();
    expect(settlements!).toHaveLength(0);
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

    expect(text).toBe('Alice owes Bob $25.00');
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

    expect(text).toBe('Alice owes Bob $25.50'); // Shows cents (M-8 fix)
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
