/**
 * Turns the games a golfer asked for into GameConfig[] the scorecard can settle,
 * or explains exactly why it can't.
 *
 * Every rule here mirrors one the manual setup enforces (FormatStep player-count
 * gates, TIER_LIMITS) so a spoken round can never create a game the manual flow
 * would refuse.
 */
import type { GameConfig, Team } from '@/types/golf';
import type { DraftAssumption, DraftIssue, DraftPlayer, PlanGame, PlanGameType } from './types';
import { normalizeName, sameFirstName } from './names';

export const GAME_LABEL: Record<PlanGameType, string> = {
  skins: 'Skins', nassau: 'Nassau', match: 'Match play', stableford: 'Stableford',
  bestball: 'Best ball', wolf: 'Wolf', vegas: 'Vegas', nines: 'Nines', defender: 'Defender', sixes: 'Sixes',
};

/** Default stake and what one unit of it is, per game. Defaults match NewRound's. */
export const STAKE_UNIT: Record<PlanGameType, { default: number; unit: string } | null> = {
  skins: { default: 2, unit: 'a skin' },
  nassau: { default: 5, unit: 'a side' },
  match: { default: 10, unit: 'on the match' },
  wolf: { default: 2, unit: 'a point' },
  vegas: { default: 1, unit: 'a point' },
  nines: { default: 1, unit: 'a point' },
  defender: { default: 1, unit: 'a point' },
  sixes: { default: 1, unit: 'a point' },
  stableford: null,
  bestball: null,
};

/** Allowed total player counts (including the user), per game. */
const PLAYER_COUNTS: Record<PlanGameType, number[]> = {
  skins: [2, 3, 4, 5, 6, 7, 8],
  nassau: [2, 3, 4, 5, 6, 7, 8],
  match: [2, 4],
  stableford: [1, 2, 3, 4, 5, 6, 7, 8],
  bestball: [2, 3, 4, 5, 6, 7, 8],
  wolf: [3, 4],
  vegas: [4],
  nines: [3],
  defender: [3, 4],
  sixes: [4],
};

const FREE_GAMES = new Set<PlanGameType>(['match', 'skins']);

/** Largest stake we accept without asking: protects against "fifty" heard as "fifteen hundred". */
export const MAX_STAKE = 500;

export function formatStake(type: PlanGameType, stake: number): string {
  const unit = STAKE_UNIT[type]?.unit ?? '';
  const amount = Number.isInteger(stake) ? `$${stake}` : `$${stake.toFixed(2)}`;
  return `${amount} ${unit}`.trim();
}

function countsText(counts: number[]): string {
  if (counts.length === 1) return `exactly ${counts[0]}`;
  const contiguous = counts.every((n, i) => i === 0 || n === counts[i - 1] + 1);
  return contiguous ? `${counts[0]}–${counts[counts.length - 1]}` : counts.join(' or ');
}

const SELF_WORDS = new Set(['me', 'i', 'myself', 'you', 'mine']);

/** Resolves a spoken team member ("me", "Jack") to a draft player key. */
function findPlayerKey(spoken: string, players: DraftPlayer[]): string | null {
  const s = normalizeName(spoken);
  if (SELF_WORDS.has(s)) return players.find(p => p.kind === 'you')?.key ?? null;
  const first = s.split(' ')[0];
  const exact = players.filter(p => normalizeName(p.name) === s || (p.saidAs && normalizeName(p.saidAs) === s));
  if (exact.length === 1) return exact[0].key;
  const byFirst = players.filter(p => {
    const pf = normalizeName(p.name).split(' ')[0];
    const sf = p.saidAs ? normalizeName(p.saidAs).split(' ')[0] : '';
    return pf === first || sf === first || sameFirstName(pf, first);
  });
  return byFirst.length === 1 ? byFirst[0].key : null;
}

function teamName(keys: string[], players: DraftPlayer[]): string {
  return keys.map(k => players.find(p => p.key === k)?.name.split(' ')[0] ?? '?').join(' & ');
}

/**
 * Builds two teams from spoken names. With exactly one side named, the other side
 * is everyone else. Returns null (plus an issue) when the teams don't add up.
 */
function resolveTeams(
  spoken: [string[], string[]] | null,
  players: DraftPlayer[],
  label: string,
): { teams: [string[], string[]] | null; issue: string | null; assumed: boolean } {
  if (players.length !== 4) return { teams: null, issue: null, assumed: false };
  if (!spoken || (!spoken[0].length && !spoken[1].length)) {
    // Nothing said: the user and the next player vs the other two, like the manual default.
    return { teams: [[players[0].key, players[1].key], [players[2].key, players[3].key]], issue: null, assumed: true };
  }
  const a = spoken[0].map(n => findPlayerKey(n, players));
  const b = spoken[1].map(n => findPlayerKey(n, players));
  if (a.includes(null) || b.includes(null)) {
    return { teams: null, issue: `${label}: couldn't tell who is on which team`, assumed: false };
  }
  let teamA = [...new Set(a as string[])];
  let teamB = [...new Set(b as string[])];
  if (teamA.length && !teamB.length) teamB = players.map(p => p.key).filter(k => !teamA.includes(k));
  if (teamB.length && !teamA.length) teamA = players.map(p => p.key).filter(k => !teamB.includes(k));
  const overlap = teamA.some(k => teamB.includes(k));
  if (overlap || teamA.length !== 2 || teamB.length !== 2) {
    return { teams: null, issue: `${label}: teams need two players each`, assumed: false };
  }
  return { teams: [teamA, teamB], issue: null, assumed: false };
}

