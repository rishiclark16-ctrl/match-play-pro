import { describe, it, expect } from 'vitest';
import {
  calculateCourseHandicap,
  calculatePlayingHandicap,
  getStrokesPerHole,
  getStrokeHoles,
  calculateNetScore,
  calculateTotalNetStrokes,
  formatHandicap,
  getStrokesDescription,
  calculateMatchPlayStrokes,
  buildMatchPlayStrokesMap,
} from './handicapUtils';
import { HoleInfo } from '@/types/golf';

const make18Holes = (): HoleInfo[] =>
  Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: i < 4 ? 5 : i < 14 ? 4 : 3,
    handicap: i + 1, // SI 1 = hole 1, SI 18 = hole 18
  }));

describe('calculateCourseHandicap', () => {
  it('standard slope 113 returns index unchanged', () => {
    expect(calculateCourseHandicap(10, 113)).toBe(10);
  });

  it('higher slope increases handicap', () => {
    expect(calculateCourseHandicap(10, 130)).toBe(Math.round(10 * 130 / 113));
  });

  it('lower slope decreases handicap', () => {
    expect(calculateCourseHandicap(10, 100)).toBe(Math.round(10 * 100 / 113));
  });

  it('applies course rating adjustment when provided', () => {
    // CR 72.5, Par 72 → +0.5 adjustment
    expect(calculateCourseHandicap(10, 113, 72.5, 72)).toBe(Math.round(10 + 0.5));
  });

  it('negative handicap (plus) works', () => {
    expect(calculateCourseHandicap(-3, 113)).toBe(-3);
  });

  it('zero handicap returns 0', () => {
    expect(calculateCourseHandicap(0, 113)).toBe(0);
  });
});

describe('calculatePlayingHandicap', () => {
  it('18 holes returns full course handicap', () => {
    expect(calculatePlayingHandicap(10, 113, 18)).toBe(10);
  });

  it('9 holes returns approximately half', () => {
    expect(calculatePlayingHandicap(10, 113, 9)).toBe(5);
  });

  it('9 holes rounds correctly for odd handicaps', () => {
    expect(calculatePlayingHandicap(11, 113, 9)).toBe(Math.round(11 / 2));
  });
});

describe('getStrokesPerHole', () => {
  const holes = make18Holes();

  it('0 handicap gives 0 strokes on all holes', () => {
    const map = getStrokesPerHole(0, holes);
    for (const strokes of map.values()) expect(strokes).toBe(0);
  });

  it('5 handicap gives 1 stroke on 5 hardest holes (SI 1-5)', () => {
    const map = getStrokesPerHole(5, holes);
    for (let h = 1; h <= 5; h++) expect(map.get(h)).toBe(1);
    for (let h = 6; h <= 18; h++) expect(map.get(h)).toBe(0);
  });

  it('18 handicap gives 1 stroke on every hole', () => {
    const map = getStrokesPerHole(18, holes);
    for (let h = 1; h <= 18; h++) expect(map.get(h)).toBe(1);
  });

  it('20 handicap gives 2 strokes on hardest 2, 1 on rest', () => {
    const map = getStrokesPerHole(20, holes);
    expect(map.get(1)).toBe(2);
    expect(map.get(2)).toBe(2);
    for (let h = 3; h <= 18; h++) expect(map.get(h)).toBe(1);
  });

  it('36 handicap gives 2 strokes on every hole', () => {
    const map = getStrokesPerHole(36, holes);
    for (let h = 1; h <= 18; h++) expect(map.get(h)).toBe(2);
  });

  it('empty holeInfo returns empty map', () => {
    const map = getStrokesPerHole(10, []);
    expect(map.size).toBe(0);
  });

  it('negative handicap (plus) gives penalty strokes from easiest holes', () => {
    const map = getStrokesPerHole(-3, holes);
    // SI 18, 17, 16 get -1 (penalty)
    expect(map.get(18)).toBe(-1);
    expect(map.get(17)).toBe(-1);
    expect(map.get(16)).toBe(-1);
    // Others remain 0
    expect(map.get(1)).toBe(0);
    expect(map.get(15)).toBe(0);
  });
});

