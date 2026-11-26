/**
 * The plan-round edge function (Deno) keeps its own copy of the plan schema.
 * If the app learns a new game type and the function doesn't, spoken rounds
 * would silently drop that game. This test fails first.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PLAN_GAME_TYPES } from './types';
import { PLAN_SCHEMA, wireToPlan, toWireCustom, fromWireCustom } from '../../../supabase/functions/_shared/planRoundPrompt';
import { CUSTOM_EXAMPLES } from '../../../supabase/functions/_shared/customExamples';

const src = readFileSync(resolve(__dirname, '../../../supabase/functions/plan-round/index.ts'), 'utf8') +
  readFileSync(resolve(__dirname, '../../../supabase/functions/plan-round/validate.ts'), 'utf8');
const prompt = readFileSync(resolve(__dirname, '../../../supabase/functions/_shared/planRoundPrompt.ts'), 'utf8');

describe('plan-round parity', () => {
  it('lists exactly the app\'s game types', () => {
    const m = /const GAME_TYPES = \[([^\]]+)\] as const/.exec(prompt);
    expect(m).not.toBeNull();
    const fnTypes = [...m![1].matchAll(/"([a-z]+)"/g)].map(x => x[1]).sort();
    expect(fnTypes).toEqual([...PLAN_GAME_TYPES].sort());
  });
  it('asks for every PlanGame field', () => {
    const m = /required: \["type", ([^\]]+)\]/.exec(prompt);
    expect(m).not.toBeNull();
    const fields = [...m![1].matchAll(/"([A-Za-z]+)"/g)].map(x => x[1]).sort();
    expect(fields).toEqual(['autoPress', 'carryover', 'modified', 'perHole', 'stake', 'teamScoring', 'teams']);
  });
  it('validates the new fields after the model', () => {
    expect(src).toMatch(/teamScoring: z\.enum\(TEAM_SCORING\)/);
    expect(src).toMatch(/perHole: z\.boolean\(\)/);
    expect(src).toMatch(/customGames: z\.array\(z\.string\(\)/);
    expect(src).toMatch(/CustomZ\.safeParse/);
  });
  // Structured outputs reject a schema with more than 16 union-typed (anyOf) fields or
  // more than 24 optional ones, and the whole plan would then fail for every golfer.
  it('stays inside the structured-output limits', () => {
    const json = JSON.stringify(PLAN_SCHEMA);
    expect((json.match(/"anyOf"/g) ?? []).length).toBeLessThanOrEqual(16);
    const optional = (node: unknown): number => {
      if (!node || typeof node !== 'object') return 0;
      const n = node as { properties?: Record<string, unknown>; required?: string[] };
      let count = n.properties ? Object.keys(n.properties).filter(k => !(n.required ?? []).includes(k)).length : 0;
      for (const v of Object.values(node)) count += Array.isArray(v) ? v.reduce((a: number, x) => a + optional(x), 0) : optional(v);
      return count;
    };
    expect(optional(PLAN_SCHEMA)).toBe(0);
  });
  it('custom games round-trip between the wire form and the plan form', () => {
    for (const ex of CUSTOM_EXAMPLES) {
      expect(fromWireCustom(toWireCustom(ex.custom, ex.stake))).toEqual(ex.custom);
    }
    const plan = wireToPlan({ games: [], customGames: [toWireCustom(CUSTOM_EXAMPLES[0].custom, 0.25)], unsupported: [] }) as { games: { type: string; stake: number; custom: unknown }[] };
    expect(plan.games[0]).toMatchObject({ type: 'custom', stake: 0.25, custom: CUSTOM_EXAMPLES[0].custom });
    // The model writes each custom game as a JSON string.
    const fromString = wireToPlan({ games: [], customGames: [JSON.stringify(toWireCustom(CUSTOM_EXAMPLES[0].custom, 0.25))], unsupported: [] }) as typeof plan;
    expect(fromString.games[0]).toEqual(plan.games[0]);
    const broken = wireToPlan({ games: [], customGames: ['{"name": "Daytona", "sides":'], unsupported: [] }) as { games: unknown[]; unsupported: string[] };
    expect(broken.games).toEqual([]);
    expect(broken.unsupported).toEqual(["a custom game (couldn't set it up)"]);
  });
  // A nested custom-game object made the compiled grammar too large and every request
  // failed in production. Custom games stay a plain list of strings.
  it('keeps custom games out of the constrained grammar', () => {
    expect(PLAN_SCHEMA.properties.customGames).toEqual({ type: 'array', items: { type: 'string' } });
  });
  it('never asks the model for database ids', () => {
    expect(src).not.toMatch(/profileId|friendId|course_id/);
    expect(prompt).not.toMatch(/profileId|friendId|course_id/);
  });
});
