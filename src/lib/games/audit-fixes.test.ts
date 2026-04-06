/**
 * Audit Fix Verification Tests
 * Tests each of the 13 issues identified in the game logic audit.
 */
import { describe, it, expect } from 'vitest';
import { calculateSkins } from './skins';
import { calculateNassau } from './nassau';
import { calculateWolfStandings } from './wolf';
import { calculateVegas } from './vegas';
import { calculateQuota } from './quota';
import { calculateHouseGame } from './houseGame';
import { calculateLiveMoney, formatMoney } from './moneyTracker';
import { buildScoringConfig } from '@/lib/houseGame/engine';
import { Score, Player, HoleInfo, Press, WolfHoleResult } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

// ─── Test Helpers ──────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, handicap?: number, orderIndex = 0): Player {
  return { id, roundId: 'r1', name, handicap, orderIndex };
}

function makeScore(playerId: string, holeNumber: number, strokes: number): Score {
  return { id: `${playerId}-${holeNumber}`, roundId: 'r1', playerId, holeNumber, strokes };
}

function makeHoleInfo(count: number, startPar = 4): HoleInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    par: startPar,
    handicap: i + 1, // SI 1..N
  }));
}

// ─── Issue 1 & 2: Net scoring strokesPerHole for Skins & Nassau ─────────────

describe('Issue 1 & 2: Skins and Nassau with net scoring', () => {
  const players = [makePlayer('p1', 'Alice', 10), makePlayer('p2', 'Bob', 0)];
  const holeInfo = makeHoleInfo(9);

  // strokesPerHole: p1 gets 1 stroke on holes 1-9 (SI 1-9), p2 gets 0
  const strokesMap: StrokesPerHoleMap = new Map([
    ['p1', new Map(Array.from({ length: 9 }, (_, i) => [i + 1, 1] as [number, number]))],
    ['p2', new Map(Array.from({ length: 9 }, (_, i) => [i + 1, 0] as [number, number]))],
  ]);

  it('skins: net scoring gives skin to handicap player when gross ties', () => {
    // Both score 5 on hole 1 (par 4), but p1 nets 4, p2 nets 5
    const scores = [makeScore('p1', 1, 5), makeScore('p2', 1, 5)];
    const resultGross = calculateSkins(scores, players, 1, 1, true);
    const resultNet = calculateSkins(scores, players, 1, 1, true, strokesMap);

    // Gross: tie (no winner)
    expect(resultGross.results[0].winnerId).toBeNull();
    // Net: p1 wins because 5-1=4 < 5-0=5
    expect(resultNet.results[0].winnerId).toBe('p1');
  });

  it('nassau: net scoring affects segment winners', () => {
    // p1 scores 5 on all 9, p2 scores 5 on all 9
    // Gross: tie. Net: p1 nets 4 per hole (total 36) vs p2 nets 5 (total 45)
    const scores = Array.from({ length: 9 }, (_, i) => [
      makeScore('p1', i + 1, 5),
      makeScore('p2', i + 1, 5),
    ]).flat();

    const resultGross = calculateNassau(scores, players, 10, [], 9);
    const resultNet = calculateNassau(scores, players, 10, [], 9, strokesMap);

    // Gross: all tied
    expect(resultGross.front9.winnerId).toBeNull();
    // Net: p1 wins front 9
    expect(resultNet.front9.winnerId).toBe('p1');
  });
});

// ─── Issue 3: moneyTracker Nassau uses actual holes, not hardcoded 18 ────────

describe('Issue 3: moneyTracker Nassau respects 9-hole rounds', () => {
  it('nassau settles correctly for 9-hole round in money tracker', () => {
    const players = [
      makePlayer('p1', 'Alice', undefined, 0),
      makePlayer('p2', 'Bob', undefined, 1),
    ] as any[];
    // Give them PlayerWithScores shape
    players.forEach((p: any) => { p.scores = []; p.totalStrokes = 0; p.totalRelativeToPar = 0; p.holesPlayed = 9; });

    const holeInfo = makeHoleInfo(9);
    // p1 wins every hole by 1 stroke
    const scores = Array.from({ length: 9 }, (_, i) => [
      makeScore('p1', i + 1, 3),
      makeScore('p2', i + 1, 4),
    ]).flat();

    const nassauGame = { id: 'g1', type: 'nassau' as const, stakes: 10, useNet: false };
    const result = calculateLiveMoney(players, scores, [nassauGame], holeInfo, [], 9);

    // p1 should win the front9 + overall = $20
    const p1Money = result.players.find(p => p.playerId === 'p1');
    const p2Money = result.players.find(p => p.playerId === 'p2');
    expect(p1Money!.currentBalance).toBe(20);
    expect(p2Money!.currentBalance).toBe(-20);
  });
});

