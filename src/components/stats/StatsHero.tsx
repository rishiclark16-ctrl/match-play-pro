import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountUp, RingProgress } from './StatsAnimations';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

interface StatsHeroProps {
  winRate: number;
  holesWon: number;
  holesPlayed: number;
  roundsWon: number;
  longestWinStreak: number;
}

/**
 * Forest hero card for the stats screen: hole win rate as the 52/800 numeral
 * with a lime ring, and three sub-tiles (lime for holes won, the hottest number).
 */
export function StatsHero({ winRate, holesWon, holesPlayed, roundsWon, longestWinStreak }: StatsHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.05 }}
      className="bg-[#14532D] rounded-[28px] p-5 text-white"
      aria-label="Win rate"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#CFE3D6]">Hole win rate</p>
          <CountUp
            value={winRate}
            suffix="%"
            className="block text-[52px] font-extrabold leading-none tracking-[-0.04em] mt-1.5"
          />
          <p className="text-[13px] text-[#CFE3D6] mt-2">
            Holes you won outright, across every round
          </p>
        </div>
        <div className="shrink-0">
          <RingProgress value={winRate} max={100} size={96} strokeWidth={10} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5">
        <Tile hot label="Holes won">
          <CountUp value={holesWon} className="text-[22px] font-extrabold leading-tight" />
          <span className="text-[13px] font-semibold text-[#14532D] ml-0.5">/{holesPlayed}</span>
        </Tile>
        <Tile label="Rounds won">
          <CountUp value={roundsWon} className="text-[22px] font-extrabold leading-tight" />
        </Tile>
        <Tile label="Best streak">
          <CountUp value={longestWinStreak} className="text-[22px] font-extrabold leading-tight" />
          {longestWinStreak >= 3 && <Zap className="w-4 h-4 text-[#BEF264] ml-1" aria-label="Hot streak" />}
        </Tile>
      </div>
    </motion.section>
  );
}

function Tile({ label, hot, children }: { label: string; hot?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[16px] px-3 py-2.5 min-w-0',
        hot ? 'bg-[#BEF264] text-[#14532D]' : 'bg-white/10 text-white',
      )}
    >
      <p className={cn('text-[11px] font-semibold truncate', hot ? 'text-[#14532D]' : 'text-[#CFE3D6]')}>{label}</p>
      <div className="flex items-baseline">{children}</div>
    </div>
  );
}
