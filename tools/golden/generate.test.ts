/**
 * Golden fixture generator.
 *
 * Runs the v1 TypeScript betting engines over a fixed set of scenarios and
 * freezes every input/output pair to tools/golden/fixtures/*.json.
 *
 * Those JSON files are the specification for the v3 Swift engine: the Swift
 * XCTest suite loads the same files, runs the Swift implementation over the
 * same inputs, and asserts byte-identical results. If Swift and TypeScript
 * ever disagree about who owes whom, the test fails.
 *
 * Run:  npx vitest run tools/golden/generate.test.ts --include 'tools/**\/*.test.ts'
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { calculateNassau } from '@/lib/games/nassau';
import { calculateSkins } from '@/lib/games/skins';
import { calculateStableford } from '@/lib/games/stableford';
import { calculateMatchPlay } from '@/lib/games/matchPlay';
import { calculateSettlement } from '@/lib/games/settlement';

import {
  makePlayers, makeCourse, makeScores, makeStrokesPerHole, serializeStrokes,
} from './scenarios';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const course = makeCourse();

type Case = { name: string; input: unknown; output: unknown };

function write(game: string, cases: Case[]) {
  mkdirSync(OUT, { recursive: true });
  const body = { game, version: 1, caseCount: cases.length, cases };
  writeFileSync(resolve(OUT, `${game}.json`), JSON.stringify(body, null, 2) + '\n');
  return cases.length;
}

describe('golden fixtures', () => {
  it('nassau', () => {
    const cases: Case[] = [];
    for (const holes of [5, 9, 18]) {
      for (const net of [false, true]) {
        for (const seed of [11, 22, 33]) {
          const players = makePlayers(2, net ? [4, 18] : undefined);
          const scores = makeScores(players, course, holes, seed, [0, 1]);
          const sph = net ? makeStrokesPerHole(players, course) : undefined;
          const holesInRound = holes <= 9 ? 9 : 18;
          const stakes = 20;
          const output = calculateNassau(scores, players, stakes, [], holesInRound, sph);
          cases.push({
            name: `2p-${holes}holes-${net ? 'net' : 'gross'}-seed${seed}`,
            input: { players, scores, stakes, presses: [], holesInRound, strokesPerHole: serializeStrokes(sph) },
            output,
          });
        }
      }
    }
    expect(write('nassau', cases)).toBeGreaterThan(0);
  });

  it('skins', () => {
    const cases: Case[] = [];
    for (const count of [2, 3, 4]) {
      for (const carryover of [true, false]) {
        for (const seed of [44, 55]) {
          const players = makePlayers(count);
          const holes = 18;
          const scores = makeScores(players, course, holes, seed, [0, 1, 0, 2].slice(0, count));
          const stakesPerSkin = 5;
          const output = calculateSkins(scores, players, holes, stakesPerSkin, carryover, undefined);
          cases.push({
            name: `${count}p-carry${carryover ? 'on' : 'off'}-seed${seed}`,
            input: { players, scores, holesPlayed: holes, stakesPerSkin, carryover, strokesPerHole: null },
            output,
          });
        }
      }
    }
    expect(write('skins', cases)).toBeGreaterThan(0);
  });

  it('stableford', () => {
    const cases: Case[] = [];
    for (const count of [2, 4]) {
      for (const modified of [false, true]) {
        for (const seed of [66, 77]) {
          const players = makePlayers(count, [2, 9, 14, 22].slice(0, count));
          const scores = makeScores(players, course, 18, seed, [0, 1, 2, 1].slice(0, count));
          const sph = makeStrokesPerHole(players, course);
          const output = calculateStableford(scores, players, course, modified, sph);
          cases.push({
            name: `${count}p-${modified ? 'modified' : 'standard'}-seed${seed}`,
            input: { players, scores, holeInfo: course, modified, strokesPerHole: serializeStrokes(sph) },
            output,
          });
        }
      }
    }
    expect(write('stableford', cases)).toBeGreaterThan(0);
  });

  it('matchPlay', () => {
    const cases: Case[] = [];
    for (const totalHoles of [9, 18] as const) {
      for (const net of [false, true]) {
        for (const seed of [88, 99, 111]) {
          const players = makePlayers(2, net ? [6, 15] : undefined);
          const scores = makeScores(players, course, totalHoles, seed, [0, 1]);
          const sph = net ? makeStrokesPerHole(players, course) : undefined;
          const output = calculateMatchPlay(scores, players, course, sph, totalHoles);
          cases.push({
            name: `2p-${totalHoles}holes-${net ? 'net' : 'gross'}-seed${seed}`,
            input: { players, scores, holeInfo: course, strokesPerHole: serializeStrokes(sph), totalHoles },
            output,
          });
        }
      }
    }
    expect(write('matchPlay', cases)).toBeGreaterThan(0);
  });

  it('settlement', () => {
    const cases: Case[] = [];
    for (const count of [2, 3, 4]) {
      for (const seed of [123, 234]) {
        const players = makePlayers(count);
        const scores = makeScores(players, course, 18, seed, [0, 1, 0, 2].slice(0, count));
        const skinsResult = calculateSkins(scores, players, 18, 5, true, undefined);
        const nassauResult = count === 2
          ? calculateNassau(scores, players, 20, [], 18, undefined)
          : undefined;
        const output = calculateSettlement(players, skinsResult, nassauResult);
        cases.push({
          name: `${count}p-skins${count === 2 ? '+nassau' : ''}-seed${seed}`,
          input: { players, skinsResult, nassauResult: nassauResult ?? null },
          output,
        });
      }
    }
    expect(write('settlement', cases)).toBeGreaterThan(0);
  });
});
