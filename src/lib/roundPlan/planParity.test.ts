/**
 * The plan-round edge function (Deno) keeps its own copy of the plan schema.
 * If the app learns a new game type and the function doesn't, spoken rounds
 * would silently drop that game. This test fails first.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PLAN_GAME_TYPES } from './types';

const src = readFileSync(resolve(__dirname, '../../../supabase/functions/plan-round/index.ts'), 'utf8');
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
  });
  it('never asks the model for database ids', () => {
    expect(src).not.toMatch(/profileId|friendId|course_id/);
    expect(prompt).not.toMatch(/profileId|friendId|course_id/);
  });
});