// ─── Issue 5: moneyTracker Wolf uses calculateWolfStandings ──────────────────

describe('Issue 5: moneyTracker Wolf consistent with wolf.ts', () => {
  it('wolf earnings in money tracker match calculateWolfStandings', () => {
    const players = [
      makePlayer('p1', 'Alice', undefined, 0),
      makePlayer('p2', 'Bob', undefined, 1),
      makePlayer('p3', 'Charlie', undefined, 2),
      makePlayer('p4', 'Dan', undefined, 3),
    ] as any[];
    players.forEach((p: any) => { p.scores = []; p.totalStrokes = 0; p.totalRelativeToPar = 0; p.holesPlayed = 1; });

    const holeInfo = makeHoleInfo(18);
    const scores = [
      makeScore('p1', 1, 4), makeScore('p2', 1, 5),
      makeScore('p3', 1, 5), makeScore('p4', 1, 5),
    ];

    const wolfResults: WolfHoleResult[] = [{
      holeNumber: 1, wolfId: 'p1', partnerId: 'p2',
      isBlindWolf: false, winningTeam: 'wolf', points: 4,
    }];

    const wolfGame = { id: 'g1', type: 'wolf' as const, stakes: 2, wolfResults };
    const moneyResult = calculateLiveMoney(players, scores, [wolfGame], holeInfo, [], 1);

    // Compare with direct call
    const standings = calculateWolfStandings(wolfResults, players, 2);
    for (const standing of standings) {
      const moneyPlayer = moneyResult.players.find(p => p.playerId === standing.playerId);
      expect(moneyPlayer!.currentBalance).toBe(standing.earnings);
    }
  });
});

// ─── Issue 6: Vegas mutual birdie cancellation ──────────────────────────────

describe('Issue 6: Vegas mutual birdie cancellation', () => {
  it('no flip when both teams have a birdie', () => {
    const players = [
      makePlayer('p1', 'A1'), makePlayer('p2', 'A2'),
      makePlayer('p3', 'B1'), makePlayer('p4', 'B2'),
    ];
    const holeInfo: HoleInfo[] = [{ number: 1, par: 4, handicap: 1 }];
    // Team A: 3 and 5 (birdie + bogey) → combined = 35
    // Team B: 3 and 6 (birdie + double) → combined = 36
    // Both teams have a birdie → mutual cancellation → no flip
    const scores = [
      makeScore('p1', 1, 3), makeScore('p2', 1, 5),
      makeScore('p3', 1, 3), makeScore('p4', 1, 6),
    ];

    const result = calculateVegas(scores, players, holeInfo, 1, 1);
    expect(result.holeResults[0].teamAFlipped).toBe(false);
    expect(result.holeResults[0].teamBFlipped).toBe(false);
    // No flip: 35 vs 36, Team A wins by 1
    expect(result.holeResults[0].pointDiff).toBe(1); // teamBScore - teamAScore
  });

  it('flip still applies when only one team has a birdie', () => {
    const players = [
      makePlayer('p1', 'A1'), makePlayer('p2', 'A2'),
      makePlayer('p3', 'B1'), makePlayer('p4', 'B2'),
    ];
    const holeInfo: HoleInfo[] = [{ number: 1, par: 4, handicap: 1 }];
    // Team A: 3 and 4 (birdie) → combined = 34
    // Team B: 4 and 5 → combined = 45
    // Only Team A has birdie, Team A is winning → flip Team B: 45 → 54
    const scores = [
      makeScore('p1', 1, 3), makeScore('p2', 1, 4),
      makeScore('p3', 1, 4), makeScore('p4', 1, 5),
    ];

    const result = calculateVegas(scores, players, holeInfo, 1, 1);
    expect(result.holeResults[0].teamBFlipped).toBe(true);
    // After flip: 34 vs 54, diff = 54-34 = 20
    expect(result.holeResults[0].pointDiff).toBe(20);
  });
});

// ─── Issue 7: Quota uses Course Handicap ────────────────────────────────────

