import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { formatRelativeToPar, getScoreColor, PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRoundById, getPlayersWithScores } = useRounds();

  const [viewMode, setViewMode] = useState<'gross' | 'net'>('gross');

  const round = getRoundById(id || '');

  const playersWithScores = useMemo(() => {
    if (!round) return [];
    return getPlayersWithScores(round.id, round.holeInfo, round.slope, round.holes);
  }, [round, getPlayersWithScores]);

  const hasHandicaps = playersWithScores.some(p => p.playingHandicap !== undefined && p.playingHandicap > 0);

  // Sort players by score
  const sortedPlayers = useMemo(() => {
    return [...playersWithScores].sort((a, b) => {
      if (viewMode === 'net' && hasHandicaps) {
        const aNet = a.totalNetStrokes ?? a.totalStrokes;
        const bNet = b.totalNetStrokes ?? b.totalStrokes;
        return aNet - bNet;
      }
      return a.totalStrokes - b.totalStrokes;
    });
  }, [playersWithScores, viewMode, hasHandicaps]);

  // Match play status (if enabled and 2 players)
  const matchPlayStatus = useMemo(() => {
    if (!round?.matchPlay || playersWithScores.length !== 2) return null;
    
    const [p1, p2] = playersWithScores;
    let p1Wins = 0;
    let p2Wins = 0;
    let holesPlayed = 0;

    for (let hole = 1; hole <= round.holes; hole++) {
      const p1Score = p1.scores.find(s => s.holeNumber === hole)?.strokes;
      const p2Score = p2.scores.find(s => s.holeNumber === hole)?.strokes;
      
      if (p1Score !== undefined && p2Score !== undefined) {
        holesPlayed++;
        if (p1Score < p2Score) p1Wins++;
        else if (p2Score < p1Score) p2Wins++;
      }
    }

    const diff = p1Wins - p2Wins;
    if (diff === 0) return { status: 'All Square', leader: null, holesPlayed };
    
    const leader = diff > 0 ? p1 : p2;
    const upBy = Math.abs(diff);
    const holesRemaining = round.holes - holesPlayed;
    
    return {
      status: `${leader.name} ${upBy} UP`,
      leader,
      holesPlayed,
      holesRemaining,
      upBy,
    };
  }, [round, playersWithScores]);

  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Round not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const getPlayerDisplay = (player: PlayerWithScores, rank: number) => {
    const displayScore = viewMode === 'net' && hasHandicaps 
      ? (player.totalNetStrokes ?? player.totalStrokes) 
      : player.totalStrokes;
    const parForHolesPlayed = player.scores.reduce((sum, s) => {
      const hole = round.holeInfo.find(h => h.number === s.holeNumber);
      return sum + (hole?.par || 4);
    }, 0);
    const relativeToPar = viewMode === 'net' && hasHandicaps 
      ? (player.netRelativeToPar ?? player.totalRelativeToPar)
      : player.totalRelativeToPar;

    return (
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.05 }}
        className={cn(
          "card-premium p-4 flex items-center gap-4",
          rank === 0 && player.holesPlayed > 0 && "ring-2 ring-primary/20 bg-primary-light"
        )}
      >
        {/* Rank */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
          rank === 0 && player.holesPlayed > 0
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}>
          {rank + 1}
        </div>

        {/* Name */}
        <div className="flex-1">
          <h4 className="font-medium">{player.name}</h4>
          {player.playingHandicap !== undefined && viewMode === 'net' && (
            <p className="text-xs text-muted-foreground">Playing HCP: {player.playingHandicap}</p>
          )}
        </div>

        {/* Score */}
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">
            {player.holesPlayed > 0 ? displayScore : '–'}
          </p>
          {player.holesPlayed > 0 && (
            <p className={cn("text-sm font-medium", getScoreColor(displayScore, parForHolesPlayed))}>
              {formatRelativeToPar(relativeToPar)}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 safe-top flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(`/round/${round.id}`)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <h1 className="text-xl font-semibold">Leaderboard</h1>
      </header>

      {/* Toggle */}
      {hasHandicaps && (
        <div className="px-6 pb-4">
          <div className="flex bg-muted rounded-xl p-1">
            {(['gross', 'net'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                  viewMode === mode
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-6 pb-6 overflow-auto">
        {/* Rankings */}
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => getPlayerDisplay(player, index))}
        </div>

        {/* Match Play Status */}
        {matchPlayStatus && (
          <div className="mt-6 card-premium p-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Match Play
            </h3>
            <p className="text-xl font-bold">
              {matchPlayStatus.status}
              {matchPlayStatus.holesPlayed > 0 && (
                <span className="text-muted-foreground font-normal text-base ml-2">
                  thru {matchPlayStatus.holesPlayed}
                </span>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
