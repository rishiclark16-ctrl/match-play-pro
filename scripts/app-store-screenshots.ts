/**
 * App Store Screenshot Generator
 *
 * Seeds realistic demo data, then captures 10 polished screenshots
 * at iPhone 15 Pro Max resolution (1290×2796 @ 3x = 430×932 viewport).
 *
 * Run: npx playwright test scripts/app-store-screenshots.ts --project=screenshots
 *   or: npx playwright test scripts/app-store-screenshots.ts --config=scripts/screenshots.config.ts
 */
import { test, expect, Page } from '@playwright/test';

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://puqgbsxabcyxrbwwoznn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cWdic3hhYmN5eHJid3dvem5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDA4NzAsImV4cCI6MjA4MzgxNjg3MH0.gr7BZFetWhyMTSHITVzg3wjhWWH8K5dzIVT74zJcUPw';

const TEST_USER = {
  email: 'e2e-test@matchgolf.dev',
  password: 'TestMatch2026!',
  id: 'd2067fae-137e-4050-960e-8a67d7f8e9a2',
};

// Output dir is set per-test based on viewport size
let OUTPUT_DIR = 'screenshots/app-store';

test.setTimeout(180_000);

// ─── Auth helper ───────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });

  const result = await page.evaluate(async ({ url, key, email, password }) => {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return { error: await res.text() };
    const session = await res.json();
    localStorage.setItem('sb-puqgbsxabcyxrbwwoznn-auth-token', JSON.stringify(session));
    return { success: true, token: session.access_token };
  }, { url: SUPABASE_URL, key: SUPABASE_KEY, email: TEST_USER.email, password: TEST_USER.password });

  if ('error' in result) throw new Error(`Login failed: ${result.error}`);

  // Dismiss all tutorials
  await page.evaluate(() => {
    localStorage.setItem('ai_builder_tutorial_seen_v1', '1');
    localStorage.setItem('app_tutorial_seen', '1');
    localStorage.setItem('scorecard_tutorial_seen', '1');
    localStorage.setItem('match-golf-settings', JSON.stringify({
      tutorialDismissed: true,
      tutorialViewCount: 3,
    }));
  });

  return result;
}

// ─── Supabase helper ───────────────────────────────────────────────────────────

