/**
 * Pure stat computation functions extracted from Stats.tsx.
 * No React, no Supabase, no side effects.
 */

export interface RoundDataForStats {
  id: string;
  course_name: string | null;
  games: Array<{ type: string }>;
  stakes: number | null;
  /** The player-record ID for the current user in this round */
  user_player_id: string;
  scores: Array<{
    player_id: string;
    hole_number: number;
    strokes: number;
    par: number;
  }>;
}

export interface StatsResult {
  bestRound: { score: number; courseName: string } | null;
  bestPayout: { amount: number; courseName: string } | null;
  mostSkins: { count: number; courseName: string } | null;
  scoreTrend: { delta: number; improving: boolean } | null;
}

export function computeAllTimeStats(
  rounds: RoundDataForStats[],
  _userId: string
): StatsResult {
  let bestRound: { score: number; courseName: string } | null = null;
  let bestPayout: { amount: number; courseName: string } | null = null;
  let mostSkins: { count: number; courseName: string } | null = null;
  const roundAvgScores: number[] = [];

  rounds.forEach(round => {
    const userPlayerId = round.user_player_id;
    const roundScores = round.scores;

    // Build per-player stroke totals
    const playerTotals: Record<string, number> = {};
    roundScores.forEach(score => {
      if (!score.player_id) return;
      playerTotals[score.player_id] = (playerTotals[score.player_id] || 0) + score.strokes;
    });

    if (!userPlayerId || !playerTotals[userPlayerId]) return;

    const userTotal = playerTotals[userPlayerId];
    const allTotals = Object.values(playerTotals);
    const minTotal = Math.min(...allTotals);

    // ── bestRound ──
    const userRoundScores = roundScores.filter(
      s => s.player_id === userPlayerId && s.strokes && s.par
    );
    const roundStrokesVsPar = userRoundScores.reduce(
      (sum, s) => sum + (s.strokes - s.par),
      0
    );
    if (userRoundScores.length > 0) {
      const roundAvg = roundStrokesVsPar / userRoundScores.length;
      roundAvgScores.push(roundAvg);
      if (!bestRound || roundStrokesVsPar < bestRound.score) {
        bestRound = { score: roundStrokesVsPar, courseName: round.course_name || 'Unknown' };
      }
    }

    // ── mostSkins ──
    const hasSkins =
      Array.isArray(round.games) &&
      round.games.some(g => g.type === 'skins');
    if (hasSkins) {
      let skinsWon = 0;
      const scoresByHole: Record<number, Array<{ playerId: string; strokes: number }>> = {};
      roundScores.forEach(score => {
        if (!score.player_id || !score.strokes) return;
        if (!scoresByHole[score.hole_number]) scoresByHole[score.hole_number] = [];
        scoresByHole[score.hole_number].push({ playerId: score.player_id, strokes: score.strokes });
      });
      Object.values(scoresByHole).forEach(holeScores => {
        if (holeScores.length < 2) return;
        const userHoleScore = holeScores.find(s => s.playerId === userPlayerId);
        if (!userHoleScore) return;
        const minStrokes = Math.min(...holeScores.map(s => s.strokes));
        if (
          userHoleScore.strokes === minStrokes &&
          holeScores.filter(s => s.strokes === minStrokes).length === 1
        ) {
          skinsWon++;
        }
      });
      if (!mostSkins || skinsWon > mostSkins.count) {
        mostSkins = { count: skinsWon, courseName: round.course_name || 'Unknown' };
      }
    }

    // ── bestPayout ──
    if (userTotal === minTotal && allTotals.filter(t => t === minTotal).length === 1) {
      if (round.stakes) {
        const otherPlayers = Object.keys(playerTotals).length - 1;
        const payout = (round.stakes as number) * otherPlayers;
        if (!bestPayout || payout > bestPayout.amount) {
          bestPayout = { amount: payout, courseName: round.course_name || 'Unknown' };
        }
      }
    }
  });

  // ── scoreTrend ──
  let scoreTrend: { delta: number; improving: boolean } | null = null;
  if (roundAvgScores.length >= 10) {
    const recent = roundAvgScores.slice(-5);
    const prior = roundAvgScores.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const delta = Math.abs(recentAvg - priorAvg);
    scoreTrend = { delta: parseFloat(delta.toFixed(1)), improving: recentAvg < priorAvg };
  }

  return { bestRound, bestPayout, mostSkins, scoreTrend };
}
