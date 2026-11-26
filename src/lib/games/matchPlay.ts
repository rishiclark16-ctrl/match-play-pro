import { Score, Player, HoleInfo, Team, GameConfig, TeamScoring, MatchPayout } from '@/types/golf';

export type StrokesPerHoleMap = Map<string, Map<number, number>>;

export interface MatchPlayHoleResult {
  holeNumber: number;
  winnerId: string | null; // null = halved (singles: player id, fourball: team id)
  grossScores: Record<string, number>;
  netScores: Record<string, number>;
  strokesReceived: Record<string, number>;
  /** best_and_aggregate only: points each team took on the hole (0–2). */
  teamPoints?: Record<string, number>;
  /** aggregate scoring only: each team's combined net score on the hole. */
  teamTotals?: Record<string, number>;
}

export interface MatchPlayResult {
  holeResults: MatchPlayHoleResult[];
  leaderId: string | null; // singles: player id, fourball: team id
  holesUp: number;
  holesPlayed: number;
  holesRemaining: number;
  matchStatus: 'ongoing' | 'dormie' | 'won' | 'halved' | 'not_started';
  winnerId: string | null;
  statusText: string;
  winMargin?: string;
  format: 'singles' | 'fourball';
  teams?: Team[];
  /** fourball only: how team hole scores were formed. holesUp counts points for best_and_aggregate. */
  scoring?: TeamScoring;
}

/**
 * Calculate match play results for a 2-player match
 * Uses net scores based on strokesPerHole (differential strokes)
 */
export function calculateMatchPlay(
  scores: Score[],
  players: Player[],
  holeInfo: HoleInfo[],
  strokesPerHole: StrokesPerHoleMap | undefined,
  totalHoles: 9 | 18
): MatchPlayResult {
  if (players.length !== 2) {
    return {
      holeResults: [],
      leaderId: null,
      holesUp: 0,
      holesPlayed: 0,
      holesRemaining: totalHoles,
      matchStatus: 'not_started',
      winnerId: null,
      statusText: 'Match Play requires 2 players',
      format: 'singles',
    };
  }

  const [player1, player2] = players;
  const holeResults: MatchPlayHoleResult[] = [];
  
  let player1HolesWon = 0;
  let player2HolesWon = 0;
  let holesPlayed = 0;

  // Process each hole
  for (let holeNum = 1; holeNum <= totalHoles; holeNum++) {
    const holeData = holeInfo.find(h => h.number === holeNum);
    if (!holeData) continue;

    const p1Score = scores.find(s => s.playerId === player1.id && s.holeNumber === holeNum);
    const p2Score = scores.find(s => s.playerId === player2.id && s.holeNumber === holeNum);

    // Skip if either player hasn't scored this hole
    if (!p1Score || !p2Score) continue;

    holesPlayed++;

    // Get strokes received for this hole
    const p1Strokes = strokesPerHole?.get(player1.id)?.get(holeNum) ?? 0;
    const p2Strokes = strokesPerHole?.get(player2.id)?.get(holeNum) ?? 0;

    // Calculate net scores
    const p1Net = p1Score.strokes - p1Strokes;
    const p2Net = p2Score.strokes - p2Strokes;

    let winnerId: string | null = null;
    if (p1Net < p2Net) {
      winnerId = player1.id;
      player1HolesWon++;
    } else if (p2Net < p1Net) {
      winnerId = player2.id;
      player2HolesWon++;
    }
    // If equal, hole is halved (winnerId stays null)

    holeResults.push({
      holeNumber: holeNum,
      winnerId,
      grossScores: {
        [player1.id]: p1Score.strokes,
        [player2.id]: p2Score.strokes,
      },
      netScores: {
        [player1.id]: p1Net,
        [player2.id]: p2Net,
      },
      strokesReceived: {
        [player1.id]: p1Strokes,
        [player2.id]: p2Strokes,
      },
    });
  }

  const holesRemaining = totalHoles - holesPlayed;
  const holeDiff = player1HolesWon - player2HolesWon;
  const holesUp = Math.abs(holeDiff);
  const leaderId = holeDiff > 0 ? player1.id : holeDiff < 0 ? player2.id : null;
  const leaderName = leaderId === player1.id ? player1.name : leaderId === player2.id ? player2.name : null;

  // Determine match status
  let matchStatus: MatchPlayResult['matchStatus'] = 'ongoing';
  let winnerId: string | null = null;
  let statusText = 'All Square';
  let winMargin: string | undefined;

  if (holesPlayed === 0) {
    matchStatus = 'not_started';
    statusText = 'Match not started';
  } else if (holesUp > holesRemaining) {
    // Match is won - leader has more holes up than holes remaining
    matchStatus = 'won';
    winnerId = leaderId;
    winMargin = holesRemaining === 0 ? `${holesUp} UP` : `${holesUp}&${holesRemaining}`;
    statusText = `${leaderName} wins ${winMargin}`;
  } else if (holesUp === holesRemaining && holesUp > 0) {
    // Dormie - leader is up by exactly the number of holes remaining
    matchStatus = 'dormie';
    statusText = `${leaderName} ${holesUp} UP (Dormie)`;
  } else if (holesRemaining === 0 && holesUp === 0) {
    // Match ended in a tie
    matchStatus = 'halved';
    statusText = 'Match Halved';
  } else if (holesUp === 0) {
    statusText = 'All Square';
  } else {
    statusText = `${leaderName} ${holesUp} UP`;
  }

  return {
    holeResults,
    leaderId,
    holesUp,
    holesPlayed,
    holesRemaining,
    matchStatus,
    winnerId,
    statusText,
    winMargin,
    format: 'singles' as const,
  };
}

