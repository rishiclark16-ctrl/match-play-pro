import { describe, it, expect } from 'vitest';
import { computeAllTimeStats, RoundDataForStats } from './statCalculations';

// ── Test helpers ──────────────────────────────────────────────────────────────

const USER_ID = 'auth-user-1';
const USER_PLAYER_ID = 'player-user';
const OTHER_PLAYER_ID = 'player-other';
const THIRD_PLAYER_ID = 'player-third';

/** Build a minimal score entry */
function makeScore(
  playerId: string,
  holeNumber: number,
  strokes: number,
  par = 4
): RoundDataForStats['scores'][number] {
  return { player_id: playerId, hole_number: holeNumber, strokes, par };
}

/** Build a complete round with sensible defaults */
function makeRound(
  overrides: Partial<RoundDataForStats> & { id?: string }
): RoundDataForStats {
  return {
    id: overrides.id ?? 'round-1',
    course_name: overrides.course_name ?? 'Test Course',
    games: overrides.games ?? [],
    stakes: overrides.stakes ?? null,
    user_player_id: overrides.user_player_id ?? USER_PLAYER_ID,
    scores: overrides.scores ?? [],
  };
}

/**
 * Build a full 18-hole round where the user scores `userStrokesPerHole`
 * and one opponent scores `opponentStrokesPerHole`, all on par-4 holes.
 */
function makeFullRound(
  id: string,
  courseName: string,
  userStrokesPerHole: number,
  opponentStrokesPerHole: number,
  overrides: Partial<RoundDataForStats> = {}
): RoundDataForStats {
  const scores: RoundDataForStats['scores'] = [];
  for (let hole = 1; hole <= 18; hole++) {
    scores.push(makeScore(USER_PLAYER_ID, hole, userStrokesPerHole, 4));
    scores.push(makeScore(OTHER_PLAYER_ID, hole, opponentStrokesPerHole, 4));
  }
  return makeRound({ id, course_name: courseName, scores, ...overrides });
}

// ── bestRound ─────────────────────────────────────────────────────────────────

describe('computeAllTimeStats — bestRound', () => {
  it('returns null when there are no rounds', () => {
    const result = computeAllTimeStats([], USER_ID);
    expect(result.bestRound).toBeNull();
  });

  it('returns null when user has no scores in any round', () => {
    const round = makeRound({
      scores: [makeScore(OTHER_PLAYER_ID, 1, 4, 4)],
    });
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.bestRound).toBeNull();
  });

  it('identifies the round with lowest total strokes vs par', () => {
    // Round A: user shoots even par (18 holes × par 4, strokes 4 → 0 vs par)
    // Round B: user shoots +9 (strokes 4.5 avg → 9 over par)
    const roundA = makeFullRound('r-a', 'Augusta', 4, 5);   // user = 0 vs par
    const roundB = makeFullRound('r-b', 'Pebble', 5, 6);   // user = +18 vs par

    const result = computeAllTimeStats([roundA, roundB], USER_ID);
    expect(result.bestRound).not.toBeNull();
    expect(result.bestRound!.courseName).toBe('Augusta');
    expect(result.bestRound!.score).toBe(0); // 18 holes × (4-4) = 0
  });

  it('picks the correct round when one is significantly better', () => {
    // Round A: user shoots -5 (birdie on 5 holes, par the rest)
    const scoresA: RoundDataForStats['scores'] = [];
    for (let hole = 1; hole <= 18; hole++) {
      const strokes = hole <= 5 ? 3 : 4; // 5 birdies
      scoresA.push(makeScore(USER_PLAYER_ID, hole, strokes, 4));
      scoresA.push(makeScore(OTHER_PLAYER_ID, hole, 5, 4));
    }
    const roundA = makeRound({ id: 'r-a', course_name: 'Birdie Course', scores: scoresA });

    // Round B: user shoots +5
    const roundB = makeFullRound('r-b', 'Bogey Course', 5, 4);

    const result = computeAllTimeStats([roundB, roundA], USER_ID);
    expect(result.bestRound!.courseName).toBe('Birdie Course');
    expect(result.bestRound!.score).toBe(-5);
  });

  it('handles ties by picking the first occurrence', () => {
    const roundA = makeFullRound('r-a', 'First Course', 4, 5);  // 0 vs par
    const roundB = makeFullRound('r-b', 'Second Course', 4, 5); // 0 vs par

    const result = computeAllTimeStats([roundA, roundB], USER_ID);
    expect(result.bestRound!.courseName).toBe('First Course');
  });

  it('uses Unknown as course name when course_name is null', () => {
    const round = makeFullRound('r-a', 'placeholder', 4, 5);
    round.course_name = null;

    const result = computeAllTimeStats([round], USER_ID);
    expect(result.bestRound!.courseName).toBe('Unknown');
  });
});

