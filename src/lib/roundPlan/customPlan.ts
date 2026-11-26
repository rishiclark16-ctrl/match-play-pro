/**
 * Turns a planner's custom game (players named as said) into a GameSpec the engine
 * scores (players as draft keys), and the other way for the offline parser and tests.
 */
import { PRESETS, STABLEFORD_TABLE } from '@/lib/games/custom/presets';
import { mapSpecPlayers } from '@/lib/games/custom/round';
import type { GameSpec } from '@/lib/games/custom/types';
import { validateSpec } from '@/lib/games/custom/validate';
import type { PlanCustomSpec } from './types';

/** A complete spec from the flattened plan form, with defaults for anything left null. */
export function specFromPlan(c: PlanCustomSpec, allPlayers: string[], useNet: boolean): GameSpec {
  const s = c.sides;
  const sides: GameSpec['sides'] =
    s.kind === 'teams' ? { kind: 'teams', teams: s.teams ?? [] }
    : s.kind === 'rotating_teams' ? { kind: 'rotating_teams', rotations: s.rotations ?? [] }
    : s.kind === 'one_vs_field' ? { kind: 'one_vs_field', order: s.order?.length ? s.order : allPlayers, loneWeight: s.loneWeight ?? 1, fieldMetric: s.fieldMetric ?? 'best' }
    : { kind: 'individual' };
  return {
    version: 1,
    name: c.name.trim().slice(0, 60) || 'Custom game',
    sides,
    contests: c.contests.map(k => {
      switch (k.kind) {
        case 'low_wins': return { kind: 'low_wins', metric: k.metric, points: k.points ?? 1 };
        case 'rank': return { kind: 'rank', metric: k.metric, table: k.table ?? [], ties: k.ties ?? 'share' };
        case 'vs_par': return { kind: 'vs_par', metric: k.metric, table: k.parTable ?? STABLEFORD_TABLE };
        case 'diff': return { kind: 'diff', metric: k.metric };
      }
    }),
    ties: c.ties,
    multipliers: c.multipliers.map(m => ({ when: m.when, factor: m.factor, ...(m.holes ? { holes: m.holes } : {}) })),
    segments: c.segments,
    scoring: c.scoring,
    payout: c.payout,
    money: c.money ?? (s.kind === 'one_vs_field' ? 'each_opponent' : 'per_man'),
    net: c.net ?? useNet,
    quota: c.quota,
  };
}

export interface ResolvedCustom {
  spec: GameSpec | null;
  issues: string[];
}

/**
 * Maps every named player to a draft key and validates the game. Any name that
 * isn't one of the round's players, or any rule the engine can't score as written,
 * comes back as an issue (the golfer fixes it before teeing off).
 */
export function resolveCustom(
  c: PlanCustomSpec, keys: string[], findKey: (spoken: string) => string | null, useNet: boolean, holes: number[],
): ResolvedCustom {
  const unknown = new Set<string>();
  const named = specFromPlan(c, keys, useNet);
  const spec = mapSpecPlayers(named, ref => {
    if (keys.includes(ref)) return ref;
    const k = findKey(ref);
    if (!k) unknown.add(ref);
    return k ?? ref;
  });
  if (unknown.size) return { spec: null, issues: [`${spec.name}: who is ${[...unknown].join(', ')}?`] };
  const issues = validateSpec(spec, keys, holes).map(i => `${spec.name}: ${i}`);
  return { spec: issues.length ? null : spec, issues };
}

/** The plan form of a spec (players as given). Used for presets and the offline parser. */
export function planFromSpec(spec: GameSpec): PlanCustomSpec {
  const s = spec.sides;
  return {
    name: spec.name,
    sides: {
      kind: s.kind,
      teams: s.kind === 'teams' ? s.teams : null,
      rotations: s.kind === 'rotating_teams' ? s.rotations : null,
      order: s.kind === 'one_vs_field' ? s.order : null,
      loneWeight: s.kind === 'one_vs_field' ? s.loneWeight : null,
      fieldMetric: s.kind === 'one_vs_field' ? s.fieldMetric : null,
    },
    contests: spec.contests.map(k => ({
      kind: k.kind, metric: k.metric,
      points: k.kind === 'low_wins' ? k.points : null,
      table: k.kind === 'rank' ? k.table : null,
      ties: k.kind === 'rank' ? k.ties : null,
      parTable: k.kind === 'vs_par' ? k.table : null,
    })),
    ties: spec.ties,
    multipliers: spec.multipliers.map(m => ({ when: m.when, holes: m.holes ?? null, factor: m.factor })),
    segments: spec.segments,
    scoring: spec.scoring,
    payout: spec.payout,
    money: spec.money,
    net: null,
    quota: spec.quota,
  };
}

/**
 * Named games the offline parser can set up as custom games without the AI.
 * `teams` are the two sides when the game needs them; `everyone` is the speaker
 * ("me") and the other players in seat order.
 */
export const OFFLINE_PRESETS: Record<string, (teams: [string[], string[]] | null, everyone: string[]) => GameSpec | null> = {
  split_sixes: () => PRESETS.splitSixes(),
  acey_deucey: () => PRESETS.aceyDeucey(),
  per_stroke: () => PRESETS.dollarAStroke(),
  stroke_play_bet: () => PRESETS.medal(),
  quota: () => PRESETS.quota(),
  wolfman: (_t, everyone) => PRESETS.wolfman(everyone),
  high_low: teams => (teams ? PRESETS.highLow(teams) : null),
  daytona: teams => (teams ? PRESETS.daytona(teams) : null),
};
