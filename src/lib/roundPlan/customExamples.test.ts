/**
 * Every custom example the AI is shown must resolve and validate through the app,
 * and the named ones must score exactly like the engine's presets.
 */
import { describe, it, expect } from 'vitest';
import { CUSTOM_EXAMPLES } from '../../../supabase/functions/_shared/customExamples';
import { PRESETS } from '@/lib/games/custom/presets';
import { settleCustomGame } from '@/lib/games/custom/engine';
import type { GameSpec } from '@/lib/games/custom/types';
import type { HoleInfo, Score } from '@/types/golf';
import { resolveCustom } from './customPlan';
import type { PlanCustomSpec } from './types';

const holes = Array.from({ length: 18 }, (_, i) => i + 1);
const holeInfo: HoleInfo[] = holes.map(n => ({ number: n, par: [4, 5, 3, 4][n % 4], handicap: n }));

function resolve(said: string, players: string[], custom: unknown) {
  const keys = ['me', ...players.map(p => p.toLowerCase())];
  return resolveCustom(custom as PlanCustomSpec, keys, s => (s.toLowerCase() === 'me' ? 'me' : keys.find(k => k === s.toLowerCase()) ?? null), true, holes);
}

function randomScores(keys: string[], seed: number): Score[] {
  let s = seed;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return holeInfo.flatMap(h => keys.map(k => ({ id: `${k}${h.number}`, playerId: k, roundId: 'r', holeNumber: h.number, strokes: Math.max(2, Math.round(h.par + r() * 4 - 1.2)) })));
}

describe('custom examples shown to the AI', () => {
  for (const ex of CUSTOM_EXAMPLES) {
    it(`resolves: ${ex.said}`, () => {
      const r = resolve(ex.said, ex.players, ex.custom);
      expect(r.issues).toEqual([]);
      expect(r.spec).not.toBeNull();
    });
  }

  const samePreset: [string, (keys: string[]) => GameSpec][] = [
    ['Daytona', k => PRESETS.daytona([[k[0], k[1]], [k[2], k[3]]])],
    ['High-low', k => PRESETS.highLow([[k[0], k[1]], [k[2], k[3]]])],
    ['Split Sixes', () => PRESETS.splitSixes()],
    ['Acey Deucey', () => PRESETS.aceyDeucey()],
    ['Wolfman', k => PRESETS.wolfman(k)],
    ['Quota', () => PRESETS.quota()],
  ];
  for (const [name, preset] of samePreset) {
    it(`${name} scores exactly like the preset`, () => {
      const ex = CUSTOM_EXAMPLES.find(e => (e.custom as { name: string }).name === name)!;
      const keys = ['me', ...ex.players.map(p => p.toLowerCase())];
      const spec = resolve(ex.said, ex.players, ex.custom).spec!;
      for (let seed = 1; seed <= 10; seed++) {
        const scores = randomScores(keys, seed);
        const a = settleCustomGame({ spec, playerIds: keys, scores, holeInfo, stake: 1, final: true });
        const b = settleCustomGame({ spec: preset(keys), playerIds: keys, scores, holeInfo, stake: 1, final: true });
        expect(a.result.byPlayer).toEqual(b.result.byPlayer);
      }
    });
  }
});
