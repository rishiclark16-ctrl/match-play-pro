import 'fake-indexeddb/auto'; // must be first — patches globalThis.indexedDB
import { describe, it, expect, beforeEach } from 'vitest';
import {
  queueScore,
  getUnsyncedScores,
  markScoreSynced,
  cleanupSyncedScores,
  cacheRound,
  getCachedRound,
  getPendingCount,
  clearOfflineData,
} from './offlineDb';

beforeEach(async () => {
  await clearOfflineData();
});

// ---------------------------------------------------------------------------
// queueScore + getUnsyncedScores
// ---------------------------------------------------------------------------
describe('queueScore + getUnsyncedScores', () => {
  it('queued score appears in getUnsyncedScores', async () => {
    await queueScore('round-1', 'player-1', 3, 5);
    const scores = await getUnsyncedScores();
    expect(scores).toHaveLength(1);
  });

  it('multiple queued scores all appear', async () => {
    await queueScore('round-1', 'player-1', 1, 4);
    await queueScore('round-1', 'player-1', 2, 3);
    await queueScore('round-1', 'player-2', 1, 5);
    const scores = await getUnsyncedScores();
    expect(scores).toHaveLength(3);
  });

  it('queued score has correct roundId, playerId, holeNumber, strokes fields', async () => {
    await queueScore('round-abc', 'player-xyz', 7, 6);
    const scores = await getUnsyncedScores();
    const score = scores[0];
    expect(score.roundId).toBe('round-abc');
    expect(score.playerId).toBe('player-xyz');
    expect(score.holeNumber).toBe(7);
    expect(score.strokes).toBe(6);
  });

  it('synced flag starts as 0', async () => {
    await queueScore('round-1', 'player-1', 1, 4);
    const scores = await getUnsyncedScores();
    expect(scores[0].synced).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// markScoreSynced
// ---------------------------------------------------------------------------
describe('markScoreSynced', () => {
  it('after marking synced, score no longer appears in getUnsyncedScores', async () => {
    const id = await queueScore('round-1', 'player-1', 1, 4);
    await markScoreSynced(id);
    const scores = await getUnsyncedScores();
    expect(scores).toHaveLength(0);
  });

  it('only the marked score is removed from unsynced list', async () => {
    const id1 = await queueScore('round-1', 'player-1', 1, 4);
    await queueScore('round-1', 'player-1', 2, 5);
    await markScoreSynced(id1);
    const scores = await getUnsyncedScores();
    expect(scores).toHaveLength(1);
    expect(scores[0].holeNumber).toBe(2);
  });

  it('marking a non-existent id does not throw', async () => {
    await expect(markScoreSynced('does-not-exist')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getPendingCount
// ---------------------------------------------------------------------------
describe('getPendingCount', () => {
  it('returns 0 when empty', async () => {
    expect(await getPendingCount()).toBe(0);
  });

  it('returns correct count after queuing multiple scores', async () => {
    await queueScore('round-1', 'player-1', 1, 4);
    await queueScore('round-1', 'player-1', 2, 5);
    await queueScore('round-1', 'player-2', 1, 3);
    expect(await getPendingCount()).toBe(3);
  });

  it('decrements after markScoreSynced', async () => {
    const id = await queueScore('round-1', 'player-1', 1, 4);
    await queueScore('round-1', 'player-1', 2, 5);
    await markScoreSynced(id);
    expect(await getPendingCount()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// cleanupSyncedScores
// ---------------------------------------------------------------------------
describe('cleanupSyncedScores', () => {
  it('does not remove unsynced scores', async () => {
    await queueScore('round-1', 'player-1', 1, 4);
    await cleanupSyncedScores();
    expect(await getUnsyncedScores()).toHaveLength(1);
  });

  it('does not throw when nothing to clean', async () => {
    await expect(cleanupSyncedScores()).resolves.toBeUndefined();
  });

  it('removes synced scores older than 24 hours', async () => {
    const id1 = await queueScore('round-1', 'player-1', 1, 4);
    const id2 = await queueScore('round-1', 'player-1', 2, 5);
    await markScoreSynced(id1);
    await markScoreSynced(id2);

    const realNow = Date.now;
    Date.now = () => realNow() + 25 * 60 * 60 * 1000;
    try {
      await cleanupSyncedScores();
    } finally {
      Date.now = realNow;
    }

    expect(await getPendingCount()).toBe(0);
  });

  it('does not remove unsynced scores when cleaning up synced ones', async () => {
    const id1 = await queueScore('round-1', 'player-1', 1, 4);
    await queueScore('round-1', 'player-1', 2, 5);
    await markScoreSynced(id1);

    const realNow = Date.now;
    Date.now = () => realNow() + 25 * 60 * 60 * 1000;
    try {
      await cleanupSyncedScores();
    } finally {
      Date.now = realNow;
    }

    const scores = await getUnsyncedScores();
    expect(scores).toHaveLength(1);
    expect(scores[0].holeNumber).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// cacheRound + getCachedRound
// ---------------------------------------------------------------------------
describe('cacheRound + getCachedRound', () => {
  it('stored round can be retrieved by id', async () => {
    const data = { courseName: 'Pebble Beach', holes: 18 };
    await cacheRound('round-42', data);
    expect(await getCachedRound('round-42')).toEqual(data);
  });

  it('returns null for unknown id', async () => {
    expect(await getCachedRound('non-existent')).toBeNull();
  });

  it('storing same id twice overwrites previous data', async () => {
    await cacheRound('round-99', { status: 'in_progress' });
    await cacheRound('round-99', { status: 'complete', score: 72 });
    expect(await getCachedRound('round-99')).toEqual({ status: 'complete', score: 72 });
  });

  it('different round ids do not interfere', async () => {
    await cacheRound('round-A', { label: 'A' });
    await cacheRound('round-B', { label: 'B' });
    const a = await getCachedRound('round-A') as Record<string, unknown>;
    const b = await getCachedRound('round-B') as Record<string, unknown>;
    expect(a.label).toBe('A');
    expect(b.label).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// clearOfflineData
// ---------------------------------------------------------------------------
describe('clearOfflineData', () => {
  it('after clear, getUnsyncedScores returns empty array', async () => {
    await queueScore('round-1', 'player-1', 1, 4);
    await clearOfflineData();
    expect(await getUnsyncedScores()).toEqual([]);
  });

  it('after clear, getPendingCount returns 0', async () => {
    await queueScore('round-1', 'player-1', 1, 4);
    await queueScore('round-1', 'player-1', 2, 3);
    await clearOfflineData();
    expect(await getPendingCount()).toBe(0);
  });

  it('after clear, getCachedRound returns null', async () => {
    await cacheRound('round-x', { some: 'data' });
    await clearOfflineData();
    expect(await getCachedRound('round-x')).toBeNull();
  });

  it('after clear, new data can be queued normally', async () => {
    await queueScore('round-1', 'player-1', 1, 4);
    await clearOfflineData();
    await queueScore('round-2', 'player-2', 5, 3);
    const scores = await getUnsyncedScores();
    expect(scores).toHaveLength(1);
    expect(scores[0].roundId).toBe('round-2');
  });
});
