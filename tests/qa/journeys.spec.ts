/**
 * Core journeys, tapped through like a golfer would, with what the app writes
 * checked as well as what it shows. Phone sizes only (iPad uses the same flows).
 */
import { test, expect } from '@playwright/test';
import { mockBackend, R_DONE, R_LIVE, SENTENCE } from './mockBackend';

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
  await expect(page.getByText('$20 on the match')).toBeVisible();
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
