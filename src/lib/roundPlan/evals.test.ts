/**
 * Round-plan evals, the deterministic half (runs on every PR).
 *
 * 1. Engine: every eval case's expected plan resolves into the games the app plays,
 *    with the right team scoring, payout and stakes. If this fails, the app can't
 *    play a game the model correctly understood.
 * 2. Coverage: every game in the grounding catalogue has at least one eval case,
 *    and every game the app can't play has a case that checks it is flagged.
 * 3. Offline parser: the no-network fallback's score on the cases may not drop.
 *
 * The model half (the real prompt, live) is evals/round-plan/run.ts.
 */
import { describe, it, expect } from 'vitest';
import { CASES, type GameExpect } from '../../../evals/round-plan/cases';
import { scoreCase } from '../../../evals/round-plan/score';
import { GOLF_GAMES } from '../../../supabase/functions/_shared/golfGames';
import { SYSTEM } from '../../../supabase/functions/_shared/planRoundPrompt';
import { resolveGames } from './games';
import { customGamesTransfers } from '@/lib/games/custom/round';
import { localParse, unsaidAmounts } from './localParse';
import type { DraftPlayer, PlanGame } from './types';

const you: DraftPlayer = { key: 'you', name: 'Sam Carter', kind: 'you', profileId: 'me', handicap: 8, saidAs: null, spoken: '', alternatives: [] };

function draftPlayers(others: string[]): DraftPlayer[] {
  return [you, ...others.map((name, i) => ({
    key: `p${i + 1}`, name, kind: 'guest' as const, profileId: null, handicap: null, saidAs: null, spoken: name, alternatives: [],
  }))];
}

function toPlanGame(e: GameExpect): PlanGame {
  return {
    stake: null, carryover: null, autoPress: null, modified: null, teams: null, teamScoring: null, perHole: null, custom: null,
    ...e,
  } as PlanGame;
}

describe('round-plan eval: engine', () => {
  const withGames = CASES.filter(c => c.expect.games?.length);
  for (const c of withGames) {
    it(c.id, () => {
      const games = c.expect.games!.map(g => toPlanGame('oneOf' in g ? g.oneOf[0] : g));
      let n = 0;
      const r = resolveGames({ games, players: draftPlayers(c.expect.players ?? []), isPro: true, useNet: true, generateId: () => `g${++n}` });

      if (c.engine?.issue) {
        expect(r.issues.map(i => i.message).join(' | ')).toMatch(new RegExp(c.engine.issue, 'i'));
        return;
      }
      expect(r.issues.map(i => i.message)).toEqual([]);
      expect(r.games).toHaveLength(games.length);
      for (const want of c.engine?.games ?? []) {
        const got = r.games.find(g => g.type === want.type);
        expect(got, `${c.id}: no ${want.type} game`).toBeDefined();
        for (const [k, v] of Object.entries(want)) {
          expect((got as unknown as Record<string, unknown>)[k], `${c.id}: ${want.type}.${k}`).toEqual(v);
        }
      }
      if (c.engine?.assumption) {
        expect(r.assumptions.map(a => a.message).join(' | ')).toMatch(new RegExp(c.engine.assumption, 'i'));
      }
      if (c.engine?.money) {
        // Play the resolved games on the short card; custom games settle through the engine.
        const { rows, stake, balance } = c.engine.money;
        const seats = draftPlayers(c.expect.players ?? []);
        const holeInfo = rows.map((_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));
        const scores = rows.flatMap((row, h) => seats.map((p, i) => ({ id: `${p.key}${h}`, playerId: p.key, roundId: 'r', holeNumber: h + 1, strokes: row[i] })));
        const games = r.games.map(g => (stake != null ? { ...g, stakes: stake } : g));
        const got: Record<string, number> = {};
        for (const t of customGamesTransfers(games, seats.map(p => ({ id: p.key })), scores, holeInfo, true)) {
          const from = t.from === 'you' ? 'me' : seats.find(p => p.key === t.from)!.name;
          const to = t.to === 'you' ? 'me' : seats.find(p => p.key === t.to)!.name;
          got[from] = Math.round(((got[from] ?? 0) - t.amount) * 100) / 100;
          got[to] = Math.round(((got[to] ?? 0) + t.amount) * 100) / 100;
        }
        for (const [name, v] of Object.entries(balance)) expect(got[name] ?? 0, `${c.id}: ${name}`).toBeCloseTo(v, 2);
      }
    });
  }
});

describe('round-plan eval: catalogue coverage', () => {
  const covered = new Set(CASES.flatMap(c => c.catalog));

  it('every catalogued game has an eval case', () => {
    expect(GOLF_GAMES.map(g => g.id).filter(id => !covered.has(id))).toEqual([]);
  });

  it('every playable game has a case that sets it up', () => {
    const playable = GOLF_GAMES.filter(g => g.support.status === 'yes' || g.support.status === 'as').map(g => g.id);
    const setUp = new Set(CASES.filter(c => c.expect.games?.length).flatMap(c => c.catalog));
    expect(playable.filter(id => !setUp.has(id))).toEqual([]);
  });

  it('every game the app does not play from a sentence has a case that checks it is flagged', () => {
    const notPlayable = GOLF_GAMES.filter(g => g.support.status !== 'yes' && g.support.status !== 'as').map(g => g.id);
    const flagged = new Set(CASES.filter(c => c.expect.unsupported?.length).flatMap(c => c.catalog));
    expect(notPlayable.filter(id => !flagged.has(id))).toEqual([]);
  });

  it('catalogue ids are unique', () => {
    const ids = GOLF_GAMES.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the prompt carries the whole glossary', () => {
    for (const g of GOLF_GAMES) expect(SYSTEM, g.id).toContain(g.name);
  });
});

/**
 * The offline parser (used when the network or model fails) is scored on every
 * case it can set up (AI-only cases are skipped), unsupported flags included. Raise
 * LOCAL_BASELINE when it improves; never lower it for the same set of cases.
 */
const LOCAL_BASELINE = 86;

describe('round-plan eval: offline parser', () => {
  it(`passes at least ${LOCAL_BASELINE} of the ${CASES.filter(c => !c.aiOnly).length} cases it can set up`, () => {
    const scored = CASES.filter(c => !c.aiOnly).map(c => scoreCase(c, localParse(c.text)));
    const passed = scored.filter(s => s.pass).length;
    if (process.env.EVAL_VERBOSE) {
      for (const s of scored.filter(x => !x.pass)) console.log(`  ✗ ${s.id}: ${s.failures.join('; ')}`);
    }
    console.log(`offline parser: ${passed}/${scored.length} cases`);
    expect(passed).toBeGreaterThanOrEqual(LOCAL_BASELINE);
  });

  // Money safety check: an AI amount the golfer never said blocks tee-off. Amounts
  // said without digits ("a quarter a point") were missing, so a correct plan was blocked.
  it('accepts amounts said in words', () => {
    const plan = (stake: number) => ({ ...localParse('x'), games: [{ type: 'vegas' as const, stake, carryover: null, autoPress: null, modified: null, teams: null, teamScoring: null, perHole: null, custom: null }] });
    expect(unsaidAmounts(plan(0.25), 'vegas a quarter a point')).toEqual([]);
    expect(unsaidAmounts(plan(0.5), 'fifty cents a point vegas')).toEqual([]);
    expect(unsaidAmounts(plan(1), 'vegas for a buck')).toEqual([]);
    expect(unsaidAmounts(plan(0.25), 'vegas for a dollar')).toEqual([{ type: 'vegas', stake: 0.25 }]);
  });
});
