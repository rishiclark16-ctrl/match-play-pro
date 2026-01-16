/**
 * Custom Service Worker for Background Sync
 * This file is imported by the generated Workbox service worker
 */

// Background Sync tag for score syncing
const SYNC_TAG = 'sync-scores';

// Supabase configuration - these will be injected at runtime
let supabaseUrl = '';
let supabaseKey = '';

// IndexedDB configuration
const DB_NAME = 'match-golf-offline';
const DB_VERSION = 1;

/**
 * Open the IndexedDB database
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pendingScores')) {
        const scoresStore = db.createObjectStore('pendingScores', { keyPath: 'id' });
        scoresStore.createIndex('by-round', 'roundId');
        scoresStore.createIndex('by-synced', 'synced');
      }
      
      if (!db.objectStoreNames.contains('pendingRoundUpdates')) {
        const updatesStore = db.createObjectStore('pendingRoundUpdates', { keyPath: 'id' });
        updatesStore.createIndex('by-round', 'roundId');
        updatesStore.createIndex('by-synced', 'synced');
      }
      
      if (!db.objectStoreNames.contains('cachedRounds')) {
        db.createObjectStore('cachedRounds', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all unsynced scores from IndexedDB
 */
async function getUnsyncedScores() {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingScores', 'readonly');
    const store = tx.objectStore('pendingScores');
    const index = store.index('by-synced');
    const request = index.getAll(0); // 0 = false (not synced)
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark a score as synced in IndexedDB
 */
async function markScoreSynced(id) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingScores', 'readwrite');
    const store = tx.objectStore('pendingScores');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const score = getRequest.result;
      if (score) {
        score.synced = true;
        const putRequest = store.put(score);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Sync a single score to Supabase
 */
async function syncScore(score) {
  if (!supabaseUrl || !supabaseKey) {
    console.error('[SW] Supabase configuration not available');
    throw new Error('Supabase not configured');
  }
  
  const response = await fetch(`${supabaseUrl}/rest/v1/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      round_id: score.roundId,
      player_id: score.playerId,
      hole_number: score.holeNumber,
      strokes: score.strokes
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[SW] Failed to sync score:', error);
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  return response;
}

/**
 * Handle background sync event
 */
async function handleSync(event) {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    try {
      const unsyncedScores = await getUnsyncedScores();
      console.log(`[SW] Found ${unsyncedScores.length} unsynced scores`);
      
      for (const score of unsyncedScores) {
        try {
          await syncScore(score);
          await markScoreSynced(score.id);
          console.log('[SW] Synced score:', score.id);
        } catch (error) {
          console.error('[SW] Failed to sync score:', score.id, error);
          // Don't throw - continue with other scores
        }
      }
      
      console.log('[SW] Background sync complete');
    } catch (error) {
      console.error('[SW] Background sync failed:', error);
      throw error; // Throw to retry
    }
  }
}

/**
 * Listen for messages from the main app
 * Security: Only accept messages from same origin
 */
self.addEventListener('message', (event) => {
  // Validate origin to prevent cross-origin attacks
  if (event.origin && event.origin !== self.location.origin) {
    console.warn('[SW] Ignoring message from untrusted origin:', event.origin);
    return;
  }

  if (event.data && event.data.type === 'SUPABASE_CONFIG') {
    supabaseUrl = event.data.url;
    supabaseKey = event.data.key;
    console.log('[SW] Received Supabase configuration');
  }

  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    // Manual sync trigger from the app
    console.log('[SW] Manual sync requested');
    self.registration.sync.register(SYNC_TAG).catch(console.error);
  }
});

/**
 * Register sync event handler
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event received:', event.tag);
  event.waitUntil(handleSync(event));
});

/**
 * Periodic background sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-scores-periodic') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(handleSync({ tag: SYNC_TAG }));
  }
});

console.log('[SW] Custom service worker loaded with background sync support');
