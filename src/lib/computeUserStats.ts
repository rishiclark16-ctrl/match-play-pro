import type { SupabaseClient } from '@supabase/supabase-js';
import { computeAllTimeStats } from './statCalculations';

export interface ScoreDistribution {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
  total: number;
}

export interface GolfStats {
  holesWon: number;
  holesPlayed: number;
  matchesWon: number;
  matchesPlayed: number;
  totalMoneyWon: number;
  bestCourse: { name: string; wins: number } | null;
  hotHole: { course: string; hole: number; wins: number } | null;
  roundsPlayed: number;
  scoreDistribution: ScoreDistribution;
  avgScore: number | null;
  longestWinStreak: number;
  bestRound: { score: number; courseName: string } | null;
  bestPayout: { amount: number; courseName: string } | null;
  mostSkins: { count: number; courseName: string } | null;
  scoreTrend: { delta: number; improving: boolean } | null;
}

const EMPTY_STATS: GolfStats = {
  holesWon: 0, holesPlayed: 0, matchesWon: 0, matchesPlayed: 0,
  totalMoneyWon: 0, bestCourse: null, hotHole: null, roundsPlayed: 0,
  scoreDistribution: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, total: 0 },
  avgScore: null, longestWinStreak: 0,
  bestRound: null, bestPayout: null, mostSkins: null, scoreTrend: null,
};

/**
 * Aggregates the current user's all-time golf stats from supabase:
 *   1. fetch the user's player rows + their rounds + every score
 *   2. compute hole win-rate, score distribution (eagles/birdies/etc.),
 *      best course, hottest hole
 *   3. compute matches won/played, money won, longest win streak
 *   4. delegate best-round / best-payout / most-skins / scoreTrend to
 *      computeAllTimeStats()
 *
 * Returns a fresh GolfStats with zero/null fields when the user has no
 * recorded players yet.
 */
