// Screenshot harness with a realistic in-progress round.
// usage: node demo.cjs <outdir> <path> [<path>...]   (WAIT env = ms per page, W/H env = viewport)
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const paths = process.argv.slice(3);
const uid = 'e2e-user-id-00000000';
const RID = '11111111-1111-1111-1111-111111111111';
const pars = [4,5,4,3,4,4,3,5,4, 4,4,4,5,3,4,5,3,4];
const hole_info = pars.map((par, i) => ({ number: i + 1, par, yardage: 340 + ((i * 37) % 220), handicap: ((i * 7) % 18) + 1 }));
const now = new Date().toISOString();
const round = {
  id: RID, course_name: 'Pebble Creek GC', course_id: null, holes: 18, hole_info, stroke_play: true,
  match_play: false, stakes: 5, slope: 128, rating: 71.2, status: 'active', created_at: now,
  join_code: 'FORE42', created_by: uid, scorekeeper_ids: [uid],
  games: [
    { id: 'g1', type: 'nassau', stakes: 5, useNet: true },
    { id: 'g2', type: 'skins', stakes: 2, carryover: true, useNet: true },
  ],
};
const names = [['p1', 'Rishi Clark', 8.4, uid], ['p2', 'David Hooper', 12.1, 'u2'], ['p3', 'Marcus Lee', 4.2, 'u3'], ['p4', 'Sam Ortiz', 17.0, null]];
const players = names.map(([id, name, handicap, profile_id], i) => ({
  id, name, handicap, profile_id, order_index: i, round_id: RID, is_ghost: false, manual_strokes: null,
  team_id: null, tee_set_id: null, created_at: now, profiles: { avatar_url: null },
}));
const grid = { p1: [4,5,3,3,5,4,3], p2: [5,6,4,4,4,5,3], p3: [4,4,4,2,4,4,3], p4: [6,5,5,4,6,5,4] };
const scores = [];
for (const [pid, arr] of Object.entries(grid)) arr.forEach((strokes, i) => scores.push({
  id: `${pid}-${i + 1}`, player_id: pid, round_id: RID, hole_number: i + 1, strokes, created_at: now, updated_at: now,
}));
const profile = { id: uid, full_name: 'Rishi Clark', email: 'e2e@matchgolf.test', handicap: 8.4, has_onboarded: true,
  subscription_tier: process.env.TIER || 'pro', friend_code: 'RISHI7', avatar_url: null };
const user = { id: uid, email: profile.email, app_metadata: {}, user_metadata: { full_name: 'Rishi Clark' }, aud: 'authenticated', role: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
const session = { access_token: 'x', refresh_token: 'y', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user };

const tables = {
  rounds: [round], players, scores, presses: [], prop_bets: [], profiles: [profile],
  round_spectators: [], friendships: [], golf_groups: [], group_members: [],
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  await page.addInitScript(s => {
    localStorage.setItem('sb-puqgbsxabcyxrbwwoznn-auth-token', JSON.stringify(s));
    localStorage.setItem('ai_builder_tutorial_seen_v1', '1');
    localStorage.setItem('match_tutorial_seen', '1');
  }, session);
  await page.route(/supabase\.co/, async r => {
    const u = r.request().url();
    const one = (r.request().headers()['accept'] || '').includes('vnd.pgrst.object');
    if (u.includes('/auth/v1/')) return r.fulfill({ json: u.includes('/user') ? user : session });
    if (u.includes('/rest/v1/rpc/')) return r.fulfill({ json: u.includes('subscription') ? { is_pro: true, tier: 'pro' } : [] });
    const m = u.match(/\/rest\/v1\/([a-z_]+)/);
    if (m) {
      let rows = tables[m[1]] ?? [];
      if (m[1] === 'rounds' && /status=eq\.complete/.test(u)) rows = [];
      return one ? (rows[0] ? r.fulfill({ json: rows[0] }) : r.fulfill({ status: 406, json: {} })) : r.fulfill({ json: rows });
    }
    return r.fulfill({ json: {} });
  });
  await page.route(/^https:\/\/[^/]*(sentry\.io|posthog|googleapis|gstatic)/, r => r.abort());
  for (const p of paths) {
    await page.goto((process.env.BASE || 'http://127.0.0.1:8080') + p.replace(':rid', RID));
    await page.waitForTimeout(+process.env.WAIT || 6000);
    const name = p.replace(':rid', 'R').replace(/\W+/g, '_') || 'home';
    await page.screenshot({ path: `${out}/${name}.png` });
    if (process.env.FULL) await page.screenshot({ path: `${out}/${name}_full.png`, fullPage: true });
  }
  await b.close();
})();
