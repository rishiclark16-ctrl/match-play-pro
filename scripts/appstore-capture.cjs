// Captures real app screens for App Store screenshots and UI review.
//
//   node scripts/appstore-capture.cjs <outdir> [iphone|ipad]   (vite on BASE, default http://127.0.0.1:8080)
//
// Everything is fictional and safe to publish: invented players (no real users),
// and money only for games the marketing money embargo allows (team match play,
// 18-hole Sixes). The Supabase backend is mocked; filters on eq./in. are honoured
// so each screen sees the rows it would see in production.
const { chromium } = require('playwright');

const out = process.argv[2];
const device = process.argv[3] || 'iphone';
const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const VIEW = device === 'ipad'
  ? { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }
  : { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };

const uid = 'u-sam';
const now = new Date().toISOString();
const R_LIVE = '11111111-1111-1111-1111-111111111111';
const R_DONE = '22222222-2222-2222-2222-222222222222';

const pars = [4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const si = [9, 3, 13, 17, 1, 11, 15, 5, 7, 10, 4, 18, 2, 12, 8, 16, 14, 6];
const yards = [366, 512, 401, 168, 432, 377, 154, 541, 388, 395, 418, 142, 528, 371, 402, 189, 356, 519];
const hole_info = pars.map((par, i) => ({ number: i + 1, par, handicap: si[i], yardage: yards[i] }));

const people = [
  { pid: 'p1', name: 'Sam Carter', hcp: 8.4, profile: uid },
  { pid: 'p2', name: 'Jack Turner', hcp: 12.1, profile: 'u-jack' },
  { pid: 'p3', name: 'James Reid', hcp: 6.3, profile: 'u-james' },
  { pid: 'p4', name: 'Tim Shaw', hcp: 17.8, profile: 'u-tim' },
];
const gross = {
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
const round = (id, status) => ({
  id, course_name: 'Sonoma GC (II)', course_id: null, holes: 18, hole_info, stroke_play: true, match_play: true,
  stakes: 20, slope: 136, rating: 72.7, status, created_at: now, updated_at: now, join_code: 'FORE42', created_by: uid,
  scorekeeper_ids: [uid], games, teams: null, handicap_mode: 'auto', tee_sets: null, mixed_tees: false, stableford: false, modified_stableford: false,
});
const playersFor = rid => people.map((p, i) => ({
  id: rid === R_LIVE ? p.pid : `${p.pid}`, name: p.name, handicap: p.hcp, profile_id: p.profile, order_index: i, round_id: rid,
  is_ghost: false, manual_strokes: null, team_id: null, tee_set_id: null, created_at: now, profiles: { avatar_url: null },
}));
const scoresFor = (rid, through) => Object.entries(gross).flatMap(([pid, arr]) => arr.slice(0, through).map((strokes, i) => ({
  id: `${rid}-${pid}-${i + 1}`, player_id: pid, round_id: rid, hole_number: i + 1, strokes, created_at: now, updated_at: now,
})));

const profile = { id: uid, full_name: 'Sam Carter', email: 'sam@example.com', handicap: 8.4, has_onboarded: true, subscription_tier: 'pro',
  friend_code: 'SAM8', avatar_url: null, tee_preference: null, home_course_name: 'Sonoma GC' };
const friendProfiles = [
  { id: 'u-jack', full_name: 'Jack Turner', handicap: 12.1, avatar_url: null, friend_code: 'JACK1', home_course_name: null },
  { id: 'u-james', full_name: 'James Reid', handicap: 6.3, avatar_url: null, friend_code: 'JIM22', home_course_name: null },
  { id: 'u-tim', full_name: 'Tim Shaw', handicap: 17.8, avatar_url: null, friend_code: 'TIM9', home_course_name: null },
  { id: 'u-mike', full_name: 'Michael Brooks', handicap: 9.0, avatar_url: null, friend_code: 'MIKE4', home_course_name: null },
];
const user = { id: uid, email: profile.email, app_metadata: {}, user_metadata: { full_name: profile.full_name }, aud: 'authenticated', role: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
const session = { access_token: 'x', refresh_token: 'y', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user };

const tables = {
  rounds: [round(R_LIVE, 'active'), round(R_DONE, 'complete')],
  players: [...playersFor(R_LIVE), ...playersFor(R_DONE)],
  scores: [...scoresFor(R_LIVE, 12), ...scoresFor(R_DONE, 18)],
  profiles: [profile, ...friendProfiles],
  friendships: friendProfiles.map(f => ({ id: `fs-${f.id}`, user_id: uid, friend_id: f.id, status: 'accepted', created_at: now, accepted_at: now })),
  presses: [], prop_bets: [], round_spectators: [], golf_groups: [], group_members: [], bet_settlements: [],
};

const SONOMA = { id: 'cdx8ze6s', club_name: 'Sonoma Gc', course_name: 'Sonoma Gc', location: { city: 'Sonoma', state: 'CA', country: 'United States' } };
const tees = [['I', 7076, 138, 74.6], ['II', 6652, 136, 72.7], ['III', 6128, 133, 70.1], ['IV', 5229, 115, 65.6]].map(([tee_name, total_yards, slope_rating, course_rating]) => ({
  tee_name, total_yards, slope_rating, course_rating, number_of_holes: 18, par_total: 72, holes: hole_info.map(h => ({ par: h.par, yardage: h.yardage, handicap: h.handicap })),
}));
const SENTENCE = 'Sonoma Golf Club from the blues. Me and Jack vs Jim and Tim, $20 match, and sixes for 2 a point';
const plan = {
  course: { query: 'Sonoma Golf Club', tee: 'blues', holes: null, nine: null },
  players: [{ name: 'Jack', handicap: null }, { name: 'Jim', handicap: null }, { name: 'Tim', handicap: null }],
  userPlaying: true, userHandicap: null,
  games: [
    { type: 'match', stake: 20, carryover: null, autoPress: null, modified: null, teams: [['me', 'Jack'], ['Jim', 'Tim']] },
    { type: 'sixes', stake: 2, carryover: null, autoPress: null, modified: null, teams: null },
  ],
  handicaps: null, unsupported: [],
};

/** Applies PostgREST eq./in. filters on top-level columns; ignores everything else. */
function filterRows(rows, url) {
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
      if (op === 'eq') return v === raw;
      if (op === 'neq') return v !== raw;
      if (op === 'is') return v === raw;
      if (op === 'in') return raw.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/"/g, '')).includes(v);
      return true;
    });
  }
  return out;
}

