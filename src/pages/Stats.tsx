import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { computeUserStats } from '@/lib/computeUserStats';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { StatsHero } from '@/components/stats/StatsHero';
import { ScoringBreakdownCard } from '@/components/stats/ScoringBreakdownCard';
import { StatsTiles } from '@/components/stats/StatsTiles';
import {
  BestCourseCard,
  LuckyHoleCard,
  PlayerProfileCard,
  RecordsSection,
} from '@/components/stats/StatsInsights';
import type { GolfStats } from '@/lib/computeUserStats';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

export default function Stats() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<GolfStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const result = await computeUserStats(user.id, supabase);
      setStats(result);
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats, location.key]);

  const handleRefresh = useCallback(async () => {
    hapticLight();
    await fetchStats();
    hapticSuccess();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  const winRate = stats && stats.holesPlayed > 0
    ? Math.round((stats.holesWon / stats.holesPlayed) * 100) : 0;
  const matchWinRate = stats && stats.matchesPlayed > 0
    ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100) : 0;

  const dist = stats?.scoreDistribution ?? { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, total: 0 };
  const roundsPlayed = stats?.roundsPlayed || 0;

  const headerContent = (
    <div className="flex items-end justify-between gap-3 px-5 pb-3 pt-safe-content">
      <div>
        <p className="text-[13px] font-semibold text-muted-foreground">Your game</p>
        <h1 className="text-[30px] font-extrabold tracking-[-0.02em] leading-tight text-foreground">Stats</h1>
      </div>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.96 }}
        transition={spring}
        onClick={() => { hapticLight(); navigate('/rounds'); }}
        aria-label="View all rounds"
        className="h-11 bg-card border border-border rounded-full pl-4 pr-3 flex items-center gap-1 mb-0.5"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="text-[14px] font-semibold text-foreground tabular-nums">
          {roundsPlayed} {roundsPlayed === 1 ? 'round' : 'rounds'}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </motion.button>
    </div>
  );

  const hasData = stats && (stats.holesPlayed > 0 || stats.roundsPlayed > 0);

  return (
    <AppLayout header={headerContent} mainClassName="pb-nav">
      <PullToRefresh onRefresh={handleRefresh}>
      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="mx-5 mt-4 bg-card rounded-[20px] border border-border flex flex-col items-center justify-center py-12 px-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="w-7 h-7 text-foreground" />
            </div>
            <h3 className="text-[18px] font-bold text-foreground mb-1">No stats yet</h3>
            <p className="text-[14px] text-muted-foreground max-w-[260px] leading-relaxed">
              Play some rounds with friends to start tracking your wins, money, and scoring trends.
            </p>
            <button
              onClick={() => { hapticLight(); navigate('/new-round'); }}
              className="mt-5 h-12 px-6 rounded-[14px] bg-[#0F1F17] text-white text-[15px] font-semibold"
            >
              Start a round
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-5 pt-2 pb-6 space-y-3.5"
          >
            <StatsHero
              winRate={winRate}
              holesWon={stats?.holesWon ?? 0}
              holesPlayed={stats?.holesPlayed ?? 0}
              roundsWon={stats?.matchesWon ?? 0}
              longestWinStreak={stats?.longestWinStreak ?? 0}
            />

            <StatsTiles
              moneyWon={stats?.totalMoneyWon ?? 0}
              roundWinRate={matchWinRate}
              roundsWon={stats?.matchesWon ?? 0}
              roundsPlayed={roundsPlayed}
              holesPlayed={stats?.holesPlayed ?? 0}
              matchesPlayed={stats?.matchesPlayed ?? 0}
            />

            <ScoringBreakdownCard
              dist={dist}
              avgScore={stats?.avgScore ?? null}
              scoreTrend={stats?.scoreTrend ?? null}
            />

            {stats?.bestCourse && <BestCourseCard course={stats.bestCourse} />}
            {stats?.hotHole && <LuckyHoleCard hot={stats.hotHole} />}
            {dist.total >= 9 && <PlayerProfileCard dist={dist} />}
            {stats && <RecordsSection stats={stats} />}
          </motion.div>
        )}
      </AnimatePresence>
      </PullToRefresh>
    </AppLayout>
  );
}
