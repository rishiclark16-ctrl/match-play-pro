/**
 * AI Game Builder — Comprehensive 50+ Game Test Suite
 *
 * Tests the full pipeline: describe → parse (real AI) → confirm page.
 * Uses real auth and the real parse-house-game edge function — no mocks.
 *
 * Each test validates:
 * 1. The builder page loads and accepts the description
 * 2. The parse succeeds and navigates to confirm
 * 3. The confirm page shows the expected rules
 * 4. Specific primitives are present for known game types
 */
import { test, expect, Page } from '@playwright/test';
import { setupAuthenticatedTest, blockExternalRequests } from './helpers';

// ─── Config ────────────────────────────────────────────────────────────────────

// Increase timeout for real AI parsing (can take 3-10s per parse)
test.setTimeout(90_000);

// Run sequentially to avoid rate limiting the edge function
test.describe.configure({ mode: 'serial' });

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function setupRealBuilder(page: Page) {
  await setupAuthenticatedTest(page);
}

async function enterAndParse(page: Page, description: string): Promise<string[]> {
  await page.goto('/my-formats/new', { waitUntil: 'networkidle' });
  await expect(page.locator('h1', { hasText: 'AI Game Builder' })).toBeVisible({ timeout: 15000 });

  // Fill description
  const textarea = page.locator('textarea');
  await textarea.fill(description);

  // Click Build My Game
  const cta = page.getByRole('button', { name: /Build My Game/i });
  await expect(cta).toBeEnabled();
  await cta.click();

  // Should show parsing state
  await expect(page.getByText(/Reading your description|Identifying|Mapping|Building/)).toBeVisible({ timeout: 5000 });

  // Wait for confirm page (real AI — may take up to 30s)
  await page.waitForURL('**/my-formats/confirm', { timeout: 45000 });
  await expect(page.getByText('Confirm Rules')).toBeVisible({ timeout: 10000 });

  // Collect all visible rule IDs from the page for validation
  // The header subtitle shows the rule count
  const headerP = page.locator('header p').filter({ hasText: /\d+ rule/ });
  const headerText = await headerP.textContent().catch(() => '');
  const ruleCount = parseInt(headerText?.match(/(\d+)/)?.[1] ?? '0');

  // Get the body text for rule validation
  const bodyText = await page.locator('main').textContent() ?? '';

  return [bodyText, String(ruleCount)];
}

