import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PlayerBalance } from '@/hooks/useGroupLedger';
import { formatAmount, ledgerSpringTransition } from './ledgerHelpers';

interface RunningTabListProps {
  loading: boolean;
  balances: PlayerBalance[];
  currentUserId: string | undefined;
  onPlayerTap: (player: PlayerBalance) => void;
  onSettle: (debtor: PlayerBalance) => void;
}

export function RunningTabList({ loading, balances, currentUserId, onPlayerTap, onSettle }: RunningTabListProps) {
  return (
    <div className="mt-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
        Running Tab
      </p>
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          </div>
        ) : balances.length === 0 ? (
          <div className="py-10 text-center text-sm text-black/40">
            No ledger data yet
          </div>
        ) : (
          balances.map((player, i) => (
            <motion.button
              key={player.profileId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...ledgerSpringTransition, delay: i * 0.05 }}
              onClick={() => onPlayerTap(player)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-black/5 last:border-b-0 text-left active:bg-black/5"
            >
              <Avatar className="h-10 w-10 rounded-xl flex-shrink-0">
                <AvatarImage src={player.avatarUrl || undefined} />
                <AvatarFallback className="bg-black/10 text-foreground text-xs rounded-xl font-bold">
                  {player.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">
                  {player.profileId === currentUserId ? 'You' : player.name.split(' ')[0]}
                </p>
                <p className="text-xs text-black/40 mt-0.5">
                  {player.netBalance > 0.005
                    ? `up ${formatAmount(player.netBalance)}`
                    : player.netBalance < -0.005
                    ? `down ${formatAmount(player.netBalance)}`
                    : 'all even'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={cn(
                    'font-black text-base',
                    player.netBalance >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  )}
                >
                  {player.netBalance >= 0 ? '+' : '-'}{formatAmount(player.netBalance)}
                </span>
                {player.netBalance < 0 && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSettle(player);
                    }}
                    className="bg-[#EF4444] text-white text-[10px] font-bold rounded-full px-2.5 py-1 uppercase tracking-wider"
                  >
                    Settle
                  </motion.button>
                )}
                {player.netBalance >= 0 && (
                  <ChevronRight className="h-4 w-4 text-black/20" />
                )}
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
