/**
 * Scores a RoundPlan against an eval case. Returns every mismatch in plain words,
 * so a failing case reads like a bug report ("low-total-named: match teamScoring
 * was best, expected aggregate").
 */
import type { PlanCustomSpec, PlanGame, RoundPlan } from '../../src/lib/roundPlan/types';
import type { EvalCase, GameExpect } from './cases';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
const SELF = new Set(['me', 'i', 'myself', 'you']);

function sameTeams(actual: [string[], string[]] | null, expected: [string[], string[]]): boolean {
  if (!actual) return false;
  const key = (t: string[]) => t.map(n => (SELF.has(norm(n)) ? 'me' : norm(n).split(' ')[0])).sort().join('+');
  const a = [key(actual[0]), key(actual[1])].sort();
  const e = [key(expected[0]), key(expected[1])].sort();
  return a[0] === e[0] && a[1] === e[1];
}

/**
 * A custom game matches when its structure does: the kind of sides (and the teams),
 * the set of contests (kind + metric, and rank tables), ties when they matter,
 * multipliers, segments count, scoring, payout and quota. Names and money style
 * defaults are not compared.
 */
function customDiffs(got: PlanCustomSpec | null, want: PlanCustomSpec): string[] {
  if (!got) return ['custom rules missing'];
  const out: string[] = [];
  if (got.sides.kind !== want.sides.kind) out.push(`custom sides were ${got.sides.kind}, expected ${want.sides.kind}`);
  if (want.sides.teams?.length === 2 && !sameTeams((got.sides.teams as [string[], string[]]) ?? null, want.sides.teams as [string[], string[]])) {
    out.push(`custom teams were ${JSON.stringify(got.sides.teams)}, expected ${JSON.stringify(want.sides.teams)}`);
  }
  if (want.sides.kind === 'one_vs_field' && got.sides.loneWeight !== want.sides.loneWeight) out.push(`custom loneWeight was ${got.sides.loneWeight}, expected ${want.sides.loneWeight}`);
  const key = (c: PlanCustomSpec['contests'][number]) => `${c.kind}:${c.kind === 'diff' || c.kind === 'rank' || want.sides.kind !== 'one_vs_field' ? c.metric : '*'}${c.kind === 'rank' ? `:${(c.table ?? []).join('/')}` : ''}`;
  const g = got.contests.map(key).sort().join(', ');
  const w = want.contests.map(key).sort().join(', ');
  if (g !== w) out.push(`custom contests were [${g}], expected [${w}]`);
  if (want.contests.some(c => c.kind === 'low_wins') && got.ties !== want.ties) out.push(`custom ties were ${got.ties}, expected ${want.ties}`);
  const mul = (m: PlanCustomSpec['multipliers']) => m.map(x => `${x.when}x${x.factor}${x.holes ? `@${x.holes.join('/')}` : ''}`).sort().join(', ');
  if (mul(got.multipliers) !== mul(want.multipliers)) out.push(`custom multipliers were [${mul(got.multipliers)}], expected [${mul(want.multipliers)}]`);
  if (got.segments.length !== want.segments.length) out.push(`custom has ${got.segments.length} bets, expected ${want.segments.length}`);
  if (got.scoring !== want.scoring) out.push(`custom scoring was ${got.scoring}, expected ${want.scoring}`);
  if (got.payout !== want.payout) out.push(`custom payout was ${got.payout}, expected ${want.payout}`);
  if (got.quota !== want.quota) out.push(`custom quota was ${got.quota}, expected ${want.quota}`);
  return out;
}

