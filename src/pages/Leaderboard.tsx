import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isSoloRound } from '@/lib/soloRound';
import { ArrowLeft, RefreshCw, Trophy, Target, TrendingUp, TrendingDown, Minus, Medal, Award, Sparkles } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useSupabaseRound } from '@/hooks/useSupabaseRound';
import { formatRelativeToPar, getScoreColor, PlayerWithScores } from '@/types/golf';
import {
  calculatePlayingHandicap,
  getStrokesPerHole,
  calculateTotalNetStrokes,
  getManualStrokesPerHole,
  calculateMatchPlayStrokes,
  buildMatchPlayStrokesMap,
} from '@/lib/handicapUtils';
import { calculateMatchPlay } from '@/lib/games/matchPlay';
import { isCustomPrimitive } from '@/types/houseGame';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

  // Redirect solo rounds back to the scorecard — there's no meaningful
  // leaderboard for a single player.
  useEffect(() => {
    if (round && isSoloRound(round, supabasePlayers)) {
      navigate(`/round/${id}`, { replace: true });
    }
  }, [round, supabasePlayers, id, navigate]);

  const playersWithScores: PlayerWithScores[] = useMemo(() => {
    if (!round) return [];

    const useSupabase = supabasePlayers.length > 0 || supabaseLoading || supabaseRound !== null;

    if (!useSupabase) {
      return getPlayersWithScores(round.id, round.holeInfo, round.slope, round.holes, round.rating);
    }

    if (supabaseLoading && supabasePlayers.length === 0) {
      return [];
    }

    // Check if this is a 2-player match play scenario for differential strokes
    const isMatchPlay = round.matchPlay || round.games?.some(g => g.type === 'match' || g.type === 'nassau');
    const isTwoPlayerMatch = isMatchPlay && supabasePlayers.length === 2;
    const isManualMode = round.handicapMode === 'manual';

    // For 2-player match play, calculate differential strokes
    let matchPlayStrokesMap: Map<string, Map<number, number>> | undefined;
    const totalCoursePar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);

    if (isTwoPlayerMatch) {
      const [p1, p2] = supabasePlayers;
      const matchInfo = calculateMatchPlayStrokes(
        { id: p1.id, name: p1.name, handicap: p1.handicap, manualStrokes: p1.manualStrokes },
        { id: p2.id, name: p2.name, handicap: p2.handicap, manualStrokes: p2.manualStrokes },
        round.slope || 113,
        round.holes,
        isManualMode ? 'manual' : 'auto',
        round.rating,
        totalCoursePar
      );
      matchPlayStrokesMap = buildMatchPlayStrokesMap(matchInfo, round.holeInfo);
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

      // Use match play differential strokes if applicable
      if (matchPlayStrokesMap) {
        strokesPerHole = matchPlayStrokesMap.get(player.id);
        playingHandicap = strokesPerHole
          ? Array.from(strokesPerHole.values()).reduce((sum, s) => sum + s, 0)
          : 0;
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      } else if (isManualMode) {
        // Manual mode for non-match-play: use manually entered strokes
        playingHandicap = player.manualStrokes ?? 0;
        strokesPerHole = getManualStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      } else if (player.handicap !== undefined && player.handicap !== null) {
        // Auto mode for non-match-play: calculate from handicap index and course slope
        playingHandicap = calculatePlayingHandicap(player.handicap, round.slope || 113, round.holes, round.rating, totalCoursePar);
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

    // Build strokes map for match play calculation
    const strokesMap = new Map<string, Map<number, number>>();
    playersWithScores.forEach(p => {
      if (p.strokesPerHole) {
        strokesMap.set(p.id, p.strokesPerHole);
      }
    });

    // Use the proper match play calculation with net scores
    const result = calculateMatchPlay(
      supabaseScores,
      playersWithScores,
      round.holeInfo,
      strokesMap.size > 0 ? strokesMap : undefined,
      round.holes
    );

    return {
      status: result.statusText,
      leader: result.leaderId ? playersWithScores.find(p => p.id === result.leaderId) : null,
      holesPlayed: result.holesPlayed,
      holesRemaining: result.holesRemaining,
      upBy: result.holesUp,
      matchStatus: result.matchStatus,
    };
  }, [round, playersWithScores, supabaseScores]);

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
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-8 text-center mx-6">
          <h2 className="text-[22px] font-black tracking-[-0.04em] mb-4">Round not found</h2>
          <Button
            onClick={() => navigate('/')}
            className="bg-foreground text-background rounded-2xl font-bold"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const getPositionBadge = (rank: number) => {
    if (rank === 0) {
      return (
        <div className="w-9 h-9 rounded-xl bg-[#F0EE3A] flex items-center justify-center">
          <Trophy className="w-4 h-4 text-[#0A0A0A]" />
        </div>
      );
    }
    if (rank === 1) {
      return (
        <div className="w-9 h-9 rounded-xl bg-[#E5E7EB] flex items-center justify-center">
          <Medal className="w-4 h-4 text-[#374151]" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-9 h-9 rounded-xl bg-[#FED7AA] flex items-center justify-center">
          <Award className="w-4 h-4 text-[#92400E]" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
        <span className="text-sm font-black text-muted-foreground">{rank + 1}</span>
      </div>
    );
  };

  const getScoreTrend = (relativeToPar: number) => {
    if (relativeToPar < 0) {
      return <TrendingDown className="w-4 h-4 text-[#22C55E]" />;
    }
    if (relativeToPar > 0) {
      return <TrendingUp className="w-4 h-4 text-[#EF4444]" />;
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
        className={cn(
          "bg-white rounded-2xl px-4 py-3.5 mb-2",
          isLeader
            ? "shadow-[0_0_0_2px_rgba(34,197,94,0.35),0_4px_16px_rgba(34,197,94,0.1)]"
            : "shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Position Badge */}
          {getPositionBadge(rank)}

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{player.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {player.holesPlayed > 0 ? `Thru ${player.holesPlayed}` : 'Not started'}
              </span>
              {player.playingHandicap !== undefined && viewMode === 'net' && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  · NET
                </span>
              )}
            </div>
          </div>

          {/* Score Display */}
          <div className="flex items-center gap-2">
            {player.holesPlayed > 0 && getScoreTrend(relativeToPar)}
            <div className="text-right">
              <p className={cn(
                "font-black text-xl tabular-nums",
                relativeToPar < 0 && "text-[#22C55E]",
                relativeToPar > 0 && "text-[#EF4444]",
                relativeToPar === 0 && "text-foreground"
              )}>
                {player.holesPlayed > 0 ? displayScore : '–'}
              </p>
              {player.holesPlayed > 0 && (
                <p className={cn(
                  "text-[10px] font-bold tabular-nums",
                  relativeToPar < 0 && "text-[#22C55E]",
                  relativeToPar > 0 && "text-[#EF4444]",
                  relativeToPar === 0 && "text-muted-foreground"
                )}>
                  {formatRelativeToPar(relativeToPar)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Leader stats grid */}
        {isLeader && player.scores.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mx-0 mt-2 mb-0 -mx-4 -mb-3.5 rounded-t-none">
            <div className="grid grid-cols-4 gap-0 divide-x divide-border">
              {/* Birdies */}
              <div className="flex flex-col items-center py-1">
                <TrendingDown className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="font-black text-lg text-[#22C55E]">
                  {player.scores.filter(s => {
                    const hole = round.holeInfo.find(h => h.number === s.holeNumber);
                    return hole && s.strokes < hole.par;
                  }).length}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Birdies</span>
              </div>
              {/* Pars */}
              <div className="flex flex-col items-center py-1">
                <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-black text-lg text-foreground">
                  {player.scores.filter(s => {
                    const hole = round.holeInfo.find(h => h.number === s.holeNumber);
                    return hole && s.strokes === hole.par;
                  }).length}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Pars</span>
              </div>
              {/* Bogeys */}
              <div className="flex flex-col items-center py-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="font-black text-lg text-[#D97706]">
                  {player.scores.filter(s => {
                    const hole = round.holeInfo.find(h => h.number === s.holeNumber);
                    return hole && s.strokes === hole.par + 1;
                  }).length}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Bogeys</span>
              </div>
              {/* Doubles */}
              <div className="flex flex-col items-center py-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#EF4444]" />
                <span className="font-black text-lg text-[#EF4444]">
                  {player.scores.filter(s => {
                    const hole = round.holeInfo.find(h => h.number === s.holeNumber);
                    return hole && s.strokes >= hole.par + 2;
                  }).length}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Doubles</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Fixed Header */}
      <header className="flex-shrink-0 px-6 pb-3 pt-safe-content border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              hapticLight();
              navigate(`/round/${round.id}`);
            }}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Back to scorecard"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </motion.button>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground truncate">{round.courseName}</p>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-tight">Leaderboard</h1>
              <ConnectionStatus isOnline={isOnline} />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4 text-foreground", isRefreshing && "animate-spin")} />
          </motion.button>
        </div>
      </header>

      {/* View Mode Toggle */}
      {hasHandicaps && (
        <div className="relative bg-muted rounded-xl p-1 flex gap-1 mx-6 mb-4 mt-3">
          {(['gross', 'net'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                hapticLight();
                setViewMode(mode);
              }}
              className="relative flex-1 py-2 text-sm text-center z-10"
            >
              {viewMode === mode && (
                <motion.div
                  layoutId="leaderboard-mode"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={cn(
                "relative z-10 font-bold",
                viewMode === mode ? "text-foreground" : "text-muted-foreground font-medium"
              )}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Content */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-6 pb-nav" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Loading state */}
        {supabaseLoading && playersWithScores.length === 0 ? (
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted/50 rounded-2xl h-14 animate-pulse mb-2" />
            ))}
          </div>
        ) : (
          <>
            {/* Rankings */}
            <div className="pt-2">
              {sortedPlayers.map((player, index) => getPlayerCard(player, index))}
            </div>

            {/* Match Play Status */}
            {matchPlayStatus && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mb-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-foreground" />
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">Match Play</p>
                </div>
                <p className="font-black text-lg text-foreground">
                  {matchPlayStatus.status}
                </p>
                {matchPlayStatus.holesPlayed > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Thru {matchPlayStatus.holesPlayed} · {matchPlayStatus.holesRemaining} to play
                  </p>
                )}
              </motion.div>
            )}

            {/* Round Statistics */}
            {stats && stats.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mx-0 mt-2 mb-2"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">Round Statistics</p>
                <div className="grid grid-cols-4 gap-0 divide-x divide-border">
                  <div className="flex flex-col items-center py-1">
                    <TrendingDown className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span className="font-black text-lg text-[#22C55E]">{stats.birdiesOrBetter}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Birdies</span>
                  </div>
                  <div className="flex flex-col items-center py-1">
                    <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-black text-lg text-foreground">{stats.pars}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Pars</span>
                  </div>
                  <div className="flex flex-col items-center py-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#D97706]" />
                    <span className="font-black text-lg text-[#D97706]">{stats.bogeys}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Bogeys</span>
                  </div>
                  <div className="flex flex-col items-center py-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#EF4444]" />
                    <span className="font-black text-lg text-[#EF4444]">{stats.doubles}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground mt-0.5">Doubles</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Custom House Game Rules */}
            {(() => {
              const houseEntry = round?.games?.find(g => g.type === 'house');
              const customRules = (houseEntry?.activePrimitives ?? []).filter(isCustomPrimitive);
              if (customRules.length === 0) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden mt-2 mb-2"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                    <div className="w-5 h-5 rounded-md bg-[#F0EE3A] flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-[#0A0A0A]" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground">Custom Rules</p>
                    <span className="ml-auto text-[10px] font-bold text-muted-foreground">Settle manually</span>
                  </div>
                  {customRules.map((rule) => {
                    const label = rule.label ?? rule.id.replace('custom_', '').replace(/_/g, ' ');
                    const desc = rule.description ?? '';
                    const val = rule.value;
                    return (
                      <div key={rule.id} className="px-4 py-3 border-b border-border/10 last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-foreground block">{label}</span>
                            {desc && <span className="text-[11px] text-muted-foreground leading-snug">{desc}</span>}
                          </div>
                          {val != null && (
                            <span className="text-[12px] font-black text-foreground flex-shrink-0">${val}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
}
