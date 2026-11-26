/**
 * Deterministic parser for spoken round setups.
 *
 * Two jobs:
 *  1. Fallback when the AI planner is unreachable (no signal on the first tee).
 *     It handles the common shapes: "<course> from the <tee> with A, B and C,
 *     skins $5 a hole and a $10 nassau".
 *  2. A second opinion on money: `amountsSaid()` lists every dollar figure in the
 *     sentence, so an amount the AI returns that the golfer never said can be
 *     caught before anyone plays for it.
 */
import type { PlanGame, PlanGameType, RoundPlan } from './types';
import { KNOWN_UNPLAYABLE } from '../../../supabase/functions/_shared/golfGames';

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, a: 1, an: 1,
};
const NUMBER_WORD_RE = Object.keys(NUMBER_WORDS).filter(w => w !== 'a' && w !== 'an').join('|');

/** "twenty five" -> 25, "5" -> 5, "a hundred" -> 100. */
export function wordsToNumber(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/[$,]/g, '');
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const parts = t.split(/[\s-]+/).filter(Boolean);
  if (!parts.length || parts.some(p => !(p in NUMBER_WORDS))) return null;
  let total = 0;
  let current = 0;
  for (const p of parts) {
    const v = NUMBER_WORDS[p];
    if (v === 100) current = (current || 1) * 100;
    else current += v;
  }
  total += current;
  return total;
}

const GAME_PATTERNS: [PlanGameType, RegExp][] = [
  ['skins', /\bskins?\b/i],
  ['nassau', /\bnassau\b|\b(\d+)\s*-\s*\1\s*-\s*\1\b/i],
  // A team game named by its scoring is a match: "low total", "add our scores", "low ball, low total".
  ['match', /\bmatch(?:\s*play)?\b|\blow[\s-]*total\b|\bteam total\b|\baggregate\b|\bcombined (?:score|total)s?\b|\badd (?:our|both|the|their) (?:two )?scores\b|\blower total\b/i],
  ['stableford', /\bstableford\b/i],
  ['bestball', /\b(?:best|better|four)[\s-]?ball\b/i],
  ['wolf', /\bwolf\b/i],
  ['vegas', /\bvegas\b/i],
  ['nines', /\bnines\b|\b5\s*-\s*3\s*-\s*1\b|\bfive three one\b/i],
  ['defender', /\bdefender\b/i],
  ['sixes', /\bsixes\b|\bround robin\b|\bhollywood\b/i],
];

const MONEY_RE = new RegExp(
  String.raw`\$\s?(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?|(?:${NUMBER_WORD_RE})(?:[\s-](?:${NUMBER_WORD_RE}))*)\s*(?:dollars?|bucks?|bones|clams|a (?:hole|skin|side|point|man)|per (?:hole|skin|side|point|man))`,
  'gi',
);

interface Amount { value: number; index: number }

/** Amounts golfers say without a number: "a buck a hole", "a quarter a point", "fifty cents". */
const SPOKEN_AMOUNTS: [RegExp, (m: RegExpExecArray) => number][] = [
  [/\b(?:a|one)\s+(?:buck|dollar|bone|clam)\b/gi, () => 1],
  [/\b(?:a|one)\s+quarter\b|\btwenty[\s-]five cents\b|\b25 cents\b/gi, () => 0.25],
  [/\bhalf a (?:buck|dollar)\b|\bfifty cents\b|\b50 cents\b/gi, () => 0.5],
  [/\b(\d{1,2})\s*cents\b/gi, m => Number(m[1]) / 100],
];

