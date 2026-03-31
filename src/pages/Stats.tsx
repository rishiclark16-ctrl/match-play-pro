import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Flag,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Trophy,
  BarChart3,
  Star,
  Award,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { computeAllTimeStats } from '@/lib/statCalculations';

interface ScoreDistribution {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
  total: number;
}

interface GolfStats {
  holesWon: number;
  holesPlayed: number;
  matchesWon: number;
  matchesPlayed: number;
  totalMoneyWon: number;
  bestCourse: { name: string; wins: number } | null;
  hotHole: { course: string; hole: number; wins: number } | null;
  roundsPlayed: number;
  scoreDistribution: ScoreDistribution;
  avgScore: number | null;
  longestWinStreak: number;
  bestRound: { score: number; courseName: string } | null;
  bestPayout: { amount: number; courseName: string } | null;
  mostSkins: { count: number; courseName: string } | null;
  scoreTrend: { delta: number; improving: boolean } | null;
}

// Animated counter that counts up from 0
function CountUp({ value, className, prefix = '', suffix = '', decimals = 0 }: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const spring = useSpring(0, { mass: 0.8, stiffness: 60, damping: 18 });
  const display = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );

  useEffect(() => {
    if (inView) spring.set(value);
  }, [inView, value, spring]);

  useEffect(() => {
    return display.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v}${suffix}`;
    });
  }, [display, prefix, suffix]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}0{suffix}
    </span>
  );
}

// Animated circular progress ring
function RingProgress({ value, max, size = 120, strokeWidth = 10, color = '#F0EE3A' }: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(max, 1), 1);

  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const dashoffset = useTransform(spring, (v) => circumference * (1 - v));

  useEffect(() => {
    if (inView) spring.set(pct);
  }, [inView, pct, spring]);

  return (
    <svg ref={ref} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: dashoffset }}
      />
    </svg>
  );
}

// Animated bar
function StatBar({ value, max, color, delay = 0 }: {
  value: number;
  max: number;
  color: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;

  return (
    <div ref={ref} className="h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${pct}%` } : { width: 0 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

export default function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GolfStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      try {
        const { data: playerData } = await supabase
          .from('players')
          .select('id, round_id, name')
          .eq('profile_id', user.id);

        if (!playerData || playerData.length === 0) {
          setStats({
            holesWon: 0, holesPlayed: 0, matchesWon: 0, matchesPlayed: 0,
            totalMoneyWon: 0, bestCourse: null, hotHole: null, roundsPlayed: 0,
            scoreDistribution: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, total: 0 },
            avgScore: null, longestWinStreak: 0,
            bestRound: null, bestPayout: null, mostSkins: null, scoreTrend: null,
          });
          setLoading(false);
          return;
        }

        const playerIds = playerData.map(p => p.id);
        const roundIds = [...new Set(playerData.map(p => p.round_id).filter(Boolean))] as string[];

        const { data: roundsData } = await supabase
          .from('rounds')
          .select('id, course_name, status, games, stakes')
          .in('id', roundIds);

        const { data: allScoresData } = await supabase
          .from('scores')
          .select('id, round_id, player_id, hole_number, strokes, par')
          .in('round_id', roundIds);

        let holesWon = 0;
        let holesPlayed = 0;
        const courseWins: Record<string, number> = {};
        const holeWins: Record<string, Record<number, number>> = {};
        const scoreDistribution: ScoreDistribution = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, total: 0 };
        let totalStrokesVsPar = 0;
        let scoredHoles = 0;

        if (allScoresData && roundsData) {
          // Score distribution for user's own scores
          allScoresData.forEach(score => {
            if (!playerIds.includes(score.player_id ?? '')) return;
            if (!score.strokes || !score.par) return;

            const diff = score.strokes - score.par;
            scoreDistribution.total++;
            scoredHoles++;
            totalStrokesVsPar += diff;

            if (diff <= -2) scoreDistribution.eagles++;
            else if (diff === -1) scoreDistribution.birdies++;
            else if (diff === 0) scoreDistribution.pars++;
            else if (diff === 1) scoreDistribution.bogeys++;
            else scoreDistribution.doubles++;
          });

          // Group scores by round and hole for hole wins
          const scoresByRoundHole: Record<string, Record<number, Array<{ playerId: string; strokes: number }>>> = {};
          allScoresData.forEach(score => {
            if (!score.round_id || !score.player_id) return;
            if (!scoresByRoundHole[score.round_id]) scoresByRoundHole[score.round_id] = {};
            if (!scoresByRoundHole[score.round_id][score.hole_number]) scoresByRoundHole[score.round_id][score.hole_number] = [];
            scoresByRoundHole[score.round_id][score.hole_number].push({ playerId: score.player_id, strokes: score.strokes });
          });

          Object.entries(scoresByRoundHole).forEach(([roundId, holes]) => {
            const round = roundsData.find(r => r.id === roundId);
            const courseName = round?.course_name || 'Unknown';

            Object.entries(holes).forEach(([holeNum, scores]) => {
              if (scores.length < 2) return;
              const userScore = scores.find(s => playerIds.includes(s.playerId));
              if (!userScore) return;
              holesPlayed++;
              const minStrokes = Math.min(...scores.map(s => s.strokes));
              const winners = scores.filter(s => s.strokes === minStrokes);
              if (userScore.strokes === minStrokes && winners.length === 1) {
                holesWon++;
                courseWins[courseName] = (courseWins[courseName] || 0) + 1;
                if (!holeWins[courseName]) holeWins[courseName] = {};
                const hole = parseInt(holeNum);
                holeWins[courseName][hole] = (holeWins[courseName][hole] || 0) + 1;
              }
            });
          });
        }

        let bestCourse: { name: string; wins: number } | null = null;
        Object.entries(courseWins).forEach(([name, wins]) => {
          if (!bestCourse || wins > bestCourse.wins) bestCourse = { name, wins };
        });

        let hotHole: { course: string; hole: number; wins: number } | null = null;
        Object.entries(holeWins).forEach(([course, holes]) => {
          Object.entries(holes).forEach(([hole, wins]) => {
            if (!hotHole || wins > hotHole.wins) hotHole = { course, hole: parseInt(hole), wins };
          });
        });

        let matchesWon = 0;
        let matchesPlayed = 0;
        let totalMoneyWon = 0;
        let longestWinStreak = 0;
        let currentStreak = 0;

        // Build rounds data for pure stat computation
        const completedRoundsForStats = roundsData
          ? roundsData.filter(r => r.status === 'complete').map(round => {
              const userPlayerId = playerData.find(p => p.round_id === round.id)?.id ?? '';
              const roundScores = allScoresData
                ? allScoresData
                    .filter(s => s.round_id === round.id)
                    .map(s => ({
                      player_id: s.player_id ?? '',
                      hole_number: s.hole_number,
                      strokes: s.strokes,
                      par: s.par ?? 0,
                    }))
                : [];
              return {
                id: round.id,
                course_name: round.course_name,
                games: Array.isArray(round.games)
                  ? (round.games as Array<{ type: string }>)
                  : [],
                stakes: round.stakes as number | null,
                user_player_id: userPlayerId,
                scores: roundScores,
              };
            })
          : [];

        const {
          bestRound,
          bestPayout,
          mostSkins,
          scoreTrend,
        } = computeAllTimeStats(completedRoundsForStats, user.id);

        if (roundsData && allScoresData) {
          const completedRounds = roundsData.filter(r => r.status === 'complete');

          completedRounds.forEach(round => {
            const roundScores = allScoresData.filter(s => s.round_id === round.id);
            const playerTotals: Record<string, number> = {};
            roundScores.forEach(score => {
              if (!score.player_id) return;
              playerTotals[score.player_id] = (playerTotals[score.player_id] || 0) + score.strokes;
            });

            const userPlayerId = playerData.find(p => p.round_id === round.id)?.id;
            if (!userPlayerId || !playerTotals[userPlayerId]) return;

            matchesPlayed++;
            const userTotal = playerTotals[userPlayerId];
            const allTotals = Object.values(playerTotals);
            const minTotal = Math.min(...allTotals);

            if (userTotal === minTotal && allTotals.filter(t => t === minTotal).length === 1) {
              matchesWon++;
              currentStreak++;
              longestWinStreak = Math.max(longestWinStreak, currentStreak);
              if (round.stakes) {
                const otherPlayers = Object.keys(playerTotals).length - 1;
                const payout = (round.stakes as number) * otherPlayers;
                totalMoneyWon += payout;
              }
            } else {
              currentStreak = 0;
            }
          });
        }

        setStats({
          holesWon, holesPlayed, matchesWon, matchesPlayed, totalMoneyWon,
          bestCourse, hotHole, roundsPlayed: roundIds.length,
          scoreDistribution,
          avgScore: scoredHoles > 0 ? totalStrokesVsPar / scoredHoles : null,
          longestWinStreak,
          bestRound, bestPayout, mostSkins, scoreTrend,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen bg-[#F8F8F6] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent"
        />
      </div>
    );
  }

  const winRate = stats && stats.holesPlayed > 0
    ? Math.round((stats.holesWon / stats.holesPlayed) * 100) : 0;
  const matchWinRate = stats && stats.matchesPlayed > 0
    ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100) : 0;

  const dist = stats?.scoreDistribution ?? { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, total: 0 };
  const distMax = Math.max(dist.eagles, dist.birdies, dist.pars, dist.bogeys, dist.doubles, 1);

  const headerContent = (
    <div className="flex items-center justify-between px-6 pb-3 pt-safe-content border-b-2 border-foreground">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">MATCH Golf</p>
        <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">Stats</h1>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="bg-muted rounded-xl px-3 py-1.5"
      >
        <span className="text-[12px] font-bold text-foreground tabular-nums">
          {stats?.roundsPlayed || 0} {stats?.roundsPlayed === 1 ? 'round' : 'rounds'}
        </span>
      </motion.div>
    </div>
  );

  const hasData = stats && (stats.holesPlayed > 0 || stats.roundsPlayed > 0);

  return (
    <AppLayout header={headerContent} mainClassName="pb-nav">
      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="flex flex-col items-center justify-center py-24 px-6 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-foreground flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-9 h-9 text-[#F0EE3A]" />
            </div>
            <h3 className="text-xl font-black tracking-[-0.03em] mb-2">No Stats Yet</h3>
            <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
              Play some rounds with friends to start tracking your wins, money, and scoring trends.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-6 pt-4 pb-6 space-y-4"
          >

            {/* ── Hero: Win Rate Ring ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.05 }}
              className="bg-[#0A0A0A] overflow-hidden px-6 pt-6 pb-7 -mx-6 rounded-b-3xl"
            >
              <div className="flex items-center gap-6">
                {/* Ring */}
                <div className="relative flex-shrink-0">
                  <RingProgress value={winRate} max={100} size={152} strokeWidth={11} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <CountUp
                      value={winRate}
                      suffix="%"
                      className="text-[52px] font-black text-white leading-none tracking-[-0.04em]"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mt-1">
                      WIN RATE
                    </span>
                  </div>
                </div>

                {/* Key numbers */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-0.5">Holes Won</p>
                    <div className="flex items-baseline gap-1.5">
                      <CountUp
                        value={stats?.holesWon ?? 0}
                        className="text-[32px] font-black text-[#F0EE3A] leading-none"
                      />
                      <span className="text-[14px] font-bold text-white/40">
                        / {stats?.holesPlayed ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-0.5">Rounds Won</p>
                      <CountUp
                        value={stats?.matchesWon ?? 0}
                        className="text-[22px] font-black text-white leading-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-0.5">Win Streak</p>
                      <div className="flex items-baseline gap-1">
                        <CountUp
                          value={stats?.longestWinStreak ?? 0}
                          className="text-[22px] font-black text-white leading-none"
                        />
                        {(stats?.longestWinStreak ?? 0) >= 3 && (
                          <Zap className="w-4 h-4 text-[#F0EE3A]" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Score Distribution ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Scoring Breakdown</p>
                <div className="flex items-center gap-1.5">
                  {stats?.scoreTrend != null && (
                    <div className={cn(
                      "text-[13px] font-black px-2.5 py-1 rounded-xl",
                      stats.scoreTrend.improving ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"
                    )}>
                      {stats.scoreTrend.improving ? '▲' : '▼'} {stats.scoreTrend.delta} {stats.scoreTrend.improving ? 'improving' : 'declining'}
                    </div>
                  )}
                  {stats?.avgScore != null && (
                    <div className={cn(
                      "text-[12px] font-black px-2 py-0.5 rounded-lg",
                      stats.avgScore < 0 ? "bg-[#DCFCE7] text-[#15803D]" :
                      stats.avgScore === 0 ? "bg-muted text-foreground" :
                      stats.avgScore <= 1 ? "bg-[#FFFBEB] text-[#92400E]" :
                      "bg-[#FEF2F2] text-[#991B1B]"
                    )}>
                      {stats.avgScore > 0 ? '+' : ''}{stats.avgScore.toFixed(1)} avg
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Eagle', count: dist.eagles, color: '#15803D', bg: '#DCFCE7', icon: '🦅' },
                  { label: 'Birdie', count: dist.birdies, color: '#22C55E', bg: '#F0FFF4', icon: '🐦' },
                  { label: 'Par', count: dist.pars, color: '#0A0A0A', bg: '#F3F4F6', icon: '◎' },
                  { label: 'Bogey', count: dist.bogeys, color: '#D97706', bg: '#FFFBEB', icon: '+1' },
                  { label: 'Double+', count: dist.doubles, color: '#DC2626', bg: '#FEF2F2', icon: '+2' },
                ].map((row, i) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div
                      className="w-14 text-center py-0.5 rounded-lg text-[10px] font-black flex-shrink-0"
                      style={{ backgroundColor: row.bg, color: row.color }}
                    >
                      {row.label}
                    </div>
                    <div className="flex-1">
                      <StatBar value={row.count} max={distMax} color={row.color} delay={0.12 + i * 0.06} />
                    </div>
                    <span className="text-[13px] font-black text-foreground tabular-nums w-6 text-right flex-shrink-0">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>

              {dist.total > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50 flex gap-4">
                  <div className="text-center flex-1">
                    <CountUp
                      value={Math.round(((dist.eagles + dist.birdies) / dist.total) * 100)}
                      suffix="%"
                      className="text-[17px] font-black text-[#22C55E]"
                    />
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-0.5">Under par</p>
                  </div>
                  <div className="w-px bg-border/50" />
                  <div className="text-center flex-1">
                    <CountUp
                      value={Math.round((dist.pars / dist.total) * 100)}
                      suffix="%"
                      className="text-[17px] font-black text-foreground"
                    />
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-0.5">On par</p>
                  </div>
                  <div className="w-px bg-border/50" />
                  <div className="text-center flex-1">
                    <CountUp
                      value={Math.round(((dist.bogeys + dist.doubles) / dist.total) * 100)}
                      suffix="%"
                      className="text-[17px] font-black text-[#DC2626]"
                    />
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-0.5">Over par</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── 4-Stat Grid ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.15 }}
              className="grid grid-cols-2 gap-3"
            >
              {/* Money Won */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4">
                <div className="w-9 h-9 rounded-xl bg-[#F0FFF4] flex items-center justify-center mb-3">
                  <DollarSign className="w-4 h-4 text-[#22C55E]" />
                </div>
                <CountUp
                  value={stats?.totalMoneyWon ?? 0}
                  prefix="$"
                  className="text-[24px] font-black text-foreground leading-none block"
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-1">
                  Money Won
                </p>
              </div>

              {/* Match Win % */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Trophy className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex items-baseline gap-1">
                  <CountUp
                    value={matchWinRate}
                    suffix="%"
                    className="text-[24px] font-black text-foreground leading-none"
                  />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-1">
                  Round Win Rate
                </p>
                {(stats?.matchesPlayed ?? 0) > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {stats?.matchesWon}/{stats?.matchesPlayed} rounds
                  </p>
                )}
              </div>

              {/* Rounds Played */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Flag className="w-4 h-4 text-foreground" />
                </div>
                <CountUp
                  value={stats?.roundsPlayed ?? 0}
                  className="text-[24px] font-black text-foreground leading-none block"
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-1">
                  Rounds Played
                </p>
              </div>

              {/* Total Holes */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Target className="w-4 h-4 text-foreground" />
                </div>
                <CountUp
                  value={stats?.holesPlayed ?? 0}
                  className="text-[24px] font-black text-foreground leading-none block"
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-1">
                  Holes Played
                </p>
              </div>
            </motion.div>

            {/* ── Best Course ── */}
            {stats?.bestCourse && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                  Happy Place
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#F0EE3A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[17px] tracking-[-0.02em] truncate text-foreground">
                      {stats.bestCourse.name}
                    </p>
                    <p className="text-[12px] text-muted-foreground">Most holes won here</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <CountUp
                      value={stats.bestCourse.wins}
                      className="text-[26px] font-black text-foreground leading-none block"
                    />
                    <p className="text-[11px] font-bold text-muted-foreground">hole wins</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Hot Hole ── */}
            {stats?.hotHole && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.25 }}
                className="bg-[#F0EE3A] rounded-2xl p-5"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0A0A0A]/60 mb-3">
                  Lucky Hole
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
                    <span className="text-[22px] font-black text-[#F0EE3A]">{stats.hotHole.hole}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[17px] tracking-[-0.02em] text-[#0A0A0A]">
                      Hole {stats.hotHole.hole}
                    </p>
                    <p className="text-[12px] text-[#0A0A0A]/60 truncate">{stats.hotHole.course}</p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[#0A0A0A]" />
                    <CountUp
                      value={stats.hotHole.wins}
                      className="text-[22px] font-black text-[#0A0A0A] leading-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Scoring Mindset ── */}
            {dist.total >= 9 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.3 }}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Player Profile
                  </p>
                </div>
                {(() => {
                  const birdieRate = dist.total > 0 ? (dist.eagles + dist.birdies) / dist.total : 0;
                  const bogeyRate = dist.total > 0 ? (dist.bogeys + dist.doubles) / dist.total : 0;
                  let label = '';
                  let desc = '';
                  let color = '';

                  if (birdieRate >= 0.25) {
                    label = 'Scoring Machine';
                    desc = `Making ${Math.round(birdieRate * 100)}% under-par holes — your group better watch out.`;
                    color = 'text-[#22C55E]';
                  } else if (birdieRate >= 0.12) {
                    label = 'Steady Birdie Hunter';
                    desc = 'Consistently threatening under par with good approach play.';
                    color = 'text-[#15803D]';
                  } else if (bogeyRate < 0.35) {
                    label = 'Consistent & Solid';
                    desc = 'Keeping bogeys to a minimum — reliability is your superpower.';
                    color = 'text-foreground';
                  } else if (bogeyRate >= 0.5) {
                    label = 'Fighter';
                    desc = 'Battling through tough holes. Every birdie hits different.';
                    color = 'text-[#D97706]';
                  } else {
                    label = 'Building Game';
                    desc = 'On the path to consistency. The birdies are coming.';
                    color = 'text-muted-foreground';
                  }

                  return (
                    <div>
                      <p className={cn("text-[20px] font-black tracking-[-0.03em]", color)}>{label}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* ── All-time Records ── */}
            {(stats?.bestRound != null || stats?.bestPayout != null || stats?.mostSkins != null) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.35 }}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    All-time Records
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {stats?.bestRound != null && (
                    <div className="bg-[#0A0A0A] rounded-2xl p-3 flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 leading-tight">Best Round</p>
                      <p className="text-[28px] font-black text-[#F0EE3A] leading-none tabular-nums">
                        {stats.bestRound.score > 0 ? '+' : ''}{stats.bestRound.score}
                      </p>
                      <p className="text-[12px] text-white/70 truncate leading-tight">{stats.bestRound.courseName}</p>
                    </div>
                  )}
                  {stats?.bestPayout != null && (
                    <div className="bg-[#0A0A0A] rounded-2xl p-3 flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 leading-tight">Best Payout</p>
                      <p className="text-[28px] font-black text-[#F0EE3A] leading-none tabular-nums">
                        ${stats.bestPayout.amount}
                      </p>
                      <p className="text-[12px] text-white/70 truncate leading-tight">{stats.bestPayout.courseName}</p>
                    </div>
                  )}
                  {stats?.mostSkins != null && (
                    <div className="bg-[#0A0A0A] rounded-2xl p-3 flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 leading-tight">Most Skins</p>
                      <p className="text-[28px] font-black text-[#F0EE3A] leading-none tabular-nums">
                        {stats.mostSkins.count}
                      </p>
                      <p className="text-[12px] text-white/70 truncate leading-tight">{stats.mostSkins.courseName}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
