import { motion } from 'framer-motion';
import { MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GolfStats, ScoreDistribution } from '@/lib/computeUserStats';
import { CountUp } from './StatsAnimations';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

function Card({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      className={cn('bg-card rounded-[20px] border border-border p-4', className)}
    >
      {children}
    </motion.section>
  );
}

export function BestCourseCard({ course }: { course: NonNullable<GolfStats['bestCourse']> }) {
  return (
    <Card delay={0.2}>
      <p className="text-[13px] font-semibold text-muted-foreground mb-3">Happy place</p>
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-[14px] bg-[#14532D] flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-[#BEF264]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold tracking-[-0.01em] truncate text-foreground">{course.name}</p>
          <p className="text-[12px] text-muted-foreground">Most holes won here</p>
        </div>
        <div className="text-right shrink-0">
          <CountUp value={course.wins} className="block text-[26px] font-extrabold leading-none text-foreground" />
          <p className="text-[12px] text-muted-foreground mt-0.5">hole wins</p>
        </div>
      </div>
    </Card>
  );
}

export function LuckyHoleCard({ hot }: { hot: NonNullable<GolfStats['hotHole']> }) {
  return (
    <Card delay={0.25}>
      <p className="text-[13px] font-semibold text-muted-foreground mb-3">Lucky hole</p>
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-full border-2 border-[#14532D] bg-[#ECFCCB] flex items-center justify-center shrink-0">
          <span className="text-[20px] font-extrabold text-[#14532D] tabular-nums">{hot.hole}</span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold tracking-[-0.01em] text-foreground">Hole {hot.hole}</p>
          <p className="text-[12px] text-muted-foreground truncate">{hot.course}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1">
            <Star className="w-4 h-4 text-[#14532D] fill-[#BEF264]" />
            <CountUp value={hot.wins} className="text-[26px] font-extrabold leading-none text-foreground" />
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">wins</p>
        </div>
      </div>
    </Card>
  );
}

function profileFor(dist: ScoreDistribution) {
  const birdieRate = dist.total > 0 ? (dist.eagles + dist.birdies) / dist.total : 0;
  const bogeyRate = dist.total > 0 ? (dist.bogeys + dist.doubles) / dist.total : 0;
  if (birdieRate >= 0.25) {
    return {
      label: 'Scoring Machine',
      desc: `Making ${Math.round(birdieRate * 100)}% under-par holes — your group better watch out.`,
      color: 'text-[#14532D]',
    };
  }
  if (birdieRate >= 0.12) {
    return { label: 'Steady Birdie Hunter', desc: 'Consistently threatening under par with good approach play.', color: 'text-[#14532D]' };
  }
  if (bogeyRate < 0.35) {
    return { label: 'Consistent & Solid', desc: 'Keeping bogeys to a minimum — reliability is your superpower.', color: 'text-foreground' };
  }
  if (bogeyRate >= 0.5) {
    return { label: 'Fighter', desc: 'Battling through tough holes. Every birdie hits different.', color: 'text-foreground' };
  }
  return { label: 'Building Game', desc: 'On the path to consistency. The birdies are coming.', color: 'text-foreground' };
}

export function PlayerProfileCard({ dist }: { dist: ScoreDistribution }) {
  const p = profileFor(dist);
  return (
    <Card delay={0.3}>
      <p className="text-[13px] font-semibold text-muted-foreground">Player profile</p>
      <p className={cn('text-[22px] font-extrabold tracking-[-0.02em] mt-1', p.color)}>{p.label}</p>
      <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
    </Card>
  );
}

export function RecordsSection({ stats }: { stats: GolfStats }) {
  const records = [
    stats.bestRound && {
      label: 'Best round',
      value: `${stats.bestRound.score > 0 ? '+' : stats.bestRound.score < 0 ? '−' : ''}${Math.abs(stats.bestRound.score)}`,
      sub: stats.bestRound.courseName,
      cls: stats.bestRound.score < 0 ? 'text-[#14532D]' : 'text-foreground',
    },
    stats.bestPayout && {
      label: 'Best payout',
      value: `$${stats.bestPayout.amount}`,
      sub: stats.bestPayout.courseName,
      cls: 'text-[#14532D]',
    },
    stats.mostSkins && {
      label: 'Most skins',
      value: String(stats.mostSkins.count),
      sub: stats.mostSkins.courseName,
      cls: 'text-foreground',
    },
  ].filter(Boolean) as { label: string; value: string; sub: string; cls: string }[];

  if (records.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.35 }}
    >
      <h2 className="text-[13px] font-semibold text-muted-foreground px-1 mb-2">All-time records</h2>
      <div className={cn('grid gap-2', records.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {records.map(r => (
          <div key={r.label} className="bg-card rounded-[20px] border border-border p-3.5 min-w-0">
            <p className="text-[12px] font-semibold text-muted-foreground truncate">{r.label}</p>
            <p className={cn('text-[28px] font-extrabold leading-tight tabular-nums tracking-[-0.02em] mt-0.5', r.cls)}>
              {r.value}
            </p>
            <p className="text-[12px] text-muted-foreground truncate">{r.sub}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