export interface FourballOptions {
  /** How a team's hole score is formed. Default 'best' (four-ball). */
  scoring?: TeamScoring;
  /** 'per_hole' plays every hole out (no closing the match early). Default 'match'. */
  payout?: MatchPayout;
}

/** The fourball options stored on a match game. */
export function fourballOptions(game?: Pick<GameConfig, 'teamScoring' | 'matchPayout'> | null): FourballOptions {
  return { scoring: game?.teamScoring ?? 'best', payout: game?.matchPayout ?? 'match' };
}

const POINT_UNIT = (scoring: TeamScoring) => (scoring === 'best_and_aggregate' ? 2 : 1);

/**
 * Team (2v2, or 1v2 in a threesome) match play. Each player plays their own ball.
 *
 * - best: the team's better net ball wins the hole (four-ball).
 * - aggregate: the team's combined net score wins the hole ("low total"). Needs
 *   every player on both teams to have a score on the hole.
 * - best_and_aggregate: one point for low ball and one for low total, so a hole is
 *   worth two points ("low ball, low total"). `holesUp` then counts points.
 */
export function calculateFourballMatchPlay(
  scores: Score[],
  players: Player[],
  holeInfo: HoleInfo[],
  strokesPerHole: StrokesPerHoleMap | undefined,
  totalHoles: 9 | 18,
  teams: Team[],
  options: FourballOptions = {},
): MatchPlayResult {
  const scoring = options.scoring ?? 'best';
  const payout = options.payout ?? 'match';
  const unit = POINT_UNIT(scoring);
  if (teams.length !== 2) {
    return {
      holeResults: [],
      leaderId: null,
      holesUp: 0,
      holesPlayed: 0,
      holesRemaining: totalHoles,
      matchStatus: 'not_started',
      winnerId: null,
      statusText: 'Fourball requires 2 teams',
      format: 'fourball',
      teams,
      scoring,
    };
  }

  const [teamA, teamB] = teams;
  const holeResults: MatchPlayHoleResult[] = [];

  let teamAPoints = 0;
  let teamBPoints = 0;
  let holesPlayed = 0;

  for (let holeNum = 1; holeNum <= totalHoles; holeNum++) {
    const holeData = holeInfo.find(h => h.number === holeNum);
    if (!holeData) continue;

    const teamHole = (team: Team) => {
      const grossScores: Record<string, number> = {};
      const netScores: Record<string, number> = {};
      const strokesRec: Record<string, number> = {};
      const nets: number[] = [];
      for (const pid of team.playerIds) {
        const score = scores.find(s => s.playerId === pid && s.holeNumber === holeNum);
        if (!score) continue;
        const strokes = strokesPerHole?.get(pid)?.get(holeNum) ?? 0;
        const net = score.strokes - strokes;
        grossScores[pid] = score.strokes;
        netScores[pid] = net;
        strokesRec[pid] = strokes;
        nets.push(net);
      }
      const complete = nets.length === team.playerIds.length;
      return {
        best: nets.length ? Math.min(...nets) : null,
        total: complete ? nets.reduce((a, b) => a + b, 0) : null,
        grossScores, netScores, strokesRec,
      };
    };

    const a = teamHole(teamA);
    const b = teamHole(teamB);
    // A hole counts once every score its format needs is in.
    const needsTotal = scoring !== 'best';
    if (a.best === null || b.best === null) continue;
    if (needsTotal && (a.total === null || b.total === null)) continue;

    holesPlayed++;

    let pa = 0;
    let pb = 0;
    if (scoring !== 'aggregate') {
      if (a.best < b.best) pa++; else if (b.best < a.best) pb++;
    }
    if (scoring !== 'best') {
      if (a.total! < b.total!) pa++; else if (b.total! < a.total!) pb++;
    }
    teamAPoints += pa;
    teamBPoints += pb;

    holeResults.push({
      holeNumber: holeNum,
      winnerId: pa > pb ? teamA.id : pb > pa ? teamB.id : null,
      grossScores: { ...a.grossScores, ...b.grossScores },
      netScores: { ...a.netScores, ...b.netScores },
      strokesReceived: { ...a.strokesRec, ...b.strokesRec },
      teamPoints: unit > 1 ? { [teamA.id]: pa, [teamB.id]: pb } : undefined,
      teamTotals: scoring !== 'best' ? { [teamA.id]: a.total!, [teamB.id]: b.total! } : undefined,
    });
  }

  const holesRemaining = totalHoles - holesPlayed;
  const pointsLeft = holesRemaining * unit;
  const diff = teamAPoints - teamBPoints;
  const holesUp = Math.abs(diff);
  const leaderId = diff > 0 ? teamA.id : diff < 0 ? teamB.id : null;
  const leaderName = leaderId === teamA.id ? teamA.name : leaderId === teamB.id ? teamB.name : null;
  const up = (n: number) => (unit > 1 ? `${n} ${n === 1 ? 'pt' : 'pts'} up` : `${n} UP`);

  let matchStatus: MatchPlayResult['matchStatus'] = 'ongoing';
  let winnerId: string | null = null;
  let statusText = 'All Square';
  let winMargin: string | undefined;
  // A per-hole bet plays every hole: nothing is "closed out" early.
  const canClose = payout === 'match';

  if (holesPlayed === 0) {
    matchStatus = 'not_started';
    statusText = 'Match not started';
  } else if (holesRemaining === 0 && holesUp === 0) {
    matchStatus = 'halved';
    statusText = 'Match Halved';
  } else if (holesUp > 0 && (holesRemaining === 0 || (canClose && holesUp > pointsLeft))) {
    matchStatus = 'won';
    winnerId = leaderId;
    winMargin = unit > 1 || holesRemaining === 0 || !canClose ? up(holesUp) : `${holesUp}&${holesRemaining}`;
    statusText = `${leaderName} wins ${winMargin}`;
  } else if (canClose && holesUp === pointsLeft && holesUp > 0) {
    matchStatus = 'dormie';
    statusText = `${leaderName} ${up(holesUp)} (Dormie)`;
  } else if (holesUp === 0) {
    statusText = 'All Square';
  } else {
    statusText = `${leaderName} ${up(holesUp)}`;
  }

  return {
    holeResults,
    leaderId,
    holesUp,
    holesPlayed,
    holesRemaining,
    matchStatus,
    winnerId,
    statusText,
    winMargin,
    format: 'fourball',
    teams,
    scoring,
  };
}

