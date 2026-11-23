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

describe('plan-round parity', () => {
  it('lists exactly the app\'s game types', () => {
    const m = /const GAME_TYPES = \[([^\]]+)\] as const/.exec(src);
    expect(m).not.toBeNull();
    const fnTypes = [...m![1].matchAll(/"([a-z]+)"/g)].map(x => x[1]).sort();
    expect(fnTypes).toEqual([...PLAN_GAME_TYPES].sort());
  });
  it('never asks the model for database ids', () => {
    expect(src).not.toMatch(/profileId|friendId|course_id/);
  });
});
