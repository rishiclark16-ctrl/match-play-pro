/**
 * Picking the tee a golfer named.
 *
 * Many courses name tees by colour ("Blue"), but plenty don't: Sonoma GC's are
 * "I", "II", "III", "IV". When the name isn't on the card, a colour still means
 * a position (black/tips longest, blue back, white middle, gold senior, red
 * forward), so we map it by length and tell the user what we chose.
 */

export interface TeeLike {
  tee_name: string;
  total_yards?: number;
  slope_rating?: number;
  course_rating?: number;
  number_of_holes?: number;
}

export type TeeChoiceHow = 'named' | 'by-length' | 'preference' | 'default';

export interface TeeChoice<T extends TeeLike> {
  tee: T;
  how: TeeChoiceHow;
  /** Human sentence for the assumptions list; null when the tee was named exactly. */
  note: string | null;
}

/** Position on the card: 0 = longest tee, 1 = shortest. */
const POSITION: [RegExp, number, string][] = [
  [/^(black|blacks|tips?|the tips|championship|champ|tournament|pro|tiger|back tees?|all the way back)$/, 0, 'the longest tees'],
  [/^(blue|blues)$/, 0.25, 'the back tees'],
  [/^(white|whites|members?|regular|middle|mens?)$/, 0.5, 'the middle tees'],
  [/^(gold|golds|yellow|yellows|senior|seniors|green|greens|silver|silvers)$/, 0.75, 'the senior tees'],
  [/^(red|reds|forward|front tees?|ladies|womens?|shortest)$/, 1, 'the forward tees'],
];

function norm(s: string): string {
  return s.toLowerCase().replace(/\btees?\b/g, '').replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function singular(s: string): string {
  return s.length > 3 && s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s;
}

function isCombo(t: TeeLike): boolean {
  return /[/&+]|combo/i.test(t.tee_name);
}

function byLength<T extends TeeLike>(tees: T[]): T[] {
  return [...tees].sort((a, b) => (b.total_yards ?? 0) - (a.total_yards ?? 0));
}

/** Exact or near-exact name match against the card. */
function findNamed<T extends TeeLike>(tees: T[], said: string): T | null {
  const s = singular(norm(said));
  if (!s) return null;
  const singles = tees.filter(t => !isCombo(t));
  const exact = (list: T[]) => list.find(t => singular(norm(t.tee_name)) === s);
  return exact(singles) ?? exact(tees) ?? null;
}

function findByPosition<T extends TeeLike>(tees: T[], said: string): { tee: T; label: string } | null {
  const s = norm(said);
  const hit = POSITION.find(([re]) => re.test(s));
  if (!hit) return null;
  const singles = tees.filter(t => !isCombo(t));
  const ranked = byLength(singles.length ? singles : tees);
  if (!ranked.length) return null;
  const idx = Math.round(hit[1] * (ranked.length - 1));
  return { tee: ranked[idx], label: hit[2] };
}

function yards(t: TeeLike): string {
  return t.total_yards ? ` (${t.total_yards.toLocaleString('en-US')} yds)` : '';
}

/**
 * @param said      tee as spoken, or null
 * @param preferred the user's saved tee preference, or null
 */
export function chooseTee<T extends TeeLike>(tees: T[], said: string | null, preferred: string | null): TeeChoice<T> | null {
  if (!tees.length) return null;

  if (said) {
    const named = findNamed(tees, said);
    if (named) return { tee: named, how: 'named', note: null };
    const pos = findByPosition(tees, said);
    if (pos) {
      return {
        tee: pos.tee,
        how: 'by-length',
        note: `No "${said}" tee on this card, so we used ${pos.label}: ${pos.tee.tee_name}${yards(pos.tee)}`,
      };
    }
  }

  if (preferred) {
    const named = findNamed(tees, preferred) ?? findByPosition(tees, preferred)?.tee ?? null;
    if (named) {
      return { tee: named, how: 'preference', note: `${named.tee_name} tees${yards(named)}, from your profile` };
    }
  }

  const singles = tees.filter(t => !isCombo(t));
  const ranked = byLength(singles.length ? singles : tees);
  const middle = ranked[Math.floor((ranked.length - 1) / 2)];
  return {
    tee: middle,
    how: 'default',
    note: said
      ? `Couldn't find "${said}", so we picked the ${middle.tee_name} tees${yards(middle)}`
      : `${middle.tee_name} tees${yards(middle)}, from the middle of the card. Tap the tee to change it`,
  };
}
