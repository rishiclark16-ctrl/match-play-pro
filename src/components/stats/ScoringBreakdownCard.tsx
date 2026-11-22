import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GolfStats, ScoreDistribution } from '@/lib/computeUserStats';
import { CountUp, StatBar } from './StatsAnimations';
import { ScoreMark, type ScoreMarkKind } from './ScoreMark';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

const ROWS: { key: keyof Omit<ScoreDistribution, 'total'>; label: string; kind: ScoreMarkKind; glyph: string; bar: string }[] = [
  { key: 'eagles', label: 'Eagle or better', kind: 'eagle', glyph: '−2', bar: '#14532D' },
  { key: 'birdies', label: 'Birdie', kind: 'birdie', glyph: '−1', bar: '#BEF264' },
  { key: 'pars', label: 'Par', kind: 'par', glyph: 'E', bar: '#0F1F17' },
  { key: 'bogeys', label: 'Bogey', kind: 'bogey', glyph: '+1', bar: '#8A978F' },
  { key: 'doubles', label: 'Double or worse', kind: 'double', glyph: '+2', bar: '#B42318' },
];

interface Props {
  dist: ScoreDistribution;
  avgScore: GolfStats['avgScore'];
  scoreTrend: GolfStats['scoreTrend'];
}

/** White card: score-mark rows with bars, then under / on / over par split. */
export function ScoringBreakdownCard({ dist, avgScore, scoreTrend }: Props) {
  const max = Math.max(dist.eagles, dist.birdies, dist.pars, dist.bogeys, dist.doubles, 1);
  const pct = (n: number) => (dist.total > 0 ? Math.round((n / dist.total) * 100) : 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="bg-card rounded-[20px] border border-border p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">Scoring</h2>
          <p className="text-[12px] text-muted-foreground">{dist.total} holes scored</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {avgScore != null && (
            <span className="rounded-full bg-muted px-2.5 h-7 inline-flex items-center text-[13px] font-bold text-foreground tabular-nums">
              {avgScore > 0 ? '+' : avgScore < 0 ? '−' : ''}
              {Math.abs(avgScore).toFixed(1)} per hole
            </span>
          )}
          {scoreTrend != null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[12px] font-semibold',
                scoreTrend.improving ? 'text-[#14532D]' : 'text-[#B42318]',
              )}
            >
              {scoreTrend.improving ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              {scoreTrend.delta} {scoreTrend.improving ? 'improving' : 'declining'}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {ROWS.map((row, i) => (
          <div key={row.key} className="flex items-center gap-3 min-h-[40px]">
            <ScoreMark kind={row.kind} size={30}>
              {row.glyph}
            </ScoreMark>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[13px] font-medium text-foreground">{row.label}</span>
                <span className="text-[13px] font-bold text-foreground tabular-nums">{dist[row.key]}</span>
              </div>
              <StatBar value={dist[row.key]} max={max} color={row.bar} delay={0.12 + i * 0.06} />
            </div>
          </div>
        ))}
      </div>

      {dist.total > 0 && (
        <div className="mt-4 pt-3 border-t border-border grid grid-cols-3">
          {[
            { label: 'Under par', value: pct(dist.eagles + dist.birdies), cls: 'text-[#14532D]' },
            { label: 'On par', value: pct(dist.pars), cls: 'text-foreground' },
            { label: 'Over par', value: pct(dist.bogeys + dist.doubles), cls: 'text-[#B42318]' },
          ].map((c, i) => (
            <div key={c.label} className={cn('text-center', i > 0 && 'border-l border-border')}>
              <CountUp value={c.value} suffix="%" className={cn('text-[22px] font-extrabold', c.cls)} />
              <p className="text-[12px] font-medium text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