/** Every dollar amount said, with its position. "5-5-5" counts as one amount of 5. */
export function amountsSaid(text: string): Amount[] {
  const out: Amount[] = [];
  for (const [re, value] of SPOKEN_AMOUNTS) {
    re.lastIndex = 0;
    let sm: RegExpExecArray | null;
    while ((sm = re.exec(text))) {
      const at = sm.index;
      if (!out.some(o => Math.abs(o.index - at) < 3)) out.push({ value: value(sm), index: at });
    }
  }
  const dash = /\b(\d+)\s*-\s*\1\s*-\s*\1\b/g;
  let m: RegExpExecArray | null;
  while ((m = dash.exec(text))) out.push({ value: Number(m[1]), index: m.index });
  MONEY_RE.lastIndex = 0;
  const forN = new RegExp(String.raw`\b(?:for|at)\s+(\d+(?:\.\d{1,2})?|(?:${NUMBER_WORD_RE})(?:[\s-](?:${NUMBER_WORD_RE}))*)\b(?!\s*(?:holes?|players?|people|guys|of us|o'?clock|am|pm|percent|%))`, 'gi');
  while ((m = forN.exec(text))) {
    const v = wordsToNumber(m[1]);
    const at = m.index;
    if (v != null && v > 0 && !/^\s*cents\b/i.test(text.slice(at + m[0].length)) && !out.some(o => Math.abs(o.index - at) < 6)) out.push({ value: v, index: at });
  }
  while ((m = MONEY_RE.exec(text))) {
    const raw = m[1] ?? m[2];
    const v = raw != null ? wordsToNumber(raw) : null;
    if (v != null && v > 0 && !out.some(o => Math.abs(o.index - m!.index) < 3)) out.push({ value: v, index: m.index });
  }
  return out.sort((a, b) => a.index - b.index);
}