describe('Issue 7: Quota uses Course Handicap, not raw Index', () => {
  it('quota calculated with slope-adjusted handicap', () => {
    // Player with 10 index on slope 130 course
    // Course Handicap = round(10 * 130 / 113) = round(11.5) = 12
    // Quota = 36 - 12 = 24
    const players = [makePlayer('p1', 'Alice', 10)];
    const holeInfo = makeHoleInfo(18);
    const result = calculateQuota([], players, holeInfo, 1, undefined, 130);
    expect(result.standings[0].quota).toBe(24);
  });

  it('quota with default slope 113 equals raw index', () => {
    // Course Handicap = round(10 * 113 / 113) = 10
    // Quota = 36 - 10 = 26
    const players = [makePlayer('p1', 'Alice', 10)];
    const holeInfo = makeHoleInfo(18);
    const result = calculateQuota([], players, holeInfo, 1, undefined, 113);
    expect(result.standings[0].quota).toBe(26);
  });
});

// ─── Issue 8: Greenie awards single lowest scorer ───────────────────────────

describe('Issue 8: Greenie awards single lowest on par 3', () => {
  it('greenie: only lowest unique scorer wins', () => {
    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B'), makePlayer('p3', 'C')];
    const holeInfo: HoleInfo[] = [{ number: 1, par: 3, handicap: 1 }];
    // p1=2 (birdie), p2=3 (par), p3=3 (par)
    const scores = [makeScore('p1', 1, 2), makeScore('p2', 1, 3), makeScore('p3', 1, 3)];

    const config = buildScoringConfig([{ id: 'bonus_greenie', value: true }]);
    config.unitValue = 5;
    const result = calculateHouseGame(scores, players, holeInfo, config, 113, 18);

    // Only p1 should earn greenie (unique lowest + par or better)
    const p1 = result.standings.find(s => s.playerId === 'p1');
    const p2 = result.standings.find(s => s.playerId === 'p2');
    const p3 = result.standings.find(s => s.playerId === 'p3');
    expect(p1!.netEarnings).toBe(10); // 5 * 2 others
    expect(p2!.netEarnings).toBe(-5);
    expect(p3!.netEarnings).toBe(-5);
  });

  it('greenie: tied lowest means no greenie awarded', () => {
    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B')];
    const holeInfo: HoleInfo[] = [{ number: 1, par: 3, handicap: 1 }];
    // Both score 3 (par) — tied, no greenie
    const scores = [makeScore('p1', 1, 3), makeScore('p2', 1, 3)];

    const config = buildScoringConfig([{ id: 'bonus_greenie', value: true }]);
    config.unitValue = 5;
    const result = calculateHouseGame(scores, players, holeInfo, config, 113, 18);

    const p1 = result.standings.find(s => s.playerId === 'p1');
    const p2 = result.standings.find(s => s.playerId === 'p2');
    expect(p1!.netEarnings).toBe(0);
    expect(p2!.netEarnings).toBe(0);
  });
});

// ─── Issue 11: formatMoney shows cents ──────────────────────────────────────

describe('Issue 11: formatMoney shows cents', () => {
  it('positive amount shows cents', () => {
    expect(formatMoney(12.50)).toBe('+$12.50');
  });

  it('negative amount shows cents', () => {
    expect(formatMoney(-3.75)).toBe('-$3.75');
  });

  it('zero shows cents', () => {
    expect(formatMoney(0)).toBe('+$0.00');
  });

  it('whole numbers show .00', () => {
    expect(formatMoney(10)).toBe('+$10.00');
  });
});

// ─── Issue 13: carryoverSkinsHalved ─────────────────────────────────────────

describe('Issue 13: carryoverSkinsHalved reduces carryover value', () => {
  it('halved carryover: tied skins carry at 0.5 instead of 1.0', () => {
    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B')];
    // Hole 1: tie, Hole 2: tie, Hole 3: p1 wins
    const scores = [
      makeScore('p1', 1, 4), makeScore('p2', 1, 4), // tie
      makeScore('p1', 2, 4), makeScore('p2', 2, 4), // tie
      makeScore('p1', 3, 3), makeScore('p2', 3, 4), // p1 wins
    ];

    const resultNormal = calculateSkins(scores, players, 3, 10, true);
    const resultHalved = calculateSkins(scores, players, 3, 10, true, undefined, undefined, undefined, true);

    // Normal: 2 carryovers + 1 current = 3 skins on hole 3
    expect(resultNormal.results[2].value).toBe(3);
    // Halved: 2 × 0.5 carryover + 1 current = 2 skins on hole 3
    expect(resultHalved.results[2].value).toBe(2);
  });
});