// ── bestPayout ────────────────────────────────────────────────────────────────

describe('computeAllTimeStats — bestPayout', () => {
  it('returns null when no rounds have stakes', () => {
    const round = makeFullRound('r-1', 'Course', 4, 5); // user wins, no stakes
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.bestPayout).toBeNull();
  });

  it('returns null when user does not win', () => {
    const round = makeFullRound('r-1', 'Course', 5, 4, { stakes: 10 }); // user loses
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.bestPayout).toBeNull();
  });

  it('calculates payout as stakes × number of other players', () => {
    // 2 players total → 1 other player → payout = stakes × 1
    const round = makeFullRound('r-1', 'Windy Course', 4, 5, { stakes: 20 });
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.bestPayout).not.toBeNull();
    expect(result.bestPayout!.amount).toBe(20); // 20 × 1
    expect(result.bestPayout!.courseName).toBe('Windy Course');
  });

  it('calculates payout correctly with three players', () => {
    // 3 players → 2 other players → payout = stakes × 2
    const scores: RoundDataForStats['scores'] = [];
    for (let hole = 1; hole <= 18; hole++) {
      scores.push(makeScore(USER_PLAYER_ID, hole, 4, 4));
      scores.push(makeScore(OTHER_PLAYER_ID, hole, 5, 4));
      scores.push(makeScore(THIRD_PLAYER_ID, hole, 5, 4));
    }
    const round = makeRound({ id: 'r-1', course_name: 'Big Game', scores, stakes: 15 });
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.bestPayout!.amount).toBe(30); // 15 × 2
  });

  it('picks the highest single-round payout across multiple rounds', () => {
    const roundSmall = makeFullRound('r-1', 'Small Stakes', 4, 5, { stakes: 10 });
    const roundBig   = makeFullRound('r-2', 'Big Stakes',   4, 5, { stakes: 50 });
    const roundLoss  = makeFullRound('r-3', 'Loss Round',   5, 4, { stakes: 100 });

    const result = computeAllTimeStats([roundSmall, roundBig, roundLoss], USER_ID);
    expect(result.bestPayout!.amount).toBe(50);
    expect(result.bestPayout!.courseName).toBe('Big Stakes');
  });

  it('does not count tied winning rounds as a payout', () => {
    // Two players tied → no outright winner
    const scores: RoundDataForStats['scores'] = [];
    for (let hole = 1; hole <= 18; hole++) {
      scores.push(makeScore(USER_PLAYER_ID, hole, 4, 4));
      scores.push(makeScore(OTHER_PLAYER_ID, hole, 4, 4));
    }
    const round = makeRound({ scores, stakes: 20 });
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.bestPayout).toBeNull();
  });
});

// ── mostSkins ─────────────────────────────────────────────────────────────────

