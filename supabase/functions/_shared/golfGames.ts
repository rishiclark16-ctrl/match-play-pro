/**
 * Grounding catalogue of golf games and bets, as friendly groups play them.
 *
 * One source of truth for three consumers:
 *  - the plan-round prompt (supabase/functions/_shared/planRoundPrompt.ts) builds its
 *    game glossary from it, so the model maps "low total" or "5-5-5" the way the app does;
 *  - the eval suite (evals/round-plan) checks every supported game end to end;
 *  - people reading it to learn what the app does and doesn't play.
 *
 * Pure data, no imports: it is loaded by Deno (edge functions) and by bun (app tests).
 *
 * Sources: Golf Compendium games dictionary (~370 entries), Golf.com, Golf Digest,
 * GolfLink, Golf News Net, USGA Rules (Rule 21–23 formats), MyGolfSpy, club game
 * sheets. Rules vary by group; each entry gives the common form and the usual options.
 *
 * support.status:
 *  - 'yes':     say-it-and-play sets it up directly (support.plan says how).
 *  - 'as':      set up as an equivalent supported game (support.plan + note say which).
 *  - 'builder': not from one sentence; the AI Game Builder (house games) handles it.
 *  - 'side':    a side bet / junk; added during the round from the scorecard.
 *  - 'no':      not supported yet. The planner must list it in `unsupported`.
 */

export type SupportStatus = 'yes' | 'as' | 'builder' | 'side' | 'no';

export interface GolfGame {
  id: string;
  name: string;
  /** How golfers say it on the tee. Lowercase-insensitive phrases. */
  aliases: string[];
  /** Player counts it works for, including the speaker. */
  players: string;
  teams: 'none' | 'fixed 2v2' | 'rotating' | '1 vs field' | 'shot-sharing pairs';
  /** How a hole (or the game) is decided. */
  rules: string;
  /** How the money moves, and what a quoted stake usually means. */
  money: string;
  options?: string[];
  support: { status: SupportStatus; plan?: string; note?: string };
}

