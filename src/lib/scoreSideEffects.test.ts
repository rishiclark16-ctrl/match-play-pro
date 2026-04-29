import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { PlayerWithScores } from '@/types/golf';

// Use vi.spyOn instead of vi.mock so the override doesn't leak into pushUtils.test.ts
// when bun's test runner reuses module registries across files.
import * as pushUtilsModule from '@/lib/pushUtils';
import { fireScoreSideEffects } from './scoreSideEffects';

const sendPushMock = vi.fn();
const sendPushSpy = vi.spyOn(pushUtilsModule, 'sendPushToProfiles');
sendPushSpy.mockImplementation((args) => {
  sendPushMock(args);
  return Promise.resolve();
});

afterAll(() => {
  sendPushSpy.mockRestore();
});

const buildPlayer = (
  overrides: Partial<PlayerWithScores> & { id: string; name: string },
): PlayerWithScores =>
  ({
    id: overrides.id,
    name: overrides.name,
    profileId: overrides.profileId,
    handicap: 0,
    scores: [],
    totalStrokes: 0,
    totalRelativeToPar: 0,
    holesPlayed: 0,
    ...overrides,
  } as PlayerWithScores);

const baseRound = { id: 'round-1' };
const baseUser = { id: 'user-rishi', user_metadata: { full_name: 'Rishi Clark' } };

describe('fireScoreSideEffects', () => {
  beforeEach(() => {
    sendPushMock.mockReset();
  });

  it('fires hole-in-one push to other profiled players when par 3 is aced', () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Andrew Smith', profileId: 'profile-andrew' }),
      buildPlayer({ id: 'p2', name: 'Bob Lee', profileId: 'profile-bob' }),
      buildPlayer({ id: 'p3', name: 'Charlie Ghost' }), // ghost — no profile
    ];

    fireScoreSideEffects({
      round: baseRound,
      user: baseUser,
      playersWithScores: players,
      currentHole: 7,
      currentHolePar: 3,
      playerId: 'p1',
      score: 1,
    });

    // Hole-in-one push fired (no scoreEntered push because scored player has no profile match → actually andrew has profileId different from user.id)
    const aceCall = sendPushMock.mock.calls.find(c => c[0]?.type === 'holeInOne');
    expect(aceCall).toBeDefined();
    expect(aceCall![0]).toMatchObject({
      profileIds: ['profile-bob'],
      title: 'ACE! ⛳',
      type: 'holeInOne',
      data: { roundId: 'round-1', route: '/round/round-1' },
    });
    expect(aceCall![0].body).toContain('Andrew');
    expect(aceCall![0].body).toContain('#7');
  });

  it('fires eagle push when score is par-2 (and not a hole-in-one)', () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Andrew', profileId: 'profile-andrew' }),
      buildPlayer({ id: 'p2', name: 'Bob', profileId: 'profile-bob' }),
    ];

    fireScoreSideEffects({
      round: baseRound,
      user: baseUser,
      playersWithScores: players,
      currentHole: 12,
      currentHolePar: 5,
      playerId: 'p1',
      score: 3, // -2 = eagle on a par 5
    });

    const eagleCall = sendPushMock.mock.calls.find(c => c[0]?.type === 'eagleLogged');
    expect(eagleCall).toBeDefined();
    expect(eagleCall![0]).toMatchObject({
      profileIds: ['profile-bob'],
      type: 'eagleLogged',
    });
    expect(eagleCall![0].title).toContain('Eagle');
    // Not also a hole-in-one push
    expect(sendPushMock.mock.calls.find(c => c[0]?.type === 'holeInOne')).toBeUndefined();
  });

  it('fires score-entered-for-you push when scorer is a different profile than the scored player', () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Andrew Smith', profileId: 'profile-andrew' }),
      buildPlayer({ id: 'p2', name: 'Rishi Clark', profileId: 'user-rishi' }),
    ];

    fireScoreSideEffects({
      round: baseRound,
      user: baseUser,
      playersWithScores: players,
      currentHole: 5,
      currentHolePar: 4,
      playerId: 'p1',
      score: 4, // par — no hole-in-one or eagle
    });

    const enteredCall = sendPushMock.mock.calls.find(c => c[0]?.type === 'scoreEnteredForYou');
    expect(enteredCall).toBeDefined();
    expect(enteredCall![0]).toMatchObject({
      profileIds: ['profile-andrew'],
      type: 'scoreEnteredForYou',
    });
    expect(enteredCall![0].body).toContain('Rishi');
    expect(enteredCall![0].body).toContain('4');
    expect(enteredCall![0].body).toContain('#5');
  });

  it('does not fire score-entered-for-you when the scorer is the scored player', () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Self Player', profileId: 'user-rishi' }),
      buildPlayer({ id: 'p2', name: 'Other', profileId: 'profile-other' }),
    ];

    fireScoreSideEffects({
      round: baseRound,
      user: baseUser,
      playersWithScores: players,
      currentHole: 1,
      currentHolePar: 4,
      playerId: 'p1',
      score: 4,
    });

    expect(
      sendPushMock.mock.calls.find(c => c[0]?.type === 'scoreEnteredForYou'),
    ).toBeUndefined();
  });

  it('does nothing when the scored player is not in the players list', () => {
    fireScoreSideEffects({
      round: baseRound,
      user: baseUser,
      playersWithScores: [
        buildPlayer({ id: 'p1', name: 'Andrew', profileId: 'profile-andrew' }),
      ],
      currentHole: 7,
      currentHolePar: 3,
      playerId: 'missing-player',
      score: 1,
    });

    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it('does not fire hole-in-one or eagle push when no other profiles are in the round', () => {
    const players = [
      // Only the scoring player has a profile; the rest are ghosts/no profile
      buildPlayer({ id: 'p1', name: 'Solo Pro', profileId: 'profile-solo' }),
      buildPlayer({ id: 'p2', name: 'Ghost A' }),
    ];

    fireScoreSideEffects({
      round: baseRound,
      user: { id: 'profile-solo', user_metadata: { full_name: 'Solo Pro' } },
      playersWithScores: players,
      currentHole: 8,
      currentHolePar: 3,
      playerId: 'p1',
      score: 1, // would be hole-in-one
    });

    // No hype pushes (no audience), and no scoreEntered (scorer === scored)
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it('falls back to "Player" when scoredPlayer name is empty', () => {
    const players = [
      buildPlayer({ id: 'p1', name: '', profileId: 'pa' }),
      buildPlayer({ id: 'p2', name: 'Bob', profileId: 'pb' }),
    ];

    fireScoreSideEffects({
      round: baseRound,
      user: baseUser,
      playersWithScores: players,
      currentHole: 3,
      currentHolePar: 3,
      playerId: 'p1',
      score: 1,
    });

    const aceCall = sendPushMock.mock.calls.find(c => c[0]?.type === 'holeInOne');
    expect(aceCall).toBeDefined();
    expect(aceCall![0].body).toContain('Player');
  });

  it('uses "Someone" as the scorer name when user metadata has no full_name', () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Other Player', profileId: 'po' }),
    ];

    fireScoreSideEffects({
      round: baseRound,
      user: { id: 'user-anon' },
      playersWithScores: players,
      currentHole: 4,
      currentHolePar: 4,
      playerId: 'p1',
      score: 4,
    });

    const enteredCall = sendPushMock.mock.calls.find(c => c[0]?.type === 'scoreEnteredForYou');
    expect(enteredCall).toBeDefined();
    expect(enteredCall![0].body).toContain('Someone');
  });
});
