import { describe, it, expect } from 'vitest';
import { calculateVegas } from './vegas';
import { calculateSettlement } from './settlement';
import { calculateLiveMoney } from './moneyTracker';
import { Player, Score, HoleInfo, PlayerWithScores, GameConfig } from '@/types/golf';

/**
 * Cross-module magnitude agreement.
 *
 * Sum-to-zero is NOT sufficient to validate these calculators. `settlement.ts`
 * carried a 2x Vegas overcharge (M3 / MAT-11) for its entire history while
 * still summing to zero perfectly: each loser paid $9 and each winner received
 * $9, so the ledger balanced at twice the correct magnitude.
 *
 * The only assertion that catches that class is: one fixture produces ONE
 * per-player figure, and every module that computes it agrees.
 *
 * See MAT-20 for the full set of invariants this file is part of.
 */

const TEST_ROUND_ID = 'cross-module-round';

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

const makeHoleInfo = (count: number): HoleInfo[] =>
  Array.from({ length: count }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));

/** Net position per player implied by a settlement ledger. */
const netByPlayer = (
  settlements: { fromPlayerId: string; toPlayerId: string; amount: number }[],
  players: Player[],
): Record<string, number> => {
  const net: Record<string, number> = {};
  players.forEach(p => { net[p.id] = 0; });
  settlements.forEach(s => {
    net[s.fromPlayerId] -= s.amount;
    net[s.toPlayerId] += s.amount;
  });
  return net;
};

describe('cross-module magnitude agreement', () => {
  const players = [
    createPlayer('p1', 'Alice', 0),   // Team A
    createPlayer('p2', 'Bob', 1),     // Team A
    createPlayer('p3', 'Charlie', 2), // Team B
    createPlayer('p4', 'Diana', 3),   // Team B
  ];
  const holeInfo = makeHoleInfo(18);

  // Par 4. Team A posts 4 and 5 -> 45. Team B posts 5 and 6 -> 56.
  // No score is a birdie, so no flips or doublers apply.
  // Team A wins the hole by 11 points.
  const scores = [
    createScore('p1', 1, 4), createScore('p2', 1, 5),
    createScore('p3', 1, 5), createScore('p4', 1, 6),
  ];

  it('vegas teamEarnings is a TEAM figure, not a per-player figure', () => {
    const vegas = calculateVegas(scores, players, holeInfo, 1, 1);

    // 56 - 45 = 11 points to team A, at $1/point.
    expect(vegas.teamATotal).toBe(11);
    expect(vegas.teamAEarnings).toBe(11);
    expect(vegas.teamBEarnings).toBe(-11);
  });

  it('settlement moves the team figure ONCE, not once per player', () => {
    const vegas = calculateVegas(scores, players, holeInfo, 1, 1);
    const settlements = calculateSettlement(
      players,
      undefined, // skins
      undefined, // nassau
      undefined, // matchPlayWinnerId
      undefined, // matchPlayStakes
      undefined, // wolfResults
      undefined, // wolfStakes
      undefined, // propBets
      undefined, // houseGameResult
      vegas,
    );

    const net = netByPlayer(settlements, players);
    const perPlayer = vegas.teamAEarnings / 2; // 5.50

    // Each member of the winning team is up half the team figure.
    expect(net['p1']).toBeCloseTo(perPlayer, 10);
    expect(net['p2']).toBeCloseTo(perPlayer, 10);
    // Each member of the losing team is down the same.
    expect(net['p3']).toBeCloseTo(-perPlayer, 10);
    expect(net['p4']).toBeCloseTo(-perPlayer, 10);

    // The regression guard: before M3 this moved $22 in total, not $11,
    // and still summed to zero.
    const totalMoved = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalMoved).toBeCloseTo(Math.abs(vegas.teamAEarnings), 10);
  });

  it('settlement sums to zero (necessary, but not what catches M3)', () => {
    const vegas = calculateVegas(scores, players, holeInfo, 1, 1);
    const settlements = calculateSettlement(
      players, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, vegas,
    );

    const net = netByPlayer(settlements, players);
    const total = Object.values(net).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(0, 10);
  });

  it('houseGame per-member share matches settlement per-player net', () => {
    const vegas = calculateVegas(scores, players, holeInfo, 1, 1);

    // houseGame.ts credits each member `teamEarnings / 2`. Assert that the
    // figure it uses is the same one settlement nets out to, so the two
    // paths cannot drift apart again.
    const houseGamePerMember = vegas.teamAEarnings / 2;

    const settlements = calculateSettlement(
      players, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, vegas,
    );
    const net = netByPlayer(settlements, players);

    expect(net['p1']).toBeCloseTo(houseGamePerMember, 10);
    expect(net['p3']).toBeCloseTo(-houseGamePerMember, 10);
  });
});

