import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSeasonLeaderboard } from '@/hooks/useSeasonLeaderboard';
import { cn } from '@/lib/utils';

export function SeasonLeaderboard() {
  const { entries, loading } = useSeasonLeaderboard();
  const [expanded, setExpanded] = useState(false);
  const year = new Date().getFullYear();

  if (loading) {
    return (
      <div className="bg-[#0A0A0A] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded bg-white/10 animate-pulse" />
          <div className="h-2.5 w-28 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-2.5 bg-white/10 rounded animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 h-2.5 bg-white/10 rounded animate-pulse" />
              <div className="w-10 h-2.5 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-[#0A0A0A] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-[#F0EE3A]" />
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/50">
            {year} Season
          </span>
        </div>
        <p className="text-[12px] text-white/30 leading-relaxed">
          Play money rounds with friends — your standings will appear here.
        </p>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => b.netAmount - a.netAmount);
  const totalNet = sorted.reduce((s, e) => s + e.netAmount, 0);
  const shown = expanded ? sorted : sorted.slice(0, 3);
  const hasMore = sorted.length > 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A0A0A] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#F0EE3A] flex-shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/50">
            {year} Season
          </span>
        </div>
        {/* Your net summary */}
        <div className="text-right">
          <span className={cn(
            'text-[13px] font-black tabular-nums',
            totalNet > 0 ? 'text-emerald-400' : totalNet < 0 ? 'text-red-400' : 'text-white/40'
          )}>
            {totalNet > 0 ? '+' : ''}{totalNet < 0 ? '-' : ''}${Math.abs(totalNet).toFixed(0)}
          </span>
          <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.08em]">your net</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-4" />

      {/* Rows */}
      <div className="px-4 pt-3 pb-3 space-y-1">
        <AnimatePresence initial={false}>
          {shown.map((entry, idx) => {
            const isFirst = idx === 0;
            const pos = entry.netAmount;
            const isUp = pos > 0;
            const isDown = pos < 0;

            return (
              <motion.div
                key={entry.friendProfileId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5',
                  isFirst ? 'bg-[#F0EE3A]/10' : 'bg-transparent'
                )}>
                  {/* Rank */}
                  <span className={cn(
                    'text-[11px] font-black w-4 text-center flex-shrink-0',
                    isFirst ? 'text-[#F0EE3A]' : 'text-white/25'
                  )}>
                    {idx + 1}
                  </span>

                  {/* Avatar */}
                  <Avatar className="w-7 h-7 rounded-full flex-shrink-0">
                    <AvatarImage src={entry.friendAvatar ?? undefined} />
                    <AvatarFallback className="rounded-full text-[9px] font-black bg-white/10 text-white">
                      {entry.friendName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[13px] font-bold truncate leading-none',
                      isFirst ? 'text-white' : 'text-white/70'
                    )}>
                      {entry.friendName.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      {entry.roundCount}r
                    </p>
                  </div>

                  {/* Amount */}
                  <span className={cn(
                    'text-[14px] font-black tabular-nums flex-shrink-0',
                    isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-white/30'
                  )}>
                    {isUp ? '+' : isDown ? '-' : ''}${Math.abs(pos).toFixed(0)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-white/5 text-[11px] font-bold text-white/30 hover:text-white/50 transition-colors"
        >
          {expanded ? 'Show less' : `${sorted.length - 3} more`}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </motion.div>
  );
}
