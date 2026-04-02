import { useMemo } from 'react';
import { Round, PlayerWithScores, HoleInfo } from '@/types/golf';

export interface RoundPlayerStats {
  playerId: string;
  playerName: string;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
  worse: number;
  par3Avg: number | null;
  par4Avg: number | null;
  par5Avg: number | null;
  front9Total: number;
  back9Total: number;
  bestHole: { number: number; score: number; par: number } | null;
  worstHole: { number: number; score: number; par: number } | null;
  longestBirdieStreak: number;
}

export interface RoundStatsResult {
  playerStats: RoundPlayerStats[];
  mostCompetitiveHole: { number: number; spread: number } | null;
  biggestBlowupHole: { number: number; spread: number } | null;
}

export function useRoundStats(
  round: Round | null,
  playersWithScores: PlayerWithScores[]
): RoundStatsResult | null {
  return useMemo(() => {
    if (!round || playersWithScores.length === 0) return null;

    const holeInfo = round.holeInfo;
    const holePar = (n: number) => holeInfo.find(h => h.number === n)?.par ?? 4;

    const playerStats: RoundPlayerStats[] = playersWithScores.map(p => {
      let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0, worse = 0;
      let par3Strokes = 0, par3Count = 0;
      let par4Strokes = 0, par4Count = 0;
      let par5Strokes = 0, par5Count = 0;
      let front9 = 0, back9 = 0;
      let bestDiff = Infinity, worstDiff = -Infinity;
      let bestHole: RoundPlayerStats['bestHole'] = null;
      let worstHole: RoundPlayerStats['worstHole'] = null;
      let streak = 0, longestStreak = 0;

      p.scores.forEach(s => {
        const par = holePar(s.holeNumber);
        const diff = s.strokes - par;

        if (diff <= -2) eagles++;
        else if (diff === -1) birdies++;
        else if (diff === 0) pars++;
        else if (diff === 1) bogeys++;
        else if (diff === 2) doubles++;
        else worse++;

        if (diff < bestDiff) { bestDiff = diff; bestHole = { number: s.holeNumber, score: s.strokes, par }; }
        if (diff > worstDiff) { worstDiff = diff; worstHole = { number: s.holeNumber, score: s.strokes, par }; }

        if (diff < 0) { streak++; longestStreak = Math.max(longestStreak, streak); }
        else { streak = 0; }

        if (par === 3) { par3Strokes += s.strokes; par3Count++; }
        else if (par === 4) { par4Strokes += s.strokes; par4Count++; }
        else if (par >= 5) { par5Strokes += s.strokes; par5Count++; }

        if (s.holeNumber <= 9) front9 += s.strokes;
        else back9 += s.strokes;
      });

      return {
        playerId: p.id,
        playerName: p.name,
        eagles, birdies, pars, bogeys, doubles, worse,
        par3Avg: par3Count > 0 ? par3Strokes / par3Count : null,
        par4Avg: par4Count > 0 ? par4Strokes / par4Count : null,
        par5Avg: par5Count > 0 ? par5Strokes / par5Count : null,
        front9Total: front9,
        back9Total: back9,
        bestHole, worstHole,
        longestBirdieStreak: longestStreak,
      };
    });

    // Most competitive hole (smallest spread among all players)
    let mostCompetitive: RoundStatsResult['mostCompetitiveHole'] = null;
    let biggestBlowup: RoundStatsResult['biggestBlowupHole'] = null;
    let minSpread = Infinity, maxSpread = -Infinity;

    for (let h = 1; h <= round.holes; h++) {
      const holeScores = playersWithScores
        .map(p => p.scores.find(s => s.holeNumber === h)?.strokes)
        .filter((s): s is number => s != null);
      if (holeScores.length < 2) continue;
      const spread = Math.max(...holeScores) - Math.min(...holeScores);
      if (spread < minSpread) { minSpread = spread; mostCompetitive = { number: h, spread }; }
      if (spread > maxSpread) { maxSpread = spread; biggestBlowup = { number: h, spread }; }
    }

    return { playerStats, mostCompetitiveHole: mostCompetitive, biggestBlowupHole: biggestBlowup };
  }, [round, playersWithScores]);
}