describe('match play: live tracker and settlement agree', () => {
  // M4 (MAT-12). The tracker paid `stakes` for EVERY hole won while settlement
  // paid it once, so a 4-and-3 win at $5 read $20 live and $5 at the end. Golf
  // convention is a flat stake on the match: the margin says how decisively it
  // was won, not how much is owed. This test is the one that would have caught
  // the disagreement.
  const stakes = 5;

  const trackerPlayers: PlayerWithScores[] = [
    {
      id: 'p1', roundId: TEST_ROUND_ID, name: 'Alice', handicap: undefined,
      orderIndex: 0, scores: [], totalStrokes: 0, totalRelativeToPar: 0, holesPlayed: 0,
    },
    {
      id: 'p2', roundId: TEST_ROUND_ID, name: 'Bob', handicap: undefined,
      orderIndex: 1, scores: [], totalStrokes: 0, totalRelativeToPar: 0, holesPlayed: 0,
    },
  ];
  const settlementPlayers: Player[] = [
    createPlayer('p1', 'Alice', 0),
    createPlayer('p2', 'Bob', 1),
  ];

  // Alice wins holes 1, 2 and 3 outright — 3 up with 15 to play.
  const scores: Score[] = [
    createScore('p1', 1, 3), createScore('p2', 1, 5),
    createScore('p1', 2, 4), createScore('p2', 2, 6),
    createScore('p1', 3, 3), createScore('p2', 3, 4),
  ];
  const holeInfo = makeHoleInfo(18);

  it('the live tracker pays the stake once, not once per hole won', () => {
    const games: GameConfig[] = [{ id: 'g1', type: 'match', stakes }];
    const live = calculateLiveMoney(trackerPlayers, scores, games, holeInfo, [], 3);

    // Three holes won. Before M4 this was 3 x $5 = $15.
    expect(live.breakdown.get('p1')!.match).toBe(stakes);
    expect(live.breakdown.get('p2')!.match).toBe(-stakes);
  });

  it('settlement pays the same figure the tracker showed', () => {
    const games: GameConfig[] = [{ id: 'g1', type: 'match', stakes }];
    const live = calculateLiveMoney(trackerPlayers, scores, games, holeInfo, [], 3);

    const settlements = calculateSettlement(
      settlementPlayers,
      undefined,   // skins
      undefined,   // nassau
      'p1',        // matchPlayWinnerId
      stakes,      // matchPlayStakes
    );
    const net = netByPlayer(settlements, settlementPlayers);

    // The assertion that matters: one number, both modules.
    expect(net['p1']).toBeCloseTo(live.breakdown.get('p1')!.match, 10);
    expect(net['p2']).toBeCloseTo(live.breakdown.get('p2')!.match, 10);
    expect(net['p1']).toBeCloseTo(stakes, 10);
  });

  it('an all-square match pays nothing', () => {
    const square: Score[] = [
      createScore('p1', 1, 4), createScore('p2', 1, 4),
      createScore('p1', 2, 5), createScore('p2', 2, 5),
    ];
    const games: GameConfig[] = [{ id: 'g1', type: 'match', stakes }];
    const live = calculateLiveMoney(trackerPlayers, square, games, holeInfo, [], 2);

    expect(live.breakdown.get('p1')!.match).toBe(0);
    expect(live.breakdown.get('p2')!.match).toBe(0);
  });
});
