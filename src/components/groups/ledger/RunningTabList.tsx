import { motion } from 'framer-motion';
import { ChevronRight, Receipt } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PlayerBalance } from '@/hooks/useGroupLedger';
import { formatAmount, ledgerSpringTransition, ledgerSectionLabel, moneyTone } from './ledgerHelpers';

interface RunningTabListProps {
  loading: boolean;
  balances: PlayerBalance[];
  currentUserId: string | undefined;
  onPlayerTap: (player: PlayerBalance) => void;
  onSettle: (debtor: PlayerBalance) => void;
}

export function RunningTabList({ loading, balances, currentUserId, onPlayerTap, onSettle }: RunningTabListProps) {
  return (
    <section className="mt-[18px]">
      <p className={ledgerSectionLabel}>Running tab</p>
      {loading ? (
        <div className="rounded-[20px] border border-border bg-card flex items-center justify-center py-10">
          <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : balances.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border-strong px-6 py-7 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-muted text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <p className="text-[15px] font-semibold text-foreground">No money on the tab yet</p>
          <p className="mx-auto mt-1 max-w-[250px] text-[13px] leading-relaxed text-muted-foreground">
            Finish a round and tap "Add to group tab" to start the season ledger.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {balances.map((player, i) => {
            const up = player.netBalance > 0.005;
            const down = player.netBalance < -0.005;
            return (
              <motion.div
                key={player.profileId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...ledgerSpringTransition, delay: i * 0.05 }}
                role="button"
                tabIndex={0}
                onClick={() => onPlayerTap(player)}
                onKeyDown={(e) => { if (e.key === 'Enter') onPlayerTap(player); }}
                className="w-full rounded-[20px] border border-border bg-card pl-3.5 pr-2 py-2.5 flex items-center gap-3 text-left cursor-pointer active:bg-muted/40"
              >
                <Avatar className="h-11 w-11 rounded-[14px] flex-shrink-0">
                  <AvatarImage src={player.avatarUrl || undefined} />
                  <AvatarFallback className="bg-muted text-primary text-[13px] rounded-[14px] font-bold">
                    {player.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-foreground truncate">
                    {player.profileId === currentUserId ? 'You' : player.name.split(' ')[0]}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {up ? `up ${formatAmount(player.netBalance)}` : down ? `owes ${formatAmount(player.netBalance)}` : 'all even'}
                  </p>
                </div>
                <span className={cn('text-[20px] font-extrabold tabular-nums', moneyTone(player.netBalance))}>
                  {up ? '+' : down ? '-' : ''}{formatAmount(player.netBalance)}
                </span>
                {down ? (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSettle(player);
                    }}
                    className="h-11 rounded-[14px] bg-foreground px-3.5 text-[14px] font-bold text-background"
                  >
                    Settle
                  </motion.button>
                ) : (
                  <ChevronRight className={cn('h-4 w-4 text-muted-foreground mx-3')} />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