/** Mismatches between one actual game and one expectation. */
function gameDiffs(g: PlanGame, e: GameExpect): string[] {
  const out: string[] = [];
  for (const [field, want] of Object.entries(e)) {
    if (field === 'type') continue;
    const got = (g as unknown as Record<string, unknown>)[field];
    if (field === 'custom') {
      out.push(...customDiffs(g.custom ?? null, want as PlanCustomSpec));
    } else if (field === 'teams') {
      if (!sameTeams(g.teams, want as [string[], string[]])) out.push(`${g.type} teams were ${JSON.stringify(g.teams)}, expected ${JSON.stringify(want)}`);
    } else if (want === false) {
      if (got === true) out.push(`${g.type} ${field} was true, expected not`);
    } else if (typeof want === 'number') {
      if (typeof got !== 'number' || Math.abs(got - want) > 0.001) out.push(`${g.type} ${field} was ${got}, expected ${want}`);
    } else if (got !== want) {
      out.push(`${g.type} ${field} was ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }
  return out;
}

export interface CaseScore {
  id: string;
  pass: boolean;
  failures: string[];
}

export function scoreCase(c: EvalCase, plan: RoundPlan): CaseScore {
  const f: string[] = [];
  const e = c.expect;

  if (e.players) {
    const got = plan.players.map(p => norm(p.name).split(' ')[0]).sort();
    const want = e.players.map(n => norm(n).split(' ')[0]).sort();
    if (got.join(',') !== want.join(',')) f.push(`players were [${got}], expected [${want}]`);
  }

  const matched = new Set<number>();
  for (const item of e.games ?? []) {
    const options = 'oneOf' in item ? item.oneOf : [item];
    let best: { idx: number; diffs: string[] } | null = null;
    for (const opt of options) {
      plan.games.forEach((g, idx) => {
        if (g.type !== opt.type || matched.has(idx)) return;
        const diffs = gameDiffs(g, opt);
        if (!best || diffs.length < best.diffs.length) best = { idx, diffs };
      });
    }
    const found = best as { idx: number; diffs: string[] } | null;
    if (!found) {
      f.push(`missing game ${options.map(o => o.type).join(' or ')}`);
      continue;
    }
    matched.add(found.idx);
    f.push(...found.diffs);
  }
  if (e.noGames && plan.games.length) f.push(`expected no games, got ${plan.games.map(g => g.type).join(', ')}`);
  if (!e.extraGames && !e.noGames) {
    const extra = plan.games.filter((_, i) => !matched.has(i)).map(g => g.type);
    if (extra.length) f.push(`unexpected games: ${extra.join(', ')}`);
  }

  if (e.unsupported) {
    const said = plan.unsupported.join(' | ').toLowerCase();
    // Each keyword is a case-insensitive pattern ("net|medal" accepts either word).
    for (const k of e.unsupported) if (!new RegExp(k, 'i').test(said)) f.push(`unsupported should mention "${k}" (got: ${said || 'nothing'})`);
  }

  if (e.course) {
    const c2 = plan.course;
    if (e.course.query && !norm(c2.query ?? '').includes(norm(e.course.query))) f.push(`course was "${c2.query}", expected "${e.course.query}"`);
    if (e.course.tee && !norm(c2.tee ?? '').includes(norm(e.course.tee))) f.push(`tee was "${c2.tee}", expected "${e.course.tee}"`);
    if (e.course.holes && c2.holes !== e.course.holes) f.push(`holes were ${c2.holes}, expected ${e.course.holes}`);
    if (e.course.nine && c2.nine !== e.course.nine) f.push(`nine was ${c2.nine}, expected ${e.course.nine}`);
  }
  if (e.handicaps) {
    const h = plan.handicaps;
    if (!h || h.mode !== e.handicaps.mode || (e.handicaps.percent != null && h.percent !== e.handicaps.percent)) {
      f.push(`handicaps were ${JSON.stringify(h)}, expected ${JSON.stringify(e.handicaps)}`);
    }
  }
  if (e.userPlaying != null && plan.userPlaying !== e.userPlaying) f.push(`userPlaying was ${plan.userPlaying}`);
  if (e.userHandicap != null && plan.userHandicap !== e.userHandicap) f.push(`userHandicap was ${plan.userHandicap}, expected ${e.userHandicap}`);

  return { id: c.id, pass: f.length === 0, failures: f };
}