describe('getStrokeHoles', () => {
  const holes = make18Holes();

  it('returns empty for 0 handicap', () => {
    expect(getStrokeHoles(0, holes)).toEqual([]);
  });

  it('returns empty for negative handicap', () => {
    expect(getStrokeHoles(-5, holes)).toEqual([]);
  });

  it('returns correct holes for 3 handicap', () => {
    expect(getStrokeHoles(3, holes)).toEqual([1, 2, 3]);
  });

  it('returns sorted ascending', () => {
    const result = getStrokeHoles(10, holes);
    for (let i = 1; i < result.length; i++) expect(result[i]).toBeGreaterThan(result[i - 1]);
  });
});

describe('calculateNetScore', () => {
  it('subtracts handicap strokes', () => {
    expect(calculateNetScore(5, 1)).toBe(4);
  });

  it('0 strokes returns gross', () => {
    expect(calculateNetScore(4, 0)).toBe(4);
  });
});

describe('calculateTotalNetStrokes', () => {
  it('full 18 holes subtracts full handicap', () => {
    expect(calculateTotalNetStrokes(90, 18, 18, 18)).toBe(72);
  });

  it('prorates for partial round', () => {
    // 9 of 18 holes → half handicap
    expect(calculateTotalNetStrokes(45, 10, 9, 18)).toBe(40);
  });
});

describe('formatHandicap', () => {
  it('null → dash', () => expect(formatHandicap(null)).toBe('–'));
  it('undefined → dash', () => expect(formatHandicap(undefined)).toBe('–'));
  it('0 → Scr', () => expect(formatHandicap(0)).toBe('Scr'));
  it('positive → number string', () => expect(formatHandicap(5)).toBe('5'));
  it('negative → plus sign', () => expect(formatHandicap(-3)).toBe('+3'));
});

describe('getStrokesDescription', () => {
  it('0 → Scratch', () => expect(getStrokesDescription(0)).toBe('Scratch'));
  it('1 → singular', () => expect(getStrokesDescription(1)).toBe('1 stroke'));
  it('5 → plural', () => expect(getStrokesDescription(5)).toBe('5 strokes'));
});

describe('calculateMatchPlayStrokes', () => {
  const p1 = { id: '1', name: 'Jack', handicap: 9 };
  const p2 = { id: '2', name: 'Tim', handicap: 13 };

  it('lower handicap gives strokes to higher', () => {
    const info = calculateMatchPlayStrokes(p1, p2);
    expect(info.lowerPlayerId).toBe('1');
    expect(info.higherPlayerId).toBe('2');
    expect(info.strokesGiven).toBe(4);
  });

  it('order does not matter', () => {
    const info = calculateMatchPlayStrokes(p2, p1);
    expect(info.lowerPlayerId).toBe('1');
    expect(info.strokesGiven).toBe(4);
  });

  it('equal handicaps → 0 strokes', () => {
    const info = calculateMatchPlayStrokes(
      { id: '1', name: 'A', handicap: 10 },
      { id: '2', name: 'B', handicap: 10 },
    );
    expect(info.strokesGiven).toBe(0);
  });

  it('manual mode uses manualStrokes', () => {
    const info = calculateMatchPlayStrokes(
      { id: '1', name: 'A', manualStrokes: 5 },
      { id: '2', name: 'B', manualStrokes: 12 },
      113, 18, 'manual',
    );
    expect(info.strokesGiven).toBe(7);
  });
});

describe('buildMatchPlayStrokesMap', () => {
  it('lower player gets 0 strokes, higher gets differential', () => {
    const holes = make18Holes();
    const info = calculateMatchPlayStrokes(
      { id: '1', name: 'A', handicap: 5 },
      { id: '2', name: 'B', handicap: 10 },
    );
    const map = buildMatchPlayStrokesMap(info, holes);
    // Player 1 (lower) gets 0 everywhere
    const p1Map = map.get('1')!;
    for (const v of p1Map.values()) expect(v).toBe(0);
    // Player 2 (higher) gets strokes on 5 hardest holes
    const p2Map = map.get('2')!;
    const totalStrokes = Array.from(p2Map.values()).reduce((a, b) => a + b, 0);
    expect(totalStrokes).toBe(5);
  });
});