export interface ResolveGamesInput {
  games: PlanGame[];
  players: DraftPlayer[];
  isPro: boolean;
  useNet: boolean;
  generateId: () => string;
}

export interface ResolvedGames {
  games: GameConfig[];
  issues: DraftIssue[];
  assumptions: DraftAssumption[];
  /** Games that need Pro; the UI offers the paywall instead of failing. */
  needsPro: PlanGameType[];
  /**
   * Seat order the players must be in. Vegas pairs seats 1+2 against 3+4, so
   * spoken Vegas teams decide the order (the user's team first: seat 1 is the
   * round creator).
   */
  playerOrder: string[] | null;
}

export function resolveGames({ games, players, isPro, useNet, generateId }: ResolveGamesInput): ResolvedGames {
  const out: GameConfig[] = [];
  const issues: DraftIssue[] = [];
  const assumptions: DraftAssumption[] = [];
  const needsPro: PlanGameType[] = [];
  let playerOrder: string[] | null = null;
  const seen = new Set<PlanGameType>();
  const n = players.length;

  for (const g of games) {
    if (seen.has(g.type)) continue; // "skins ... and skins carry over" is one game
    seen.add(g.type);
    const label = GAME_LABEL[g.type];

    if (!PLAYER_COUNTS[g.type].includes(n)) {
      issues.push({
        field: 'games',
        message: `${label} needs ${countsText(PLAYER_COUNTS[g.type])} players; you have ${n}`,
      });
      continue;
    }
    if (!isPro && !FREE_GAMES.has(g.type)) {
      needsPro.push(g.type);
      continue;
    }

    let stake = 0;
    const unit = STAKE_UNIT[g.type];
    if (unit) {
      if (g.stake == null) {
        stake = unit.default;
        assumptions.push({ field: 'games', message: `${label} at ${formatStake(g.type, stake)}. No amount was said` });
      } else if (!(g.stake > 0) || !Number.isFinite(g.stake)) {
        issues.push({ field: 'games', message: `${label}: the amount didn't come through` });
        continue;
      } else if (g.stake > MAX_STAKE) {
        issues.push({ field: 'games', message: `${label} at ${formatStake(g.type, g.stake)}? Check the amount` });
        continue;
      } else {
        stake = Math.round(g.stake * 100) / 100;
      }
    }

    const config: GameConfig = { id: generateId(), type: g.type, stakes: stake, useNet };

    switch (g.type) {
      case 'skins':
        if (g.carryover && !isPro) {
          assumptions.push({ field: 'games', message: 'Skins carryover is a Pro feature, so ties are dropped' });
          config.carryover = false;
        } else {
          config.carryover = g.carryover ?? false;
        }
        break;
      case 'wolf':
        config.carryover = g.carryover ?? false;
        break;
      case 'vegas': {
        config.carryover = g.carryover ?? false;
        const t = resolveTeams(g.teams, players, label);
        if (!t.teams) {
          issues.push({ field: 'games', message: t.issue ?? `${label}: pick the teams` });
          continue;
        }
        const [a, b] = t.teams[0].includes('you') || !t.teams[1].includes('you') ? t.teams : [t.teams[1], t.teams[0]];
        playerOrder = [...a, ...b];
        assumptions.push({
          field: 'games',
          message: `Vegas teams: ${teamName(a, players)} vs ${teamName(b, players)}`,
        });
        break;
      }
      case 'nassau':
        config.autoPress = g.autoPress ?? false;
        break;
      case 'stableford':
        config.modifiedStableford = g.modified ?? false;
        break;
      case 'match': {
        if (n === 2) {
          config.matchPlayFormat = 'singles';
        } else {
          const t = resolveTeams(g.teams, players, label);
          if (!t.teams) {
            issues.push({ field: 'games', message: t.issue ?? `${label}: pick the teams` });
            continue;
          }
          config.matchPlayFormat = 'fourball';
          config.matchPlayTeams = [
            { id: 'team-a', name: teamName(t.teams[0], players), playerIds: t.teams[0], color: '#22C55E' },
            { id: 'team-b', name: teamName(t.teams[1], players), playerIds: t.teams[1], color: '#6366F1' },
          ];
          if (t.assumed) {
            assumptions.push({ field: 'games', message: `Match teams: ${teamName(t.teams[0], players)} vs ${teamName(t.teams[1], players)}` });
          }
        }
        break;
      }
      case 'bestball': {
        let teams: Team[];
        if (n === 4) {
          const t = resolveTeams(g.teams, players, label);
          if (!t.teams) {
            issues.push({ field: 'games', message: t.issue ?? `${label}: pick the teams` });
            continue;
          }
          teams = t.teams.map((keys, i) => ({
            id: `team-${i + 1}`, name: teamName(keys, players), playerIds: keys, color: i === 0 ? '#22c55e' : '#3b82f6',
          }));
          if (t.assumed) {
            assumptions.push({ field: 'games', message: `Best ball teams: ${teams[0].name} vs ${teams[1].name}` });
          }
        } else {
          // Not four players: everyone is their own side, as in the manual default.
          teams = players.map((p, i) => ({ id: `team-${i + 1}`, name: p.name, playerIds: [p.key], color: '#22c55e' }));
        }
        config.teams = teams;
        break;
      }
      default:
        break;
    }
    out.push(config);
  }

  return { games: out, issues, assumptions, needsPro: [...new Set(needsPro)], playerOrder };
}
