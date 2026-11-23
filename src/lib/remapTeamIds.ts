import type { GameConfig, Team } from '@/types/golf';

/**
 * Round setup builds teams from the setup screen's temporary player ids, but the
 * players table assigns the real ids. Without this, fourball match play and best
 * ball teams referenced ids that no player had, so team results never computed.
 * Returns new game objects; unknown ids are left as they are.
 */
export function remapTeamPlayerIds(games: GameConfig[], idMap: Map<string, string>): GameConfig[] {
  const remapTeam = (t: Team): Team => ({ ...t, playerIds: t.playerIds.map(id => idMap.get(id) ?? id) });
  return games.map(g => ({
    ...g,
    ...(g.matchPlayTeams ? { matchPlayTeams: g.matchPlayTeams.map(remapTeam) } : {}),
    ...(g.teams ? { teams: g.teams.map(remapTeam) } : {}),
  }));
}
