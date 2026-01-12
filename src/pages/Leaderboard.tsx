import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useSupabaseRound } from '@/hooks/useSupabaseRound';
import { formatRelativeToPar, getScoreColor, PlayerWithScores } from '@/types/golf';
import { calculatePlayingHandicap, getStrokesPerHole, calculateTotalNetStrokes } from '@/lib/handicapUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/golf/ConnectionStatus';
import { hapticLight } from '@/lib/haptics';

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use Supabase for live data
  const { 
    round: supabaseRound, 
    players: supabasePlayers, 
    scores: supabaseScores,
    isOnline,
    loading: supabaseLoading 
  } = useSupabaseRound(id || null);
  
  // Fallback to local storage
  const { getRoundById, getPlayersWithScores } = useRounds();

  const [viewMode, setViewMode] = useState<'gross' | 'net'>('gross');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use Supabase round if available, otherwise fall back to local
  const localRound = getRoundById(id || '');
  const round = supabaseRound || localRound;

  // Build players with scores from Supabase or local
  const playersWithScores: PlayerWithScores[] = useMemo(() => {
    if (!round) return [];
    
    const useSupabase = supabasePlayers.length > 0 || supabaseLoading || supabaseRound !== null;
    
    if (!useSupabase) {
      return getPlayersWithScores(round.id, round.holeInfo, round.slope, round.holes);
    }
    
    if (supabaseLoading && supabasePlayers.length === 0) {
      return [];
    }
    
    // Build PlayerWithScores from Supabase data
    return supabasePlayers.map(player => {
      const playerScores = supabaseScores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);
      
      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);

      let playingHandicap: number | undefined;
      let strokesPerHole: Map<number, number> | undefined;
      let totalNetStrokes: number | undefined;
      let netRelativeToPar: number | undefined;

      if (player.handicap !== undefined && player.handicap !== null) {
        playingHandicap = calculatePlayingHandicap(player.handicap, round.slope || 113, round.holes);
        strokesPerHole = getStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      }

      return {
        ...player,
        scores: playerScores,
        totalStrokes,
        totalRelativeToPar,
        holesPlayed: playerScores.length,
        playingHandicap,
        strokesPerHole,
        totalNetStrokes,
        netRelativeToPar,
      };
    });
  }, [round, supabasePlayers, supabaseLoading, supabaseRound, supabaseScores, getPlayersWithScores]);

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

  // Simulate refresh
  const handleRefresh = () => {
    hapticLight();
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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
          "bg-card rounded-xl p-4 flex items-center gap-4 border border-border/50",
          rank === 0 && player.holesPlayed > 0 && "ring-2 ring-primary/20 bg-primary-light/30"
        )}
      >
        {/* Rank */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
          rank === 0 && player.holesPlayed > 0
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}>
          {rank + 1}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{player.name}</h4>
          <p className="text-xs text-muted-foreground">
            {player.holesPlayed > 0 ? `Thru ${player.holesPlayed}` : 'Not started'}
            {player.playingHandicap !== undefined && viewMode === 'net' && (
              <span className="ml-2">• HCP: {player.playingHandicap}</span>
            )}
          </p>
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
      <header className="pt-12 pb-3 px-4 safe-top flex items-center gap-3 border-b border-border/50">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            hapticLight();
            navigate(`/round/${round.id}`);
          }}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          aria-label="Back to scorecard"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Leaderboard</h1>
            <ConnectionStatus isOnline={isOnline} />
          </div>
          <p className="text-xs text-muted-foreground">{round.courseName}</p>
        </div>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          aria-label="Refresh"
        >
          <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
        </motion.button>
      </header>

      {/* Toggle */}
      {hasHandicaps && (
        <div className="px-4 py-3">
          <div className="flex bg-muted rounded-xl p-1">
            {(['gross', 'net'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  hapticLight();
                  setViewMode(mode);
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize",
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
      <main className="flex-1 px-4 pb-6 overflow-auto">
        {/* Loading state */}
        {supabaseLoading && playersWithScores.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </div>
                  <div className="h-8 bg-muted rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Rankings */}
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => getPlayerDisplay(player, index))}
            </div>

            {/* Match Play Status */}
            {matchPlayStatus && (
              <div className="mt-6 bg-card rounded-xl p-4 border border-border/50">
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
          </>
        )}
      </main>
    </div>
  );
}