describe('computeAllTimeStats — mostSkins', () => {
  it('returns null when no skins games exist', () => {
    const round = makeFullRound('r-1', 'Course', 4, 5, { games: [] });
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.mostSkins).toBeNull();
  });

  it('returns null when there are rounds but none have skins game type', () => {
    const round = makeFullRound('r-1', 'Course', 4, 5, {
      games: [{ type: 'nassau' }],
    });
    const result = computeAllTimeStats([round], USER_ID);
    expect(result.mostSkins).toBeNull();
  });

  it('counts holes where user had a unique lowest score', () => {
    // User wins holes 1-3 outright, other player wins 4-18
    const scores: RoundDataForStats['scores'] = [];
    for (let hole = 1; hole <= 18; hole++) {
      const userStrokes = hole <= 3 ? 3 : 5;
      const otherStrokes = hole <= 3 ? 5 : 3;
      scores.push(makeScore(USER_PLAYER_ID, hole, userStrokes, 4));
      scores.push(makeScore(OTHER_PLAYER_ID, hole, otherStrokes, 4));
    }
    const round = makeRound({
      scores,
      games: [{ type: 'skins' }],
      course_name: 'Skins Course',
    });

    const result = computeAllTimeStats([round], USER_ID);
    expect(result.mostSkins!.count).toBe(3);
    expect(result.mostSkins!.courseName).toBe('Skins Course');
  });

  it('does NOT count holes where user tied (tied holes have no skin winner)', () => {
    // Hole 1: user and opponent both score 4 — tie, no skin
    // Hole 2: user scores 3, opponent scores 4 — user wins skin
    const scores: RoundDataForStats['scores'] = [
      makeScore(USER_PLAYER_ID, 1, 4, 4),
      makeScore(OTHER_PLAYER_ID, 1, 4, 4),
      makeScore(USER_PLAYER_ID, 2, 3, 4),
      makeScore(OTHER_PLAYER_ID, 2, 4, 4),
    ];
    const round = makeRound({ scores, games: [{ type: 'skins' }] });

    const result = computeAllTimeStats([round], USER_ID);
    expect(result.mostSkins!.count).toBe(1);
  });

  it('does NOT count a three-way tie as a skin for any player', () => {
    const scores: RoundDataForStats['scores'] = [
      makeScore(USER_PLAYER_ID, 1, 4, 4),
      makeScore(OTHER_PLAYER_ID, 1, 4, 4),
      makeScore(THIRD_PLAYER_ID, 1, 4, 4),
    ];
    const round = makeRound({ scores, games: [{ type: 'skins' }] });

    const result = computeAllTimeStats([round], USER_ID);
    // mostSkins exists because there is a skins game, but count should be 0
    expect(result.mostSkins!.count).toBe(0);
  });

  it('picks the round with the highest skin count when multiple rounds exist', () => {
    // Round A: user wins 2 skins
    const scoresA: RoundDataForStats['scores'] = [];
    for (let hole = 1; hole <= 4; hole++) {
      const userStrokes = hole <= 2 ? 3 : 5;
      const otherStrokes = 4;
      scoresA.push(makeScore(USER_PLAYER_ID, hole, userStrokes, 4));
      scoresA.push(makeScore(OTHER_PLAYER_ID, hole, otherStrokes, 4));
    }
    const roundA = makeRound({ id: 'r-a', course_name: 'Few Skins', scores: scoresA, games: [{ type: 'skins' }] });

    // Round B: user wins 4 skins
    const scoresB: RoundDataForStats['scores'] = [];
    for (let hole = 1; hole <= 6; hole++) {
      const userStrokes = hole <= 4 ? 3 : 5;
      const otherStrokes = 4;
      scoresB.push(makeScore(USER_PLAYER_ID, hole, userStrokes, 4));
      scoresB.push(makeScore(OTHER_PLAYER_ID, hole, otherStrokes, 4));
    }
    const roundB = makeRound({ id: 'r-b', course_name: 'Many Skins', scores: scoresB, games: [{ type: 'skins' }] });

    const result = computeAllTimeStats([roundA, roundB], USER_ID);
    expect(result.mostSkins!.count).toBe(4);
    expect(result.mostSkins!.courseName).toBe('Many Skins');
  });

  it('handles a round with multiple holes correctly', () => {
    const scores: RoundDataForStats['scores'] = [];
    // 9 holes; user wins all 9
    for (let hole = 1; hole <= 9; hole++) {
      scores.push(makeScore(USER_PLAYER_ID, hole, 3, 4));
      scores.push(makeScore(OTHER_PLAYER_ID, hole, 5, 4));
    }
    const round = makeRound({ scores, games: [{ type: 'skins' }] });

    const result = computeAllTimeStats([round], USER_ID);
    expect(result.mostSkins!.count).toBe(9);
  });
});

// ── scoreTrend ────────────────────────────────────────────────────────────────

