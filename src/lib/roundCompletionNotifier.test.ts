import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameConfig, PlayerWithScores } from '@/types/golf';
import { sendRoundCompletionNotifications } from './roundCompletionNotifier';

// Inject sendPushToProfiles + supabase as test dependencies (no module
// patching — bun's CI loader sometimes treats ESM namespaces as frozen
// and vi.spyOn no-ops without throwing).

const sendPushMock = vi.fn();

let friendshipsResult: { data: Array<{ user_id: string; friend_id: string }> | null; error?: unknown } = {
  data: [],
};
let supabaseShouldThrow = false;

const buildSupabaseMock = () => ({
  from: (table: string) => {
    if (table === 'friendships') {
      return {
        select: () => ({
          or: () => ({
            eq: () => {
              if (supabaseShouldThrow) throw new Error('boom');
              return Promise.resolve(friendshipsResult);
            },
          }),
        }),
      };
    }
    return { select: () => ({}) };
  },
}) as unknown as Parameters<typeof sendRoundCompletionNotifications>[0]['supabase'];

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

const make9HoleInfo = () =>
  Array.from({ length: 9 }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));

const buildSinglesScores = (loserId: string, winnerId: string) => {
  const out: Array<{ id: string; roundId: string; playerId: string; holeNumber: number; strokes: number }> = [];
  for (let h = 1; h <= 9; h++) {
    out.push({ id: `s-${winnerId}-${h}`, roundId: 'r1', playerId: winnerId, holeNumber: h, strokes: 3 });
    out.push({ id: `s-${loserId}-${h}`, roundId: 'r1', playerId: loserId, holeNumber: h, strokes: 5 });
  }
  return out;
};

const buildFourballScores = () => {
  const out: Array<{ id: string; roundId: string; playerId: string; holeNumber: number; strokes: number }> = [];
  for (let h = 1; h <= 9; h++) {
    out.push({ id: `s-p1-${h}`, roundId: 'r1', playerId: 'p1', holeNumber: h, strokes: 3 });
    out.push({ id: `s-p2-${h}`, roundId: 'r1', playerId: 'p2', holeNumber: h, strokes: 4 });
    out.push({ id: `s-p3-${h}`, roundId: 'r1', playerId: 'p3', holeNumber: h, strokes: 5 });
    out.push({ id: `s-p4-${h}`, roundId: 'r1', playerId: 'p4', holeNumber: h, strokes: 5 });
  }
  return out;
};

