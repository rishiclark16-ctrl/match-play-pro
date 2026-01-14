import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trophy, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useSupabaseRound } from '@/hooks/useSupabaseRound';
import { formatRelativeToPar, getScoreColor, PlayerWithScores } from '@/types/golf';
import { calculatePlayingHandicap, getStrokesPerHole, calculateTotalNetStrokes, getManualStrokesPerHole } from '@/lib/handicapUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { ConnectionStatus } from '@/components/golf/ConnectionStatus';
import { hapticLight } from '@/lib/haptics';

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { 
    round: supabaseRound, 
    players: supabasePlayers, 
    scores: supabaseScores,
    isOnline,
    loading: supabaseLoading 
  } = useSupabaseRound(id || null);
  
  const { getRoundById, getPlayersWithScores } = useRounds();

  const [viewMode, setViewMode] = useState<'gross' | 'net'>('gross');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const localRound = getRoundById(id || '');
  const round = supabaseRound || localRound;

  const playersWithScores: PlayerWithScores[] = useMemo(() => {
    if (!round) return [];
    
    const useSupabase = supabasePlayers.length > 0 || supabaseLoading || supabaseRound !== null;
    
    if (!useSupabase) {
      return getPlayersWithScores(round.id, round.holeInfo, round.slope, round.holes);
    }
    
    if (supabaseLoading && supabasePlayers.length === 0) {
      return [];
    }
    
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

      // Check handicap mode - 'manual' uses player.manualStrokes, 'auto' uses handicap index
      const isManualMode = round.handicapMode === 'manual';

      if (isManualMode) {
        // Manual mode: use manually entered strokes
        playingHandicap = player.manualStrokes ?? 0;
        strokesPerHole = getManualStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      } else if (player.handicap !== undefined && player.handicap !== null) {
        // Auto mode: calculate from handicap index and course slope
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
        manualStrokes: player.manualStrokes,
      };
    });
  }, [round, supabasePlayers, supabaseLoading, supabaseRound, supabaseScores, getPlayersWithScores]);

  const hasHandicaps = playersWithScores.some(p => p.playingHandicap !== undefined && p.playingHandicap > 0);

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

  const handleRefresh = () => {
    hapticLight();
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Statistics
  const stats = useMemo(() => {
    if (playersWithScores.length === 0) return null;
    
    const allScores = playersWithScores.flatMap(p => p.scores);
    const birdiesOrBetter = allScores.filter(s => {
      const hole = round?.holeInfo.find(h => h.number === s.holeNumber);
      return hole && s.strokes < hole.par;
    }).length;
    
    const pars = allScores.filter(s => {
      const hole = round?.holeInfo.find(h => h.number === s.holeNumber);
      return hole && s.strokes === hole.par;
    }).length;
    
    const bogeys = allScores.filter(s => {
      const hole = round?.holeInfo.find(h => h.number === s.holeNumber);
      return hole && s.strokes === hole.par + 1;
    }).length;
    
    const doubles = allScores.filter(s => {
      const hole = round?.holeInfo.find(h => h.number === s.holeNumber);
      return hole && s.strokes >= hole.par + 2;
    }).length;
    
    return { birdiesOrBetter, pars, bogeys, doubles, total: allScores.length };
  }, [playersWithScores, round?.holeInfo]);

  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="fixed inset-0 tech-grid-subtle opacity-40 pointer-events-none" />
        <TechCard className="relative z-10">
          <TechCardContent className="p-8 text-center">
            <h2 className="headline-md mb-4">Round not found</h2>
            <Button onClick={() => navigate('/')} className="btn-primary">
              Go Home
            </Button>
          </TechCardContent>
        </TechCard>
      </div>
    );
  }

  const getPositionBadge = (rank: number) => {
    if (rank === 0) {
      return (
        <div className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center shadow-lg">
          <Trophy className="w-6 h-6 text-gold-foreground" />
        </div>
      );
    }
    if (rank === 1) {
      return (
        <div className="w-12 h-12 rounded-xl bg-muted border-2 border-border flex items-center justify-center">
          <span className="text-xl font-black text-muted-foreground">2</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-12 h-12 rounded-xl bg-warning/20 border-2 border-warning/30 flex items-center justify-center">
          <span className="text-xl font-black text-warning">3</span>
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center">
        <span className="text-xl font-bold text-muted-foreground">{rank + 1}</span>
      </div>
    );
  };

  const getScoreTrend = (relativeToPar: number) => {
    if (relativeToPar < 0) {
      return <TrendingDown className="w-4 h-4 text-success" />;
    }
    if (relativeToPar > 0) {
      return <TrendingUp className="w-4 h-4 text-danger" />;
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getPlayerCard = (player: PlayerWithScores, rank: number) => {
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

    const isLeader = rank === 0 && player.holesPlayed > 0;

    return (
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.08 }}
      >
        <TechCard variant={isLeader ? "winner" : "default"} corners={isLeader}>
          <TechCardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Position Badge */}
              {getPositionBadge(rank)}

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg truncate">{player.name}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  <span className="font-mono">
                    {player.holesPlayed > 0 ? `Thru ${player.holesPlayed}` : 'Not started'}
                  </span>
                  {player.playingHandicap !== undefined && viewMode === 'net' && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="font-mono">HCP {player.playingHandicap}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Score Display */}
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  {player.holesPlayed > 0 && getScoreTrend(relativeToPar)}
                  <p className="number-display">
                    {player.holesPlayed > 0 ? displayScore : '–'}
                  </p>
                </div>
                {player.holesPlayed > 0 && (
                  <p className={cn(
                    "text-sm font-bold font-mono mt-0.5",
                    relativeToPar < 0 && "text-success",
                    relativeToPar > 0 && "text-danger",
                    relativeToPar === 0 && "text-muted-foreground"
                  )}>
                    {formatRelativeToPar(relativeToPar)}
                  </p>
                )}
              </div>
            </div>

            {/* Additional stats for leader */}
            {isLeader && player.scores.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-2">
                {['🦅', '⚪', '🟡', '🔴'].map((emoji, i) => {
                  const count = player.scores.filter(s => {
                    const hole = round.holeInfo.find(h => h.number === s.holeNumber);
                    if (!hole) return false;
                    const diff = s.strokes - hole.par;
                    if (i === 0) return diff < 0;
                    if (i === 1) return diff === 0;
                    if (i === 2) return diff === 1;
                    return diff >= 2;
                  }).length;
                  
                  return (
                    <div key={i} className="text-center">
                      <p className="text-lg">{emoji}</p>
                      <p className="text-sm font-bold font-mono">{count}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </TechCardContent>
        </TechCard>
      </motion.div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 tech-grid-subtle opacity-40 pointer-events-none" />
      
      {/* Fixed Header */}
      <header 
        className="flex-shrink-0 relative z-10 pb-2 pt-2 px-4 border-b border-border bg-background/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              hapticLight();
              navigate(`/round/${round.id}`);
            }}
            className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm"
            aria-label="Back to scorecard"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="headline-sm">Leaderboard</h1>
              <ConnectionStatus isOnline={isOnline} />
            </div>
            <p className="text-sm text-muted-foreground font-medium">{round.courseName}</p>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin text-primary")} />
          </motion.button>
        </div>
      </header>

      {/* View Mode Toggle */}
      {hasHandicaps && (
        <div className="relative z-10 px-4 py-4">
          <div className="flex bg-muted/50 border border-border rounded-xl p-1">
            {(['gross', 'net'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  hapticLight();
                  setViewMode(mode);
                }}
                className={cn(
                  "flex-1 py-3 rounded-lg text-sm font-bold transition-all uppercase tracking-wide",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-nav" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Loading state */}
        {supabaseLoading && playersWithScores.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <TechCard key={i}>
                <TechCardContent className="p-4">
                  <div className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-28" />
                      <div className="h-4 bg-muted rounded w-20" />
                    </div>
                    <div className="h-10 bg-muted rounded w-16" />
                  </div>
                </TechCardContent>
              </TechCard>
            ))}
          </div>
        ) : (
          <>
            {/* Rankings */}
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => getPlayerCard(player, index))}
            </div>

            {/* Match Play Status */}
            {matchPlayStatus && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <TechCard variant="highlighted" corners>
                  <TechCardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Target className="w-5 h-5 text-primary" />
                      <p className="label-sm">Match Play</p>
                    </div>
                    <p className="headline-md">
                      {matchPlayStatus.status}
                    </p>
                    {matchPlayStatus.holesPlayed > 0 && (
                      <p className="text-sm text-muted-foreground mt-1 font-mono">
                        Thru {matchPlayStatus.holesPlayed} • {matchPlayStatus.holesRemaining} to play
                      </p>
                    )}
                  </TechCardContent>
                </TechCard>
              </motion.div>
            )}

            {/* Round Statistics */}
            {stats && stats.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
              >
                <TechCard>
                  <TechCardContent className="p-5">
                    <p className="label-sm mb-4">Round Statistics</p>
                    
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-2xl font-black font-mono text-success">{stats.birdiesOrBetter}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-success/80 mt-1">Birdies+</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted border border-border">
                        <p className="text-2xl font-black font-mono">{stats.pars}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-1">Pars</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <p className="text-2xl font-black font-mono text-warning">{stats.bogeys}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-warning/80 mt-1">Bogeys</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-danger/10 border border-danger/20">
                        <p className="text-2xl font-black font-mono text-danger">{stats.doubles}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-danger/80 mt-1">2+ Over</p>
                      </div>
                    </div>
                  </TechCardContent>
                </TechCard>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
