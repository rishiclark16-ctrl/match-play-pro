import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LedgerEntry } from '@/hooks/useGroupLedger';
import { hapticLight } from '@/lib/haptics';
import { formatAmount, formatDate, ledgerSpringTransition, ledgerSectionLabel, moneyTone } from './ledgerHelpers';

export interface RoundsGroupedItem {
  roundId: string;
  courseName: string;
  roundDate: string;
  entries: LedgerEntry[];
  myAmount: number;
}

interface RoundsHistoryListProps {
  rounds: RoundsGroupedItem[];
  expandedRoundId: string | null;
  setExpandedRoundId: (id: string | null) => void;
  currentUserId: string | undefined;
  profileNameMap: Map<string, string>;
}

const signed = (n: number) => `${n > 0.005 ? '+' : n < -0.005 ? '-' : ''}${formatAmount(n)}`;

export function RoundsHistoryList({
  rounds,
  expandedRoundId,
  setExpandedRoundId,
  currentUserId,
  profileNameMap,
}: RoundsHistoryListProps) {
  return (
    <section className="mt-[18px] mb-4">
      <p className={ledgerSectionLabel}>History</p>
      <div className="rounded-[20px] border border-border bg-card overflow-hidden">
        {rounds.map((round, i) => {
          const open = expandedRoundId === round.roundId;
          return (
            <motion.div
              key={round.roundId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...ledgerSpringTransition, delay: i * 0.05 }}
              className="border-b border-border last:border-b-0"
            >
              <button
                className="w-full min-h-[60px] flex items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                aria-expanded={open}
                onClick={() => {
                  hapticLight();
                  setExpandedRoundId(open ? null : round.roundId);
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{round.courseName}</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{formatDate(round.roundDate)}</p>
                </div>
                <span className={cn('text-[16px] font-extrabold tabular-nums', moneyTone(round.myAmount))}>
                  {signed(round.myAmount)}
                </span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-4 mb-3 rounded-[14px] bg-muted/60 px-3 py-1.5">
                      {round.entries
                        .sort((a, b) => b.amount - a.amount)
                        .map(entry => (
                          <div key={entry.id} className="flex items-center justify-between py-1.5">
                            <span className="text-[14px] text-foreground/80">
                              {entry.profileId === currentUserId
                                ? 'You'
                                : (profileNameMap.get(entry.profileId) ?? 'Player').split(' ')[0]}
                            </span>
                            <span className={cn('text-[14px] font-bold tabular-nums', moneyTone(entry.amount))}>
                              {signed(entry.amount)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
