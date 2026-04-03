import { describe, it, expect } from 'vitest';
import { doubleMetaphone, phoneticMatch, phoneticDistance, findBestPhoneticMatch } from './phoneticMatch';

describe('doubleMetaphone', () => {
  it('should return empty strings for empty input', () => {
    expect(doubleMetaphone('')).toEqual(['', '']);
  });

  it('should generate codes for simple names', () => {
    const [primary] = doubleMetaphone('Mike');
    expect(primary.length).toBeGreaterThan(0);
  });

  it('should handle silent initial letters', () => {
    const [primary] = doubleMetaphone('Knight');
    // KN → skip K, starts with N
    expect(primary[0]).toBe('N');
  });

  it('should handle PH as F', () => {
    const [primary] = doubleMetaphone('Phil');
    expect(primary[0]).toBe('F');
  });

  it('should handle CH as X', () => {
    const [primary] = doubleMetaphone('Charles');
    expect(primary).toContain('X');
  });

  it('should handle SH as X', () => {
    const [primary] = doubleMetaphone('Shawn');
    expect(primary[0]).toBe('X');
  });

  it('should handle TH', () => {
    const [primary] = doubleMetaphone('Thomas');
    expect(primary.length).toBeGreaterThan(0);
  });

  it('should handle double letters', () => {
    const [a] = doubleMetaphone('Matt');
    const [b] = doubleMetaphone('Mat');
    // Both should produce same code since TT → T
    expect(a).toBe(b);
  });

  it('should produce consistent codes for the same input', () => {
    expect(doubleMetaphone('Robert')).toEqual(doubleMetaphone('Robert'));
  });

  it('should produce different primary codes for very different names', () => {
    const [a] = doubleMetaphone('Mike');
    const [b] = doubleMetaphone('Sarah');
    expect(a).not.toBe(b);
  });
});

describe('phoneticMatch', () => {
  it('should return false for empty strings', () => {
    expect(phoneticMatch('', 'Mike')).toBe(false);
    expect(phoneticMatch('Mike', '')).toBe(false);
  });

  it('should match identical names', () => {
    expect(phoneticMatch('Mike', 'Mike')).toBe(true);
  });

  it('should match case-insensitively', () => {
    expect(phoneticMatch('mike', 'MIKE')).toBe(true);
  });

  // Core golf use cases — names that sound alike
  it('should match Sean and Shawn', () => {
    expect(phoneticMatch('Sean', 'Shawn')).toBe(true);
  });

  it('should match Shaun and Shawn', () => {
    expect(phoneticMatch('Shaun', 'Shawn')).toBe(true);
  });

  it('should match Jeff and Geoff', () => {
    expect(phoneticMatch('Jeff', 'Geoff')).toBe(true);
  });

  it('should match Phil and Phillip', () => {
    expect(phoneticMatch('Phil', 'Phillip')).toBe(true);
  });

  it('should match Steven and Stephen', () => {
    expect(phoneticMatch('Steven', 'Stephen')).toBe(true);
  });

  it('should match Eric and Erik', () => {
    expect(phoneticMatch('Eric', 'Erik')).toBe(true);
  });

  it('should match Brian and Bryan', () => {
    expect(phoneticMatch('Brian', 'Bryan')).toBe(true);
  });

  it('should match Carl and Karl', () => {
    expect(phoneticMatch('Carl', 'Karl')).toBe(true);
  });

  it('should match Katherine and Catherine', () => {
    expect(phoneticMatch('Katherine', 'Catherine')).toBe(true);
  });

  it('should NOT match very different names', () => {
    expect(phoneticMatch('Mike', 'Sarah')).toBe(false);
    expect(phoneticMatch('Bob', 'Tim')).toBe(false);
    expect(phoneticMatch('Adam', 'Frank')).toBe(false);
  });

  it('should match Kris and Chris', () => {
    expect(phoneticMatch('Kris', 'Chris')).toBe(true);
  });

  it('should match Jon and John', () => {
    expect(phoneticMatch('Jon', 'John')).toBe(true);
  });

  it('should match Mathew and Matthew', () => {
    expect(phoneticMatch('Mathew', 'Matthew')).toBe(true);
  });

  it('should match Russ and Russ', () => {
    expect(phoneticMatch('Russ', 'Russ')).toBe(true);
  });
});

describe('phoneticDistance', () => {
  it('should return 0 for empty strings', () => {
    expect(phoneticDistance('', 'Mike')).toBe(0);
  });

  it('should return 1 for identical names', () => {
    expect(phoneticDistance('Mike', 'Mike')).toBe(1);
  });

  it('should return high score for phonetically similar names', () => {
    expect(phoneticDistance('Sean', 'Shawn')).toBeGreaterThanOrEqual(0.5);
  });

  it('should return > 0 for partially similar names', () => {
    const dist = phoneticDistance('Mike', 'Mark');
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThanOrEqual(1);
  });

  it('should return low score for very different names', () => {
    const dist = phoneticDistance('Mike', 'Sarah');
    expect(dist).toBeLessThan(0.5);
  });
});

describe('findBestPhoneticMatch', () => {
  const candidates = ['Michael', 'Robert', 'Timothy', 'Sean', 'Steven'];

  it('should return null for empty input', () => {
    expect(findBestPhoneticMatch('', candidates)).toBe(null);
  });

  it('should return null for empty candidates', () => {
    expect(findBestPhoneticMatch('Mike', [])).toBe(null);
  });

  it('should find exact phonetic match', () => {
    const result = findBestPhoneticMatch('Shawn', candidates);
    expect(result).not.toBeNull();
    expect(result!.match).toBe('Sean');
    expect(result!.score).toBeGreaterThanOrEqual(0.5);
  });

  it('should find Stephen matching Steven', () => {
    const result = findBestPhoneticMatch('Stephen', candidates);
    expect(result).not.toBeNull();
    expect(result!.match).toBe('Steven');
  });

  it('should return null when no match exceeds threshold', () => {
    const result = findBestPhoneticMatch('Zzzzzzz', candidates, 0.9);
    expect(result).toBe(null);
  });

  it('should respect custom threshold', () => {
    const result = findBestPhoneticMatch('Mike', candidates, 0.1);
    expect(result).not.toBeNull();
  });

  it('should handle single-candidate list', () => {
    const result = findBestPhoneticMatch('Shawn', ['Sean']);
    expect(result).not.toBeNull();
    expect(result!.match).toBe('Sean');
  });
});
