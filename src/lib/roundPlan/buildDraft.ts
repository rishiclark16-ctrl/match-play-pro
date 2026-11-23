/**
 * RoundPlan (what was said) -> RoundDraft (a real, reviewable round).
 *
 * Pure apart from the injected course lookups, so every rule is unit-tested.
 * Nothing here guesses silently: each decision made on the user's behalf is an
 * `assumption` (shown as a tappable line), and anything that would make the round
 * wrong is an `issue` that blocks "Tee off" until fixed.
 */
import type { GameConfig, HoleInfo } from '@/types/golf';
import type {
  DraftAssumption, DraftIssue, DraftPlayer, PlanGameType, PlanSource, RoundPlan,
} from './types';
import { displayName, matchFriend, type FriendLike } from './names';
import { courseDisplayName, courseQueryVariants, pickCourse, type CourseCandidate } from './courseMatch';
import { chooseTee, type TeeLike } from './teeMatch';
import { resolveGames } from './games';
import { unsaidAmounts } from './localParse';

export interface CourseTee extends TeeLike {
  holes?: { par: number; yardage?: number; handicap?: number }[];
}

export interface CourseDetails extends CourseCandidate {
  tees?: { male?: CourseTee[]; female?: CourseTee[] };
}

export interface DraftDeps {
  searchCourses: (query: string) => Promise<CourseCandidate[]>;
  getCourseDetails: (id: string) => Promise<CourseDetails | null>;
  friends: FriendLike[];
  user: { profileId: string; name: string; handicap: number | null; teePreference: string | null };
  isPro: boolean;
  /** Max players for the user's tier (TIER_LIMITS). */
  maxPlayers: number;
  generateId: () => string;
}

/** Choices the user made on the review screen. Re-running buildDraft with them is how edits apply. */
export interface DraftOverrides {
  course?: CourseCandidate;
  teeName?: string;
  /** Spoken name (lower-case) -> friend profile id, or null to keep them a guest. */
  friendFor?: Record<string, string | null>;
  /** Games the user chose to leave out (e.g. Pro games on a free account). */
  dropGames?: PlanGameType[];
}

export interface DraftCourse {
  candidate: CourseCandidate;
  details: CourseDetails | null;
  name: string;
}

export interface RoundDraft {
  source: PlanSource;
  text: string;
  course: DraftCourse | null;
  /** The course as said, for the search box when it needs picking. */
  courseQuery: string | null;
  /** Other courses the user might have meant (shown when picking). */
  courseChoices: CourseCandidate[];
  tee: CourseTee | null;
  teeChoices: CourseTee[];
  holes: 9 | 18;
  holeInfo: HoleInfo[];
  slope: number | null;
  rating: number | null;
  players: DraftPlayer[];
  games: GameConfig[];
  needsPro: PlanGameType[];
  handicapMode: 'full' | 'none' | 'percent';
  handicapPercent: number | null;
  assumptions: DraftAssumption[];
  issues: DraftIssue[];
}

const MAX_SEARCHES = 4;

/** Searches what was said, then looser variants, until one course is clearly it. */
export async function findCourse(
  query: string,
  search: DraftDeps['searchCourses'],
): Promise<{ pick: ReturnType<typeof pickCourse>; searched: number }> {
  const all: CourseCandidate[] = [];
  let searched = 0;
  let last = pickCourse(query, []);
  for (const variant of courseQueryVariants(query).slice(0, MAX_SEARCHES)) {
    searched++;
    try {
      all.push(...(await search(variant)));
    } catch {
      // One failed variant shouldn't sink the others.
    }
    last = pickCourse(query, all);
    if (last.kind === 'confident') break;
  }
  return { pick: last, searched };
}

function teesOf(details: CourseDetails | null): CourseTee[] {
  return details?.tees?.male?.length ? details.tees.male : details?.tees?.female ?? [];
}

/** Hole info for the round. Back nine keeps its real hole numbers' pars and stroke indexes, renumbered 1-9. */
export function holeInfoFor(tee: CourseTee | null, holes: 9 | 18, nine: 'front' | 'back' | null): HoleInfo[] {
  const src = tee?.holes?.length ? tee.holes : null;
  if (!src) {
    return Array.from({ length: holes }, (_, i) => ({ number: i + 1, par: 4 }));
  }
  const slice = holes === 9 ? (nine === 'back' && src.length >= 18 ? src.slice(9, 18) : src.slice(0, 9)) : src.slice(0, 18);
  return slice.map((h, i) => ({ number: i + 1, par: h.par, handicap: h.handicap, yardage: h.yardage }));
}

