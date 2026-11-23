/**
 * Finding the course a golfer named.
 *
 * The course search upstream is literal and brittle: "Sonoma Golf Club" returns
 * nothing while "sonoma" returns "Sonoma Gc". So we search several variants of
 * what was said, merge the results, and rank them ourselves on the distinctive
 * words ("sonoma"), ignoring generic ones ("golf club", "gc", "country club").
 */

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bg\s*&\s*cc\b/g, 'golf and country club'],
  [/\bgcc\b/g, 'golf and country club'],
  [/\bg&cc\b/g, 'golf and country club'],
  [/\bgc\b/g, 'golf club'],
  [/\bcc\b/g, 'country club'],
  [/\bgl\b/g, 'golf links'],
  [/\bgcse\b/g, 'golf course'],
  [/\bmt\b/g, 'mount'],
  [/\bft\b/g, 'fort'],
  [/&/g, ' and '],
];

/** Words that say "this is a golf course" but not which one. */
const GENERIC = new Set([
  'the', 'golf', 'club', 'country', 'course', 'courses', 'links', 'resort', 'and', 'of', 'at',
  'gc', 'cc', 'gcc', 'municipal', 'muni', 'public', 'private', 'national', 'park', 'g', 'c',
  'championship', 'executive', 'par', 'nine', 'hole', 'holes',
]);

export function normalizeCourseName(s: string): string {
  let out = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const [re, rep] of ABBREVIATIONS) out = out.replace(re, rep);
  return out.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** The distinctive words of a course name: "Sonoma Golf Club" -> ["sonoma"]. */
export function coreTokens(s: string): string[] {
  return normalizeCourseName(s).split(' ').filter(t => t && !GENERIC.has(t));
}

/**
 * Search strings to try, most specific first. Each must be at least 3 characters
 * (the search endpoint ignores shorter queries).
 */
export function courseQueryVariants(query: string): string[] {
  const raw = query.trim().replace(/\s+/g, ' ');
  const core = coreTokens(raw);
  const variants = [
    raw,
    normalizeCourseName(raw),
    core.join(' '),
    // Longest distinctive word alone: "pebble beach golf links" -> "pebble"
    [...core].sort((a, b) => b.length - a.length)[0] ?? '',
    core[0] ?? '',
  ];
  const seen = new Set<string>();
  return variants.filter(v => {
    const k = v.toLowerCase();
    if (k.length < 3 || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface CourseCandidate {
  id: string;
  club_name: string;
  course_name: string;
  location?: { city?: string; state?: string; country?: string; latitude?: number; longitude?: number };
  distanceMi?: number;
}

function tokenScore(said: string[], name: string): number {
  const have = coreTokens(name);
  if (!said.length || !have.length) return 0;
  // Every distinctive word said should be in the name; extra words in the
  // name cost a little ("Pebble" vs "Pebble Beach Golf Links").
  const matched = said.filter(t => have.some(h => h === t || (t.length >= 5 && h.startsWith(t)) || (h.length >= 5 && t.startsWith(h))));
  const recall = matched.length / said.length;
  const precision = matched.length / have.length;
  return recall * 0.65 + precision * 0.35;
}

/** 0..1 confidence that `candidate` is the course meant by `query`. */
export function scoreCourse(query: string, candidate: CourseCandidate): number {
  const said = coreTokens(query);
  const best = Math.max(tokenScore(said, candidate.course_name), tokenScore(said, candidate.club_name));
  // Small nudge for nearby courses, enough to break ties, never enough to beat a better name match.
  const near = candidate.distanceMi != null ? Math.max(0, 0.05 - candidate.distanceMi / 2000) : 0;
  return Math.min(1, best + near);
}

export type CoursePick =
  | { kind: 'confident'; course: CourseCandidate; score: number; others: CourseCandidate[] }
  | { kind: 'choose'; candidates: CourseCandidate[] }
  | { kind: 'none' };

/**
 * Picks a course when one is clearly meant; otherwise asks.
 * Duplicates (same id from several searches) are merged first.
 */
export function pickCourse(query: string, results: CourseCandidate[]): CoursePick {
  const byId = new Map<string, CourseCandidate>();
  for (const r of results) if (!byId.has(r.id)) byId.set(r.id, r);
  const ranked = [...byId.values()]
    .map(c => ({ c, s: scoreCourse(query, c) }))
    .filter(x => x.s >= 0.5)
    .sort((a, b) => b.s - a.s);
  if (!ranked.length) return { kind: 'none' };
  const [top, second] = ranked;
  const clear = top.s >= 0.75 && (!second || top.s - second.s >= 0.15);
  if (clear) return { kind: 'confident', course: top.c, score: top.s, others: ranked.slice(1, 5).map(x => x.c) };
  return { kind: 'choose', candidates: ranked.slice(0, 6).map(x => x.c) };
}

export function courseDisplayName(c: CourseCandidate): string {
  const course = c.course_name?.trim();
  const club = c.club_name?.trim();
  const name = !course ? club : !club || normalizeCourseName(club) === normalizeCourseName(course) ? course : `${club} · ${course}`;
  // "Sonoma Gc" -> "Sonoma GC": the source data lower-cases common suffixes.
  return (name ?? '').replace(/\b(Gc|Cc|Gcc|G&cc)\b/g, m => m.toUpperCase());
}
