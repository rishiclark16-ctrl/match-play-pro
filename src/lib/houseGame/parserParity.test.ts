/**
 * Guards Notion 09.2 M10: the parse-house-game edge function keeps its own hand-written
 * VALID_IDS set and a second list inside the model prompt. Any primitive the app can
 * configure must appear in both, or a described game silently loses that rule.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PRIMITIVES } from './primitives';

const src = readFileSync(resolve(__dirname, '../../../supabase/functions/parse-house-game/index.ts'), 'utf8');

const validIdsBlock = src.slice(src.indexOf('const VALID_IDS'), src.indexOf(']);', src.indexOf('const VALID_IDS')));
const validIds = new Set([...validIdsBlock.matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]));

const promptStart = src.indexOf('Valid standard ids:');
const promptLine = src.slice(promptStart, src.indexOf('\n\n', promptStart));
const promptIds = new Set(promptLine.replace('Valid standard ids:', '').split(',').map(s => s.trim()).filter(Boolean));

describe('parse-house-game parser parity with primitive catalogue', () => {
  const catalogue = PRIMITIVES.map(p => p.id);

  it('VALID_IDS contains every catalogue primitive', () => {
    expect(catalogue.filter(id => !validIds.has(id))).toEqual([]);
  });

  it('the model prompt lists every catalogue primitive', () => {
    expect(catalogue.filter(id => !promptIds.has(id))).toEqual([]);
  });

  it('VALID_IDS and the prompt list agree', () => {
    expect([...validIds].sort()).toEqual([...promptIds].sort());
  });
});
