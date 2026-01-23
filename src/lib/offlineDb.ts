/**
 * Offline Database - IndexedDB storage for offline score syncing
 * Uses the idb library for a cleaner async API
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PendingScore {
  id: string;
  roundId: string;
  playerId: string;
  holeNumber: number;
  strokes: number;
  timestamp: number;
  synced: boolean;
}

interface PendingRoundUpdate {
  id: string;
  roundId: string;
  field: string;
  value: unknown;
  timestamp: number;
  synced: boolean;
}

interface OfflineDBSchema extends DBSchema {
  pendingScores: {
    key: string;
    value: PendingScore;
    indexes: {
      'by-round': string;
      'by-synced': number; // 0 = not synced, 1 = synced
    };
  };
  pendingRoundUpdates: {
    key: string;
    value: PendingRoundUpdate;
    indexes: {
      'by-round': string;
      'by-synced': number;
    };
  };
  cachedRounds: {
    key: string;
    value: {
      id: string;
      data: unknown;
      cachedAt: number;
    };
  };
}

const DB_NAME = 'match-golf-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Pending scores store
      if (!db.objectStoreNames.contains('pendingScores')) {
        const scoresStore = db.createObjectStore('pendingScores', { keyPath: 'id' });
        scoresStore.createIndex('by-round', 'roundId');
        scoresStore.createIndex('by-synced', 'synced');
      }

      // Pending round updates store
      if (!db.objectStoreNames.contains('pendingRoundUpdates')) {
        const updatesStore = db.createObjectStore('pendingRoundUpdates', { keyPath: 'id' });
        updatesStore.createIndex('by-round', 'roundId');
        updatesStore.createIndex('by-synced', 'synced');
      }

      // Cached rounds store
      if (!db.objectStoreNames.contains('cachedRounds')) {
        db.createObjectStore('cachedRounds', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

/**
 * Queue a score for offline sync
 */
export async function queueScore(
  roundId: string,
  playerId: string,
  holeNumber: number,
  strokes: number
): Promise<string> {
  const db = await getDB();
  const id = `${roundId}-${playerId}-${holeNumber}-${Date.now()}`;
  
  await db.put('pendingScores', {
    id,
    roundId,
    playerId,
    holeNumber,
    strokes,
    timestamp: Date.now(),
    synced: false,
  });

  return id;
}

/**
 * Get all unsynced scores
 */
export async function getUnsyncedScores(): Promise<PendingScore[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingScores', 'by-synced', 0);
}

/**
 * Mark a score as synced
 */
export async function markScoreSynced(id: string): Promise<void> {
  const db = await getDB();
  const score = await db.get('pendingScores', id);
  if (score) {
    score.synced = true;
    await db.put('pendingScores', score);
  }
}

/**
 * Delete synced scores older than 24 hours
 */
export async function cleanupSyncedScores(): Promise<void> {
  const db = await getDB();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  const tx = db.transaction('pendingScores', 'readwrite');
  const store = tx.objectStore('pendingScores');
  
  let cursor = await store.openCursor();
  while (cursor) {
    if (cursor.value.synced && cursor.value.timestamp < oneDayAgo) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
}

/**
 * Cache a round for offline access
 */
export async function cacheRound(roundId: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put('cachedRounds', {
    id: roundId,
    data,
    cachedAt: Date.now(),
  });
}

/**
 * Get a cached round
 */
export async function getCachedRound(roundId: string): Promise<unknown | null> {
  const db = await getDB();
  const cached = await db.get('cachedRounds', roundId);
  return cached?.data ?? null;
}

/**
 * Get count of pending items
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const scores = await db.getAllFromIndex('pendingScores', 'by-synced', 0);
  return scores.length;
}

/**
 * Clear all offline data (for debugging/reset)
 */
export async function clearOfflineData(): Promise<void> {
  const db = await getDB();
  await db.clear('pendingScores');
  await db.clear('pendingRoundUpdates');
  await db.clear('cachedRounds');
}