describe('sendRoundCompletionNotifications', () => {
  beforeEach(() => {
    sendPushMock.mockReset();
    friendshipsResult = { data: [] };
    supabaseShouldThrow = false;
  });

  it('returns early when there is no match-play game (no headlines, no calls)', async () => {
    const updateGames = vi.fn();
    await sendRoundCompletionNotifications({
      round: {
        id: 'r1', courseName: 'Pebble', holes: 9, holeInfo: make9HoleInfo(),
        games: [{ id: 'g', type: 'skins', stakes: 5 }] as GameConfig[],
      },
      userId: 'user-rishi',
      playersWithScores: [],
      roundScores: [],
      updateGames,
      sendPushToProfiles: sendPushMock,
      supabase: buildSupabaseMock(),
    });

    expect(updateGames).not.toHaveBeenCalled();
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it('builds a singles match-play headline and persists it via updateGames', async () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Andrew Smith', profileId: 'profile-andrew' }),
      buildPlayer({ id: 'p2', name: 'Rishi Clark', profileId: 'user-rishi' }),
    ];
    const games = [
      { id: 'mp', type: 'match_play', stakes: 10, matchPlayFormat: 'singles' },
    ] as unknown as GameConfig[];
    const updateGames = vi.fn();

    await sendRoundCompletionNotifications({
      round: { id: 'r1', courseName: 'Pebble', holes: 9, holeInfo: make9HoleInfo(), games },
      userId: 'user-rishi',
      playersWithScores: players,
      roundScores: buildSinglesScores('p2', 'p1') as never,
      updateGames,
      sendPushToProfiles: sendPushMock,
      supabase: buildSupabaseMock(),
    });

    expect(updateGames).toHaveBeenCalledTimes(1);
    const persisted = updateGames.mock.calls[0][0] as GameConfig[];
    expect(persisted).toHaveLength(1);
    const headline = (persisted[0] as GameConfig & { resultHeadline?: string }).resultHeadline;
    expect(headline).toBeDefined();
    expect(headline!.toLowerCase()).toContain('andrew');
    expect(headline!.toLowerCase()).toContain('beat');
  });

  it('builds a fourball headline using the configured teams', async () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'A One' }),
      buildPlayer({ id: 'p2', name: 'A Two' }),
      buildPlayer({ id: 'p3', name: 'B One' }),
      buildPlayer({ id: 'p4', name: 'B Two' }),
    ];
    const games = [
      {
        id: 'mp', type: 'match_play', stakes: 10, matchPlayFormat: 'fourball',
        matchPlayTeams: [
          { id: 'tA', name: 'Team A', playerIds: ['p1', 'p2'], color: 'blue' },
          { id: 'tB', name: 'Team B', playerIds: ['p3', 'p4'], color: 'red' },
        ],
      },
    ] as unknown as GameConfig[];
    const updateGames = vi.fn();

    await sendRoundCompletionNotifications({
      round: { id: 'r1', courseName: 'Spyglass', holes: 9, holeInfo: make9HoleInfo(), games },
      userId: 'someone-else',
      playersWithScores: players,
      roundScores: buildFourballScores() as never,
      updateGames,
      sendPushToProfiles: sendPushMock,
      supabase: buildSupabaseMock(),
    });

    expect(updateGames).toHaveBeenCalledTimes(1);
    const persisted = updateGames.mock.calls[0][0] as GameConfig[];
    const headline = (persisted[0] as GameConfig & { resultHeadline?: string }).resultHeadline;
    expect(headline).toBeDefined();
    expect(headline).toContain('Team A');
    expect(headline).toContain('Team B');
  });

  it('sends a push to friends who are not in the round', async () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Andrew', profileId: 'profile-andrew' }),
      buildPlayer({ id: 'p2', name: 'Rishi', profileId: 'user-rishi' }),
    ];
    const games = [
      { id: 'mp', type: 'match_play', stakes: 10, matchPlayFormat: 'singles' },
    ] as unknown as GameConfig[];
    friendshipsResult = {
      data: [
        { user_id: 'user-rishi', friend_id: 'profile-andrew' },
        { user_id: 'user-rishi', friend_id: 'profile-diane' },
        { user_id: 'profile-ed', friend_id: 'user-rishi' },
      ],
    };

    await sendRoundCompletionNotifications({
      round: { id: 'r-xyz', courseName: 'Pebble', holes: 9, holeInfo: make9HoleInfo(), games },
      userId: 'user-rishi',
      playersWithScores: players,
      roundScores: buildSinglesScores('p2', 'p1') as never,
      updateGames: vi.fn(),
      sendPushToProfiles: sendPushMock,
      supabase: buildSupabaseMock(),
    });

    expect(sendPushMock).toHaveBeenCalledTimes(1);
    const pushArg = sendPushMock.mock.calls[0][0];
    expect(pushArg.profileIds.sort()).toEqual(['profile-diane', 'profile-ed'].sort());
    expect(pushArg.type).toBe('roundCompleted');
    expect(pushArg.title).toBe('Match over ⛳');
    expect(pushArg.body).toContain('at Pebble');
    expect(pushArg.data).toEqual({ roundId: 'r-xyz', route: '/round/r-xyz/complete' });
  });

  it('does not push when there are no friends to notify', async () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Andrew', profileId: 'profile-andrew' }),
      buildPlayer({ id: 'p2', name: 'Rishi', profileId: 'user-rishi' }),
    ];
    const games = [
      { id: 'mp', type: 'match_play', stakes: 10, matchPlayFormat: 'singles' },
    ] as unknown as GameConfig[];
    friendshipsResult = {
      data: [{ user_id: 'user-rishi', friend_id: 'profile-andrew' }],
    };

    await sendRoundCompletionNotifications({
      round: { id: 'r-1', courseName: 'Pebble', holes: 9, holeInfo: make9HoleInfo(), games },
      userId: 'user-rishi',
      playersWithScores: players,
      roundScores: buildSinglesScores('p2', 'p1') as never,
      updateGames: vi.fn(),
      sendPushToProfiles: sendPushMock,
      supabase: buildSupabaseMock(),
    });

    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it('swallows supabase fetch errors (non-critical)', async () => {
    const players = [
      buildPlayer({ id: 'p1', name: 'Andrew', profileId: 'profile-andrew' }),
      buildPlayer({ id: 'p2', name: 'Rishi', profileId: 'user-rishi' }),
    ];
    const games = [
      { id: 'mp', type: 'match_play', stakes: 10, matchPlayFormat: 'singles' },
    ] as unknown as GameConfig[];
    supabaseShouldThrow = true;

    await expect(
      sendRoundCompletionNotifications({
        round: { id: 'r-1', courseName: 'Pebble', holes: 9, holeInfo: make9HoleInfo(), games },
        userId: 'user-rishi',
        playersWithScores: players,
        roundScores: buildSinglesScores('p2', 'p1') as never,
        updateGames: vi.fn(),
        sendPushToProfiles: sendPushMock,
        supabase: buildSupabaseMock(),
      }),
    ).resolves.toBeUndefined();

    expect(sendPushMock).not.toHaveBeenCalled();
  });
});
