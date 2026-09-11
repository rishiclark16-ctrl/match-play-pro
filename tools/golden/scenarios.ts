/**
 * Deterministic scenario builder for golden fixtures.
 *
 * These scenarios feed the v1 TypeScript engines; their outputs are frozen as
 * JSON and become the acceptance tests for the v3 Swift engine. Nothing here
 * may use Math.random(), Date.now(), or crypto.randomUUID() — a fixture that
 * changes between runs is worthless as a spec.
 */
import type { Player, Score, HoleInfo } from '@/types/golf';

/** Deterministic 32-bit LCG. Same seed => same course, forever. */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export const PLAYER_NAMES = ['Rishi', 'Andrew', 'Marco', 'Dominik'];

export function makePlayers(count: number, handicaps?: number[]): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    roundId: 'r1',
    name: PLAYER_NAMES[i],
    orderIndex: i,
    ...(handicaps ? { handicap: handicaps[i] } : {}),
  }));
}

/** Standard 18-hole par-72 layout with a fixed stroke index. */
export function makeCourse(): HoleInfo[] {
  const pars = [4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
  const si = [7, 11, 17, 1, 5, 15, 9, 3, 13, 8, 18, 12, 2, 6, 16, 4, 10, 14];
  return pars.map((par, i) => ({
    number: i + 1,
    par,
    handicap: si[i],
    yardage: 300 + ((i * 37) % 250),
  }));
}

/**
 * Scores for `holes` holes. `skill` biases each player's distribution so the
 * fixtures contain real winners, ties, carryovers and blowouts rather than noise.
 */
export function makeScores(
  players: Player[],
  course: HoleInfo[],
  holes: number,
  seed: number,
  skill: number[] = [],
): Score[] {
  const rng = makeRng(seed);
  const out: Score[] = [];
  for (let h = 1; h <= holes; h++) {
    const par = course[h - 1].par;
    players.forEach((p, i) => {
      const bias = skill[i] ?? 0;
      const roll = rng();
      let delta: number;
      if (roll < 0.05) delta = -1;        // birdie
      else if (roll < 0.45) delta = 0;    // par
      else if (roll < 0.8) delta = 1;     // bogey
      else delta = 2;                     // double
      out.push({
        id: `s${h}-${p.id}`,
        roundId: 'r1',
        playerId: p.id,
        holeNumber: h,
        strokes: Math.max(1, par + delta + bias),
      });
    });
  }
  return out;
}

/** Strokes-per-hole allocation off the stroke index — the net-scoring path. */
export function makeStrokesPerHole(
  players: Player[],
  course: HoleInfo[],
): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>();
  const low = Math.min(...players.map(p => p.handicap ?? 0));
  players.forEach(p => {
    const playing = Math.max(0, (p.handicap ?? 0) - low);
    const holes = new Map<number, number>();
    course.forEach(h => {
      const si = h.handicap ?? h.number;
      let strokes = Math.floor(playing / 18);
      if (si <= playing % 18) strokes += 1;
      if (strokes > 0) holes.set(h.number, strokes);
    });
    map.set(p.id, holes);
  });
  return map;
}

/** Maps are not JSON — flatten to { playerId: { hole: strokes } }. */
export function serializeStrokes(
  m?: Map<string, Map<number, number>>,
): Record<string, Record<string, number>> | null {
  if (!m) return null;
  const out: Record<string, Record<string, number>> = {};
  m.forEach((holes, pid) => {
    const inner: Record<string, number> = {};
    holes.forEach((v, k) => { inner[String(k)] = v; });
    out[pid] = inner;
  });
  return out;
}
