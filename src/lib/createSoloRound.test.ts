import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSoloRound } from './createSoloRound';
import type { Course, HoleInfo } from '@/types/golf';

const buildHoles = (count: number): HoleInfo[] =>
  Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    par: 4,
    handicap: i + 1,
    yards: 400,
  })) as HoleInfo[];

const baseCourse: Course = {
  id: 'course-1',
  name: 'Pebble Beach',
  holes: buildHoles(18),
  slope: 130,
  rating: 72.1,
  createdAt: new Date('2026-01-01'),
};

describe('createSoloRound', () => {
  let createRound: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createRound = vi.fn();
  });

  it('returns ok=true with the new round id on success', async () => {
    createRound.mockResolvedValue({ round: { id: 'round-99' } });

    const result = await createSoloRound({
      selectedCourse: baseCourse,
      holeCount: 18,
      profile: { full_name: 'Rishi Clark', handicap: 12 },
      createRound,
    });

    expect(result).toEqual({ ok: true, roundId: 'round-99' });
  });

  it('passes the player name from the profile, falling back to "Me" when missing', async () => {
    createRound.mockResolvedValue({ round: { id: 'r1' } });

    await createSoloRound({
      selectedCourse: baseCourse,
      holeCount: 18,
      profile: null,
      createRound,
    });

    const args = createRound.mock.calls[0][0];
    expect(args.players).toHaveLength(1);
    expect(args.players[0].name).toBe('Me');
    expect(args.players[0].profileId).toBeUndefined();
    expect(args.players[0].isGhost).toBe(false);
  });

  it('truncates holeInfo to the requested holeCount', async () => {
    createRound.mockResolvedValue({ round: { id: 'r2' } });

    await createSoloRound({
      selectedCourse: baseCourse,
      holeCount: 9,
      profile: { full_name: 'Solo Player', handicap: null },
      createRound,
    });

    const args = createRound.mock.calls[0][0];
    expect(args.holes).toBe(9);
    expect(args.holeInfo).toHaveLength(9);
    expect(args.handicapMode).toBe('auto');
    expect(args.strokePlay).toBe(true);
    expect(args.matchPlay).toBe(false);
    expect(args.games).toEqual([]);
  });

  it('returns ok=false with isAuthError=true when createRound surfaces an auth error', async () => {
    createRound.mockResolvedValue({
      error: { message: 'Please sign in', isAuthError: true },
    });

    const result = await createSoloRound({
      selectedCourse: baseCourse,
      holeCount: 18,
      profile: { full_name: 'X', handicap: 0 },
      createRound,
    });

    expect(result).toEqual({ ok: false, message: 'Please sign in', isAuthError: true });
  });

  it('returns ok=false without isAuthError when createRound surfaces a non-auth error', async () => {
    createRound.mockResolvedValue({ error: { message: 'DB unavailable' } });

    const result = await createSoloRound({
      selectedCourse: baseCourse,
      holeCount: 18,
      profile: { full_name: 'X', handicap: 0 },
      createRound,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('DB unavailable');
      expect(result.isAuthError).toBeUndefined();
    }
  });

  it('returns the generic failure message when createRound returns no round and no error', async () => {
    createRound.mockResolvedValue({});

    const result = await createSoloRound({
      selectedCourse: baseCourse,
      holeCount: 18,
      profile: { full_name: 'Y', handicap: 0 },
      createRound,
    });

    expect(result).toEqual({ ok: false, message: 'Failed to create round. Please try again.' });
  });

  it('returns "Failed to create round" when createRound throws', async () => {
    createRound.mockRejectedValue(new Error('boom'));

    const result = await createSoloRound({
      selectedCourse: baseCourse,
      holeCount: 18,
      profile: { full_name: 'Y', handicap: 0 },
      createRound,
    });

    expect(result).toEqual({ ok: false, message: 'Failed to create round. Please try again.' });
  });
});
