import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LedgerEntry } from '@/hooks/useGroupLedger';
import { hapticLight } from '@/lib/haptics';
import { formatAmount, formatDate, ledgerSpringTransition } from './ledgerHelpers';

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

export function RoundsHistoryList({
  rounds,
  expandedRoundId,
  setExpandedRoundId,
  currentUserId,
  profileNameMap,
}: RoundsHistoryListProps) {
  return (
    <div className="mt-5 mb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
        History
      </p>
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {rounds.map((round, i) => (
          <motion.div
            key={round.roundId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...ledgerSpringTransition, delay: i * 0.05 }}
            className="border-b border-black/5 last:border-b-0"
          >
            {/* Round header row — tap to expand */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-black/5"
              onClick={() => {
                hapticLight();
                setExpandedRoundId(expandedRoundId === round.roundId ? null : round.roundId);
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {round.courseName}
                </p>
                <p className="text-xs text-black/40 mt-0.5">
                  {formatDate(round.roundDate)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={cn(
                    'font-black text-sm',
                    round.myAmount > 0 ? 'text-[#22C55E]' : round.myAmount < 0 ? 'text-[#EF4444]' : 'text-black/40'
                  )}
                >
                  {round.myAmount > 0 ? '+' : round.myAmount < 0 ? '-' : ''}{formatAmount(round.myAmount)}
                </span>
                <motion.div
                  animate={{ rotate: expandedRoundId === round.roundId ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-black/25" />
                </motion.div>
              </div>
            </button>

            {/* Expanded per-player breakdown */}
            <AnimatePresence>
              {expandedRoundId === round.roundId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 pt-1 bg-black/[0.02] border-t border-black/5">
                    {round.entries
                      .sort((a, b) => b.amount - a.amount)
                      .map(entry => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between py-1.5"
                        >
                          <span className="text-xs text-black/60 font-medium">
                            {entry.profileId === currentUserId
                              ? 'You'
                              : (profileNameMap.get(entry.profileId) ?? 'Player').split(' ')[0]}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-bold',
                              entry.amount > 0 ? 'text-[#22C55E]' : entry.amount < 0 ? 'text-[#EF4444]' : 'text-black/40'
                            )}
                          >
                            {entry.amount > 0 ? '+' : entry.amount < 0 ? '-' : ''}{formatAmount(entry.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
