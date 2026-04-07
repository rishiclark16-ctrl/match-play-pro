import { describe, it, expect } from 'vitest';
import { Player, Score, HoleInfo } from '@/types/golf';

// Pure computation logic extracted from useWatchPartyScores.ts
// Tests the playerScores derivation and currentHole calculation

interface PlayerScoreInfo {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  totalStrokes: number;
  holesPlayed: number;
  scoreVsPar: number;
  lastUpdatedAt: Date | null;
}

function computePlayerScores(
  players: Player[],
  scores: Score[],
  holeInfo: HoleInfo[],
  lastUpdateMap: Map<string, Date>,
): PlayerScoreInfo[] {
  return players.map(player => {
    const playerScoresList = scores.filter(s => s.playerId === player.id);
    const totalStrokes = playerScoresList.reduce((sum, s) => sum + s.strokes, 0);
    const holesPlayed = playerScoresList.length;
    const parTotal = playerScoresList.reduce((sum, s) => {
      const hole = holeInfo.find(h => h.number === s.holeNumber);
      return sum + (hole?.par ?? 0);
    }, 0);

    return {
      playerId: player.id,
      name: player.name,
      avatarUrl: player.avatarUrl ?? null,
      totalStrokes,
      holesPlayed,
      scoreVsPar: parTotal > 0 ? totalStrokes - parTotal : 0,
      lastUpdatedAt: lastUpdateMap.get(player.id) ?? null,
    };
  });
}

function computeCurrentHole(scores: Score[]): number {
  return scores.length > 0 ? Math.max(...scores.map(s => s.holeNumber)) : 0;
}

// Test helpers
const ROUND_ID = 'test-round';

function makePlayer(id: string, name: string, orderIndex = 0): Player {
  return { id, name, handicap: 0, roundId: ROUND_ID, orderIndex };
}

function makeScore(playerId: string, holeNumber: number, strokes: number): Score {
  return { id: `${playerId}-${holeNumber}`, playerId, holeNumber, strokes, roundId: ROUND_ID };
}

function makeHoleInfo(number: number, par: number, strokeIndex = number): HoleInfo {
  return { number, par, strokeIndex };
}

const STANDARD_HOLES: HoleInfo[] = [
  makeHoleInfo(1, 4), makeHoleInfo(2, 4), makeHoleInfo(3, 3),
  makeHoleInfo(4, 5), makeHoleInfo(5, 4), makeHoleInfo(6, 4),
  makeHoleInfo(7, 3), makeHoleInfo(8, 5), makeHoleInfo(9, 4),
  makeHoleInfo(10, 4), makeHoleInfo(11, 3), makeHoleInfo(12, 5),
  makeHoleInfo(13, 4), makeHoleInfo(14, 4), makeHoleInfo(15, 3),
  makeHoleInfo(16, 5), makeHoleInfo(17, 4), makeHoleInfo(18, 4),
];

