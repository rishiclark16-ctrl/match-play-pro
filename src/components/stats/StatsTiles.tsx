import { motion } from 'framer-motion';
import { DollarSign, Flag, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountUp } from './StatsAnimations';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

interface Props {
  moneyWon: number;
  roundWinRate: number;
  roundsWon: number;
  roundsPlayed: number;
  holesPlayed: number;
  matchesPlayed: number;
}

/** 2x2 grid of white stat cards. Money won uses the Forest "won" colour. */
export function StatsTiles({ moneyWon, roundWinRate, roundsWon, roundsPlayed, holesPlayed, matchesPlayed }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.15 }}
      className="grid grid-cols-2 gap-2"
    >
      <StatCard icon={DollarSign} label="Money won">
        <CountUp
          value={moneyWon}
          prefix="$"
          className={cn('text-[28px] font-extrabold leading-none tracking-[-0.02em]', moneyWon > 0 ? 'text-[#14532D]' : 'text-foreground')}
        />
      </StatCard>
      <StatCard
        icon={Trophy}
        label="Round win rate"
        caption={matchesPlayed > 0 ? `${roundsWon} of ${matchesPlayed} rounds` : undefined}
      >
        <CountUp value={roundWinRate} suffix="%" className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foreground" />
      </StatCard>
      <StatCard icon={Flag} label="Rounds played">
        <CountUp value={roundsPlayed} className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foreground" />
      </StatCard>
      <StatCard icon={Target} label="Holes played">
        <CountUp value={holesPlayed} className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foreground" />
      </StatCard>
    </motion.section>
  );
}

function StatCard({
  icon: Icon,
  label,
  caption,
  children,
}: {
  icon: React.ElementType;
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-[20px] border border-border p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-4 h-4 text-foreground" />
        </span>
      </div>
      {children}
      {caption && <p className="text-[12px] text-muted-foreground mt-1.5">{caption}</p>}
    </div>
  );
}
