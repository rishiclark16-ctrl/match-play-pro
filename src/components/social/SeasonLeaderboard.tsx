import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSeasonLeaderboard } from '@/hooks/useSeasonLeaderboard';
import { cn } from '@/lib/utils';

/** Money on Forest: up = lime, down = light red (5:1 on Forest), even = soft green. */
function moneyOnForest(n: number) {
  return n > 0 ? 'text-gold' : n < 0 ? 'text-[#FFB4A8]' : 'text-on-forest-muted';
}

function fmt(n: number) {
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}$${Math.abs(n).toFixed(0)}`;
}

const shell = 'relative overflow-hidden rounded-[28px] bg-primary text-primary-foreground';

/** Season standings vs friends: the Social feed's Forest hero card. */
export function SeasonLeaderboard() {
  const { entries, loading } = useSeasonLeaderboard();
  const [expanded, setExpanded] = useState(false);
  const year = new Date().getFullYear();

  if (loading) {
    return (
      <div className={cn(shell, 'p-5')}>
        <div className="h-3 w-28 rounded-full bg-white/15 animate-pulse mb-4" />
        <div className="h-[88px] rounded-[18px] bg-white/10 animate-pulse mb-3" />
        <div className="space-y-2.5">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[12px] bg-white/10 animate-pulse" />
              <div className="h-3 flex-1 rounded-full bg-white/10 animate-pulse" />
              <div className="h-3 w-10 rounded-full bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn(shell, 'p-5')}>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-on-forest-muted">
          <Trophy className="h-4 w-4 text-gold" />
          {year} season
        </div>
        <h2 className="mt-2 text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
          The table is <span className="text-gold">wide open.</span>
        </h2>
        <p className="mt-2 max-w-[290px] text-[14px] leading-relaxed text-on-forest-muted">
          Play money rounds with friends and your season standings show up here.
        </p>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => b.netAmount - a.netAmount);
  const totalNet = sorted.reduce((s, e) => s + e.netAmount, 0);
  const shown = expanded ? sorted : sorted.slice(0, 3);
  const hasMore = sorted.length > 3;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={shell}>
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-on-forest-muted">
          <Trophy className="h-4 w-4 text-gold" />
          {year} season
        </div>

        {/* Your net: the one lime tile */}
        <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-2">
          <div className="rounded-[18px] bg-gold px-4 py-3 text-gold-foreground">
            <p className="text-[12px] font-semibold text-gold-foreground/80 leading-none">Your net</p>
            <p className="mt-2 text-[34px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
              {totalNet === 0 ? 'Even' : fmt(totalNet)}
            </p>
          </div>
          <div className="rounded-[18px] bg-white/10 px-4 py-3">
            <p className="text-[12px] font-semibold text-on-forest-muted leading-none">Rivals</p>
            <p className="mt-2 text-[34px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-white">{sorted.length}</p>
          </div>
        </div>
      </div>

      <div className="px-3 pt-3 pb-2">
        <AnimatePresence initial={false}>
          {shown.map((entry, idx) => (
            <motion.div
              key={entry.friendProfileId}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 rounded-[14px] px-2 py-2">
                <span className={cn('w-4 text-center text-[13px] font-bold tabular-nums', idx === 0 ? 'text-gold' : 'text-on-forest-muted/70')}>
                  {idx + 1}
                </span>
                <Avatar className="h-9 w-9 rounded-[12px] flex-shrink-0">
                  <AvatarImage src={entry.friendAvatar ?? undefined} />
                  <AvatarFallback className="rounded-[12px] bg-white/10 text-[12px] font-bold text-white">
                    {entry.friendName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white truncate leading-tight">{entry.friendName.split(' ')[0]}</p>
                  <p className="text-[12px] text-on-forest-muted">
                    {entry.roundCount} {entry.roundCount === 1 ? 'round' : 'rounds'} together
                  </p>
                </div>
                <span className={cn('text-[17px] font-extrabold tabular-nums', moneyOnForest(entry.netAmount))}>
                  {entry.netAmount === 0 ? 'Even' : fmt(entry.netAmount)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          className="w-full h-11 flex items-center justify-center gap-1 border-t border-white/10 text-[13px] font-semibold text-on-forest-muted"
        >
          {expanded ? 'Show less' : `${sorted.length - 3} more`}
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </motion.div>
  );
}
