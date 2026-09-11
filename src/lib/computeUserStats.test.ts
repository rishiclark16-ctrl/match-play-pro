import { describe, it, expect, vi } from 'vitest';
import { computeUserStats } from './computeUserStats';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Build a chainable supabase stub that returns a fixed response for each table.
 * Each entry is the resolved value of `.in(...)` / `.eq(...)`.
 */
function buildSupabaseStub(tables: Record<string, { data: unknown[] | null }>): SupabaseClient {
  const from = vi.fn((table: string) => {
    const result = tables[table] ?? { data: [] };
    // .select(...).eq(col, val) → resolved value
    // .select(...).in(col, vals) → resolved value
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(result),
        in: vi.fn().mockResolvedValue(result),
      }),
    };
  });
  return { from } as unknown as SupabaseClient;
}

describe('computeUserStats', () => {
  it('returns the empty stats shape when the user has no players', async () => {
    const supabase = buildSupabaseStub({ players: { data: [] } });

    const stats = await computeUserStats('user-1', supabase);

    expect(stats).toEqual({
      holesWon: 0,
      holesPlayed: 0,
      matchesWon: 0,
      matchesPlayed: 0,
      totalMoneyWon: 0,
      bestCourse: null,
      hotHole: null,
      roundsPlayed: 0,
      scoreDistribution: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, total: 0 },
      avgScore: null,
      longestWinStreak: 0,
      bestRound: null,
      bestPayout: null,
      mostSkins: null,
      scoreTrend: null,
    });
  });

  it('returns empty stats when supabase players query returns null', async () => {
    const supabase = buildSupabaseStub({ players: { data: null } });

    const stats = await computeUserStats('user-1', supabase);

    expect(stats.roundsPlayed).toBe(0);
    expect(stats.holesWon).toBe(0);
    expect(stats.bestCourse).toBeNull();
  });

  it('aggregates score distribution, win counts, and best course for a representative round', async () => {
    // Two completed rounds, both at "Pebble Beach". The user is "user-player-A".
    // Round R1 (3 holes scored, par 4 each):
    //   user: 3 (birdie), 4 (par), 5 (bogey)  → total 12 → wins
    //   opp:  4 (par),    5 (bogey),  6 (dbl) → total 15
    //   user wins all 3 holes alone → holesWon=3, holesPlayed=3
    // Round R2 (2 holes scored, par 4 each):
    //   user: 4 (par),  4 (par)  → total 8 → wins (opp scored 5, 5)
    //   opp:  5 (bogey), 5 (bogey) → total 10
    //   user wins both → holesWon=2, holesPlayed=2

    const playersData = [
      { id: 'user-player-A', round_id: 'r1', name: 'Rishi' },
      { id: 'user-player-B', round_id: 'r2', name: 'Rishi' },
    ];

    const opponentR1 = 'opp-1';
    const opponentR2 = 'opp-2';

    const roundsData = [
      {
        id: 'r1',
        course_name: 'Pebble Beach',
        status: 'complete',
        games: [],
        stakes: 5,
        hole_info: [
          { number: 1, par: 4 },
          { number: 2, par: 4 },
          { number: 3, par: 4 },
        ],
      },
      {
        id: 'r2',
        course_name: 'Pebble Beach',
        status: 'complete',
        games: [],
        stakes: 10,
        hole_info: [
          { number: 1, par: 4 },
          { number: 2, par: 4 },
        ],
      },
    ];

    const scoresData = [
      // R1 — user
      { id: 's1', round_id: 'r1', player_id: 'user-player-A', hole_number: 1, strokes: 3 }, // birdie
      { id: 's2', round_id: 'r1', player_id: 'user-player-A', hole_number: 2, strokes: 4 }, // par
      { id: 's3', round_id: 'r1', player_id: 'user-player-A', hole_number: 3, strokes: 5 }, // bogey
      // R1 — opponent
      { id: 's4', round_id: 'r1', player_id: opponentR1, hole_number: 1, strokes: 4 },
      { id: 's5', round_id: 'r1', player_id: opponentR1, hole_number: 2, strokes: 5 },
      { id: 's6', round_id: 'r1', player_id: opponentR1, hole_number: 3, strokes: 6 },
      // R2 — user
      { id: 's7', round_id: 'r2', player_id: 'user-player-B', hole_number: 1, strokes: 4 }, // par
      { id: 's8', round_id: 'r2', player_id: 'user-player-B', hole_number: 2, strokes: 4 }, // par
      // R2 — opponent
      { id: 's9', round_id: 'r2', player_id: opponentR2, hole_number: 1, strokes: 5 },
      { id: 's10', round_id: 'r2', player_id: opponentR2, hole_number: 2, strokes: 5 },
    ];

    const supabase = buildSupabaseStub({
      players: { data: playersData },
      rounds: { data: roundsData },
      scores: { data: scoresData },
    });

    const stats = await computeUserStats('user-1', supabase);

    // Score distribution counts only the user's own scored holes (5 holes total).
    expect(stats.scoreDistribution.total).toBe(5);
    expect(stats.scoreDistribution.eagles).toBe(0);
    expect(stats.scoreDistribution.birdies).toBe(1); // R1 hole 1
    expect(stats.scoreDistribution.pars).toBe(3); // R1 hole 2, R2 holes 1+2
    expect(stats.scoreDistribution.bogeys).toBe(1); // R1 hole 3
    expect(stats.scoreDistribution.doubles).toBe(0);

    // The user won every contested hole outright (5 of 5)
    expect(stats.holesPlayed).toBe(5);
    expect(stats.holesWon).toBe(5);

    // Best course aggregates wins across both rounds at Pebble Beach
    expect(stats.bestCourse).toEqual({ name: 'Pebble Beach', wins: 5 });

    // Two completed rounds, both won → matchesPlayed=2, matchesWon=2, longestWinStreak=2
    expect(stats.matchesPlayed).toBe(2);
    expect(stats.matchesWon).toBe(2);
    expect(stats.longestWinStreak).toBe(2);

    // Stakes: $5 × 1 opp + $10 × 1 opp = $15
    expect(stats.totalMoneyWon).toBe(15);

    // 5 holes summed: birdie (-1), par (0), bogey (+1), par (0), par (0) = 0 → avg 0
    expect(stats.avgScore).toBe(0);

    // Two distinct round ids in playersData → roundsPlayed=2
    expect(stats.roundsPlayed).toBe(2);
  });
});
