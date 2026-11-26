import type { MatchPayout, TeamScoring } from '@/types/golf';

/** Team match options: how a team's hole score is formed and how the stake is paid. */
export interface TeamMatchOptions {
  teamScoring: TeamScoring;
  matchPayout: MatchPayout;
}

export const DEFAULT_TEAM_MATCH: TeamMatchOptions = { teamScoring: 'best', matchPayout: 'match' };
