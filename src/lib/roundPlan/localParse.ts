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
  ['match', /\bmatch(?:\s*play)?\b/i],
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

/** Every dollar amount said, with its position. "5-5-5" counts as one amount of 5. */
export function amountsSaid(text: string): Amount[] {
  const out: Amount[] = [];
  const dash = /\b(\d+)\s*-\s*\1\s*-\s*\1\b/g;
  let m: RegExpExecArray | null;
  while ((m = dash.exec(text))) out.push({ value: Number(m[1]), index: m.index });
  MONEY_RE.lastIndex = 0;
  const forN = new RegExp(String.raw`\b(?:for|at)\s+(\d+(?:\.\d{1,2})?|(?:${NUMBER_WORD_RE})(?:[\s-](?:${NUMBER_WORD_RE}))*)\b(?!\s*(?:holes?|players?|people|guys|of us|o'?clock|am|pm|percent|%))`, 'gi');
  while ((m = forN.exec(text))) {
    const v = wordsToNumber(m[1]);
    if (v != null && v > 0) out.push({ value: v, index: m.index });
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

function splitNames(list: string): string[] {
  return list
    .split(/\s*(?:,|\band\b|&|\bplus\b)\s*/i)
    .map(s => s.replace(/^(?:with|my (?:buddy|buddies|friend|friends|boy|boys|brother|dad|son))\s+/i, '').trim())
    .filter(s => s && !SELF.test(s) && s.split(/\s+/).length <= 3 && !/\d/.test(s));
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
  const a = side(m[1]);
  const b = side(m[2]);
  return a.length && b.length ? [a, b] : null;
}

function extractGames(text: string, amounts: Amount[]): PlanGame[] {
  const found: { type: PlanGameType; index: number }[] = [];
  for (const [type, re] of GAME_PATTERNS) {
    const m = re.exec(text);
    if (m) found.push({ type, index: m.index });
  }
  found.sort((a, b) => a.index - b.index);
  const used = new Set<number>();
  const teams = extractTeams(text);

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
    const near = text.slice(Math.max(0, index - 40), Math.min(text.length, index + 60));
    return {
      type,
      stake: best?.value ?? null,
      carryover: /carry\s*-?\s*overs?|carries|carrying/i.test(near) ? true : /no carry/i.test(near) ? false : null,
      autoPress: type === 'nassau' && /\b(?:auto[\s-]?press|press(?:es)?|presses at|press when)\b/i.test(text) ? true : null,
      modified: type === 'stableford' && /\bmodified\b/i.test(text) ? true : null,
      teams: type === 'match' || type === 'bestball' ? teams : null,
    };
  });
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
  if (!players.length) {
    // "me and Jack vs Jim and Tim": the teams name everyone.
    const teams = extractTeams(clean);
    if (teams) players = [...teams[0], ...teams[1]].filter(n => !SELF.test(n));
  }
  return {
    course: { query: extractCourse(clean), tee: extractTee(clean), holes, nine },
    players: players.map(name => ({ name, handicap: null })),
    userPlaying: !/\b(?:i'm not playing|im not playing|i am not playing|just keeping score|keeping score for)\b/i.test(clean),
    userHandicap: null,
    games: extractGames(clean, amounts),
    handicaps: extractHandicaps(clean),
    unsupported: [],
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
