/**
 * Defender
 *
 * 3 players (works for 4). One player rotates as Defender each hole.
 * Defender vs the field (1 vs 2).
 *
 * Rotation (3 players): A=1,4,7,10,13,16  B=2,5,8,11,14,17  C=3,6,9,12,15,18
 * Rotation (4 players): A=1,5,9,13,17  B=2,6,10,14,18  C=3,7,11,15  D=4,8,12,16
 *
 * Scoring:
 *   Defender wins outright (lowest score alone) → +3 to Defender
 *   Defender ties one opponent → +1 to Defender
 *   Defender loses to one opponent → +1 to each attacker
 *   Defender loses to both/all → +2 to each attacker
 */

import { Score, Player } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

export interface DefenderHoleResult {
  holeNumber: number;
  defenderId: string;
  defenderName: string;
  outcome: 'defender_wins' | 'defender_ties' | 'defender_loses_one' | 'defender_loses_all';
  defenderPoints: number;
  attackerPoints: number; // per attacker
  netScores: Record<string, number>;
}

export interface DefenderStanding {
  playerId: string;
  playerName: string;
  totalPoints: number;
  timesDefender: number;
  defenderWins: number;
  earnings: number;
}

export interface DefenderResult {
  holeResults: DefenderHoleResult[];
  standings: DefenderStanding[];
  holesScored: number;
}

function getNetScore(score: Score, strokesPerHole?: StrokesPerHoleMap): number {
  if (!strokesPerHole) return score.strokes;
  const playerStrokes = strokesPerHole.get(score.playerId);
  const holeStrokes = playerStrokes?.get(score.holeNumber) || 0;
  return score.strokes - holeStrokes;
}

/** Get the defender for a given hole number based on player count */
export function getDefenderForHole(players: Player[], holeNumber: number): Player | null {
  const n = players.length;
  if (n < 3 || n > 4) return null;
  const sorted = [...players].sort((a, b) => a.orderIndex - b.orderIndex);
  const defenderIndex = (holeNumber - 1) % n;
  return sorted[defenderIndex];
}

export function calculateDefender(
  scores: Score[],
  players: Player[],
  holesPlayed: number,
  unitValue: number,
  strokesPerHole?: StrokesPerHoleMap,
): DefenderResult {
  const n = players.length;
  if (n < 3 || n > 4) {
    return { holeResults: [], standings: [], holesScored: 0 };
  }

  const holeResults: DefenderHoleResult[] = [];
  const totalPoints: Record<string, number> = {};
  const timesDefender: Record<string, number> = {};
  const defenderWins: Record<string, number> = {};
  players.forEach(p => {
    totalPoints[p.id] = 0;
    timesDefender[p.id] = 0;
    defenderWins[p.id] = 0;
  });

  for (let hole = 1; hole <= holesPlayed; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    if (holeScores.length < n) continue;

    const defender = getDefenderForHole(players, hole);
    if (!defender) continue;

    timesDefender[defender.id]++;

    // Calculate net scores
    const netScores: Record<string, number> = {};
    holeScores.forEach(s => {
      netScores[s.playerId] = getNetScore(s, strokesPerHole);
    });

    const defenderNet = netScores[defender.id];
    const attackers = players.filter(p => p.id !== defender.id);
    const attackerNets = attackers.map(a => netScores[a.id]);
    const bestAttackerScore = Math.min(...attackerNets);
    const attackersBeatDefender = attackerNets.filter(net => net < defenderNet).length;
    const attackersTiedDefender = attackerNets.filter(net => net === defenderNet).length;

    let outcome: DefenderHoleResult['outcome'];
    let defenderPoints = 0;
    let attackerPointsEach = 0;

    if (defenderNet < bestAttackerScore) {
      // Defender wins outright
      outcome = 'defender_wins';
      defenderPoints = 3;
      attackerPointsEach = 0;
      defenderWins[defender.id]++;
    } else if (defenderNet === bestAttackerScore && attackersBeatDefender === 0) {
      // Defender ties (at least one attacker matched, none beat)
      outcome = 'defender_ties';
      defenderPoints = 1;
      attackerPointsEach = 0;
    } else if (attackersBeatDefender === 1) {
      // Defender loses to exactly one
      outcome = 'defender_loses_one';
      defenderPoints = 0;
      attackerPointsEach = 1;
    } else {
      // Defender loses to multiple
      outcome = 'defender_loses_all';
      defenderPoints = 0;
      attackerPointsEach = 2;
    }

    totalPoints[defender.id] += defenderPoints;
    attackers.forEach(a => {
      totalPoints[a.id] += attackerPointsEach;
    });

    holeResults.push({
      holeNumber: hole,
      defenderId: defender.id,
      defenderName: defender.name,
      outcome,
      defenderPoints,
      attackerPoints: attackerPointsEach,
      netScores,
    });
  }

  // Pairwise settlement
  const earnings: Record<string, number> = {};
  players.forEach(p => { earnings[p.id] = 0; });

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = (totalPoints[players[i].id] - totalPoints[players[j].id]) * unitValue;
      earnings[players[i].id] += diff;
      earnings[players[j].id] -= diff;
    }
  }

  const standings: DefenderStanding[] = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    totalPoints: totalPoints[p.id],
    timesDefender: timesDefender[p.id],
    defenderWins: defenderWins[p.id],
    earnings: Math.round(earnings[p.id] * 100) / 100,
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  return { holeResults, standings, holesScored: holeResults.length };
}