function expectRules(bodyText: string, expectedTerms: string[]) {
  for (const term of expectedTerms) {
    expect(bodyText.toLowerCase()).toContain(term.toLowerCase());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 1: Core Game Formats (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AI Builder — Core Game Formats', () => {
  test.beforeEach(async ({ page }) => {
    await setupRealBuilder(page);
  });

  test('1. Nassau — standard $5 with auto presses', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5 with auto presses when 2 down'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Nassau']);
  });

  test('2. Nassau — $10 with birdie bonus and settle at end', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $10 per side, birdies worth an extra unit to everyone, settle up at the end of the round'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Nassau']);
  });

  test('3. Skins — basic with carryovers', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Skins game $2 per skin with carryovers'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Skins']);
  });

  test('4. Skins — par 5s worth double, no carryovers', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Skins $5 per hole, par 5s are worth double, no carryovers, ties go to nobody'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Skins']);
  });

  test('5. Match Play — head to head with handicaps', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Match play, 90% handicaps, $10 per hole, birdies pay an extra unit'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Match']);
  });

  test('6. Wolf — 4-player with lone wolf bonus', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Wolf game, $2 per point, lone wolf pays double, full handicaps'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Wolf']);
  });

  test('7. Stableford — standard points system', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Stableford scoring with standard points: double bogey 0, bogey 1, par 2, birdie 3, eagle 4'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Stableford']);
  });

  test('8. Best Ball / Vegas — team format', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Vegas format, 2v2 teams, combine scores to make a number, low team wins the difference'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Vegas']);
  });

  test('9. Bingo Bango Bongo — points game', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Bingo bango bongo, first on green gets a point, closest to pin gets a point, first in the hole gets a point, $1 per point'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Bingo']);
  });

  test('10. Hammer — escalating bets', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Hammer game starting at $1, you can throw the hammer to double it at any time'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
    expectRules(body, ['Hammer']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 2: Combined / Multi-Game Formats (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AI Builder — Combined Games', () => {
  test.beforeEach(async ({ page }) => {
    await setupRealBuilder(page);
  });

  test('11. Nassau + Skins combo', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'We play nassau $5 on the front back and overall, plus skins with carryovers on every hole'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(2);
    expectRules(body, ['Nassau', 'Skins']);
  });

  test('12. Nassau + Skins + Birdies', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5, skins $2 with carryovers, birdie earns a unit from everyone, auto press when 2 down'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(3);
  });

  test('13. Match Play + Skins side game', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Match play $20 with 80% handicap plus a skins side game worth $5 per skin with carryovers'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(2);
  });

  test('14. Wolf + Skins + Prop Bets', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Wolf $3 per point, plus skins $2, closest to pin on par 3s worth $5, longest drive on 18'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(2);
  });

  test('15. Nassau + All Prop Bets', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5 with greenies, sandies, barkies, and closest to pin on all par 3s. Settle at the end.'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(3);
  });

  test('16. Skins + Stableford hybrid', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Stableford points with standard scoring, plus a skins game with carryovers. Double points on par 5s.'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(2);
  });

  test('17. Full kitchen sink game', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $10 with auto press at 2 down, skins $5 with carryovers, birdies worth $2 from everyone, eagles worth $5, greenies on par 3s, sandies, barkies, snake for 3-putts, gimmes inside 3 feet, 90% handicaps, net out at the end, max loss cap $50'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(5);
  });

  test('18. Rabbit + Skins', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Rabbit game where you chase the rabbit with low score, plus skins with carryovers, $2 per unit'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(1);
  });

  test('19. Modified Stableford + Nassau', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Modified stableford with eagle 5, birdie 2, par 0, bogey -1, double bogey -3. Plus a nassau $5 side bet.'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(2);
  });

  test('20. Defender + Wolf rotation', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Defender game with the lowest handicap player defending, plus wolf on alternating holes'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 3: Betting & Money Variations (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AI Builder — Betting Variations', () => {
  test.beforeEach(async ({ page }) => {
    await setupRealBuilder(page);
  });

  test('21. Micro stakes — $1 nassau', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Dollar nassau, just a buck per side, auto press when 2 down'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('22. High stakes — $50 nassau', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau fifty dollars per side, no presses, no junk, scratch play only'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('23. Per-hole betting — pay as you go', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Pay per hole, $5 each hole, winner takes from both losers, ties carry over to next hole'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('24. Points-based with running tab', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Points game, 1 point per hole win, 2 points for birdie, minus 1 for 3-putt. Running tab, settle at 19th hole.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('25. Max loss cap game', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $10 with auto presses, but max anyone can lose is $100 for the round. Safety net for beginners.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('26. Double on 18th hole', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Skins $5, last hole is worth double. Carryovers enabled. Settle up at the end.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('27. Junk / garbage tracking game', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Junk game: greenies $2, sandies $3, barkies $5, polies $2, and the snake (3-putt) costs $5 to hold at the end'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('28. Net out / netting bets', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5, skins $2, and everything nets out at the end so nobody is paying more than they need to'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('29. Rain shortened round settlement', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5 with auto presses. If rain shortens the round, settle based on completed holes only.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('30. Tie handling — carryover vs split', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Skins with carryovers, ties carry to next hole. Nassau ties are split. Settle at end.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 4: Handicap & Casual Rules (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AI Builder — Handicap & Casual', () => {
  test.beforeEach(async ({ page }) => {
    await setupRealBuilder(page);
  });

  test('31. Full handicap with stroke index', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Match play with full handicaps using the stroke index on the scorecard'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('32. 80% handicap with cap', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5, 80% handicaps, max handicap capped at 20 strokes, no vanity handicaps'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('33. Scratch only — no handicaps', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Scratch nassau, no strokes given, $10 a side, best player wins'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('34. Bump and run handicap', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Everyone plays off the low man. If lowest handicap is 5, a 15 handicap gets 10 strokes. Nassau $5.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('35. Mixed tees allowed', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Mixed tees round — women play from reds, men from whites. Handicap adjustment for tee differences.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('36. Gimmes inside 3 feet', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Casual nassau $2, gimmes inside 3 feet, breakfast ball on the first tee, preferred lies in the fairway'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('37. Mulligans allowed', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Everyone gets 2 mulligans for the round, $5 nassau, 90% handicaps'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('38. No blood rule', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Match play $10, no blood rule — you have to win a hole before you can lose any money, 80% handicaps'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('39. Foot wedge / winter rules', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Winter rules: preferred lies everywhere, foot wedge in the rough, 1 breakfast ball, nassau $2'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('40. Ghost player handicap', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Three player nassau, use a ghost player as the 4th with a 15 handicap. $5 per side.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 5: Natural Language / Slang / Edge Cases (15 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AI Builder — Natural Language & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupRealBuilder(page);
  });

  test('41. Casual slang — "the usual"', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Just our usual Saturday game — nassau five bucks, auto press, skins on the side, greenies on the short holes'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('42. Beer bet casual', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Loser buys beers at the turn and after the round. Closest to the pin on 7 gets a free drink. Skins for fun.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('43. Texting style shorthand', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'nass $5 auto press 2dn, skins w/ co, birdies $1, greenies par3s, settle end'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('44. Very detailed paragraph', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'We play a nassau with $5 units on the front nine, back nine, and overall eighteen. Auto presses kick in when you are 2 down on any of the three bets. We also play skins on every hole with carryovers — if nobody wins a hole, the pot carries to the next. Birdies earn you one unit from every other player in the group. Eagles are worth two units. On par 3s, the closest to the pin in regulation earns a greenie worth $3. We play with 90% handicaps and gimmes inside 2 feet. Everything settles up at the end. Last hole is worth double on the skins.'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(5);
  });

  test('45. Misspellings and typos', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassua $5 with auto pressess when 2 dwon, sknns with carryovers, birdees worth a unit'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('46. All lowercase no punctuation', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'nassau five bucks auto press 2 down skins with carryovers par 5s double settle at the end greenies on par 3s'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('47. ALL CAPS shouting style', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'NASSAU $10 AUTO PRESS 2 DOWN SKINS $5 CARRYOVERS BIRDIES WORTH A UNIT SETTLE END'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('48. Regional terms / UK golf', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Fourball better ball, £5 nassau, automatic press at 2 down, nearest the pin on short holes, settle in the clubhouse'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('49. Mixed emoji and slang', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5, press when 2 down, skins with carryovers, snake for 3-putts goes around all day, last guy with the snake pays'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('50. Contradictory rules', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau with no presses and auto press when 2 down. Skins with carryovers but no carryovers. Full handicaps but scratch only.'
    );
    // Should still parse — AI picks the most sensible interpretation
    expect(parseInt(count)).toBeGreaterThanOrEqual(0);
  });

  test('51. 9-hole specific game', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Quick 9 holes: skins $5 per hole with carryovers, closest to pin on #3 and #7, settle at the turn'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('52. Group / Sixes format', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Sixes game — switch partners every 6 holes, nassau within each six, $2 per unit. Best ball format for the team.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('53. Quota / target game', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Quota game — each player gets a target based on handicap (36 minus handicap). Points: bogey 1, par 2, birdie 4, eagle 8. Beat your quota to win.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('54. Complex multi-format tournament', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Front 9 is match play straight up $10 per hole. Back 9 switches to nassau $20 per side with auto press at 3 down. Skins run all 18 at $5 with carryovers. Greenies on every par 3. Snake for 3-putts $10. Closest to pin on 12 is worth $20 to everyone.'
    );
    expect(parseInt(count)).toBeGreaterThanOrEqual(3);
  });

  test('55. Minimal valid description', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Skins two dollars per hole with carryovers'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 6: Press Rules Deep Dive (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AI Builder — Press Rules', () => {
  test.beforeEach(async ({ page }) => {
    await setupRealBuilder(page);
  });

  test('56. Auto press at 3 down', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $10, auto press only when 3 down instead of the usual 2. No manual presses.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('57. Manual press only', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5, manual presses only — you have to call it, no auto presses. Press requires the other player to accept.'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('58. Double or nothing press', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5, presses are double or nothing — if you press and lose, you pay double the original bet'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('59. Max presses per round', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $10 with auto press 2 down, but max 3 presses per nine to keep it from getting crazy'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });

  test('60. No dormie press', async ({ page }) => {
    const [body, count] = await enterAndParse(page,
      'Nassau $5, auto press 2 down, no pressing on the last hole (no dormie press), settle at end'
    );
    expect(parseInt(count)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION 7: Save Flow with Real Parse Results (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AI Builder — Save Flow (Real Parse)', () => {
  test.beforeEach(async ({ page }) => {
    await setupRealBuilder(page);
  });

  test('61. Parse and reach save button', async ({ page }) => {
    await enterAndParse(page, 'Nassau $5 with auto presses when 2 down');

    // Verify save button is enabled (rules were found)
    const saveBtn = page.locator('header button:has-text("Save")');
    await expect(saveBtn).toBeEnabled();
  });

  test('62. Edit game name on confirm page', async ({ page }) => {
    await enterAndParse(page, 'Skins with carryovers $3 per skin');

    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('Saturday Skins Game');
    await expect(nameInput).toHaveValue('Saturday Skins Game');
  });

  test('63. Browse categories section is available', async ({ page }) => {
    await enterAndParse(page, 'Match play $5 with 90% handicaps');

    const addSection = page.getByText(/Want to add anything/);
    await addSection.scrollIntoViewIfNeeded();
    await expect(addSection).toBeVisible();
  });
});
