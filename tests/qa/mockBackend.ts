/**
 * Deterministic backend for QA runs: a signed-in user, four friends, a live round,
 * a finished round and the Sonoma GC course card. Supabase REST is served from
 * in-memory tables with PostgREST eq./in. filters honoured, so each screen sees
 * the rows it would in production. Nothing leaves the browser.
 */
import type { Page, Route } from '@playwright/test';

export const UID = 'u-sam';
export const R_LIVE = '11111111-1111-1111-1111-111111111111';
export const R_DONE = '22222222-2222-2222-2222-222222222222';
const now = new Date('2026-11-23T15:00:00Z').toISOString();

const pars = [4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const si = [9, 3, 13, 17, 1, 11, 15, 5, 7, 10, 4, 18, 2, 12, 8, 16, 14, 6];
const yards = [366, 512, 401, 168, 432, 377, 154, 541, 388, 395, 418, 142, 528, 371, 402, 189, 356, 519];
export const holeInfo = pars.map((par, i) => ({ number: i + 1, par, handicap: si[i], yardage: yards[i] }));

const people = [
  { pid: 'p1', name: 'Sam Carter', hcp: 8.4, profile: UID },
  { pid: 'p2', name: 'Jack Turner', hcp: 12.1, profile: 'u-jack' },
  { pid: 'p3', name: 'James Reid', hcp: 6.3, profile: 'u-james' },
  { pid: 'p4', name: 'Tim Shaw', hcp: 17.8, profile: 'u-tim' },
];
const gross: Record<string, number[]> = {
  p1: [4, 5, 4, 3, 5, 4, 3, 5, 4, 3, 5, 3, 5, 4, 4, 3, 4, 5],
  p2: [5, 5, 5, 4, 4, 5, 3, 6, 5, 5, 4, 4, 6, 5, 5, 4, 4, 6],
  p3: [4, 4, 4, 3, 4, 5, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 5],
  p4: [6, 6, 5, 3, 5, 6, 4, 6, 5, 5, 5, 4, 6, 5, 6, 4, 5, 6],
};
const games = [
  { id: 'g1', type: 'match', stakes: 20, useNet: true, matchPlayFormat: 'fourball', matchPlayTeams: [
    { id: 'team-a', name: 'Sam & Jack', playerIds: ['p1', 'p2'], color: '#22C55E' },
    { id: 'team-b', name: 'James & Tim', playerIds: ['p3', 'p4'], color: '#6366F1' },
  ] },
  { id: 'g2', type: 'sixes', stakes: 2, useNet: true },
];
const round = (id: string, status: string, gameList: unknown[] = games) => ({
  id, course_name: 'Sonoma GC (II)', course_id: null, holes: 18, hole_info: holeInfo, stroke_play: true, match_play: true,
  stakes: 20, slope: 136, rating: 72.7, status, created_at: now, updated_at: now, join_code: 'FORE42', created_by: UID,
  scorekeeper_ids: [UID], games: gameList, teams: null, handicap_mode: 'auto', tee_sets: null, mixed_tees: false, stableford: false, modified_stableford: false,
});
const playersFor = (rid: string) => people.map((p, i) => ({
  id: p.pid, name: p.name, handicap: p.hcp, profile_id: p.profile, order_index: i, round_id: rid,
  is_ghost: false, manual_strokes: null, team_id: null, tee_set_id: null, created_at: now, profiles: { avatar_url: null },
}));
const scoresFor = (rid: string, through: number) => Object.entries(gross).flatMap(([pid, arr]) => arr.slice(0, through).map((strokes, i) => ({
  id: `${rid}-${pid}-${i + 1}`, player_id: pid, round_id: rid, hole_number: i + 1, strokes, created_at: now, updated_at: now,
})));

export const SENTENCE = 'Sonoma Golf Club from the blues. Me and Jack vs Jim and Tim, $20 match, and sixes for 2 a point';
const plan = {
  course: { query: 'Sonoma Golf Club', tee: 'blues', holes: null, nine: null },
  players: [{ name: 'Jack', handicap: null }, { name: 'Jim', handicap: null }, { name: 'Tim', handicap: null }],
  userPlaying: true, userHandicap: null,
  games: [
    { type: 'match', stake: 20, carryover: null, autoPress: null, modified: null, teams: [['me', 'Jack'], ['Jim', 'Tim']], teamScoring: 'best', perHole: false, custom: null },
    { type: 'sixes', stake: 2, carryover: null, autoPress: null, modified: null, teams: null, teamScoring: null, perHole: null, custom: null },
  ],
  handicaps: null, unsupported: [],
};
const SONOMA = { id: 'cdx8ze6s', club_name: 'Sonoma Gc', course_name: 'Sonoma Gc', location: { city: 'Sonoma', state: 'CA', country: 'United States' } };
const tees = ([['I', 7076, 138, 74.6], ['II', 6652, 136, 72.7], ['III', 6128, 133, 70.1], ['IV', 5229, 115, 65.6]] as const).map(([tee_name, total_yards, slope_rating, course_rating]) => ({
  tee_name, total_yards, slope_rating, course_rating, number_of_holes: 18, par_total: 72,
  holes: holeInfo.map(h => ({ par: h.par, yardage: h.yardage, handicap: h.handicap })),
}));

export interface BackendOptions {
  tier?: 'pro' | 'free';
  /** false: the AI planner fails, so /play must fall back to the offline parser. */
  ai?: boolean;
  /** false: no stored session, so the app shows the sign-in screen. */
  signedIn?: boolean;
  /** What the AI planner returns, instead of the default Sonoma foursome plan. */
  plan?: unknown;
  /** Merged into the live and finished rounds' team match (e.g. { teamScoring: 'aggregate' }). */
  match?: Record<string, unknown>;
  /** Replaces the live and finished rounds' games. */
  games?: unknown[];
}

export interface Backend {
  /** Every POST/PATCH/upsert the app sent, by table. */
  writes: { table: string; method: string; body: unknown }[];
}

function filterRows(rows: Record<string, unknown>[], url: string) {
  const params = new URL(url).searchParams;
  let out = rows;
  for (const [key, value] of params) {
    if (['select', 'order', 'limit', 'offset', 'or', 'and', 'on_conflict', 'columns'].includes(key)) continue;
    const m = /^(eq|neq|in|is)\.(.*)$/.exec(value);
    if (!m) continue;
    const [, op, raw] = m;
    out = out.filter(r => {
      if (!(key in r)) return true;
      const v = r[key] == null ? 'null' : String(r[key]);
      if (op === 'eq' || op === 'is') return v === raw;
      if (op === 'neq') return v !== raw;
      return raw.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/"/g, '')).includes(v);
    });
  }
  return out;
}

export async function mockBackend(page: Page, opts: BackendOptions = {}): Promise<Backend> {
  const tier = opts.tier ?? 'pro';
  const profile = {
    id: UID, full_name: 'Sam Carter', email: 'sam@example.com', handicap: 8.4, has_onboarded: true, subscription_tier: tier,
    friend_code: 'SAM8', avatar_url: null, tee_preference: null, home_course_name: 'Sonoma GC', phone: null,
  };
  const friendProfiles = [
    { id: 'u-jack', full_name: 'Jack Turner', handicap: 12.1, avatar_url: null, friend_code: 'JACK1', home_course_name: null },
    { id: 'u-james', full_name: 'James Reid', handicap: 6.3, avatar_url: null, friend_code: 'JIM22', home_course_name: null },
    { id: 'u-tim', full_name: 'Tim Shaw', handicap: 17.8, avatar_url: null, friend_code: 'TIM9', home_course_name: null },
    { id: 'u-mike', full_name: 'Michael Brooks', handicap: 9.0, avatar_url: null, friend_code: 'MIKE4', home_course_name: null },
  ];
  const user = { id: UID, email: profile.email, app_metadata: {}, user_metadata: { full_name: profile.full_name }, aud: 'authenticated', role: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
  const session = { access_token: 'x', refresh_token: 'y', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user };
  const tables: Record<string, Record<string, unknown>[]> = {
    rounds: (() => {
      const g = opts.games ?? (opts.match ? games.map(x => (x.type === 'match' ? { ...x, ...opts.match } : x)) : games);
      return [round(R_LIVE, 'active', g), round(R_DONE, 'complete', g)];
    })(),
    players: [...playersFor(R_LIVE), ...playersFor(R_DONE)],
    scores: [...scoresFor(R_LIVE, 12), ...scoresFor(R_DONE, 18)],
    profiles: [profile, ...friendProfiles],
    friendships: friendProfiles.map(f => ({ id: `fs-${f.id}`, user_id: UID, friend_id: f.id, status: 'accepted', created_at: now, accepted_at: now })),
    subscriptions: tier === 'pro' ? [{ user_id: UID, status: 'active', tier: 'pro', product_id: 'dev.matchgolf.pro_annual', expires_at: '2027-12-31T00:00:00Z' }] : [],
  };
  const backend: Backend = { writes: [] };

  await page.addInitScript(s => {
    if (s) localStorage.setItem('sb-puqgbsxabcyxrbwwoznn-auth-token', JSON.stringify(s));
    localStorage.setItem('ai_builder_tutorial_seen_v1', '1');
    localStorage.setItem('match_tutorial_seen', '1');
    localStorage.setItem('match-golf-settings', JSON.stringify({ tutorialDismissed: true, tutorialViewCount: 9 }));
  }, opts.signedIn === false ? null : session);

  await page.route(/supabase\.co/, async (r: Route) => {
    const req = r.request();
    const u = req.url();
    const method = req.method();
    const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    if (u.includes('/auth/v1/')) {
      if (opts.signedIn === false) return r.fulfill({ status: 401, json: { error: 'not signed in' } });
      return r.fulfill({ json: u.includes('/user') ? user : session });
    }
    if (u.includes('/functions/v1/plan-round')) {
      return opts.ai === false ? r.fulfill({ status: 502, json: { error: 'model_error' } }) : r.fulfill({ json: { plan: opts.plan ?? plan } });
    }
    if (u.includes('/functions/v1/golf-course-lookup')) {
      const q = new URL(u).searchParams;
      if (q.get('action') === 'details') return r.fulfill({ json: { course: { ...SONOMA, tees: { male: tees } } } });
      return r.fulfill({ json: { courses: (q.get('query') || '').toLowerCase() === 'sonoma' ? [SONOMA] : [] } });
    }
    if (u.includes('/functions/v1/')) return r.fulfill({ json: {} });
    if (u.includes('/rest/v1/rpc/')) return r.fulfill({ json: /subscription|is_pro/.test(u) ? { is_pro: tier === 'pro', tier } : [] });
    const m = u.match(/\/rest\/v1\/([a-z_]+)/);
    if (m) {
      if (method !== 'GET' && method !== 'HEAD') {
        let body: unknown = null;
        try { body = req.postDataJSON(); } catch { body = req.postData(); }
        backend.writes.push({ table: m[1], method, body });
        return r.fulfill({ status: 201, json: [] });
      }
      const rows = filterRows(tables[m[1]] ?? [], u);
      if (one) return rows[0] ? r.fulfill({ json: rows[0] }) : r.fulfill({ status: 406, json: { code: 'PGRST116' } });
      return r.fulfill({ json: rows, headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` } });
    }
    return r.fulfill({ json: {} });
  });
  // Realtime: answer the Phoenix handshake so live screens show "Live" every run.
  // Unanswered, the socket's state depended on timing and the "Offline" badge made
  // the leaderboard audit flaky.
  await page.routeWebSocket(/supabase\.co\/realtime/, ws => {
    ws.onMessage(raw => {
      let msg: { topic?: string; event?: string; ref?: string; join_ref?: string; payload?: { config?: { postgres_changes?: Record<string, unknown>[] } } };
      try { msg = JSON.parse(String(raw)); } catch { return; }
      if (msg.event !== 'phx_join' && msg.event !== 'heartbeat' && msg.event !== 'access_token') return;
      const changes = (msg.payload?.config?.postgres_changes ?? []).map((c, i) => ({ ...c, id: i + 1 }));
      ws.send(JSON.stringify({
        topic: msg.topic, event: 'phx_reply', ref: msg.ref, join_ref: msg.join_ref,
        payload: { status: 'ok', response: msg.event === 'phx_join' ? { postgres_changes: changes } : {} },
      }));
    });
  });

  // External analytics only: the app's own bundled sentry/posthog modules must still load.
  await page.route(/^https:\/\/[^/]*(sentry\.io|posthog\.com)/, r => r.abort());
  return backend;
}