export function resolvePlayers(
  plan: RoundPlan,
  deps: Pick<DraftDeps, 'friends' | 'user' | 'maxPlayers'>,
  friendFor: Record<string, string | null> = {},
): { players: DraftPlayer[]; issues: DraftIssue[]; assumptions: DraftAssumption[] } {
  const issues: DraftIssue[] = [];
  const assumptions: DraftAssumption[] = [];
  const players: DraftPlayer[] = [];

  if (plan.userPlaying) {
    players.push({
      key: 'you',
      name: deps.user.name || 'You',
      kind: 'you',
      profileId: deps.user.profileId,
      handicap: plan.userHandicap ?? deps.user.handicap,
      saidAs: null,
      spoken: '',
      alternatives: [],
    });
  }

  const taken = new Set<string>([deps.user.profileId]);
  const seenNames = new Set<string>();
  plan.players.forEach((p, i) => {
    const said = p.name.trim();
    const dedupeKey = said.toLowerCase();
    if (!said || seenNames.has(dedupeKey)) return;
    seenNames.add(dedupeKey);
    const key = `p${i + 1}`;
    if (dedupeKey in friendFor) {
      const chosen = deps.friends.find(f => f.profileId === friendFor[dedupeKey]);
      if (chosen && !taken.has(chosen.profileId)) {
        taken.add(chosen.profileId);
        players.push({
          key, name: chosen.name, kind: 'friend', profileId: chosen.profileId,
          handicap: p.handicap ?? chosen.handicap, saidAs: said, spoken: said, alternatives: [],
        });
      } else {
        players.push({ key, name: displayName(said), kind: 'guest', profileId: null, handicap: p.handicap, saidAs: null, spoken: said, alternatives: [] });
      }
      return;
    }
    const m = matchFriend(said, deps.friends, taken);
    if (m.kind === 'match') {
      taken.add(m.friend.profileId);
      players.push({
        key, name: m.friend.name, kind: 'friend', profileId: m.friend.profileId,
        handicap: p.handicap ?? m.friend.handicap,
        saidAs: m.friend.name.toLowerCase().startsWith(said.toLowerCase()) ? null : said,
        spoken: said,
        alternatives: [],
      });
    } else if (m.kind === 'ambiguous') {
      players.push({
        key, name: displayName(said), kind: 'guest', profileId: null, handicap: p.handicap,
        saidAs: said, spoken: said, alternatives: m.candidates.map(c => ({ profileId: c.profileId, name: c.name, handicap: c.handicap })),
      });
      issues.push({ field: 'players', message: `Which ${displayName(said)}? ${m.candidates.map(c => c.name).join(' or ')}` });
    } else {
      players.push({
        key, name: displayName(said), kind: 'guest', profileId: null, handicap: p.handicap,
        saidAs: null, spoken: said, alternatives: [],
      });
      assumptions.push({
        field: 'players',
        message: `${displayName(said)} isn't in your friends, so they're a guest${p.handicap == null ? ' with no handicap' : ''}`,
      });
    }
  });

  if (!plan.userPlaying) {
    // Seat 1 of every round is the person who starts it (useCreateSupabaseRound), so a
    // scorekeeper who isn't playing would be scored as the first player.
    issues.push({ field: 'players', message: "Keeping score without playing isn't supported yet. Have one of the players start the round" });
  }
  if (!players.length) issues.push({ field: 'players', message: 'Who is playing?' });
  if (players.length > deps.maxPlayers) {
    issues.push({ field: 'players', message: `${players.length} players is over your limit of ${deps.maxPlayers}` });
  }
  return { players, issues, assumptions };
}