/**
 * Get a brief status string for the match (e.g., "2 UP", "AS", "3&2")
 */
export function getMatchPlayStatusBrief(result: MatchPlayResult): string {
  if (result.matchStatus === 'won') {
    return result.winMargin || 'Won';
  }
  if (result.matchStatus === 'halved') {
    return 'Halved';
  }
  if (result.holesUp === 0) {
    return 'AS'; // All Square
  }
  return `${result.holesUp} UP`;
}

/**
 * Generate a human-readable headline for a completed match play result.
 * e.g., "Rishi beat Andrew 5&4" or "Match Halved"
 */
export function generateMatchPlayHeadline(
  result: MatchPlayResult,
  players: { id: string; name: string }[]
): string | null {
  if (result.matchStatus === 'not_started' || result.matchStatus === 'ongoing') return null;
  if (result.matchStatus === 'dormie') return null;

  if (result.format === 'fourball' && result.teams?.length === 2) {
    const [tA, tB] = result.teams;
    if (result.matchStatus === 'halved') {
      return `${tA.name} and ${tB.name} halved their match`;
    }
    if (result.matchStatus === 'won' && result.winnerId) {
      const winner = result.teams.find(t => t.id === result.winnerId);
      const loser = result.teams.find(t => t.id !== result.winnerId);
      if (!winner || !loser) return null;
      return `${winner.name} beat ${loser.name} ${result.winMargin || '1 UP'}`;
    }
    return null;
  }

  if (result.matchStatus === 'halved') {
    const names = players.map(p => p.name.split(' ')[0]);
    return `${names[0]} and ${names[1]} halved their match`;
  }

  if (result.matchStatus === 'won' && result.winnerId) {
    const winner = players.find(p => p.id === result.winnerId);
    const loser = players.find(p => p.id !== result.winnerId);
    if (!winner || !loser) return null;
    const winnerFirst = winner.name.split(' ')[0];
    const loserFirst = loser.name.split(' ')[0];
    return `${winnerFirst} beat ${loserFirst} ${result.winMargin || '1 UP'}`;
  }

  return null;
}

