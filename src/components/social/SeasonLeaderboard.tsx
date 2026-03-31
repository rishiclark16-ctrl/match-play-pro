import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSeasonLeaderboard } from '@/hooks/useSeasonLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

function AmountBadge({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-[11px] text-white/40 font-bold">$0</span>;
  const positive = amount > 0;
  return (
    <span className={cn(
      'text-[12px] font-black tabular-nums',
      positive ? 'text-emerald-400' : 'text-red-400'
    )}>
      {positive ? '+' : ''}{amount < 0 ? '-' : ''}${Math.abs(amount).toFixed(0)}
    </span>
  );
}

export function SeasonLeaderboard() {
  const { entries, loading } = useSeasonLeaderboard();
  const { user } = useAuth();
  const year = new Date().getFullYear();

  if (loading) {
    return (
      <div className="bg-[#0A0A0A] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-3 bg-white/10 rounded animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            <div className="flex-1 h-3 bg-white/10 rounded animate-pulse" />
            <div className="w-12 h-3 bg-white/10 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-[#0A0A0A] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-[#F0EE3A]" />
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/60">
            {year} Season Standings
          </span>
        </div>
        <p className="text-[12px] text-white/40 leading-relaxed">
          Play rounds with friends to build your season money record.
        </p>
      </div>
    );
  }

  // Sort by net amount descending — highest winner at top
  const sorted = [...entries].sort((a, b) => b.netAmount - a.netAmount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A0A0A] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#F0EE3A]" />
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/60">
            {year} Season Standings
          </span>
        </div>
        <span className="text-[10px] font-bold text-white/30">
          {entries.reduce((s, e) => s + e.roundCount, 0)} rounds
        </span>
      </div>

      {/* Rows */}
      <div className="px-4 pb-4 space-y-2.5">
        {sorted.map((entry, idx) => {
          const isPositive = entry.netAmount > 0;
          const isNegative = entry.netAmount < 0;
          return (
            <motion.div
              key={entry.friendProfileId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3"
            >
              {/* Rank */}
              <span className={cn(
                'text-[11px] font-black w-5 text-center',
                idx === 0 ? 'text-[#F0EE3A]' : 'text-white/30'
              )}>
                {idx + 1}
              </span>

              {/* Avatar */}
              <Avatar className="w-8 h-8 rounded-full flex-shrink-0">
                <AvatarImage src={entry.friendAvatar ?? undefined} />
                <AvatarFallback className="rounded-full text-[10px] font-bold bg-white/10 text-white">
                  {entry.friendName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name + rounds */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white truncate leading-none">
                  {entry.friendName}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {entry.roundCount} round{entry.roundCount !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Net amount + trend icon */}
              <div className="flex items-center gap-1.5">
                {isPositive && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                {isNegative && <TrendingDown className="w-3 h-3 text-red-400" />}
                <AmountBadge amount={entry.netAmount} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
