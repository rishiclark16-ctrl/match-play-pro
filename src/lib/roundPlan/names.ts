/**
 * Matching spoken player names to the user's friends.
 *
 * Rules, strictest first; the first rule that yields matches wins:
 *   1. exact full name
 *   2. exact first name, plus a last initial or last name if one was said
 *   3. a known nickname of the first name ("Jim" for James)
 *   4. one typo away (speech-to-text: "Jon" for "John", "Tym" for "Tim")
 * A name that matches several friends equally is ambiguous: we pick none and
 * offer them all, rather than guess who owes money.
 */

export function normalizeName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/['-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Common English nicknames, both directions. Kept to well-known pairs only. */
const NICKNAME_GROUPS: string[][] = [
  ['james', 'jim', 'jimmy', 'jamie'],
  ['john', 'jack', 'johnny', 'jon'],
  ['timothy', 'tim', 'timmy'],
  ['william', 'will', 'bill', 'billy', 'liam'],
  ['robert', 'rob', 'bob', 'bobby', 'robbie'],
  ['michael', 'mike', 'mikey', 'mick'],
  ['david', 'dave', 'davey'],
  ['thomas', 'tom', 'tommy'],
  ['christopher', 'chris'],
  ['matthew', 'matt'],
  ['daniel', 'dan', 'danny'],
  ['nicholas', 'nick', 'nicky'],
  ['joseph', 'joe', 'joey'],
  ['benjamin', 'ben', 'benny'],
  ['samuel', 'sam', 'sammy'],
  ['alexander', 'alex', 'xander'],
  ['andrew', 'andy', 'drew'],
  ['steven', 'steve', 'stephen'],
  ['anthony', 'tony'],
  ['richard', 'rick', 'ricky', 'rich', 'dick'],
  ['gregory', 'greg'],
  ['jeffrey', 'jeff', 'geoffrey'],
  ['edward', 'ed', 'eddie', 'ted', 'teddy'],
  ['patrick', 'pat', 'paddy'],
  ['kenneth', 'ken', 'kenny'],
  ['ronald', 'ron', 'ronnie'],
  ['donald', 'don', 'donnie'],
  ['charles', 'charlie', 'chuck', 'chaz'],
  ['jonathan', 'jon', 'jonny'],
  ['zachary', 'zach', 'zack'],
  ['joshua', 'josh'],
  ['nathan', 'nate', 'nathaniel'],
  ['peter', 'pete'],
  ['philip', 'phil'],
  ['raymond', 'ray'],
  ['lawrence', 'larry'],
  ['gerald', 'gerry', 'jerry'],
  ['frederick', 'fred', 'freddie'],
  ['douglas', 'doug'],
  ['katherine', 'kate', 'katie', 'kathy', 'cathy'],
  ['elizabeth', 'liz', 'beth', 'lizzie', 'betty'],
  ['jennifer', 'jen', 'jenny'],
  ['margaret', 'maggie', 'meg', 'peggy'],
  ['rebecca', 'becky', 'becca'],
  ['susan', 'sue', 'suzy'],
  ['patricia', 'patty', 'tricia', 'pat'],
];

const NICKNAMES = new Map<string, Set<string>>();
for (const group of NICKNAME_GROUPS) {
  for (const n of group) {
    const set = NICKNAMES.get(n) ?? new Set<string>([n]);
    group.forEach(g => set.add(g));
    NICKNAMES.set(n, set);
  }
}

/** True when two first names are the same person's name (identical or known nickname pair). */
export function sameFirstName(a: string, b: string): boolean {
  if (a === b) return true;
  return NICKNAMES.get(a)?.has(b) ?? false;
}

export interface FriendLike {
  profileId: string;
  name: string;
  handicap: number | null;
}

export type FriendMatch =
  | { kind: 'match'; friend: FriendLike; alternatives: FriendLike[] }
  | { kind: 'ambiguous'; candidates: FriendLike[] }
  | { kind: 'none' };

function lastNameMatches(spokenLast: string, friendLast: string): boolean {
  if (!spokenLast) return true;
  if (!friendLast) return false;
  if (spokenLast.length === 1) return friendLast.startsWith(spokenLast);
  return friendLast === spokenLast || levenshtein(friendLast, spokenLast) <= 1;
}

/**
 * Matches one spoken name against the friend list.
 * `exclude` lets the caller avoid assigning the same friend twice.
 */
export function matchFriend(spoken: string, friends: FriendLike[], exclude: Set<string> = new Set()): FriendMatch {
  const said = normalizeName(spoken);
  if (!said) return { kind: 'none' };
  const pool = friends.filter(f => !exclude.has(f.profileId) && normalizeName(f.name));
  const [saidFirst, ...saidRest] = said.split(' ');
  const saidLast = saidRest.join(' ');

  const tiers: ((f: FriendLike) => boolean)[] = [
    f => normalizeName(f.name) === said,
    f => {
      const [first, ...rest] = normalizeName(f.name).split(' ');
      return first === saidFirst && lastNameMatches(saidLast, rest.join(' '));
    },
    // "Jack" for a friend saved as "John": only reached when no friend is literally "Jack".
    f => {
      const [first, ...rest] = normalizeName(f.name).split(' ');
      return sameFirstName(first, saidFirst) && lastNameMatches(saidLast, rest.join(' '));
    },
    f => {
      const [first, ...rest] = normalizeName(f.name).split(' ');
      // Only for names long enough that one edit is a likely mishearing, not a different name.
      return saidFirst.length >= 3 && levenshtein(first, saidFirst) === 1 && lastNameMatches(saidLast, rest.join(' '));
    },
  ];

  for (const test of tiers) {
    const hits = pool.filter(test);
    if (hits.length === 1) return { kind: 'match', friend: hits[0], alternatives: [] };
    if (hits.length > 1) return { kind: 'ambiguous', candidates: hits };
  }
  return { kind: 'none' };
}

/** Title-cases a spoken guest name for display ("big mike" -> "Big Mike"). */
export function displayName(spoken: string): string {
  return spoken
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(w => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