describe('useWatchPartyScores computed values', () => {
  describe('computePlayerScores', () => {
    const players = [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')];

    it('returns empty array for no players', () => {
      expect(computePlayerScores([], [], STANDARD_HOLES, new Map())).toEqual([]);
    });

    it('returns zero scores when no scores exist', () => {
      const result = computePlayerScores(players, [], STANDARD_HOLES, new Map());
      expect(result).toHaveLength(2);
      expect(result[0].totalStrokes).toBe(0);
      expect(result[0].holesPlayed).toBe(0);
      expect(result[0].scoreVsPar).toBe(0);
    });

    it('computes total strokes correctly', () => {
      const scores = [
        makeScore('p1', 1, 4),
        makeScore('p1', 2, 5),
        makeScore('p1', 3, 3),
      ];
      const result = computePlayerScores(players, scores, STANDARD_HOLES, new Map());
      expect(result[0].totalStrokes).toBe(12);
      expect(result[0].holesPlayed).toBe(3);
    });

    it('computes score vs par correctly — even par', () => {
      const scores = [
        makeScore('p1', 1, 4), // par 4
        makeScore('p1', 2, 4), // par 4
        makeScore('p1', 3, 3), // par 3
      ];
      const result = computePlayerScores(players, scores, STANDARD_HOLES, new Map());
      // 11 strokes, 11 par → even
      expect(result[0].scoreVsPar).toBe(0);
    });

    it('computes score vs par correctly — over par', () => {
      const scores = [
        makeScore('p1', 1, 6), // par 4, +2
        makeScore('p1', 2, 5), // par 4, +1
      ];
      const result = computePlayerScores(players, scores, STANDARD_HOLES, new Map());
      // 11 strokes - 8 par = +3
      expect(result[0].scoreVsPar).toBe(3);
    });

    it('computes score vs par correctly — under par', () => {
      const scores = [
        makeScore('p1', 1, 3), // par 4, -1
        makeScore('p1', 2, 3), // par 4, -1
        makeScore('p1', 3, 2), // par 3, -1
      ];
      const result = computePlayerScores(players, scores, STANDARD_HOLES, new Map());
      // 8 strokes - 11 par = -3
      expect(result[0].scoreVsPar).toBe(-3);
    });

    it('returns 0 scoreVsPar when holeInfo is empty (no par data)', () => {
      const scores = [makeScore('p1', 1, 5)];
      const result = computePlayerScores(players, scores, [], new Map());
      // parTotal = 0, so scoreVsPar should be 0
      expect(result[0].scoreVsPar).toBe(0);
    });

    it('separates scores by player', () => {
      const scores = [
        makeScore('p1', 1, 4),
        makeScore('p1', 2, 5),
        makeScore('p2', 1, 3),
      ];
      const result = computePlayerScores(players, scores, STANDARD_HOLES, new Map());
      expect(result[0].totalStrokes).toBe(9); // Alice: 4+5
      expect(result[0].holesPlayed).toBe(2);
      expect(result[1].totalStrokes).toBe(3); // Bob: 3
      expect(result[1].holesPlayed).toBe(1);
    });

    it('includes lastUpdatedAt from map', () => {
      const now = new Date('2026-04-07T12:00:00Z');
      const map = new Map<string, Date>([['p1', now]]);
      const result = computePlayerScores(players, [], STANDARD_HOLES, map);
      expect(result[0].lastUpdatedAt).toEqual(now);
      expect(result[1].lastUpdatedAt).toBeNull();
    });

    it('includes avatarUrl from player', () => {
      const playersWithAvatar = [
        { ...makePlayer('p1', 'Alice'), avatarUrl: 'https://example.com/alice.jpg' },
        makePlayer('p2', 'Bob'),
      ];
      const result = computePlayerScores(playersWithAvatar, [], STANDARD_HOLES, new Map());
      expect(result[0].avatarUrl).toBe('https://example.com/alice.jpg');
      expect(result[1].avatarUrl).toBeNull();
    });

    it('handles multiple players with full round scores', () => {
      const scores = [
        // Alice: 4,4,3 on par 4,4,3 → even
        makeScore('p1', 1, 4), makeScore('p1', 2, 4), makeScore('p1', 3, 3),
        // Bob: 5,5,4 on par 4,4,3 → +3
        makeScore('p2', 1, 5), makeScore('p2', 2, 5), makeScore('p2', 3, 4),
      ];
      const result = computePlayerScores(players, scores, STANDARD_HOLES, new Map());
      expect(result[0].scoreVsPar).toBe(0);
      expect(result[1].scoreVsPar).toBe(3);
    });
  });

  describe('computeCurrentHole', () => {
    it('returns 0 for no scores', () => {
      expect(computeCurrentHole([])).toBe(0);
    });

    it('returns the highest hole number from scores', () => {
      const scores = [
        makeScore('p1', 1, 4),
        makeScore('p1', 2, 5),
        makeScore('p2', 1, 4),
      ];
      expect(computeCurrentHole(scores)).toBe(2);
    });

    it('returns 18 when all holes scored', () => {
      const scores = Array.from({ length: 18 }, (_, i) =>
        makeScore('p1', i + 1, 4)
      );
      expect(computeCurrentHole(scores)).toBe(18);
    });

    it('works with single score', () => {
      expect(computeCurrentHole([makeScore('p1', 7, 4)])).toBe(7);
    });

    it('handles multiple players at different holes', () => {
      const scores = [
        makeScore('p1', 5, 4),
        makeScore('p2', 3, 5),
      ];
      expect(computeCurrentHole(scores)).toBe(5);
    });
  });

  describe('lastUpdateMap tracking', () => {
    it('picks the most recent timestamp per player', () => {
      const scoresData = [
        { player_id: 'p1', updated_at: '2026-04-07T12:00:00Z', created_at: '2026-04-07T11:00:00Z' },
        { player_id: 'p1', updated_at: '2026-04-07T12:30:00Z', created_at: '2026-04-07T11:30:00Z' },
        { player_id: 'p2', updated_at: '2026-04-07T12:15:00Z', created_at: '2026-04-07T11:15:00Z' },
      ];

      // Replicate the initialization logic from useWatchPartyScores
      const updateMap = new Map<string, Date>();
      for (const s of scoresData) {
        const existing = updateMap.get(s.player_id);
        const updated = new Date(s.updated_at || s.created_at || Date.now());
        if (!existing || updated > existing) {
          updateMap.set(s.player_id, updated);
        }
      }

      expect(updateMap.get('p1')).toEqual(new Date('2026-04-07T12:30:00Z'));
      expect(updateMap.get('p2')).toEqual(new Date('2026-04-07T12:15:00Z'));
    });

    it('falls back to created_at when updated_at is null', () => {
      const scoresData = [
        { player_id: 'p1', updated_at: null, created_at: '2026-04-07T11:00:00Z' },
      ];

      const updateMap = new Map<string, Date>();
      for (const s of scoresData) {
        const existing = updateMap.get(s.player_id);
        const updated = new Date(s.updated_at || s.created_at || Date.now());
        if (!existing || updated > existing) {
          updateMap.set(s.player_id, updated);
        }
      }

      expect(updateMap.get('p1')).toEqual(new Date('2026-04-07T11:00:00Z'));
    });
  });

  describe('score update merging (real-time)', () => {
    it('replaces existing score for same player+hole', () => {
      const existing = [
        makeScore('p1', 1, 4),
        makeScore('p1', 2, 5),
      ];
      const newScore = makeScore('p1', 1, 3); // Updated hole 1

      const idx = existing.findIndex(
        s => s.playerId === newScore.playerId && s.holeNumber === newScore.holeNumber
      );
      expect(idx).toBe(0);

      const updated = [...existing];
      updated[idx] = newScore;
      expect(updated[0].strokes).toBe(3);
      expect(updated[1].strokes).toBe(5);
    });

    it('appends new score for unseen player+hole', () => {
      const existing = [makeScore('p1', 1, 4)];
      const newScore = makeScore('p1', 2, 5);

      const idx = existing.findIndex(
        s => s.playerId === newScore.playerId && s.holeNumber === newScore.holeNumber
      );
      expect(idx).toBe(-1);

      const updated = [...existing, newScore];
      expect(updated).toHaveLength(2);
    });

    it('removes score by id on DELETE', () => {
      const existing = [
        makeScore('p1', 1, 4),
        makeScore('p2', 1, 5),
      ];
      const deletedId = 'p1-1';
      const updated = existing.filter(s => s.id !== deletedId);
      expect(updated).toHaveLength(1);
      expect(updated[0].playerId).toBe('p2');
    });
  });
});
