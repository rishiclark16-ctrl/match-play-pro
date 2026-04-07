/**
 * Sixes (Round Robin / Hollywood / 6-6-6)
 *
 * Exactly 4 players. Three 6-hole matches with rotating partners:
 *   Holes  1–6:  A+B vs C+D
 *   Holes  7–12: A+C vs B+D
 *   Holes 13–18: A+D vs B+C
 *
 * Each segment = best ball (lower net score per team per hole wins the hole).
 * Each segment is an independent match — settle 3 bets, or aggregate.
 */

import { Score, Player } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

export interface SixesSegment {
  segmentIndex: number;        // 0, 1, 2
  holeRange: [number, number]; // [1,6], [7,12], [13,18]
  team1Ids: string[];
  team2Ids: string[];
  team1Name: string;
  team2Name: string;
  team1HolesWon: number;
  team2HolesWon: number;
  halved: number;
  winnerId: string | null;     // 'team1' | 'team2' | null (halved)
  winnerSide: 'team1' | 'team2' | null;
}

export interface SixesStanding {
  playerId: string;
  playerName: string;
  segmentsWon: number;
  totalHolesWon: number;
  earnings: number;
}

export interface SixesResult {
  segments: SixesSegment[];
  standings: SixesStanding[];
  holesScored: number;
}

function getNetScore(score: Score, strokesPerHole?: StrokesPerHoleMap): number {
  if (!strokesPerHole) return score.strokes;
  const playerStrokes = strokesPerHole.get(score.playerId);
  const holeStrokes = playerStrokes?.get(score.holeNumber) || 0;
  return score.strokes - holeStrokes;
}

/** Standard 4-player sixes partner rotations */
function getSegmentTeams(players: Player[]): Array<{ team1: Player[]; team2: Player[] }> {
  const sorted = [...players].sort((a, b) => a.orderIndex - b.orderIndex);
  const [A, B, C, D] = sorted;
  return [
    { team1: [A, B], team2: [C, D] }, // Holes 1-6
    { team1: [A, C], team2: [B, D] }, // Holes 7-12
    { team1: [A, D], team2: [B, C] }, // Holes 13-18
  ];
}

export function calculateSixes(
  scores: Score[],
  players: Player[],
  holesPlayed: number,
  unitValue: number,
  strokesPerHole?: StrokesPerHoleMap,
): SixesResult {
  if (players.length !== 4) {
    return { segments: [], standings: [], holesScored: 0 };
  }

  const rotations = getSegmentTeams(players);
  const segments: SixesSegment[] = [];
  let totalHolesScored = 0;

  // Track per-player stats
  const playerSegmentsWon: Record<string, number> = {};
  const playerHolesWon: Record<string, number> = {};
  const playerEarnings: Record<string, number> = {};
  players.forEach(p => {
    playerSegmentsWon[p.id] = 0;
    playerHolesWon[p.id] = 0;
    playerEarnings[p.id] = 0;
  });

  rotations.forEach((rotation, segIdx) => {
    const startHole = segIdx * 6 + 1;
    const endHole = startHole + 5;
    const { team1, team2 } = rotation;
    const team1Ids = team1.map(p => p.id);
    const team2Ids = team2.map(p => p.id);

    let team1Wins = 0;
    let team2Wins = 0;
    let halved = 0;

    for (let hole = startHole; hole <= Math.min(endHole, holesPlayed); hole++) {
      const holeScores = scores.filter(s => s.holeNumber === hole);
      if (holeScores.length < 4) continue;

      totalHolesScored++;

      // Best ball per team (lowest net)
      const team1Nets = team1.map(p => {
        const s = holeScores.find(sc => sc.playerId === p.id);
        return s ? getNetScore(s, strokesPerHole) : 999;
      });
      const team2Nets = team2.map(p => {
        const s = holeScores.find(sc => sc.playerId === p.id);
        return s ? getNetScore(s, strokesPerHole) : 999;
      });

      const team1Best = Math.min(...team1Nets);
      const team2Best = Math.min(...team2Nets);

      if (team1Best < team2Best) {
        team1Wins++;
        team1.forEach(p => { playerHolesWon[p.id]++; });
      } else if (team2Best < team1Best) {
        team2Wins++;
        team2.forEach(p => { playerHolesWon[p.id]++; });
      } else {
        halved++;
      }
    }

    const team1Name = `${team1[0].name.split(' ')[0]} & ${team1[1].name.split(' ')[0]}`;
    const team2Name = `${team2[0].name.split(' ')[0]} & ${team2[1].name.split(' ')[0]}`;

    let winnerSide: 'team1' | 'team2' | null = null;
    if (team1Wins > team2Wins) winnerSide = 'team1';
    else if (team2Wins > team1Wins) winnerSide = 'team2';

    // Segment settlement: margin × unitValue per player
    const margin = Math.abs(team1Wins - team2Wins);
    const segmentPayout = margin * unitValue;

    if (winnerSide === 'team1') {
      team1.forEach(p => { playerEarnings[p.id] += segmentPayout; });
      team2.forEach(p => { playerEarnings[p.id] -= segmentPayout; });
      team1.forEach(p => { playerSegmentsWon[p.id]++; });
    } else if (winnerSide === 'team2') {
      team2.forEach(p => { playerEarnings[p.id] += segmentPayout; });
      team1.forEach(p => { playerEarnings[p.id] -= segmentPayout; });
      team2.forEach(p => { playerSegmentsWon[p.id]++; });
    }

    segments.push({
      segmentIndex: segIdx,
      holeRange: [startHole, endHole],
      team1Ids,
      team2Ids,
      team1Name,
      team2Name,
      team1HolesWon: team1Wins,
      team2HolesWon: team2Wins,
      halved,
      winnerId: winnerSide,
      winnerSide,
    });
  });

  const standings: SixesStanding[] = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    segmentsWon: playerSegmentsWon[p.id],
    totalHolesWon: playerHolesWon[p.id],
    earnings: Math.round(playerEarnings[p.id] * 100) / 100,
  })).sort((a, b) => b.earnings - a.earnings);

  return { segments, standings, holesScored: totalHolesScored };
}