describe('computeAllTimeStats — scoreTrend', () => {
  /**
   * Build N rounds where the user shoots `strokesPerHole` on each of 18 holes
   * vs one opponent. The opponent's score doesn't matter for scoreTrend.
   */
  function makeNRounds(
    n: number,
    strokesPerHoleList: number[]
  ): RoundDataForStats[] {
    return Array.from({ length: n }, (_, i) => {
      const spH = strokesPerHoleList[i] ?? strokesPerHoleList[strokesPerHoleList.length - 1];
      return makeFullRound(`r-${i}`, `Course ${i}`, spH, 5);
    });
  }

  it('returns null when there are fewer than 10 rounds', () => {
    const rounds = makeNRounds(9, [4]);
    const result = computeAllTimeStats(rounds, USER_ID);
    expect(result.scoreTrend).toBeNull();
  });

  it('returns null when there are exactly 9 rounds', () => {
    const rounds = makeNRounds(9, [4]);
    const result = computeAllTimeStats(rounds, USER_ID);
    expect(result.scoreTrend).toBeNull();
  });

  it('returns a result with exactly 10 rounds', () => {
    const rounds = makeNRounds(10, [4]);
    const result = computeAllTimeStats(rounds, USER_ID);
    expect(result.scoreTrend).not.toBeNull();
  });

  it('returns improving=true when recent avg is lower than prior avg (better scores)', () => {
    // Prior 5 rounds (rounds 0-4): user shoots 5 per hole (+1 per hole = +18 per round)
    // Recent 5 rounds (rounds 5-9): user shoots 4 per hole (0 per hole = 0 per round)
    const strokesList = [5, 5, 5, 5, 5, 4, 4, 4, 4, 4];
    const rounds = makeNRounds(10, strokesList);
    const result = computeAllTimeStats(rounds, USER_ID);
    expect(result.scoreTrend).not.toBeNull();
    expect(result.scoreTrend!.improving).toBe(true);
  });

  it('returns improving=false when recent avg is higher than prior avg (worse scores)', () => {
    // Prior 5 rounds: user shoots 4 per hole (even par)
    // Recent 5 rounds: user shoots 5 per hole (+1 per hole)
    const strokesList = [4, 4, 4, 4, 4, 5, 5, 5, 5, 5];
    const rounds = makeNRounds(10, strokesList);
    const result = computeAllTimeStats(rounds, USER_ID);
    expect(result.scoreTrend!.improving).toBe(false);
  });

  it('delta is the absolute difference rounded to 1 decimal place', () => {
    // Prior 5 rounds: user shoots 5/hole (+1 avg per hole vs par-4)
    // Recent 5 rounds: user shoots 4/hole (0 avg per hole)
    // Per-hole avg diff = 1.0; per-round avg diff = 1.0 (since stored as per-hole avg)
    const strokesList = [5, 5, 5, 5, 5, 4, 4, 4, 4, 4];
    const rounds = makeNRounds(10, strokesList);
    const result = computeAllTimeStats(rounds, USER_ID);
    expect(result.scoreTrend!.delta).toBe(1.0);
  });

  it('delta rounds to 1 decimal place correctly', () => {
    // Create a scenario where the difference is not a round number.
    // Use mixed scores so that the per-hole avg difference is ~0.5
    // Prior 5 (rounds 0-4): 5 strokes/hole (+1.0 vs par-4)
    // Recent 5 (rounds 5-9): 4 strokes/hole, except round 9 which is 3 strokes/hole
    // recentAvg per hole: (1.0 + 1.0 + 1.0 + 1.0 + (-1.0)) / 5 = 3/5 = 0.6
    // But per-hole stored values: (1, 1, 1, 1, -1) → recentAvg = 0.6
    // priorAvg = 1.0; delta = 0.4 → rounds to 0.4
    const scores10 = makeNRounds(10, [5, 5, 5, 5, 5, 5, 5, 5, 5, 3]);
    const result = computeAllTimeStats(scores10, USER_ID);
    expect(result.scoreTrend).not.toBeNull();
    // delta should be rounded to 1 decimal
    const delta = result.scoreTrend!.delta;
    expect(Number.isFinite(delta)).toBe(true);
    expect(delta.toString()).toMatch(/^\d+(\.\d)?$/);
  });

  it('uses the last 10 rounds when more than 10 exist', () => {
    // Rounds 0-4: bad (5 strokes/hole)
    // Rounds 5-9: also bad (5 strokes/hole)  ← these are the prior window in last-10
    // Rounds 10-14: good (4 strokes/hole)    ← these are the recent window in last-10
    const strokesList = [
      5, 5, 5, 5, 5, // rounds 0-4 (ignored since >10 rounds exist)
      5, 5, 5, 5, 5, // rounds 5-9 = prior window
      4, 4, 4, 4, 4, // rounds 10-14 = recent window
    ];
    const rounds = makeNRounds(15, strokesList);
    const result = computeAllTimeStats(rounds, USER_ID);
    expect(result.scoreTrend!.improving).toBe(true);
  });
});
