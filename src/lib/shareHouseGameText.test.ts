import { describe, it, expect } from 'vitest';
import { buildHouseGameShareText } from './shareHouseGameText';

describe('buildHouseGameShareText', () => {
  const baseArgs = {
    courseName: 'Pebble Beach',
    date: '2026-04-28T12:00:00Z',
    standings: [
      { playerName: 'Alice Smith', netEarnings: 42 },
      { playerName: 'Bob', netEarnings: -15 },
    ],
    junkSummary: [],
  };

  it('formats course + date header', () => {
    const text = buildHouseGameShareText(baseArgs);
    // Locale-tolerant; just confirm course name and the year are present
    expect(text).toMatch(/Pebble Beach —/);
    expect(text).toMatch(/2026/);
  });

  it('sorts standings by netEarnings descending', () => {
    const text = buildHouseGameShareText({
      ...baseArgs,
      standings: [
        { playerName: 'Bob', netEarnings: -15 },
        { playerName: 'Charlie', netEarnings: 30 },
        { playerName: 'Alice', netEarnings: 42 },
      ],
    });
    const lines = text.split('\n');
    const ranks = lines.filter(l => l.includes('$'));
    expect(ranks[0]).toContain('Alice');
    expect(ranks[1]).toContain('Charlie');
    expect(ranks[2]).toContain('Bob');
  });

  it('uses first names only', () => {
    const text = buildHouseGameShareText(baseArgs);
    expect(text).toContain('Alice:');
    expect(text).not.toContain('Smith');
  });

  it('signs winners with +', () => {
    const text = buildHouseGameShareText({
      ...baseArgs,
      standings: [{ playerName: 'A', netEarnings: 10 }],
    });
    expect(text).toContain('A: +$10');
  });

  it('omits the + sign for negatives (matches original $-N format)', () => {
    const text = buildHouseGameShareText({
      ...baseArgs,
      standings: [{ playerName: 'B', netEarnings: -7 }],
    });
    expect(text).toContain('B: $-7');
  });

  it('omits junk line when no junk bets', () => {
    const text = buildHouseGameShareText(baseArgs);
    expect(text).not.toContain('Junk');
  });

  it('appends junk line with first names + signed amounts (matches original format)', () => {
    const text = buildHouseGameShareText({
      ...baseArgs,
      junkSummary: [
        { name: 'Charlie Brown', net: 5 },
        { name: 'Dave', net: -3 },
      ],
    });
    expect(text).toContain('Junk: Charlie +$5, Dave $-3');
  });

  it('handles empty standings + empty junk gracefully', () => {
    const text = buildHouseGameShareText({
      courseName: 'X',
      date: '2026-04-28',
      standings: [],
      junkSummary: [],
    });
    expect(text).toContain('X');
    expect(text).toContain('House Game Results:');
  });
});