async function setup(browser) {
  const ctx = await browser.newContext(VIEW);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
  await page.addInitScript(s => {
    localStorage.setItem('sb-puqgbsxabcyxrbwwoznn-auth-token', JSON.stringify(s));
    localStorage.setItem('ai_builder_tutorial_seen_v1', '1');
    localStorage.setItem('match_tutorial_seen', '1');
    localStorage.setItem('match-golf-settings', JSON.stringify({ tutorialDismissed: true, tutorialViewCount: 9 }));
  }, session);
  await page.route(/supabase\.co/, async r => {
    const u = r.request().url();
    const method = r.request().method();
    const one = (r.request().headers()['accept'] || '').includes('vnd.pgrst.object');
    if (u.includes('/auth/v1/')) return r.fulfill({ json: u.includes('/user') ? user : session });
    if (u.includes('/functions/v1/plan-round')) { await new Promise(res => setTimeout(res, 800)); return r.fulfill({ json: { plan } }); }
    if (u.includes('/functions/v1/golf-course-lookup')) {
      const q = new URL(u).searchParams;
      if (q.get('action') === 'details') return r.fulfill({ json: { course: { ...SONOMA, tees: { male: tees } } } });
      return r.fulfill({ json: { courses: (q.get('query') || '').toLowerCase() === 'sonoma' ? [SONOMA] : [] } });
    }
    if (u.includes('/functions/v1/')) return r.fulfill({ json: {} });
    if (u.includes('/rest/v1/rpc/')) return r.fulfill({ json: u.includes('subscription') || u.includes('is_pro') ? { is_pro: true, tier: 'pro' } : [] });
    const m = u.match(/\/rest\/v1\/([a-z_]+)/);
    if (m) {
      if (method !== 'GET' && method !== 'HEAD') return r.fulfill({ status: 201, json: [] });
      let rows = filterRows(tables[m[1]] ?? [], u);
      if (m[1] === 'subscriptions') rows = [{ user_id: uid, status: 'active', tier: 'pro', product_id: 'dev.matchgolf.pro_annual', expires_at: '2027-12-31T00:00:00Z' }];
      if (one) return rows[0] ? r.fulfill({ json: rows[0] }) : r.fulfill({ status: 406, json: { code: 'PGRST116' } });
      return r.fulfill({ json: rows, headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` } });
    }
    return r.fulfill({ json: {} });
  });
  // External hosts only: the app's own bundled sentry/posthog modules must still load.
  await page.route(/^https:\/\/[^/]*(sentry\.io|posthog\.com)/, r => r.abort());
  return page;
}

const shot = (page, name) => page.screenshot({ path: `${out}/${device}-${name}.png` });

(async () => {
  // Cloud containers: CHROMIUM=/opt/pw-browsers/chromium (the repo pins its own Playwright).
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await setup(browser);
  const wait = ms => page.waitForTimeout(ms);

  // 1. Say it
  await page.goto(`${BASE}/play`);
  await wait(2500);
  if (process.env.DEBUG) { await shot(page, 'debug'); console.log('URL', page.url()); }
  await page.getByLabel('Describe your round').fill(SENTENCE);
  await page.getByLabel('Describe your round').blur();
  await wait(400);
  await shot(page, '1-say');

  // 2. Review
  await page.getByRole('button', { name: 'Set it up' }).click();
  await wait(4500);
  await shot(page, '2-review');

  // 3. Scorecard, on the last scored hole
  await page.goto(`${BASE}/round/${R_LIVE}`);
  await wait(4500);
  await shot(page, '3-scorecard-resume');
  const prev = page.getByLabel('Previous hole');
  if (await prev.count()) { await prev.first().click({ timeout: 5000 }).catch(e => console.log('prev click failed', e.message.slice(0, 80))); await wait(900); }
  await shot(page, '3-scorecard');
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('main, div')].find(d => d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== 'visible');
    if (el) el.scrollTop = el.scrollHeight;
  });
  await wait(700);
  await shot(page, '3b-scorecard-money');

  // 4. Leaderboard
  await page.goto(`${BASE}/round/${R_LIVE}/leaderboard`);
  await wait(4000);
  await shot(page, '4-leaderboard');

  // 5. Settle up
  await page.goto(`${BASE}/round/${R_DONE}/complete`);
  await wait(4500);
  await shot(page, '5-settle');

  // 6. Home with a live round
  await page.goto(`${BASE}/`);
  await wait(4500);
  await shot(page, '6-home');

  await browser.close();
})();
