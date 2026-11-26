/**
 * Custom games inside a round: player-id remapping when the round is created, and
 * the money every custom game on the round owes, for settlement and live views.
 */
import type { GameConfig, HoleInfo, Score } from '@/types/golf';
import { settleCustomGame, type StrokesMap } from './engine';
import type { GameSpec, Transfer } from './types';

/** The same spec with every player reference passed through `f` (names -> ids, setup ids -> round ids). */
export function mapSpecPlayers(spec: GameSpec, f: (ref: string) => string): GameSpec {
  const teams = (t: string[][]) => t.map(side => side.map(f));
  const s = spec.sides;
  const sides: GameSpec['sides'] =
    s.kind === 'teams' ? { ...s, teams: teams(s.teams) }
    : s.kind === 'rotating_teams' ? { ...s, rotations: s.rotations.map(r => ({ ...r, teams: teams(r.teams) })) }
    : s.kind === 'one_vs_field' ? { ...s, order: s.order.map(f) }
    : s;
  return { ...spec, sides };
}

interface PlayerLike {
  id: string;
  strokesPerHole?: Map<number, number>;
}

/** Handicap strokes for the players who have them. */
export function strokesFromPlayers(players: PlayerLike[]): StrokesMap {
  const m: StrokesMap = new Map();
  for (const p of players) if (p.strokesPerHole) m.set(p.id, p.strokesPerHole);
  return m;
}

/**
 * Money from every custom game on the round. `final` false is the live view
 * (an unfinished bet credits its current leader).
 */
export function customGamesTransfers(
  games: GameConfig[] | undefined,
  players: PlayerLike[],
  scores: Score[],
  holeInfo: HoleInfo[],
  final: boolean,
  strokes: StrokesMap = strokesFromPlayers(players),
): Transfer[] {
  const out: Transfer[] = [];
  for (const g of games ?? []) {
    if (g.type !== 'custom' || !g.spec) continue;
    const { transfers } = settleCustomGame({
      spec: g.spec, playerIds: players.map(p => p.id), scores, holeInfo, strokes, stake: g.stakes, final,
    });
    out.push(...transfers);
  }
  return out;
}
