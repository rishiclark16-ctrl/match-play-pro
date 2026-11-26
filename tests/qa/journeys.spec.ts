/**
 * Core journeys, tapped through like a golfer would, with what the app writes
 * checked as well as what it shows. Phone sizes only (iPad uses the same flows).
 */
import { test, expect } from '@playwright/test';
import { mockBackend, R_DONE, R_LIVE, SENTENCE } from './mockBackend';
import { PRESETS } from '../../src/lib/games/custom/presets';
import { planFromSpec } from '../../src/lib/roundPlan/customPlan';

test.beforeEach(({}, info) => {
  test.skip(info.project.name === 'ipad', 'journeys run on phone sizes');
});

test('say it and play: sentence to a live round', async ({ page }) => {
  const backend = await mockBackend(page);
  await page.goto('/play');
  await page.getByLabel('Describe your round').fill(SENTENCE);
  await page.getByRole('button', { name: 'Set it up' }).click();

  // The review shows exactly what was understood.
  await expect(page.getByText('Sonoma GC').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /II tees/ })).toBeVisible();
  await expect(page.getByText('James Reid')).toBeVisible();
  await expect(page.getByText(/you said “Jim”/)).toBeVisible();
  await expect(page.getByText('$20 a man on the match')).toBeVisible();
  await expect(page.getByText('$2 a point')).toBeVisible();
  await expect(page.getByText(/No "blues" tee on this card/)).toBeVisible();

  await page.getByRole('button', { name: 'Tee off' }).click();
  await expect(page).toHaveURL(/\/round\/[0-9a-f-]{36}$/);

  const round = backend.writes.find(w => w.table === 'rounds')?.body as Record<string, unknown>;
  const players = backend.writes.find(w => w.table === 'players')?.body as { id: string; name: string; profile_id: string | null }[];
  expect(round.course_name).toBe('Sonoma GC (II)');
  expect(round.slope).toBe(136);
  expect(players.map(p => [p.name, p.profile_id])).toEqual([
    ['Sam Carter', 'u-sam'], ['Jack Turner', 'u-jack'], ['James Reid', 'u-james'], ['Tim Shaw', 'u-tim'],
  ]);
  const games = round.games as { type: string; stakes: number; matchPlayTeams?: { playerIds: string[] }[] }[];
  expect(games.map(g => [g.type, g.stakes])).toEqual([['match', 20], ['sixes', 2]]);
  // Team members are the inserted player ids, not the setup screen's.
  const ids = players.map(p => p.id);
  expect(games[0].matchPlayTeams?.map(t => t.playerIds)).toEqual([[ids[0], ids[1]], [ids[2], ids[3]]]);
});

