import { Round, Player, Score, Press, PlayerWithScores } from '@/types/golf';
import { GameResults } from '@/hooks/useGameResults';
import { MatchPlayResult } from '@/lib/games/matchPlay';
import { DashboardSkinsCard } from './DashboardSkinsCard';
import { DashboardNassauCard } from './DashboardNassauCard';
import { DashboardMatchPlayCard } from './DashboardMatchPlayCard';
import { DashboardWolfCard } from './DashboardWolfCard';
import { DashboardHouseGameCard } from './DashboardHouseGameCard';

interface DashboardGamesProps {
  round: Round;
  players: Player[];
  gameResults: GameResults | null;
  matchPlayResult: MatchPlayResult | null;
}

export function DashboardGames({ round, players, gameResults, matchPlayResult }: DashboardGamesProps) {
  const hasAnyGame = gameResults || matchPlayResult;

  if (!hasAnyGame) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">No games were active this round.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 space-y-4">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">
        Game Results
      </h3>

      {gameResults?.skinsResult && (
        <DashboardSkinsCard result={gameResults.skinsResult} />
      )}

      {gameResults?.nassauResult && (
        <DashboardNassauCard result={gameResults.nassauResult} players={players} />
      )}

      {matchPlayResult && (
        <DashboardMatchPlayCard result={matchPlayResult} players={players} round={round} />
      )}

      {gameResults?.wolfStandings && gameResults.wolfStandings.length > 0 && (
        <DashboardWolfCard standings={gameResults.wolfStandings} />
      )}

      {gameResults?.houseGameResult && (
        <DashboardHouseGameCard result={gameResults.houseGameResult} />
      )}
    </div>
  );
}
