import { test, expect, Page, Route } from '@playwright/test';
import { mockAuth, mockAuthApi, mockProfileApi, mockRealtimeQuiet, blockExternalRequests } from './helpers';

const ROUND_ID = 'e2e-round-money-tracker';

const holeInfo = [
  { par: 4, number: 1, yardage: 388, handicap: 15 },
  { par: 5, number: 2, yardage: 554, handicap: 3 },
  { par: 4, number: 3, yardage: 411, handicap: 9 },
  { par: 3, number: 4, yardage: 204, handicap: 13 },
  { par: 4, number: 5, yardage: 431, handicap: 1 },
  { par: 4, number: 6, yardage: 422, handicap: 11 },
  { par: 3, number: 7, yardage: 220, handicap: 7 },
  { par: 5, number: 8, yardage: 595, handicap: 5 },
  { par: 4, number: 9, yardage: 346, handicap: 17 },
  { par: 4, number: 10, yardage: 426, handicap: 10 },
  { par: 4, number: 11, yardage: 359, handicap: 14 },
  { par: 4, number: 12, yardage: 427, handicap: 4 },
  { par: 5, number: 13, yardage: 550, handicap: 12 },
  { par: 3, number: 14, yardage: 216, handicap: 6 },
  { par: 4, number: 15, yardage: 433, handicap: 2 },
  { par: 5, number: 16, yardage: 544, handicap: 16 },
  { par: 3, number: 17, yardage: 146, handicap: 18 },
  { par: 4, number: 18, yardage: 410, handicap: 8 },
];

const players = [
  {
    id: 'player-alice', round_id: ROUND_ID, name: 'Alice', handicap: null,
    order_index: 0, profile_id: null, avatar_url: null, manual_strokes: null,
    is_ghost: false, tee_set_id: null,
  },
  {
    id: 'player-bob', round_id: ROUND_ID, name: 'Bob', handicap: null,
    order_index: 1, profile_id: null, avatar_url: null, manual_strokes: null,
    is_ghost: false, tee_set_id: null,
  },
];

// Alice wins holes 1, 2, 3 clearly
const scores = [
  { id: 's1', player_id: 'player-alice', round_id: ROUND_ID, hole_number: 1, strokes: 3, created_at: '2026-04-03T00:01:00Z' },
  { id: 's2', player_id: 'player-bob', round_id: ROUND_ID, hole_number: 1, strokes: 5, created_at: '2026-04-03T00:01:01Z' },
  { id: 's3', player_id: 'player-alice', round_id: ROUND_ID, hole_number: 2, strokes: 4, created_at: '2026-04-03T00:02:00Z' },
  { id: 's4', player_id: 'player-bob', round_id: ROUND_ID, hole_number: 2, strokes: 6, created_at: '2026-04-03T00:02:01Z' },
  { id: 's5', player_id: 'player-alice', round_id: ROUND_ID, hole_number: 3, strokes: 3, created_at: '2026-04-03T00:03:00Z' },
  { id: 's6', player_id: 'player-bob', round_id: ROUND_ID, hole_number: 3, strokes: 5, created_at: '2026-04-03T00:03:01Z' },
];

const houseGameSkins: object = {
  id: 'game-skins-50',
  type: 'house',
  stakes: 50,
  houseGameId: 'e2e-house-game-id',
  activePrimitives: [
    { id: 'format_skins', value: null },
    { id: 'settlement_unit_value', value: 50 },
    { id: 'carryover_skins_halved', value: null },
  ],
};

const roundData = {
  id: ROUND_ID,
  course_name: 'E2E Test Course',
  tee_name: 'White',
  holes: 18,
  status: 'active',
  hole_info: holeInfo,
  games: [houseGameSkins],
  presses: [],
  slope: 113,
  rating: 72.0,
  handicap_mode: 'auto',
  created_at: '2026-04-03T00:00:00Z',
  creator_id: 'e2e-user-id-00000000',
  current_hole: 4,
  mixed_tees: false,
  tee_sets: null,
  match_play: false,
};

async function mockRoundApi(page: Page) {
  await page.route('**/rest/v1/rounds*', async (route: Route) => {
    const url = route.request().url();
    if (url.includes(ROUND_ID) || url.includes('select=')) {
      const accept = route.request().headers()['accept'] ?? '';
      const wantsSingle = accept.includes('vnd.pgrst.object');
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(wantsSingle ? roundData : [roundData]),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });

  for (const table of ['players', 'presses', 'prop_bets', 'round_spectators', 'friendships', 'bet_settlements']) {
    const data = table === 'players' ? players : [];
    await page.route(`**/rest/v1/${table}*`, async (route: Route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
  }

  await page.route('**/rest/v1/scores*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(scores) });
    } else {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });
}

/** Wait for splash screen and dismiss scorecard tutorial */
async function waitForAppReady(page: Page) {
  // Wait for splash screen to disappear (~3s animation)
  try {
    const splash = page.locator('.fixed.inset-0.z-50.bg-foreground');
    await splash.waitFor({ state: 'hidden', timeout: 8000 });
  } catch { /* already gone */ }

  // Dismiss the scorecard tutorial overlay if present
  try {
    const skipBtn = page.getByText('Skip');
    await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
    await skipBtn.click();
    await page.waitForTimeout(500);
  } catch { /* no tutorial */ }
}

test.describe('Live Money Tracker — House Game Skins', () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalRequests(page);
    await mockRealtimeQuiet(page);
    await mockAuth(page);
    await mockAuthApi(page);
    await mockProfileApi(page);
    await mockRoundApi(page);
  });

  test('shows non-zero money for AI-built skins game ($50/skin)', async ({ page }) => {
    await page.goto(`/round/${ROUND_ID}`);
    await waitForAppReady(page);

    // Wait for the money tracker section
    await expect(page.getByText('Live Money')).toBeVisible({ timeout: 10000 });

    // "All even so far" should NOT be visible — there are skins results
    await expect(page.getByText('All even so far')).not.toBeVisible({ timeout: 3000 });

    // Locate the money tracker container by its "Live Money" label
    const moneyTracker = page.getByText('Live Money').locator('..');

    // Verify both player names appear in the money tracker
    const aliceRow = page.locator('button').filter({ hasText: 'Alice' }).first();
    const bobRow = page.locator('button').filter({ hasText: 'Bob' }).first();
    await expect(aliceRow).toBeVisible();
    await expect(bobRow).toBeVisible();

    // Check that the biggest swing badge shows (Alice won money on this hole)
    await expect(page.getByText(/Alice \+\$\d+/).first()).toBeVisible({ timeout: 5000 });
  });

  test('money tracker breakdown sheet opens on player tap', async ({ page }) => {
    await page.goto(`/round/${ROUND_ID}`);
    await waitForAppReady(page);

    await expect(page.getByText('Live Money')).toBeVisible({ timeout: 10000 });

    // Click Alice's row in the money tracker
    const moneyTracker = page.locator('[class*="bg-\\[\\#0A0A0A\\]"]');
    const aliceRow = moneyTracker.locator('button').filter({ hasText: 'Alice' });
    await aliceRow.click();

    // Breakdown sheet should open with title
    const sheet = page.getByLabel('Money Breakdown');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Should show House Game row in breakdown
    await expect(sheet.getByText('House Game')).toBeVisible();

    // Should show Total Balance card
    await expect(sheet.getByText('Total Balance')).toBeVisible();

    // All Players section should be visible
    await expect(sheet.getByText('All Players')).toBeVisible();
  });
});