async function supabaseQuery(page: Page, method: string, table: string, params: string, body?: unknown) {
  return page.evaluate(async ({ url, key, method, table, params, body }) => {
    const session = JSON.parse(localStorage.getItem('sb-puqgbsxabcyxrbwwoznn-auth-token') || '{}');
    const headers: Record<string, string> = {
      'apikey': key,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : '',
    };
    const res = await fetch(`${url}/rest/v1/${table}${params}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  }, { url: SUPABASE_URL, key: SUPABASE_KEY, method, table, params, body });
}

// ─── Seed demo data ────────────────────────────────────────────────────────────

// Realistic golf course hole info — Augusta National inspired
const DEMO_HOLES = Array.from({ length: 18 }, (_, i) => {
  const pars = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4];
  const hdcps = [7, 13, 1, 11, 9, 17, 3, 15, 5, 8, 14, 4, 2, 16, 10, 12, 6, 18];
  return { number: i + 1, par: pars[i], handicap: hdcps[i], yards: 340 + Math.floor(Math.random() * 200) };
});

const DEMO_COURSE = 'Pine Valley Golf Club';

// Player names for a realistic foursome
const DEMO_PLAYERS = [
  { name: 'E2E Test Player', handicap: 12.5 }, // The logged-in user
  { name: 'Mike Thompson', handicap: 8.2 },
  { name: 'Sarah Chen', handicap: 15.1 },
  { name: 'Jake Williams', handicap: 5.7 },
];

// Realistic score generator: par-based with variance
function generateScore(par: number, handicap: number, hole: number): number {
  // Lower handicap = closer to par
  const skill = handicap / 36; // 0 = scratch, 1 = 36 hcp
  const base = par;
  const variance = Math.random();

  if (variance < 0.05 - skill * 0.03) return base - 2; // Eagle
  if (variance < 0.20 - skill * 0.10) return base - 1; // Birdie
  if (variance < 0.50 + skill * 0.05) return base;     // Par
  if (variance < 0.80 + skill * 0.10) return base + 1; // Bogey
  if (variance < 0.95) return base + 2;                 // Double
  return base + 3;                                       // Triple
}

async function seedDemoRound(page: Page, status: 'active' | 'complete', holesPlayed: number, games: unknown[]) {
  const roundId = crypto.randomUUID();
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Insert round
  await supabaseQuery(page, 'POST', 'rounds', '', {
    id: roundId,
    created_by: TEST_USER.id,
    join_code: joinCode,
    course_name: DEMO_COURSE,
    holes: 18,
    stroke_play: true,
    match_play: false,
    stakes: 10,
    slope: 155,
    rating: 73.5,
    handicap_mode: 'auto',
    games,
    hole_info: DEMO_HOLES,
    status,
  });

  // Insert players
  const playersToInsert = DEMO_PLAYERS.map((p, i) => ({
    round_id: roundId,
    name: p.name,
    handicap: p.handicap,
    order_index: i,
    profile_id: i === 0 ? TEST_USER.id : null,
    is_ghost: false,
    manual_strokes: 0,
  }));

  const playersResult = await supabaseQuery(page, 'POST', 'players', '', playersToInsert);
  const playerIds = (playersResult as { id: string }[]).map(p => p.id);

  // Insert scores for played holes
  const scoresToInsert: { round_id: string; player_id: string; hole_number: number; strokes: number }[] = [];

  for (let hole = 1; hole <= holesPlayed; hole++) {
    for (let pi = 0; pi < DEMO_PLAYERS.length; pi++) {
      scoresToInsert.push({
        round_id: roundId,
        player_id: playerIds[pi],
        hole_number: hole,
        strokes: generateScore(DEMO_HOLES[hole - 1].par, DEMO_PLAYERS[pi].handicap, hole),
      });
    }
  }

  if (scoresToInsert.length > 0) {
    await supabaseQuery(page, 'POST', 'scores', '', scoresToInsert);
  }

  return { roundId, joinCode, playerIds };
}

// ─── Screenshot helper ─────────────────────────────────────────────────────────

async function screenshot(page: Page, name: string) {
  // Wait for animations to settle
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: `${OUTPUT_DIR}/${name}.png`,
    fullPage: false,
  });
  console.log(`  📸 ${name}.png`);
}

// ─── Main test ─────────────────────────────────────────────────────────────────

test.describe('App Store Screenshots', () => {
  test('Generate 10 App Store screenshots', async ({ page }) => {
    // Detect device type from viewport and set output dir
    const vp = page.viewportSize();
    if (vp && vp.width > 700) {
      OUTPUT_DIR = 'screenshots/app-store-ipad';
    } else {
      OUTPUT_DIR = 'screenshots/app-store';
    }

    // Login
    console.log('🔑 Logging in...');
    await login(page);

    // Seed data
    console.log('🌱 Seeding demo data...');

    // Active round — on hole 7 with a nassau + skins game
    const nassauSkinsGames = [
      {
        type: 'house',
        name: 'Saturday Game',
        stakes: 10,
        activePrimitives: [
          { id: 'format_nassau', value: null },
          { id: 'settlement_unit_value', value: 10 },
          { id: 'press_auto_x_down', value: 2 },
          { id: 'format_skins', value: null },
          { id: 'carryover_skins', value: null },
          { id: 'bonus_birdie_unit', value: 5 },
          { id: 'bonus_eagle_unit', value: 10 },
          { id: 'handicap_pct', value: 90 },
        ],
      },
    ];

    const activeRound = await seedDemoRound(page, 'active', 7, nassauSkinsGames);
    console.log(`  ✅ Active round: ${activeRound.roundId}`);

    // Completed round — full 18 holes
    const completedRound = await seedDemoRound(page, 'complete', 18, nassauSkinsGames);
    console.log(`  ✅ Completed round: ${completedRound.roundId}`);

    // Now take screenshots
    console.log('\n📷 Taking screenshots...');

    // ── 1. Home — Round List ────────────────────────────────────────────────
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '01-home-rounds');

    // ── 2. Scorecard — Navigate to hole with scores ────────────────────────
    await page.goto(`/round/${activeRound.roundId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Dismiss tutorial if it pops up
    const skipBtn = page.getByRole('button', { name: /Skip tutorial/i });
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Navigate to hole 5 (mid-front-9) where we have scores
    const nextHoleBtn = page.getByRole('button', { name: /Next hole/i });
    for (let i = 0; i < 4; i++) {
      if (await nextHoleBtn.isVisible().catch(() => false)) {
        await nextHoleBtn.click();
        await page.waitForTimeout(400);
      }
    }
    await page.waitForTimeout(800);

    // Scroll to show player cards with scores
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await screenshot(page, '02-scorecard-scoring');

    // ── 3. Player Cards with Score Entry ──────────────────────────────────
    // Scroll the inner container to show player cards with +/- buttons
    await page.evaluate(() => {
      const main = document.querySelector('main') ||
        document.querySelector('[class*="overflow-y-auto"]');
      if (main) {
        // Scroll about halfway to show player cards
        main.scrollTop = 350;
      }
    });
    await page.waitForTimeout(500);
    await screenshot(page, '03-player-cards');

    // ── 4. Game Sections — already expanded by default ────────────────────
    // The GamesSection starts with isExpanded=true, so just scroll the inner
    // overflow container down to show the House Game / Nassau / Skins content.
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = main.scrollHeight;
    });
    await page.waitForTimeout(800);
    await screenshot(page, '04-game-sections');

    // ── 5. Leaderboard ─────────────────────────────────────────────────────
    await page.goto(`/round/${activeRound.roundId}/leaderboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '05-leaderboard');

    // ── 6. Round Complete — Settlements ─────────────────────────────────────
    await page.goto(`/round/${completedRound.roundId}/complete`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '06-round-complete');

    // ── 7. AI Game Builder ─────────────────────────────────────────────────
    await page.goto('/my-formats/new', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '07-ai-game-builder');

    // ── 8. Social / Friends Page ───────────────────────────────────────────
    await page.goto('/social', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '08-social');

    // ── 9. Stats Page ──────────────────────────────────────────────────────
    await page.goto('/stats', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '09-stats');

    // ── 10. Profile Page ───────────────────────────────────────────────────
    await page.goto('/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '10-profile');

    // ── Cleanup ────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up demo data...');

    // Delete scores, players, rounds — use text() fallback for empty body
    for (const round of [activeRound, completedRound]) {
      await page.evaluate(async ({ url, key, roundId }) => {
        const session = JSON.parse(localStorage.getItem('sb-puqgbsxabcyxrbwwoznn-auth-token') || '{}');
        const headers = {
          'apikey': key,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        };
        await fetch(`${url}/rest/v1/scores?round_id=eq.${roundId}`, { method: 'DELETE', headers });
        await fetch(`${url}/rest/v1/players?round_id=eq.${roundId}`, { method: 'DELETE', headers });
        await fetch(`${url}/rest/v1/rounds?id=eq.${roundId}`, { method: 'DELETE', headers });
      }, { url: SUPABASE_URL, key: SUPABASE_KEY, roundId: round.roundId });
    }

    console.log('✅ Done! Screenshots saved to screenshots/app-store/');
  });
});