export const GOLF_GAMES: GolfGame[] = [
  // ── Head to head and individual ──────────────────────────────────────────
  {
    id: 'match_singles',
    name: 'Match play (singles)',
    aliases: ['match', 'match play', 'singles', 'head to head', 'one on one', 'heads up'],
    players: '2', teams: 'none',
    rules: 'Lower (net) score wins the hole; the player who wins more holes wins the match ("2 up", "3 & 2").',
    money: 'A stake on the whole match: "$20 match" means the loser pays $20.',
    options: ['net or gross', 'presses'],
    support: { status: 'yes', plan: 'match' },
  },
  {
    id: 'per_hole_singles',
    name: 'Dollar a hole (1 v 1)',
    aliases: ['a buck a hole', '$5 a hole', 'per hole', 'dollar a hole', 'hole for hole'],
    players: '2', teams: 'none',
    rules: 'Every hole is its own bet; halved holes pay nothing.',
    money: 'The stake changes hands on every hole won.',
    support: { status: 'as', plan: 'skins (no carryover)', note: 'Between two players, skins without carryovers pays exactly a stake per hole won.' },
  },
  {
    id: 'skins',
    name: 'Skins',
    aliases: ['skins', 'skin game', 'a skin', 'per skin', 'carryovers', 'carry overs', 'ties carry', 'validated skins'],
    players: '2-8', teams: 'none',
    rules: 'The outright low (net) score wins the hole\'s skin. If two or more tie, nobody wins it.',
    money: 'Each skin is worth the stake from every other player ("$5 skins"). With carryovers a tied hole rolls into the next.',
    options: ['carryovers', 'validation (must par the next hole)', 'gross or net'],
    support: { status: 'yes', plan: 'skins', note: 'Validation is not modelled.' },
  },
  {
    id: 'nassau',
    name: 'Nassau',
    aliases: ['nassau', '5-5-5', '2-2-2', 'front back and total', 'front, back and overall', 'three way'],
    players: '2-8', teams: 'none',
    rules: 'Three bets: the front nine, the back nine and the 18, each scored as match play (or stroke play).',
    money: '"$5 Nassau" is $5 on each of the three bets, so up to $15. "5-5-10" puts $10 on the total (not modelled).',
    options: ['automatic presses ("press when 2 down")', 'manual presses', 'stroke-play nassau'],
    support: { status: 'yes', plan: 'nassau', note: 'One amount per side; unequal sides like 5-5-10 are not modelled.' },
  },
  {
    id: 'stroke_play_bet',
    name: 'Stroke play / medal bet',
    aliases: ['stroke play', 'medal', 'low net', 'low gross', 'total score', 'lowest score wins'],
    players: '2-8', teams: 'none',
    rules: 'Lowest total (net) score for the round wins.',
    money: 'Usually a pot or a fixed amount to the winner.',
    support: { status: 'no', note: 'Stroke play is scored, but a medal bet with money is not modelled.' },
  },
  {
    id: 'per_stroke',
    name: 'Dollar a stroke',
    aliases: ['a dollar a stroke', 'per stroke', 'by the stroke', 'stroke difference'],
    players: '2-4', teams: 'none',
    rules: 'At the end, the difference in total (net) score.',
    money: 'The stake times the stroke difference between each pair of players.',
    support: { status: 'no' },
  },
  {
    id: 'stableford',
    name: 'Stableford',
    aliases: ['stableford', 'points', 'stableford points'],
    players: '1-8', teams: 'none',
    rules: 'Points per hole from net score vs par: double bogey 0, bogey 1, par 2, birdie 3, eagle 4, albatross 5. Most points wins.',
    money: 'Usually a pot or per point difference.',
    options: ['modified Stableford (pros\' table: eagle 5, birdie 2, par 0, bogey −1, double −3)'],
    support: { status: 'yes', plan: 'stableford', note: 'Scored without money.' },
  },
  {
    id: 'quota',
    name: 'Quota (Chicago)',
    aliases: ['quota', 'chicago', 'the quota game', 'points quota'],
    players: '1-8', teams: 'none',
    rules: 'Each player\'s quota is 36 minus handicap. Points: bogey 1, par 2, birdie 4, eagle 8. Beat your quota by the most.',
    money: 'Paid on points over or under quota, or a pot.',
    support: { status: 'builder', note: 'Quota is in the AI Game Builder.' },
  },
  {
    id: 'let_it_ride',
    name: 'Let It Ride',
    aliases: ['let it ride'],
    players: '2-4', teams: 'none',
    rules: 'Net points (bogey 5, par 15, birdie 30, eagle 50) ride until banked; a net double bogey loses riding points.',
    money: 'Per point at the end.',
    support: { status: 'no' },
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    aliases: ['rabbit', 'the rabbit', 'catch the rabbit', 'pull the rabbit'],
    players: '3-8', teams: 'none',
    rules: 'Win a hole outright to catch the rabbit; it is set free when someone else wins a hole. Whoever holds it at 9 and 18 wins.',
    money: 'A stake per nine to the holder.',
    support: { status: 'builder' },
  },
  {
    id: 'snake',
    name: 'Snake',
    aliases: ['snake', 'the snake', 'three-putt snake'],
    players: '2-8', teams: 'none',
    rules: 'The last player to three-putt holds the snake at the end.',
    money: 'The holder pays everyone (often a growing amount).',
    support: { status: 'side', note: 'Snake is a side bet on the scorecard.' },
  },
  {
    id: 'bingo_bango_bongo',
    name: 'Bingo Bango Bongo',
    aliases: ['bingo bango bongo', 'bbb', 'bingle bangle bungle'],
    players: '2-8', teams: 'none',
    rules: 'Three points a hole: first on the green (bingo), closest once all are on (bango), first in the hole (bongo).',
    money: 'Per point difference.',
    support: { status: 'builder' },
  },
  {
    id: 'hammer',
    name: 'Hammer',
    aliases: ['hammer', 'the hammer', 'hammers'],
    players: '2-4', teams: 'fixed 2v2',
    rules: 'A side may "hammer" mid-hole to double the hole\'s value; the other side accepts or concedes the hole at its current value.',
    money: 'Per hole, doubling with each accepted hammer.',
    support: { status: 'builder' },
  },
  {
    id: 'trouble',
    name: 'Trouble',
    aliases: ['trouble'],
    players: '2-8', teams: 'none',
    rules: 'Points against you for trouble: water, bunker, out of bounds, three-putt, lost ball. Fewest points wins.',
    money: 'Per point.',
    support: { status: 'no' },
  },
  {
    id: 'murphy',
    name: 'Murphy',
    aliases: ['murphy', 'murphies'],
    players: '2-8', teams: 'none',
    rules: 'Off the green, a player calls "Murphy": up and down to win it, fail and pay it.',
    money: 'Stake per Murphy won or lost.',
    support: { status: 'no' },
  },

  // ── Threesome games ─────────────────────────────────────────────────────
  {
    id: 'nines',
    name: 'Nines (5-3-1)',
    aliases: ['nines', '5-3-1', 'five three one', 'nine points', '9 points', 'nine point game'],
    players: '3', teams: 'none',
    rules: 'Nine points a hole: low score 5, second 3, high 1. Ties split the points (two tied low: 4-4-1; all tied: 3-3-3).',
    money: 'Per point difference at the end.',
    support: { status: 'yes', plan: 'nines' },
  },
  {
    id: 'split_sixes',
    name: 'Split Sixes',
    aliases: ['split sixes', '4-2-0', 'six point game for three'],
    players: '3', teams: 'none',
    rules: 'Six points a hole: 4-2-0 by finish; ties split (3-3-0, 4-1-1, 2-2-2).',
    money: 'Per point difference.',
    support: { status: 'no', note: 'Close to Nines with a different table.' },
  },
  {
    id: 'acey_deucey',
    name: 'Acey Deucey (Aces and Deuces)',
    aliases: ['acey deucey', 'acey ducey', 'aces and deuces'],
    players: '4', teams: 'none',
    rules: 'Each hole: the outright low score (ace) collects from everyone; the outright high score (deuce) pays everyone.',
    money: 'Two stakes per hole, one for the ace and one for the deuce.',
    support: { status: 'no' },
  },
  {
    id: 'wolf',
    name: 'Wolf',
    aliases: ['wolf', 'lone wolf', 'blind wolf', 'pig', 'wolf hammer'],
    players: '3-4', teams: 'rotating',
    rules: 'A rotating wolf picks a partner after watching drives, or goes alone (lone wolf) for double, or calls blind wolf before anyone hits for triple. Best ball decides the hole.',
    money: 'Per point; lone wolf doubles.',
    options: ['blind wolf', 'last-place wolf on 17-18', 'carryovers on ties'],
    support: { status: 'yes', plan: 'wolf' },
  },
  {
    id: 'wolfman',
    name: 'Wolfman',
    aliases: ['wolfman'],
    players: '3', teams: '1 vs field',
    rules: 'Middle drive is the Wolfman; the other two add their scores against the Wolfman\'s score doubled.',
    money: 'Hunters win or lose a unit, the Wolfman two.',
    support: { status: 'no' },
  },
  {
    id: 'defender',
    name: 'Defender',
    aliases: ['defender', 'the defender', 'one against the field'],
    players: '3-4', teams: '1 vs field',
    rules: 'A rotating defender plays the other players\' best ball each hole.',
    money: 'Defender wins or loses a unit against each opponent.',
    support: { status: 'yes', plan: 'defender' },
  },
  {
    id: 'banker',
    name: 'Banker',
    aliases: ['banker', 'the banker', 'bank'],
    players: '3-5', teams: '1 vs field',
    rules: 'A rotating banker takes on each other player head to head; each player sets their own bet on the hole.',
    money: 'Player-chosen bets, doubled by birdies.',
    support: { status: 'no' },
  },
  {
    id: 'lone_ranger',
    name: 'Lone Ranger (Yellow Ball, Money Ball, Devil Ball)',
    aliases: ['lone ranger', 'yellow ball', 'money ball', 'devil ball', 'pink ball'],
    players: '4', teams: 'rotating',
    rules: 'One player a hole is the Lone Ranger; their score plus the best of the other three make the team score for that hole.',
    money: 'Usually a team-event format; in a foursome, per hole or a pot.',
    support: { status: 'no' },
  },

  // ── Two-man team (2 v 2) games ──────────────────────────────────────────
  {
    id: 'fourball_match',
    name: 'Four-ball / best ball match',
    aliases: ['best ball', 'better ball', 'four ball', 'fourball', 'best ball match', 'team match', 'two-man best ball', 'low ball'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Everyone plays their own ball; the team\'s better (net) score on each hole is compared, as match play.',
    money: 'A stake per man on the match ("$20 a man"), or per hole up.',
    options: ['per hole up', 'presses', 'net or gross'],
    support: { status: 'yes', plan: 'match with teams, teamScoring "best"' },
  },
  {
    id: 'low_total',
    name: 'Low total (aggregate team match)',
    aliases: ['low total', 'team total', 'combined score', 'combined', 'add our scores', 'add both scores', 'aggregate', 'four-ball aggregate', 'two-man aggregate', 'total of both'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Both partners\' (net) scores are added; the lower combined score wins the hole.',
    money: 'Per hole up ("$5 a hole") or a stake on the match.',
    support: { status: 'yes', plan: 'match with teams, teamScoring "aggregate"' },
  },
  {
    id: 'low_ball_low_total',
    name: 'Low ball, low total (two-point game)',
    aliases: ['low ball low total', 'low ball and low total', 'best ball and total', 'two point game', '2 point game', 'low ball/low total'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Two points a hole: one for the team with the low ball, one for the team with the low combined total. A tied point is halved (or carried, by agreement).',
    money: 'Per point up at the end, or a stake on the match.',
    options: ['carried ties', 'birdies double'],
    support: { status: 'yes', plan: 'match with teams, teamScoring "best_and_aggregate"', note: 'Tied points are halved; carrying them is not modelled.' },
  },
  {
    id: 'high_low',
    name: 'High-low (low ball, high ball)',
    aliases: ['high low', 'high-low', 'low ball high ball', 'low ball/high ball'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Two points a hole: low ball vs low ball, and high ball vs high ball (the partners\' worse scores).',
    money: 'Per point.',
    support: { status: 'no', note: 'Close to low ball, low total, but compares the worse balls instead of the totals.' },
  },
  {
    id: 'scotch',
    name: 'Scotch (4, 5 or 6 point)',
    aliases: ['scotch', 'six point scotch', '6 point scotch', 'five point scotch', 'umbrella', '4 point game', 'four point game'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Points a hole for low ball, low total, closest to the pin, birdies and the like; sweeping them all (an umbrella) doubles.',
    money: 'Per point.',
    support: { status: 'no', note: 'Low ball + low total is supported; the extra Scotch points are not.' },
  },
  {
    id: 'vegas',
    name: 'Vegas (Las Vegas)',
    aliases: ['vegas', 'las vegas'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Each team\'s two scores make a two-digit number, low score first (4 and 5 make 45). A score of 10+ goes first. A birdie flips the other team\'s number high-first.',
    money: 'Per point of the difference between the numbers (45 vs 47 is 2 points).',
    options: ['birdie flip', 'eagle doubles', 'carryovers'],
    support: { status: 'yes', plan: 'vegas' },
  },
  {
    id: 'daytona',
    name: 'Daytona',
    aliases: ['daytona'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Like Vegas, but when a team makes par or better the low digit leads, and when it makes bogey or worse the high digit leads.',
    money: 'Per point.',
    support: { status: 'no', note: 'Vegas is supported; Daytona\'s bogey flip is not.' },
  },
  {
    id: 'sixes',
    name: 'Sixes (Round Robin, Hollywood)',
    aliases: ['sixes', 'round robin', 'hollywood', '6-6-6', 'six six six', 'switch partners every six'],
    players: '4', teams: 'rotating',
    rules: 'Three six-hole matches with new partners each time, so everyone partners everyone. Best ball decides each hole.',
    money: 'A stake on each six-hole match (or per point).',
    support: { status: 'yes', plan: 'sixes' },
  },
  {
    id: 'bestball_stroke',
    name: 'Better-ball stroke play',
    aliases: ['best ball stroke play', 'team best ball total', 'better ball medal'],
    players: '2-8', teams: 'fixed 2v2',
    rules: 'The team\'s better score each hole is added up over the round; lowest total wins.',
    money: 'Usually a pot.',
    support: { status: 'yes', plan: 'bestball', note: 'Scored as a team stroke game without money. With a stake and four players the app plays a best-ball match.' },
  },
  {
    id: 'scramble',
    name: 'Scramble (Texas, Florida, Ambrose)',
    aliases: ['scramble', 'texas scramble', 'florida scramble', 'ambrose', 'captain\'s choice', 'two-man scramble'],
    players: '2-8', teams: 'shot-sharing pairs',
    rules: 'Everyone hits, the team picks the best shot and all play from there. One team score per hole.',
    money: 'Usually a pot or team match.',
    support: { status: 'no', note: 'Team shot formats need one score per team, which the scorecard does not have yet.' },
  },
  {
    id: 'shamble',
    name: 'Shamble',
    aliases: ['shamble', 'bramble'],
    players: '2-8', teams: 'shot-sharing pairs',
    rules: 'Best drive, then everyone plays their own ball in; best ball (or two) counts.',
    money: 'Usually a pot.',
    support: { status: 'no' },
  },
  {
    id: 'alternate_shot',
    name: 'Alternate shot (foursomes)',
    aliases: ['alternate shot', 'foursomes', 'scotch foursomes'],
    players: '4', teams: 'shot-sharing pairs',
    rules: 'Partners hit one ball, taking turns; they alternate tee shots.',
    money: 'Match or a pot.',
    support: { status: 'no' },
  },
  {
    id: 'greensomes',
    name: 'Greensomes / Chapman (Pinehurst)',
    aliases: ['greensomes', 'chapman', 'pinehurst', 'american foursomes', 'canadian foursomes', 'gruesomes', 'bloodsome'],
    players: '4', teams: 'shot-sharing pairs',
    rules: 'Both drive; the team picks one drive (Chapman: switch balls for the second shot first), then alternate shot.',
    money: 'Match or a pot.',
    support: { status: 'no' },
  },
  {
    id: 'patsome',
    name: 'Patsome (Ryder Cup format)',
    aliases: ['patsome', 'ryder cup format', 'ryder cup'],
    players: '4', teams: 'fixed 2v2',
    rules: 'Six holes four-ball, six greensomes, six alternate shot.',
    money: 'Match.',
    support: { status: 'no' },
  },

  // ── Presses and multipliers (options on other games) ─────────────────────
  {
    id: 'auto_press',
    name: 'Automatic press',
    aliases: ['auto press', 'automatic press', 'press when two down', '2 down auto', 'presses'],
    players: '2-8', teams: 'none',
    rules: 'A new bet starts automatically when a side goes 2 down in the nine.',
    money: 'Each press is worth the original stake.',
    support: { status: 'yes', plan: 'nassau autoPress' },
  },
  {
    id: 'custom_press',
    name: 'Other press rules',
    aliases: ['press when one down', 'presses on presses', 'manual press', 'birdie press', 'double press', 'roll the press'],
    players: '2-8', teams: 'none',
    rules: 'Variations on when a press starts and what it is worth.',
    money: 'Varies.',
    support: { status: 'builder' },
  },

  // ── Side bets ("junk", "trash", "dots", "garbage") ──────────────────────
  {
    id: 'junk',
    name: 'Junk / trash / dots / garbage',
    aliases: ['junk', 'trash', 'dots', 'garbage', 'garbage points'],
    players: '2-8', teams: 'none',
    rules: 'A bundle of side bets (greenies, sandies, barkies, birdies...) each worth a dot.',
    money: 'Per dot, settled at the end.',
    support: { status: 'side' },
  },
  { id: 'greenie', name: 'Greenie', aliases: ['greenie', 'greenies'], players: '2-8', teams: 'none',
    rules: 'On a par 3, closest to the pin on the green in one, and makes par or better.', money: 'A dot.', support: { status: 'side' } },
  { id: 'ctp', name: 'Closest to the pin', aliases: ['closest to the pin', 'ctp', 'kp', 'closest'], players: '2-8', teams: 'none',
    rules: 'Closest tee shot on a par 3.', money: 'A dot or a fixed amount.', support: { status: 'side' } },
  { id: 'long_drive', name: 'Long drive', aliases: ['long drive', 'longest drive'], players: '2-8', teams: 'none',
    rules: 'Longest drive in the fairway on a chosen hole.', money: 'A fixed amount.', support: { status: 'side' } },
  { id: 'sandie', name: 'Sandie', aliases: ['sandie', 'sandy', 'sandies'], players: '2-8', teams: 'none',
    rules: 'Par or better after being in a bunker on the hole.', money: 'A dot.', support: { status: 'side' } },
  { id: 'barkie', name: 'Barkie', aliases: ['barkie', 'barkies', 'woodie'], players: '2-8', teams: 'none',
    rules: 'Par or better after hitting a tree.', money: 'A dot.', support: { status: 'side' } },
  { id: 'arnie', name: 'Arnie', aliases: ['arnie', 'arnies', 'seve'], players: '2-8', teams: 'none',
    rules: 'Par or better on a par 4 or 5 without ever being in the fairway.', money: 'A dot.', support: { status: 'side' } },
  { id: 'polie', name: 'Polie', aliases: ['polie', 'polies', 'poley'], players: '2-8', teams: 'none',
    rules: 'Holing a putt longer than the flagstick.', money: 'A dot.', support: { status: 'side' } },
  { id: 'chippie', name: 'Chippie', aliases: ['chippie', 'chippy', 'chip in'], players: '2-8', teams: 'none',
    rules: 'Chip in from off the green (some groups require par).', money: 'A dot.', support: { status: 'side' } },
  { id: 'ferret', name: 'Ferret', aliases: ['ferret', 'golden ferret'], players: '2-8', teams: 'none',
    rules: 'Hole out from off the green; a golden ferret is from a bunker.', money: 'A dot.', support: { status: 'side' } },
  { id: 'hogan', name: 'Hogan', aliases: ['hogan', 'hogans'], players: '2-8', teams: 'none',
    rules: 'Fairway, green in regulation and par or better.', money: 'A dot.', support: { status: 'no' } },
  { id: 'fishie', name: 'Fishie', aliases: ['fishie', 'fishies', 'splashie', 'froggy'], players: '2-8', teams: 'none',
    rules: 'Par or better after hitting into water.', money: 'A dot.', support: { status: 'no' } },
  { id: 'oozle', name: 'Oozle', aliases: ['oozle', 'oozles'], players: '2-8', teams: 'none',
    rules: 'Varies by group, often closest to the pin in regulation who then makes par.', money: 'A dot.', support: { status: 'side', note: 'Agree the meaning first.' } },
  { id: 'birdie_bonus', name: 'Birdies / eagles pay', aliases: ['birdies pay', 'birdie bonus', 'eagles pay double', 'birdies double'],
    players: '2-8', teams: 'none', rules: 'A birdie (or eagle) earns a bonus from each player.', money: 'A unit per birdie, more for eagles.',
    support: { status: 'builder' } },
];

/** Games say-it-and-play can set up, directly or as an equivalent. */
export const PLAYABLE_GAMES = GOLF_GAMES.filter(g => g.support.status === 'yes' || g.support.status === 'as');
/** Games the planner should recognise and report as not set up. */
export const KNOWN_UNPLAYABLE = GOLF_GAMES.filter(g => g.support.status !== 'yes' && g.support.status !== 'as');
