import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isSoloRound } from '@/lib/soloRound';
import { ArrowLeft, RefreshCw, Target, Sparkles } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useSupabaseRound } from '@/hooks/useSupabaseRound';
import { PlayerWithScores } from '@/types/golf';
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
import { LeaderHeroCard, StandingRow, RoundMixCard } from '@/components/golf/scorecard/LeaderboardParts';

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
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="bg-white rounded-[20px] border border-[#E7E9E3] p-8 text-center mx-5">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#0F1F17] mb-4">Round not found</h2>
          <Button
            onClick={() => navigate('/')}
            className="bg-[#0F1F17] text-white rounded-[20px] font-bold h-14 px-8 text-base"
          >
            Go home
          </Button>
        </div>
      </div>
    );
  }

  const isNet = viewMode === 'net' && hasHandicaps;
  const relOf = (p: PlayerWithScores) => (isNet ? (p.netRelativeToPar ?? p.totalRelativeToPar) : p.totalRelativeToPar);
  const scoreOf = (p: PlayerWithScores) => (isNet ? (p.totalNetStrokes ?? p.totalStrokes) : p.totalStrokes);
  const started = sortedPlayers.filter(p => p.holesPlayed > 0);
  const leaders = started.length > 0 ? started.filter(p => relOf(p) === relOf(started[0])) : [];
  const positionOf = (p: PlayerWithScores) => {
    if (p.holesPlayed === 0) return '–';
    const first = started.findIndex(q => relOf(q) === relOf(p));
    const tied = started.filter(q => relOf(q) === relOf(p)).length > 1;
    return `${tied ? 'T' : ''}${first + 1}`;
  };
  const iconButton = 'w-11 h-11 rounded-[14px] bg-white border border-[#E7E9E3] flex items-center justify-center shrink-0 touch-manipulation active:bg-[#F0F2EC]';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAFAF7]">
      {/* Fixed Header */}
      <header className="flex-shrink-0 px-3.5 pb-2 pt-safe-content">
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              hapticLight();
              navigate(`/round/${round.id}`);
            }}
            className={iconButton}
            aria-label="Back to scorecard"
          >
            <ArrowLeft className="w-5 h-5 text-[#0F1F17]" />
          </motion.button>

          <div className="flex-1 min-w-0 pl-1">
            <p className="text-[12px] font-medium text-[#5A6B61] truncate leading-tight">{round.courseName}</p>
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#0F1F17] leading-tight">Leaderboard</h1>
              <ConnectionStatus isOnline={isOnline} />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            className={iconButton}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5 text-[#0F1F17]', isRefreshing && 'animate-spin')} />
          </motion.button>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3.5 pb-nav" style={{ WebkitOverflowScrolling: 'touch' }}>
        {supabaseLoading && playersWithScores.length === 0 ? (
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#F0F2EC] rounded-[20px] h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 pt-1 pb-4">
            {leaders.length > 0 && (
              <LeaderHeroCard
                leaders={leaders}
                relativeToPar={relOf(leaders[0])}
                displayScore={scoreOf(leaders[0])}
                holeInfo={round.holeInfo}
                isNet={isNet}
              />
            )}

            {/* Gross / net toggle: muted pill, active = Forest */}
            {hasHandicaps && (
              <div className="bg-[#F0F2EC] rounded-full p-1 flex gap-1 !mt-3.5" role="tablist" aria-label="Scoring">
                {(['gross', 'net'] as const).map((mode) => (
                  <button
                    key={mode}
                    role="tab"
                    aria-selected={viewMode === mode}
                    onClick={() => {
                      hapticLight();
                      setViewMode(mode);
                    }}
                    className="relative flex-1 h-11 text-[15px] text-center"
                  >
                    {viewMode === mode && (
                      <motion.div
                        layoutId="leaderboard-mode"
                        className="absolute inset-0 bg-[#14532D] rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={cn('relative z-10 font-semibold', viewMode === mode ? 'text-white' : 'text-[#5A6B61]')}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Rankings */}
            <div className="space-y-2 !mt-3.5">
              {sortedPlayers.map((player, index) => (
                <StandingRow
                  key={player.id}
                  player={player}
                  position={positionOf(player)}
                  isLeader={leaders.some(l => l.id === player.id)}
                  relativeToPar={relOf(player)}
                  displayScore={scoreOf(player)}
                  isNet={isNet}
                  index={index}
                />
              ))}
            </div>

            {/* Match Play Status */}
            {matchPlayStatus && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-[20px] border border-[#E7E9E3] p-4 !mt-3.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-[#5A6B61]" />
                  <p className="text-[12px] font-semibold text-[#5A6B61]">Match play</p>
                </div>
                <p className="font-extrabold text-[22px] tracking-[-0.02em] text-[#14532D]">
                  {matchPlayStatus.status}
                </p>
                {matchPlayStatus.holesPlayed > 0 && (
                  <p className="text-[13px] text-[#5A6B61] mt-0.5">
                    Thru {matchPlayStatus.holesPlayed} · {matchPlayStatus.holesRemaining} to play
                  </p>
                )}
              </motion.div>
            )}

            {/* Round Statistics */}
            {stats && stats.total > 0 && (
              <div className="!mt-3.5">
                <RoundMixCard birdies={stats.birdiesOrBetter} pars={stats.pars} bogeys={stats.bogeys} doubles={stats.doubles} />
              </div>
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
                  className="bg-white rounded-[20px] border border-[#E7E9E3] overflow-hidden !mt-3.5"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E7E9E3]">
                    <div className="w-6 h-6 rounded-[8px] bg-[#ECFCCB] flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-[#14532D]" />
                    </div>
                    <p className="text-[15px] font-semibold text-[#0F1F17]">Custom rules</p>
                    <span className="ml-auto text-[12px] font-medium text-[#5A6B61]">Settle manually</span>
                  </div>
                  {customRules.map((rule) => {
                    const label = rule.label ?? rule.id.replace('custom_', '').replace(/_/g, ' ');
                    const desc = rule.description ?? '';
                    const val = rule.value;
                    return (
                      <div key={rule.id} className="px-4 py-3 border-b border-[#E7E9E3] last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-[14px] font-semibold text-[#0F1F17] block">{label}</span>
                            {desc && <span className="text-[12px] text-[#5A6B61] leading-snug">{desc}</span>}
                          </div>
                          {val != null && (
                            <span className="text-[14px] font-bold text-[#0F1F17] flex-shrink-0">${val}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