const STOP_WORDS_AFTER_COURSE = /\s+(?:from|off|with|and we|we're|were|today|this|tomorrow|at \d|for|playing|on the|using|teeing|front|back|just)\b|\s+(?:\d+|nine|eighteen)\s+holes?\b|[,.;!?]/i;

function extractCourse(text: string): string | null {
  const m =
    /(?<!match\s)\b(?:playing|play|at|heading to|going to|out at|round at)\s+(?:at\s+)?(?:the\s+)?(.+)/i.exec(text) ??
    // A sentence that starts with the course: "Pebble Beach with Mike", "Sonoma from the blues".
    /^(?:the\s+)?(.+?)\s+(?:from|off|with)\s+/i.exec(text);
  if (!m) return null;
  let rest = m[1];
  const stop = STOP_WORDS_AFTER_COURSE.exec(rest);
  if (stop) rest = rest.slice(0, stop.index);
  rest = rest.replace(/\b(?:golf\s+)?today\b/i, '').trim();
  // "playing skins" is a game, not a course.
  if (!rest || GAME_PATTERNS.some(([, re]) => re.test(rest)) || /^\d+\s*holes?$/i.test(rest)) return null;
  return rest.split(/\s+/).length <= 8 ? rest : null;
}

function extractTee(text: string): string | null {
  const m = /\b(?:from|off)\s+the\s+([a-z0-9/]+)(?:\s+tees?)?\b/i.exec(text) ?? /\b([a-z0-9/]+)\s+tees\b/i.exec(text);
  if (!m) return null;
  const word = m[1].toLowerCase();
  if (['front', 'back'].includes(word) && /\bnine\b/i.test(text.slice(m.index, m.index + 20))) return null;
  return m[1];
}

function extractHoles(text: string): { holes: 9 | 18 | null; nine: 'front' | 'back' | null } {
  if (/\bback\s+(?:nine|9)\b/i.test(text)) return { holes: 9, nine: 'back' };
  if (/\bfront\s+(?:nine|9)\b/i.test(text)) return { holes: 9, nine: 'front' };
  if (/\b(?:nine|9)\s+holes?\b|\bjust nine\b|\bplaying nine\b/i.test(text)) return { holes: 9, nine: null };
  if (/\b(?:eighteen|18)(?:\s+holes?)?\b/i.test(text)) return { holes: 18, nine: null };
  return { holes: null, nine: null };
}

const SELF = /^(?:me|myself|i)$/i;

const NOT_A_NAME = /^(?:i'?m|im|we|we're|were|us|guys|the|a|an|my|our|it's|its|just|also|then|play|playing|plus|vs|versus|against|v|no|money|today|dollars?|bucks?|quarter|cents|points?|holes?|format|cup)$/i;

function splitNames(list: string): string[] {
  const items = list
    .split(/\s*(?:,|\band\b|&|\bplus\b)\s*/i)
    .map(s => s.replace(/^(?:with|my (?:buddy|buddies|friend|friends|boy|boys|brother|dad|son))\s+/i, '').trim())
    .filter(s => s && !SELF.test(s) && s.split(/\s+/).length <= 3 && !/\d/.test(s));
  // Speech-to-text drops commas: "jack jim and tim". A multi-word item is a run of
  // first names, not one full name, when another item is a single name, when it has
  // three words, or when the list is all lowercase (dictated, not typed).
  const run = items.some(i => !i.includes(' ')) || items.some(i => i.split(/\s+/).length >= 3) || list === list.toLowerCase();
  const words = run ? items.flatMap(i => i.split(/\s+/)) : items;
  return words.filter(w => !SELF.test(w) && !NOT_A_NAME.test(w));
}

const GAME_WORDS = /\b(?:skins?|nassau|match|stableford|ball|wolf|vegas|nines|defender|sixes|round robin|hollywood|total|aggregate|press(?:es)?|carry\s*overs?|point|hole|side|man|bucks?|dollars?|handicaps?|stroke|play|low|high|team|teams|combined|scores?|quarter|cents|game|wins?)\b/i;

/** A clause that is only names ("me Jim and Tim", "Jack Jim and Tim"). */
function namesOnly(clause: string): string[] | null {
  const c = clause.trim();
  if (!c || GAME_WORDS.test(c) || /\d|\$/.test(c) || /\b(?:vs\.?|versus|against|v)\b/i.test(c)) return null;
  if (!/\band\b|&|\s/.test(c)) return null;
  const names = splitNames(c);
  return names.length ? names : null;
}

/** People named without "with": "me jack and tim", "playing Jack", "against Jim", "Me and Jack, ...". */
function extractPlayersLoose(text: string): string[] {
  const clauses = text.split(/[,.;!?]/);
  for (const clause of clauses) {
    const c = clause.trim();
    const lead = /^(?:it's\s+)?(?:me|myself)\s+(?:and\s+)?(.+)$/i.exec(c);
    if (lead && !/\b(?:vs\.?|versus|against|v)\b/i.test(c) && !GAME_WORDS.test(lead[1]) && !/\d|\$/.test(lead[1])) {
      const n = splitNames(lead[1]);
      if (n.length) return n;
    }
  }
  // "Jack's an 8": a player named with their handicap.
  const withHcp = [...text.matchAll(/\b([A-Za-z]+)'s an? \d{1,2}\b/g)].map(m => m[1]).filter(n => !/^(?:it|that|he|she)$/i.test(n));
  if (withHcp.length) return withHcp;
  // A leading list of names: "Mikey and JT, $5 skins".
  const first = /\band\b|&/i.test(clauses[0] ?? '') ? namesOnly(clauses[0]) : null;
  if (first && first.length >= 2) return first;
  const single = /\b(?:playing|against|versus|vs\.?)\s+([a-z]+)(?=\s*(?:[,.;]|$|\s+(?:for|straight|full|no|with|at|in|\$|\d)))/i.exec(text);
  if (single && !GAME_WORDS.test(single[1]) && !NOT_A_NAME.test(single[1]) && !/\b(?:vs\.?|versus|against|v)\b.*\band\b/i.test(text)) return [single[1]];
  // A trailing list of names: "wolf for a buck and skins for two, Jack Jim and Tim".
  const last = clauses[clauses.length - 1] || clauses[clauses.length - 2] || '';
  const trailing = namesOnly(last);
  return trailing && trailing.length >= 2 ? trailing : [];
}

function extractPlayers(text: string): string[] {
  // The first "with" that introduces people, not "with carryovers" / "with auto presses".
  // (Each "with" is checked separately: the regex is not global so overlapping tails are all seen.)
  const withs = [...text.matchAll(/\bwith\s+/gi)]
    .map(w => text.slice(w.index! + w[0].length))
    .filter(rest => !/^(?:carry|auto|press|presses|handicap|strokes|no\b|full\b|the\b|a\b|an\b|\$|\d)/i.test(rest));
  if (!withs.length) return [];
  let list = withs[0];
  // Stop at the first game, money or round detail.
  const stops = [
    ...GAME_PATTERNS.map(([, re]) => re),
    /\b(?:we(?:'re| are)?|playing|for|from|off|at|on|front|back|no|full|gross|net|just)\b/i,
    /\b(?:handicaps?|holes?|nine|eighteen|carry\s*overs?|presses)\b/i,
    /\b(?:birdies?|eagles?|greenies?|sandies?|barkies?|arnies?|polies?|chipp(?:y|ie|ies)|ferrets?|hogans?|fishies?|oozles?|junk|dots|trash|garbage|snake|pays?|double|closest|long drive)\b/i,
    /[.;!?]/,
    /\$|\b\d/,
  ];
  let cut = list.length;
  for (const re of stops) {
    const s = re.exec(list);
    if (s && s.index < cut) cut = s.index;
  }
  list = list.slice(0, cut);
  return splitNames(list);
}

function extractTeams(text: string): [string[], string[]] | null {
  const m = /([a-z][a-z\s,&]*?)\s+(?:vs\.?|versus|against|v)\s+([a-z][a-z\s,&]*?)(?=[,.;!?]|$|\s+(?:for|in|at|playing|\$|\d))/i.exec(text);
  if (!m) return null;
  const side = (s: string) =>
    s
      .replace(/^.*\b(?:it's|its|teams?(?: are)?|partners?|playing|play|match|ball)\s+/i, '')
      .split(/\s*(?:,|\band\b|&|\bplus\b)\s*/i)
      .map(x => x.trim())
      .filter(Boolean);
  // Side A starts after the last comma: "low total, me and Tim vs ..." -> "me and Tim".
  const lastClause = m[1].split(/[,.;]/).pop() ?? m[1];
  const a = side(lastClause).filter(n => !GAME_WORDS.test(n)).slice(-2);
  const b = side(m[2]);
  return a.length && b.length ? [a, b] : null;
}

/** How the speaker said a team's hole score is formed, if they did. */
function teamScoringSaid(text: string): PlanGame['teamScoring'] {
  if (/\blow[\s-]*ball\W+(?:and\s+|&\s+)?low[\s-]*total\b|\btwo[\s-]point game\b|\b2[\s-]point game\b/i.test(text)) return 'best_and_aggregate';
  if (/\blow[\s-]*total\b|\bteam total\b|\baggregate\b|\bcombined\b|\badd (?:our|both|the|their) (?:two )?scores\b|\blower total\b/i.test(text)) return 'aggregate';
  if (/\b(?:best|better|four|low)[\s-]?ball\b/i.test(text)) return 'best';
  return null;
}

function extractGames(text: string, amounts: Amount[]): PlanGame[] {
  const found: { type: PlanGameType; index: number }[] = [];
  for (const [type, re] of GAME_PATTERNS) {
    const m = re.exec(text);
    if (m) found.push({ type, index: m.index });
  }
  if (!found.length) {
    const perHole = /\b(?:a|per|each) hole\b/i.exec(text);
    if (perHole && amounts.length) found.push({ type: 'match', index: perHole.index });
  }
  const match = found.find(f => f.type === 'match');
  const ball = found.findIndex(f => f.type === 'bestball');
  if (match && ball >= 0) {
    match.index = Math.min(match.index, found[ball].index);
    found.splice(ball, 1);
  }
  found.sort((a, b) => a.index - b.index);
  const used = new Set<number>();
  const teams = extractTeams(text);
  const sharedStake = new Map<number, number | null>();

  return found.map(({ type, index }) => {
    // The amount that belongs to a game is the nearest one in the same clause.
    const clauseStart = Math.max(text.lastIndexOf(',', index), text.lastIndexOf(';', index), text.lastIndexOf('.', index), 0);
    const nextGame = found.find(f => f.index > index)?.index ?? text.length;
    let best: Amount | null = null;
    for (const a of amounts) {
      if (used.has(a.index) || a.index < clauseStart || a.index >= nextGame) continue;
      if (!best || Math.abs(a.index - index) < Math.abs(best.index - index)) best = a;
    }
    if (best) used.add(best.index);
    const prev = found[found.indexOf(found.find(f => f.index === index)!) - 1];
    let shared: number | null = null;
    if (!best && prev) {
      const between = text.slice(prev.index, index);
      if (/^\S+(?:\s+\S+)?\s+(?:and|&)\s+$/i.test(between)) shared = sharedStake.get(prev.index) ?? null;
    }
    const near = text.slice(Math.max(0, index - 40), Math.min(text.length, index + 60));
    const perHoleRe = /\b(?:a|per|each) (?:hole|point)\b/i;
    sharedStake.set(index, best?.value ?? shared);
    return {
      type,
      stake: best?.value ?? shared,
      carryover: /\bno carry/i.test(near) ? false : /carry\s*-?\s*overs?|carries|carrying|ties carry/i.test(near) ? true : null,
      autoPress: type !== 'nassau' ? null
        : /\bno (?:auto[\s-]?)?press/i.test(text) ? false
        : /\b(?:auto[\s-]?press|press(?:es)?|presses at|press when)\b/i.test(text) ? true : null,
      modified: type === 'stableford' && /\bmodified\b/i.test(text) ? true : null,
      teams: type === 'match' || type === 'bestball' || type === 'vegas' ? teams : null,
      teamScoring: type === 'match' ? teamScoringSaid(text) : null,
      perHole: type === 'match' ? (perHoleRe.test(near) || (found.length === 1 && perHoleRe.test(text)) ? true : null) : null,
    };
  });
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Games and bets from the catalogue that the app doesn't set up from a sentence.
 * Offline, the golfer still hears "Rabbit wasn't set up" instead of silence.
 * A named shot-sharing format (scramble, alternate shot...) means the team game
 * in the same sentence isn't one the scorecard can play, and "split sixes" is not Sixes.
 */
function flagUnsupported(text: string, games: PlanGame[]): { unsupported: string[]; games: PlanGame[] } {
  const unsupported: string[] = [];
  let kept = games;
  for (const g of KNOWN_UNPLAYABLE) {
    const hit = g.aliases.find(a => new RegExp(String.raw`\b${escapeRe(a)}s?\b`, 'i').test(text));
    if (!hit) continue;
    unsupported.push(g.name);
    if (g.teams === 'shot-sharing pairs') kept = kept.filter(x => x.type !== 'match' && x.type !== 'bestball');
    // The unsupported name contains a supported game's word: drop that game.
    kept = kept.filter(x => !new RegExp(String.raw`\b${escapeRe(x.type)}\b`, 'i').test(hit));
  }
  return { unsupported, games: kept };
}

function extractHandicaps(text: string): RoundPlan['handicaps'] {
  const pct = /\b(\d{2,3})\s*(?:%|percent|per cent)(?:\s+(?:of\s+)?(?:handicaps?|strokes?))?/i.exec(text);
  if (pct && /handicap|stroke|allowance/i.test(text)) return { mode: 'percent', percent: Number(pct[1]) };
  if (/\b(?:no handicaps?|gross|scratch|straight up|no strokes)\b/i.test(text)) return { mode: 'none', percent: null };
  if (/\b(?:full handicaps?|net|with strokes|handicaps on)\b/i.test(text)) return { mode: 'full', percent: null };
  return null;
}

export function localParse(text: string): RoundPlan {
  const clean = text.replace(/\s+/g, ' ').trim();
  const amounts = amountsSaid(clean);
  const { holes, nine } = extractHoles(clean);
  let players = extractPlayers(clean);
  if (!players.length) players = extractPlayersLoose(clean);
  if (!players.length) {
    // "me and Jack vs Jim and Tim": the teams name everyone.
    const teams = extractTeams(clean);
    if (teams) players = [...teams[0], ...teams[1]].filter(n => !SELF.test(n));
  }
  return {
    course: { query: extractCourse(clean), tee: extractTee(clean), holes, nine },
    players: players.map(name => ({ name, handicap: null })),
    userPlaying: !/\b(?:i'm not playing|im not playing|i am not playing|just keeping score|keeping score for)\b/i.test(clean),
    userHandicap: (() => {
      const h = /\b(?:i'?m|i am)\s+an?\s+(\d{1,2}(?:\.\d)?)\b(?!\s*(?:dollars?|bucks?))/i.exec(clean);
      return h ? Number(h[1]) : null;
    })(),
    ...flagUnsupported(clean, extractGames(clean, amounts)),
    handicaps: extractHandicaps(clean),
  };
}

/**
 * Amounts in a plan that the golfer never said. Defaults are not checked here
 * (a null stake is filled in later and shown as an assumption).
 */
export function unsaidAmounts(plan: RoundPlan, text: string): { type: PlanGameType; stake: number }[] {
  const said = new Set(amountsSaid(text).map(a => a.value));
  // Bare numbers count too ("skins for 5"), but only ones that are not hole counts.
  for (const m of text.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)) said.add(Number(m[1]));
  for (const m of text.matchAll(new RegExp(String.raw`\b((?:${NUMBER_WORD_RE})(?:[\s-](?:${NUMBER_WORD_RE}))*)\b`, 'gi'))) {
    const v = wordsToNumber(m[1]);
    if (v != null) said.add(v);
  }
  return plan.games.filter(g => g.stake != null && !said.has(g.stake)).map(g => ({ type: g.type, stake: g.stake! }));
}