test('low total, $5 a hole: the 2 v 2 game where partners add their scores', async ({ page }) => {
  const said = 'Me and Jack vs Jim and Tim, we add both scores and the lower total wins the hole, five bucks a hole';
  const backend = await mockBackend(page, {
    plan: {
      course: { query: 'Sonoma Golf Club', tee: 'II', holes: null, nine: null },
      players: [{ name: 'Jack', handicap: null }, { name: 'Jim', handicap: null }, { name: 'Tim', handicap: null }],
      userPlaying: true, userHandicap: null,
      games: [{ type: 'match', stake: 5, carryover: null, autoPress: null, modified: null, teams: [['me', 'Jack'], ['Jim', 'Tim']], teamScoring: 'aggregate', perHole: true, custom: null }],
      handicaps: null, unsupported: [],
    },
  });
  await page.goto('/play');
  await page.getByLabel('Describe your round').fill(said);
  await page.getByRole('button', { name: 'Set it up' }).click();

  await expect(page.getByText(/low total/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('$5 a hole, a man')).toBeVisible();
  await expect(page.getByText(/Sam & Jack vs James & Tim/)).toBeVisible();

  await page.getByRole('button', { name: 'Tee off' }).click();
  await expect(page).toHaveURL(/\/round\/[0-9a-f-]{36}$/);
  const round = backend.writes.find(w => w.table === 'rounds')?.body as { games: Record<string, unknown>[] };
  expect(round.games).toHaveLength(1);
  expect(round.games[0]).toMatchObject({
    type: 'match', stakes: 5, matchPlayFormat: 'fourball', teamScoring: 'aggregate', matchPayout: 'per_hole',
  });
});

test('custom game: Daytona is set up from its rules and saved with the real player ids', async ({ page }) => {
  const daytona = planFromSpec(PRESETS.daytona([['me', 'Jack'], ['Jim', 'Tim']]));
  const backend = await mockBackend(page, {
    plan: {
      course: { query: 'Sonoma Golf Club', tee: 'II', holes: null, nine: null },
      players: [{ name: 'Jack', handicap: null }, { name: 'Jim', handicap: null }, { name: 'Tim', handicap: null }],
      userPlaying: true, userHandicap: null,
      games: [{ type: 'custom', stake: 0.25, carryover: null, autoPress: null, modified: null, teams: null, teamScoring: null, perHole: null, custom: daytona }],
      handicaps: null, unsupported: [],
    },
  });
  await page.goto('/play');
  await page.getByLabel('Describe your round').fill('Daytona, me and Jack vs Jim and Tim, a quarter a point');
  await page.getByRole('button', { name: 'Set it up' }).click();

  // The rules the golfer confirms are generated from the spec that will be scored.
  const rules = page.getByTestId('custom-rules');
  await expect(rules).toBeVisible({ timeout: 15_000 });
  await expect(rules).toContainText('Sam & Jack vs James & Tim');
  await expect(rules).toContainText('the difference between the Daytona numbers counts');
  await expect(page.getByText('$0.25 a point, a man')).toBeVisible();

  await page.getByRole('button', { name: 'Tee off' }).click();
  await expect(page).toHaveURL(/\/round\/[0-9a-f-]{36}$/);
  const round = backend.writes.find(w => w.table === 'rounds')?.body as { games: { type: string; stakes: number; spec: { sides: { teams: string[][] } } }[] };
  const players = backend.writes.find(w => w.table === 'players')?.body as { id: string }[];
  expect(round.games[0].type).toBe('custom');
  expect(round.games[0].stakes).toBe(0.25);
  // Teams reference the inserted players, not names or setup-screen keys.
  const ids = players.map(p => p.id);
  expect(round.games[0].spec.sides.teams).toEqual([[ids[0], ids[1]], [ids[2], ids[3]]]);
});

test('custom game on the scorecard: rules, points and live money', async ({ page }) => {
  await mockBackend(page, {
    games: [{ id: 'g9', type: 'custom', stakes: 1, useNet: true, spec: PRESETS.highLow([['p1', 'p2'], ['p3', 'p4']]) }],
  });
  await page.goto(`/round/${R_LIVE}`);
  const card = page.getByTestId('custom-game');
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText('High-low');
  await expect(card).toContainText('Thru 12');
  await card.getByRole('button', { name: /Sam & Jack vs James & Tim/ }).click();
  await expect(card).toContainText('1 point for the better high ball');
});

test('no AI: the offline parser still sets the round up, and says so', async ({ page }) => {
  await mockBackend(page, { ai: false });
  await page.goto('/play');
  await page.getByLabel('Describe your round').fill('Sonoma with Jack and Tim, $20 match');
  await page.getByRole('button', { name: 'Set it up' }).click();
  await expect(page.getByText(/Set up offline from your words/)).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Jack Turner')).toBeVisible();
});

test('free account: Pro games offer the upgrade or start without them', async ({ page }) => {
  await mockBackend(page, { tier: 'free' });
  await page.goto('/play');
  await page.getByLabel('Describe your round').fill(SENTENCE);
  await page.getByRole('button', { name: 'Set it up' }).click();
  await expect(page.getByRole('button', { name: /Unlock Sixes/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Start without Sixes/ }).click();
  await expect(page.getByRole('button', { name: 'Tee off' })).toBeEnabled();
});

test('a manual setup is one tap away', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/play');
  await page.getByRole('button', { name: 'Set up by hand' }).click();
  await expect(page).toHaveURL(/\/new-round$/);
});

test('home: the centre tab opens say-it-and-play', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'New round' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByLabel('Describe your round')).toBeVisible();
});

test('scorecard: entering a score saves it', async ({ page }) => {
  const backend = await mockBackend(page);
  await page.goto(`/round/${R_LIVE}`);
  await expect(page.getByText('Hole 13').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Increase score' }).first().click();
  await expect.poll(() => backend.writes.some(w => w.table === 'scores'), { timeout: 10_000 }).toBe(true);
});

test('settle up: the team match is paid out', async ({ page }) => {
  await mockBackend(page);
  await page.goto(`/round/${R_DONE}/complete`);
  // $20 a man on the match plus Sixes: Sam is up $28.
  await expect(page.getByText('+$28').first()).toBeVisible({ timeout: 15_000 });
});