export async function buildDraft(
  plan: RoundPlan,
  text: string,
  source: PlanSource,
  deps: DraftDeps,
  overrides: DraftOverrides = {},
): Promise<RoundDraft> {
  const issues: DraftIssue[] = [];
  const assumptions: DraftAssumption[] = [];

  // ── Course + tee ──
  let course: DraftCourse | null = null;
  let courseChoices: CourseCandidate[] = [];
  if (overrides.course) {
    const details = await deps.getCourseDetails(overrides.course.id).catch(() => null);
    course = { candidate: overrides.course, details, name: courseDisplayName(overrides.course) };
    if (!details) assumptions.push({ field: 'course', message: `Couldn't load the scorecard for ${course.name}; using par 4s` });
  } else if (plan.course.query) {
    const { pick } = await findCourse(plan.course.query, deps.searchCourses);
    if (pick.kind === 'confident') {
      const details = await deps.getCourseDetails(pick.course.id).catch(() => null);
      course = { candidate: pick.course, details, name: courseDisplayName(pick.course) };
      courseChoices = pick.others;
      if (!details) assumptions.push({ field: 'course', message: `Couldn't load the scorecard for ${course.name}; using par 4s` });
    } else if (pick.kind === 'choose') {
      courseChoices = pick.candidates;
      issues.push({ field: 'course', message: `Which "${plan.course.query}"?` });
    } else {
      issues.push({ field: 'course', message: `Couldn't find "${plan.course.query}". Search for it` });
    }
  } else {
    issues.push({ field: 'course', message: 'Which course?' });
  }

  const teeChoices = teesOf(course?.details ?? null);
  const pinned = overrides.teeName ? teeChoices.find(t => t.tee_name === overrides.teeName) : undefined;
  const teeChoice = pinned
    ? { tee: pinned, how: 'named' as const, note: null }
    : chooseTee(teeChoices, plan.course.tee, deps.user.teePreference);
  const tee = teeChoice?.tee ?? null;
  if (teeChoice?.note) assumptions.push({ field: 'tee', message: teeChoice.note });

  const cardHoles = tee?.number_of_holes ?? tee?.holes?.length ?? 18;
  let holes: 9 | 18 = plan.course.holes ?? (cardHoles === 9 ? 9 : 18);
  if (holes === 18 && cardHoles === 9) {
    holes = 9;
    assumptions.push({ field: 'holes', message: 'This is a 9-hole course' });
  }
  if (holes === 9 && plan.course.nine === 'back') {
    assumptions.push({ field: 'holes', message: 'Back nine: holes 10–18, shown as 1–9 on the card' });
  }
  const holeInfo = holeInfoFor(tee, holes, plan.course.nine);

  // ── Players ──
  const p = resolvePlayers(plan, deps, overrides.friendFor);
  issues.push(...p.issues);
  assumptions.push(...p.assumptions);
  let players = p.players;

  // ── Handicaps ──
  const handicapMode = plan.handicaps?.mode ?? 'full';
  const handicapPercent = handicapMode === 'percent' ? plan.handicaps?.percent ?? null : null;
  if (handicapMode === 'percent') {
    if (handicapPercent == null || handicapPercent <= 0 || handicapPercent > 100) {
      issues.push({ field: 'players', message: 'Check the handicap percentage' });
    } else {
      // A percentage allowance scales the index, and so the playing handicap, by the same factor.
      players = players.map(pl => ({
        ...pl,
        handicap: pl.handicap == null ? null : Math.round(pl.handicap * handicapPercent) / 100,
      }));
      assumptions.push({ field: 'handicaps', message: `${handicapPercent}% of handicaps` });
    }
  } else if (handicapMode === 'none') {
    assumptions.push({ field: 'handicaps', message: 'Gross scores, no handicap strokes' });
  }

  // ── Games ──
  const dropped = new Set(overrides.dropGames ?? []);
  const g = resolveGames({
    games: plan.games.filter(x => !dropped.has(x.type)), players, isPro: deps.isPro, useNet: handicapMode !== 'none', generateId: deps.generateId,
  });
  issues.push(...g.issues);
  assumptions.push(...g.assumptions);
  if (g.playerOrder) {
    const order = g.playerOrder;
    players = [...players].sort((x, y) => order.indexOf(x.key) - order.indexOf(y.key));
  }
  if (!plan.games.length) assumptions.push({ field: 'games', message: 'No game said, so just keeping score' });
  for (const u of plan.unsupported) assumptions.push({ field: 'games', message: `Not set up: ${u}` });

  // An amount from the AI that the golfer never said is not trusted.
  if (source === 'ai') {
    for (const u of unsaidAmounts(plan, text)) {
      issues.push({ field: 'games', message: `Check the ${u.type} amount: $${u.stake} wasn't in what you said` });
    }
  }

  return {
    source,
    text,
    course,
    courseQuery: plan.course.query,
    courseChoices,
    tee,
    teeChoices,
    holes,
    holeInfo,
    slope: tee?.slope_rating ?? null,
    rating: tee?.course_rating ?? null,
    players,
    games: g.games,
    needsPro: g.needsPro,
    handicapMode,
    handicapPercent,
    assumptions,
    issues,
  };
}

/** True when the draft can become a round right now. */
export function canTeeOff(d: RoundDraft): boolean {
  return d.issues.length === 0 && d.needsPro.length === 0 && !!d.course;
}