export async function computeUserStats(
  userId: string,
  supabase: SupabaseClient,
): Promise<GolfStats> {
  const { data: playerData } = await supabase
    .from('players')
    .select('id, round_id, name')
    .eq('profile_id', userId);

  if (!playerData || playerData.length === 0) {
    return { ...EMPTY_STATS };
  }

  const playerIds = playerData.map(p => p.id);
  const roundIds = [...new Set(playerData.map(p => p.round_id).filter(Boolean))] as string[];

  const { data: roundsData } = await supabase
    .from('rounds')
    .select('id, course_name, status, games, stakes, hole_info')
    .in('id', roundIds);

  const { data: allScoresData } = await supabase
    .from('scores')
    .select('id, round_id, player_id, hole_number, strokes')
    .in('round_id', roundIds);

  // Build a lookup: roundId -> holeNumber -> par (from hole_info)
  const parLookup: Record<string, Record<number, number>> = {};
  if (roundsData) {
    roundsData.forEach(round => {
      const holes = Array.isArray(round.hole_info) ? (round.hole_info as { number: number; par: number }[]) : [];
      const map: Record<number, number> = {};
      holes.forEach(h => { if (h.number && h.par) map[h.number] = h.par; });
      parLookup[round.id] = map;
    });
  }

  let holesWon = 0;
  let holesPlayed = 0;
  const courseWins: Record<string, number> = {};
  const holeWins: Record<string, Record<number, number>> = {};
  const scoreDistribution: ScoreDistribution = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, total: 0 };
  let totalStrokesVsPar = 0;
  let scoredHoles = 0;

  if (allScoresData && roundsData) {
    // Score distribution for the user's own scores
    allScoresData.forEach(score => {
      if (!playerIds.includes(score.player_id ?? '')) return;
      if (!score.strokes) return;
      const par = parLookup[score.round_id ?? '']?.[score.hole_number] ?? 0;
      if (!par) return;

      const diff = score.strokes - par;
      scoreDistribution.total++;
      scoredHoles++;
      totalStrokesVsPar += diff;

      if (diff <= -2) scoreDistribution.eagles++;
      else if (diff === -1) scoreDistribution.birdies++;
      else if (diff === 0) scoreDistribution.pars++;
      else if (diff === 1) scoreDistribution.bogeys++;
      else scoreDistribution.doubles++;
    });

    // Group scores by round and hole for hole wins
    const scoresByRoundHole: Record<string, Record<number, Array<{ playerId: string; strokes: number }>>> = {};
    allScoresData.forEach(score => {
      if (!score.round_id || !score.player_id) return;
      if (!scoresByRoundHole[score.round_id]) scoresByRoundHole[score.round_id] = {};
      if (!scoresByRoundHole[score.round_id][score.hole_number]) scoresByRoundHole[score.round_id][score.hole_number] = [];
      scoresByRoundHole[score.round_id][score.hole_number].push({ playerId: score.player_id, strokes: score.strokes });
    });

    Object.entries(scoresByRoundHole).forEach(([roundId, holes]) => {
      const round = roundsData.find(r => r.id === roundId);
      const courseName = round?.course_name || 'Unknown';

      Object.entries(holes).forEach(([holeNum, scores]) => {
        if (scores.length < 2) return;
        const userScore = scores.find(s => playerIds.includes(s.playerId));
        if (!userScore) return;
        holesPlayed++;
        const minStrokes = Math.min(...scores.map(s => s.strokes));
        const winners = scores.filter(s => s.strokes === minStrokes);
        if (userScore.strokes === minStrokes && winners.length === 1) {
          holesWon++;
          courseWins[courseName] = (courseWins[courseName] || 0) + 1;
          if (!holeWins[courseName]) holeWins[courseName] = {};
          const hole = parseInt(holeNum);
          holeWins[courseName][hole] = (holeWins[courseName][hole] || 0) + 1;
        }
      });
    });
  }

  let bestCourse: { name: string; wins: number } | null = null;
  Object.entries(courseWins).forEach(([name, wins]) => {
    if (!bestCourse || wins > bestCourse.wins) bestCourse = { name, wins };
  });

  let hotHole: { course: string; hole: number; wins: number } | null = null;
  Object.entries(holeWins).forEach(([course, holes]) => {
    Object.entries(holes).forEach(([hole, wins]) => {
      if (!hotHole || wins > hotHole.wins) hotHole = { course, hole: parseInt(hole), wins };
    });
  });

  let matchesWon = 0;
  let matchesPlayed = 0;
  let totalMoneyWon = 0;
  let longestWinStreak = 0;
  let currentStreak = 0;

  // Pure stat computation across completed rounds
  const completedRoundsForStats = roundsData
    ? roundsData.filter(r => r.status === 'complete').map(round => {
        const userPlayerId = playerData.find(p => p.round_id === round.id)?.id ?? '';
        const roundScores = allScoresData
          ? allScoresData
              .filter(s => s.round_id === round.id)
              .map(s => ({
                player_id: s.player_id ?? '',
                hole_number: s.hole_number,
                strokes: s.strokes,
                par: parLookup[round.id]?.[s.hole_number] ?? 0,
              }))
          : [];
        return {
          id: round.id,
          course_name: round.course_name,
          games: Array.isArray(round.games)
            ? (round.games as Array<{ type: string }>)
            : [],
          stakes: round.stakes as number | null,
          user_player_id: userPlayerId,
          scores: roundScores,
        };
      })
    : [];

  const { bestRound, bestPayout, mostSkins, scoreTrend } = computeAllTimeStats(
    completedRoundsForStats,
    userId,
  );

  if (roundsData && allScoresData) {
    const completedRounds = roundsData.filter(r => r.status === 'complete');

    completedRounds.forEach(round => {
      const roundScores = allScoresData.filter(s => s.round_id === round.id);
      const playerTotals: Record<string, number> = {};
      roundScores.forEach(score => {
        if (!score.player_id) return;
        playerTotals[score.player_id] = (playerTotals[score.player_id] || 0) + score.strokes;
      });

      const userPlayerId = playerData.find(p => p.round_id === round.id)?.id;
      if (!userPlayerId || !playerTotals[userPlayerId]) return;

      matchesPlayed++;
      const userTotal = playerTotals[userPlayerId];
      const allTotals = Object.values(playerTotals);
      const minTotal = Math.min(...allTotals);

      if (userTotal === minTotal && allTotals.filter(t => t === minTotal).length === 1) {
        matchesWon++;
        currentStreak++;
        longestWinStreak = Math.max(longestWinStreak, currentStreak);
        if (round.stakes) {
          const otherPlayers = Object.keys(playerTotals).length - 1;
          const payout = (round.stakes as number) * otherPlayers;
          totalMoneyWon += payout;
        }
      } else {
        currentStreak = 0;
      }
    });
  }

  return {
    holesWon, holesPlayed, matchesWon, matchesPlayed, totalMoneyWon,
    bestCourse, hotHole, roundsPlayed: roundIds.length,
    scoreDistribution,
    avgScore: scoredHoles > 0 ? totalStrokesVsPar / scoredHoles : null,
    longestWinStreak,
    bestRound, bestPayout, mostSkins, scoreTrend,
  };
}
