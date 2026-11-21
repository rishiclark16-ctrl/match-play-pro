import { describe, it, expect } from 'vitest';
import { suggestFormatName } from './suggestFormatName';

describe('suggestFormatName', () => {
  it('names a single format with unit and presses', () => {
    expect(suggestFormatName([
      { id: 'format_nassau' }, { id: 'settlement_unit_value', value: 5 }, { id: 'press_auto_x_down', value: 2 },
    ], 'whatever')).toBe('$5 Nassau + Presses');
  });

  it('joins two formats', () => {
    expect(suggestFormatName([{ id: 'format_nassau' }, { id: 'format_skins' }], '')).toBe('Nassau + Skins');
  });

  it('ignores infeasible primitives', () => {
    expect(suggestFormatName([{ id: 'format_wolf', infeasible: true }], 'Wolf game.')).toBe('Wolf game');
  });

  it('falls back to a short first sentence', () => {
    expect(suggestFormatName([], 'Saturday money game. Lots of rules')).toBe('Saturday money game');
  });

  it('truncates long descriptions on a word boundary', () => {
    const name = suggestFormatName([], 'We play a very long complicated game with many side bets every week');
    expect(name.endsWith('…')).toBe(true);
    expect(name.length).toBeLessThanOrEqual(30);
    expect(name).not.toMatch(/\s…$/);
  });

  it('uses fallback when nothing is available', () => {
    expect(suggestFormatName([], undefined, 'House Game')).toBe('House Game');
  });

  it('drops the second format when the name would be too long', () => {
    expect(suggestFormatName([
      { id: 'format_bingo_bango_bongo' }, { id: 'format_modified_stableford' }, { id: 'settlement_unit_value', value: 10 },
    ], '')).toBe('$10 Bingo Bango Bongo');
  });
});
