import type { Round, Player } from '@/types/golf';

/**
 * A round is "solo" when a single (non-ghost) player is tracking their own
 * stats with no betting games configured. Solo rounds render a stripped-down
 * scorecard (no money, no settlements) and feed scoring-only stats.
 */
export function isSoloRound(
  round: Pick<Round, 'games'> | null | undefined,
  players: Pick<Player, 'isGhost'>[] | null | undefined,
): boolean {
  if (!round || !players) return false;
  const realPlayers = players.filter(p => !p.isGhost);
  if (realPlayers.length !== 1) return false;
  const games = round.games ?? [];
  return games.length === 0;
}
