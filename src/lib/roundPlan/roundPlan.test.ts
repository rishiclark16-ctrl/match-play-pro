import { describe, it, expect } from 'vitest';
import { matchFriend, sameFirstName, levenshtein, type FriendLike } from './names';
import { courseQueryVariants, pickCourse, coreTokens, courseDisplayName, type CourseCandidate } from './courseMatch';
import { chooseTee } from './teeMatch';
import { resolveGames } from './games';
import { localParse, amountsSaid, unsaidAmounts, wordsToNumber } from './localParse';
import { buildDraft, canTeeOff, holeInfoFor, type CourseDetails, type DraftDeps } from './buildDraft';
import type { DraftPlayer, PlanGame, RoundPlan } from './types';

// Real data from the course API (2026-11-23): Sonoma GC names its tees I-IV, not colours.
const SONOMA: CourseCandidate = { id: 'cdx8ze6s', club_name: 'Sonoma Gc', course_name: 'Sonoma Gc', location: { city: 'Sonoma', state: 'CA' } };
const SONOMA_RANCH: CourseCandidate = { id: 'mnzs5db0', club_name: 'Sonoma Ranch Golf Club', course_name: 'Sonoma Ranch Golf Club', location: { city: 'Las Cruces', state: 'NM' } };
const pars = [4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const holes = pars.map((par, i) => ({ par, yardage: 350 + i, handicap: ((i * 7) % 18) + 1 }));
const SONOMA_TEES = [
  { tee_name: 'I', total_yards: 7076, slope_rating: 138, course_rating: 74.6, number_of_holes: 18, holes },
  { tee_name: 'I/II', total_yards: 6842, slope_rating: 137, course_rating: 73.5, number_of_holes: 18, holes },
  { tee_name: 'II', total_yards: 6652, slope_rating: 136, course_rating: 72.7, number_of_holes: 18, holes },
  { tee_name: 'II/III', total_yards: 6316, slope_rating: 134, course_rating: 71, number_of_holes: 18, holes },
  { tee_name: 'III', total_yards: 6128, slope_rating: 133, course_rating: 70.1, number_of_holes: 18, holes },
  { tee_name: 'IV', total_yards: 5229, slope_rating: 115, course_rating: 65.6, number_of_holes: 18, holes },
];
const COLOUR_TEES = [
  { tee_name: 'Black', total_yards: 7100 },
  { tee_name: 'Blue', total_yards: 6700 },
  { tee_name: 'White', total_yards: 6300 },
  { tee_name: 'Red', total_yards: 5400 },
];

const FRIENDS: FriendLike[] = [
  { profileId: 'f-jack', name: 'Jack Turner', handicap: 12 },
  { profileId: 'f-james', name: 'James Reid', handicap: 6 },
  { profileId: 'f-tim1', name: 'Tim Shaw', handicap: 18 },
  { profileId: 'f-tim2', name: 'Tim Owens', handicap: 3 },
  { profileId: 'f-mike', name: 'Michael Brooks', handicap: 9 },
];

describe('names', () => {
  it('levenshtein', () => {
    expect(levenshtein('tim', 'tym')).toBe(1);
    expect(levenshtein('john', 'jon')).toBe(1);
  });
  it('nicknames are symmetric', () => {
    expect(sameFirstName('jim', 'james')).toBe(true);
    expect(sameFirstName('james', 'jimmy')).toBe(true);
    expect(sameFirstName('jim', 'tim')).toBe(false);
  });
  it('exact first name beats a nickname', () => {
    const m = matchFriend('Jack', FRIENDS);
    expect(m.kind === 'match' && m.friend.profileId).toBe('f-jack');
  });
  it('matches a nickname when nobody has the literal name', () => {
    const m = matchFriend('Jim', FRIENDS);
    expect(m.kind === 'match' && m.friend.profileId).toBe('f-james');
    const mike = matchFriend('Mike', FRIENDS);
    expect(mike.kind === 'match' && mike.friend.profileId).toBe('f-mike');
  });
  it('two friends with the same first name is ambiguous, never a guess', () => {
    const m = matchFriend('Tim', FRIENDS);
    expect(m.kind).toBe('ambiguous');
    expect(m.kind === 'ambiguous' && m.candidates.map(c => c.profileId).sort()).toEqual(['f-tim1', 'f-tim2']);
  });
  it('a last initial disambiguates', () => {
    const m = matchFriend('Tim S', FRIENDS);
    expect(m.kind === 'match' && m.friend.profileId).toBe('f-tim1');
  });
  it('one speech-to-text slip still matches; a different name does not', () => {
    const m = matchFriend('Jak', FRIENDS);
    expect(m.kind === 'match' && m.friend.profileId).toBe('f-jack');
    expect(matchFriend('Zed', FRIENDS).kind).toBe('none');
  });
  it('never matches the same friend twice', () => {
    const m = matchFriend('Jack', FRIENDS, new Set(['f-jack']));
    expect(m.kind === 'match' && m.friend.profileId).not.toBe('f-jack');
  });
});

describe('course matching', () => {
  it('generic words are ignored', () => {
    expect(coreTokens('Sonoma Golf Club')).toEqual(['sonoma']);
    expect(coreTokens('Sonoma GC')).toEqual(['sonoma']);
  });
  it('searches looser variants: the upstream search misses "Sonoma Golf Club"', () => {
    expect(courseQueryVariants('Sonoma Golf Club')).toContain('sonoma');
  });
  it('picks Sonoma GC over Sonoma Ranch for "Sonoma Golf Club"', () => {
    const pick = pickCourse('Sonoma Golf Club', [SONOMA_RANCH, SONOMA]);
    expect(pick.kind).toBe('confident');
    expect(pick.kind === 'confident' && pick.course.id).toBe('cdx8ze6s');
  });
  it('asks when two courses fit equally', () => {
    const a: CourseCandidate = { id: 'a', club_name: 'Lincoln Park', course_name: 'Lincoln Park' };
    const b: CourseCandidate = { id: 'b', club_name: 'Lincoln Park Golf Course', course_name: 'Lincoln Park' };
    expect(pickCourse('Lincoln Park', [a, b]).kind).toBe('choose');
  });
  it('returns none for unrelated results', () => {
    expect(pickCourse('Augusta', [SONOMA]).kind).toBe('none');
  });
  it('cleans display names', () => {
    expect(courseDisplayName(SONOMA)).toBe('Sonoma GC');
  });
});

describe('tee choice', () => {
  it('uses a tee named on the card', () => {
    const t = chooseTee(COLOUR_TEES, 'blues', null);
    expect(t?.tee.tee_name).toBe('Blue');
    expect(t?.note).toBeNull();
  });
  it('maps a colour by length when the card uses other names, and says so', () => {
    const t = chooseTee(SONOMA_TEES, 'blues', null);
    // Singles by length: I, II, III, IV -> "blue" is the second-longest.
    expect(t?.tee.tee_name).toBe('II');
    expect(t?.how).toBe('by-length');
    expect(t?.note).toMatch(/No "blues" tee/);
  });
  it('tips means the longest; reds the shortest', () => {
    expect(chooseTee(SONOMA_TEES, 'the tips', null)?.tee.tee_name).toBe('I');
    expect(chooseTee(SONOMA_TEES, 'reds', null)?.tee.tee_name).toBe('IV');
  });
  it('names a roman-numeral tee directly', () => {
    expect(chooseTee(SONOMA_TEES, 'III', null)?.tee.tee_name).toBe('III');
  });
  it('falls back to the profile preference, then the middle tee', () => {
    expect(chooseTee(COLOUR_TEES, null, 'White')?.how).toBe('preference');
    const d = chooseTee(COLOUR_TEES, null, null);
    expect(d?.how).toBe('default');
    expect(['Blue', 'White']).toContain(d?.tee.tee_name);
  });
});

const you: DraftPlayer = { key: 'you', name: 'Rishi C', kind: 'you', profileId: 'me', handicap: 8, saidAs: null, spoken: '', alternatives: [] };
const guest = (key: string, name: string): DraftPlayer => ({ key, name, kind: 'guest', profileId: null, handicap: null, saidAs: null, spoken: name.split(' ')[0], alternatives: [] });
const four = [you, guest('p1', 'Jack Turner'), guest('p2', 'Jim Reid'), guest('p3', 'Tim Shaw')];
let n = 0;
const gid = () => `g${++n}`;
const game = (g: Partial<PlanGame> & Pick<PlanGame, 'type'>): PlanGame => ({ stake: null, carryover: null, autoPress: null, modified: null, teams: null, teamScoring: null, perHole: null, custom: null, ...g });

describe('games from a newer server', () => {
  it('an unknown game type is an issue, not a crash', () => {
    const r = resolveGames({ games: [game({ type: 'hammer_time' as never })], players: four, isPro: true, useNet: true, generateId: gid });
    expect(r.issues[0].message).toMatch(/newer version/);
  });
});

describe('games', () => {
  it('skins $5 a hole for four players', () => {
    const r = resolveGames({ games: [game({ type: 'skins', stake: 5 })], players: four, isPro: true, useNet: true, generateId: gid });
    expect(r.issues).toEqual([]);
    expect(r.games[0]).toMatchObject({ type: 'skins', stakes: 5, carryover: false, useNet: true });
  });
  it('rejects a game the player count cannot support', () => {
    const r = resolveGames({ games: [game({ type: 'vegas', stake: 1 })], players: four.slice(0, 3), isPro: true, useNet: true, generateId: gid });
    expect(r.games).toEqual([]);
    expect(r.issues[0].message).toMatch(/Vegas needs exactly 4 players; you have 3/);
  });
  it('a missing amount uses the default and says so', () => {
    const r = resolveGames({ games: [game({ type: 'nassau' })], players: four, isPro: true, useNet: true, generateId: gid });
    expect(r.games[0].stakes).toBe(5);
    expect(r.assumptions[0].message).toMatch(/\$5 a side/);
  });
  it('blocks absurd amounts', () => {
    const r = resolveGames({ games: [game({ type: 'skins', stake: 5000 })], players: four, isPro: true, useNet: true, generateId: gid });
    expect(r.games).toEqual([]);
    expect(r.issues[0].message).toMatch(/Check the amount/);
  });
  it('Pro games are flagged for the paywall on free accounts', () => {
    const r = resolveGames({ games: [game({ type: 'wolf', stake: 2 }), game({ type: 'skins', stake: 2 })], players: four, isPro: false, useNet: true, generateId: gid });
    expect(r.needsPro).toEqual(['wolf']);
    expect(r.games.map(g => g.type)).toEqual(['skins']);
  });
  it('fourball match teams from "me and Jack vs Jim and Tim"', () => {
    const r = resolveGames({
      games: [game({ type: 'match', stake: 20, teams: [['me', 'Jack'], ['Jim', 'Tim']] })],
      players: four, isPro: true, useNet: true, generateId: gid,
    });
    expect(r.issues).toEqual([]);
    expect(r.games[0].matchPlayFormat).toBe('fourball');
    expect(r.games[0].matchPlayTeams?.map(t => t.playerIds)).toEqual([['you', 'p1'], ['p2', 'p3']]);
  });
  it('one named side implies the other', () => {
    const r = resolveGames({ games: [game({ type: 'match', stake: 20, teams: [['me', 'Tim'], []] })], players: four, isPro: true, useNet: true, generateId: gid });
    expect(r.games[0].matchPlayTeams?.map(t => t.playerIds)).toEqual([['you', 'p3'], ['p1', 'p2']]);
  });
  it('match play with 3 players is refused', () => {
    const r = resolveGames({ games: [game({ type: 'match', stake: 20 })], players: four.slice(0, 3), isPro: true, useNet: true, generateId: gid });
    expect(r.issues[0].message).toMatch(/Match play needs 2 or 4 players/);
  });
  it('Vegas teams set the seat order, with the user\'s team first', () => {
    const r = resolveGames({ games: [game({ type: 'vegas', stake: 1, teams: [['Jack', 'Jim'], ['me', 'Tim']] })], players: four, isPro: true, useNet: true, generateId: gid });
    expect(r.issues).toEqual([]);
    expect(r.playerOrder).toEqual(['you', 'p3', 'p1', 'p2']);
  });
  it('the same game twice is one game', () => {
    const r = resolveGames({ games: [game({ type: 'skins', stake: 5 }), game({ type: 'skins', carryover: true })], players: four, isPro: true, useNet: true, generateId: gid });
    expect(r.games).toHaveLength(1);
  });
});

describe('local parser', () => {
  const cases: [string, Partial<{ course: string | null; tee: string | null; players: string[]; games: [string, number | null][]; holes: number | null }>][] = [
    ["I'm playing Sonoma Golf Club from the blues with Jack, Jim and Tim and we are playing skins 5 per hole",
      { course: 'Sonoma Golf Club', tee: 'blues', players: ['Jack', 'Jim', 'Tim'], games: [['skins', 5]] }],
    ['Pebble Beach with Mike and Dave, $10 nassau with auto presses and skins for 2',
      { course: 'Pebble Beach', players: ['Mike', 'Dave'], games: [['nassau', 10], ['skins', 2]] }],
    ['Playing the muni off the whites with Sam, front nine, no handicaps, skins $1',
      { course: 'muni', tee: 'whites', players: ['Sam'], games: [['skins', 1]], holes: 9 }],
    ['match play me and Jack vs Jim and Tim for 20 bucks at Harding Park',
      { course: 'Harding Park', players: ['Jack', 'Jim', 'Tim'], games: [['match', 20]] }],
    ['5-5-5 nassau with Dave at Olympic Club', { course: 'Olympic Club', players: ['Dave'], games: [['nassau', 5]] }],
    ['skins twenty five dollars a skin with carryovers with Tom and Ben', { players: ['Tom', 'Ben'], games: [['skins', 25]] }],
    ['stableford with Ryan and Kevin at Sharp Park 9 holes', { course: 'Sharp Park', players: ['Ryan', 'Kevin'], games: [['stableford', null]], holes: 9 }],
  ];
  for (const [text, want] of cases) {
    it(text, () => {
      const p = localParse(text);
      if ('course' in want) expect(p.course.query).toBe(want.course);
      if ('tee' in want) expect(p.course.tee).toBe(want.tee);
      if (want.players) expect(p.players.map(x => x.name)).toEqual(want.players);
      if (want.games) expect(p.games.map(g => [g.type, g.stake])).toEqual(want.games);
      if ('holes' in want) expect(p.course.holes).toBe(want.holes);
    });
  }
  it('reads number words', () => {
    expect(wordsToNumber('twenty five')).toBe(25);
    expect(wordsToNumber('a hundred')).toBe(100);
  });
  it('finds every amount said', () => {
    expect(amountsSaid('$5 skins and a ten dollar nassau').map(a => a.value)).toEqual([5, 10]);
  });
  it('flags an AI amount that was never said', () => {
    const plan = localParse('skins with Jack');
    plan.games[0].stake = 20;
    expect(unsaidAmounts(plan, 'skins with Jack')).toEqual([{ type: 'skins', stake: 20 }]);
    expect(unsaidAmounts(plan, 'skins for twenty with Jack')).toEqual([]);
  });
  it('keeping score for others leaves the speaker out (and the draft says it is unsupported)', () => {
    expect(localParse("I'm not playing, just keeping score for Jack and Jim").userPlaying).toBe(false);
  });
});

describe('buildDraft', () => {
  const details: CourseDetails = { ...SONOMA, tees: { male: SONOMA_TEES } };
  const searches: string[] = [];
  const deps: DraftDeps = {
    searchCourses: async q => {
      searches.push(q);
      // Mirrors the live endpoint: only the bare word finds Sonoma GC.
      return q.toLowerCase() === 'sonoma' ? [SONOMA, SONOMA_RANCH] : [];
    },
    getCourseDetails: async id => (id === SONOMA.id ? details : null),
    friends: [
      { profileId: 'f-jack', name: 'Jack Turner', handicap: 12 },
      { profileId: 'f-james', name: 'James Reid', handicap: 6 },
      { profileId: 'f-tim', name: 'Tim Shaw', handicap: 18 },
    ],
    user: { profileId: 'me', name: 'Rishi Clark', handicap: 8.4, teePreference: null },
    isPro: false,
    maxPlayers: 4,
    generateId: gid,
  };
  const text = 'I\'m playing Sonoma Golf Club from the blues with Jack, Jim and Tim and we are playing skins 5 per hole';

  it('the headline example becomes a ready-to-play round', async () => {
    const d = await buildDraft(localParse(text), text, 'local', deps);
    expect(d.issues).toEqual([]);
    expect(canTeeOff(d)).toBe(true);
    expect(d.course?.name).toBe('Sonoma GC');
    expect(d.tee?.tee_name).toBe('II');
    expect(d.slope).toBe(136);
    expect(d.holeInfo).toHaveLength(18);
    expect(d.players.map(p => [p.name, p.kind])).toEqual([
      ['Rishi Clark', 'you'], ['Jack Turner', 'friend'], ['James Reid', 'friend'], ['Tim Shaw', 'friend'],
    ]);
    expect(d.games).toHaveLength(1);
    expect(d.games[0]).toMatchObject({ type: 'skins', stakes: 5, carryover: false });
    expect(d.assumptions.map(a => a.field)).toContain('tee');
    expect(searches).toContain('sonoma');
  });

  it('an unknown name is a guest, flagged', async () => {
    const t = 'Sonoma with Zed, skins $2';
    const d = await buildDraft(localParse(t), t, 'local', deps);
    expect(d.players.find(p => p.name === 'Zed')?.kind).toBe('guest');
    expect(d.assumptions.some(a => /Zed isn't in your friends/.test(a.message))).toBe(true);
  });

  it('an AI amount that was not said blocks the round', async () => {
    const plan: RoundPlan = { ...localParse(text) };
    plan.games = [{ ...plan.games[0], stake: 50 }];
    const d = await buildDraft(plan, text, 'ai', deps);
    expect(canTeeOff(d)).toBe(false);
    expect(d.issues.some(i => /\$50 wasn't in what you said/.test(i.message))).toBe(true);
  });

  it('no course said blocks the round', async () => {
    const t = 'skins with Jack for 5';
    const d = await buildDraft(localParse(t), t, 'local', deps);
    expect(d.issues.some(i => i.field === 'course')).toBe(true);
  });

  it('percentage handicaps scale each index', async () => {
    const t = 'Sonoma with Jack, 80% handicaps, skins $2';
    const d = await buildDraft(localParse(t), t, 'local', deps);
    expect(d.players.find(p => p.kind === 'you')?.handicap).toBeCloseTo(6.72);
  });

  it('overrides apply the user\'s picks', async () => {
    const t = 'Sonoma with Tim, skins $2';
    const d = await buildDraft(localParse(t), t, 'local', deps, { teeName: 'IV', friendFor: { tim: null } });
    expect(d.tee?.tee_name).toBe('IV');
    expect(d.players.find(p => p.key === 'p1')?.kind).toBe('guest');
  });

  it('a scorekeeper who is not playing is refused with a reason', async () => {
    const t = "I'm not playing, just keeping score for Jack and Jim at Sonoma, skins $2";
    const d = await buildDraft(localParse(t), t, 'local', deps);
    expect(d.issues.some(i => /Keeping score without playing/.test(i.message))).toBe(true);
  });

  it('Pro games can be dropped to start on a free account', async () => {
    const t = 'Sonoma with Jack, $10 nassau and $2 skins';
    const d1 = await buildDraft(localParse(t), t, 'local', deps);
    expect(d1.needsPro).toEqual(['nassau']);
    expect(canTeeOff(d1)).toBe(false);
    const d2 = await buildDraft(localParse(t), t, 'local', deps, { dropGames: ['nassau'] });
    expect(d2.needsPro).toEqual([]);
    expect(d2.games.map(g => g.type)).toEqual(['skins']);
    expect(canTeeOff(d2)).toBe(true);
  });

  it('back nine uses holes 10-18', () => {
    const h = holeInfoFor(SONOMA_TEES[0], 9, 'back');
    expect(h).toHaveLength(9);
    expect(h[0]).toMatchObject({ number: 1, par: pars[9] });
  });
});