/**
 * Get the color class for displaying match status
 */
export function getMatchPlayStatusColor(result: MatchPlayResult, playerId: string): string {
  if (result.matchStatus === 'halved' || result.holesUp === 0) {
    return 'text-muted-foreground';
  }
  if (result.leaderId === playerId) {
    return 'text-primary';
  }
  return 'text-loss';
}


/**
 * Money for a decided fourball match: each player on the losing team pays the
 * stake, split evenly across the winning team ("$20 a man": in a 2v2 each winner
 * is +$20 and each loser -$20). A halved or undecided match pays nothing.
 * Shared by settlement, the live money tracker and the in-round preview.
 */
/**
 * What a team match pays. `stake` is per man.
 * - payout 'match': the stake, to the team that won the match. Live (`final` false)
 *   credits the current leader, "if the match ended here".
 * - payout 'per_hole': the stake times the holes (or points) up, to the leading team.
 */
export function fourballMoney(
  game: Pick<GameConfig, 'stakes' | 'matchPlayTeams' | 'matchPayout'>,
  result: Pick<MatchPlayResult, 'winnerId' | 'leaderId' | 'holesUp'>,
  final: boolean,
): { from: string; to: string; amount: number }[] {
  if (game.matchPayout === 'per_hole') {
    if (!result.leaderId || result.holesUp <= 0) return [];
    return fourballTransfers(game.matchPlayTeams, result.leaderId, game.stakes * result.holesUp);
  }
  const winner = final ? result.winnerId : result.winnerId ?? (result.holesUp > 0 ? result.leaderId : null);
  return fourballTransfers(game.matchPlayTeams, winner, game.stakes);
}

export function fourballTransfers(
  teams: Team[] | undefined,
  winnerTeamId: string | null,
  stakes: number,
): { from: string; to: string; amount: number }[] {
  if (!teams || teams.length !== 2 || !winnerTeamId || !(stakes > 0)) return [];
  const winners = teams.find(t => t.id === winnerTeamId)?.playerIds ?? [];
  const losers = teams.find(t => t.id !== winnerTeamId)?.playerIds ?? [];
  if (!winners.length || !losers.length) return [];
  const share = Math.round((stakes / winners.length) * 100) / 100;
  return losers.flatMap(from => winners.map(to => ({ from, to, amount: share })));
}
