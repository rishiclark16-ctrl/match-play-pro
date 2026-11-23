import { motion } from 'framer-motion';
import { Check, RotateCcw, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TrackedSettlement, useSettlementTracking } from '@/hooks/useSettlementTracking';
import { hapticSuccess, hapticLight } from '@/lib/haptics';
import { toast } from 'sonner';
import { CollapsibleResults, InitialBadge, Pill, ResultsCard } from './results/resultsUi';
import { firstName, formatMoney, MONEY_EVEN, MONEY_OWED, MONEY_WON } from './results/resultsFormat';

type SettlementStats = ReturnType<typeof useSettlementTracking>['stats'];

interface SettlementsSectionProps {
  trackedSettlements: TrackedSettlement[];
  settlementStats: SettlementStats;
  isOpen: boolean;
  onToggle: () => void;
  markAsPaid: (settlement: TrackedSettlement) => void;
  markAsForgiven: (settlement: TrackedSettlement) => void;
  markAsPending: (settlement: TrackedSettlement) => void;
  /** Viewer's player id, so their own rows read "You pay" / "pays you". */
  myPlayerId?: string;
  /** Rendered under the rows (e.g. "Add to group tab"). */
  footer?: React.ReactNode;
}

export function SettlementsSection({
  trackedSettlements,
  settlementStats,
  isOpen,
  onToggle,
  markAsPaid,
  markAsForgiven,
  markAsPending,
  myPlayerId,
  footer,
}: SettlementsSectionProps) {
  if (trackedSettlements.length === 0) return null;

  const allSettled = settlementStats.pending === 0;

  return (
    <CollapsibleResults
      title="Settle up"
      isOpen={isOpen}
      onToggle={onToggle}
      summary={
        allSettled ? (
          <Pill tone="lime">
            <Check className="w-3 h-3" strokeWidth={3} />
            All settled
          </Pill>
        ) : (
          <Pill tone="muted">
            {settlementStats.pending} to settle · {formatMoney(settlementStats.pendingAmount, { signed: false })}
          </Pill>
        )
      }
    >
      {trackedSettlements.map((s) => {
        const iPay = !!myPlayerId && s.fromPlayerId === myPlayerId;
        const iGet = !!myPlayerId && s.toPlayerId === myPlayerId;
        const from = iPay ? 'You' : firstName(s.fromPlayerName);
        const to = iGet ? 'you' : firstName(s.toPlayerName);
        const verb = iPay ? 'pay' : 'pays';
        const pending = s.status === 'pending';

        return (
          <motion.div key={`${s.fromPlayerId}-${s.toPlayerId}`} layout>
            <ResultsCard className={cn('p-4', s.status === 'forgiven' && 'opacity-70')}>
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2 shrink-0" aria-hidden>
                  <InitialBadge name={s.fromPlayerName} tone={iPay ? 'forest' : 'muted'} />
                  <span className="w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center z-10">
                    <ArrowRight className="w-3 h-3 text-foreground" strokeWidth={2.6} />
                  </span>
                  <InitialBadge name={s.toPlayerName} tone={iGet ? 'forest' : 'muted'} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-foreground leading-snug truncate">
                    {from} <span className="font-normal text-muted-foreground">{verb}</span> {to}
                  </p>
                  <p
                    className={cn(
                      'text-[12px] font-medium mt-0.5',
                      s.status === 'paid' ? 'text-[#14532D]' : 'text-muted-foreground',
                    )}
                  >
                    {s.status === 'paid' && (
                      <>
                        <Check className="w-3 h-3 inline -mt-0.5 mr-1" strokeWidth={3} />
                        Paid{s.paidAt ? ` · ${format(s.paidAt, 'MMM d')}` : ''}
                      </>
                    )}
                    {s.status === 'forgiven' && 'Forgiven'}
                    {pending && 'Not paid yet'}
                  </p>
                </div>

                <span
                  className={cn(
                    'text-[26px] font-extrabold tabular-nums tracking-[-0.02em] shrink-0',
                    !pending
                      ? 'text-muted-foreground'
                      : iPay
                      ? MONEY_OWED
                      : iGet
                      ? MONEY_WON
                      : MONEY_EVEN,
                    s.status === 'forgiven' && 'line-through',
                  )}
                >
                  {formatMoney(s.amount, { signed: false })}
                </span>
              </div>

              {pending ? (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="h-11 rounded-[14px] bg-primary text-primary-foreground text-[14px] font-semibold flex items-center justify-center gap-1.5"
                    onClick={() => {
                      hapticSuccess();
                      markAsPaid(s);
                      toast.success('Marked as paid!');
                    }}
                  >
                    <Check className="w-4 h-4" strokeWidth={2.6} />
                    Mark paid
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="h-11 rounded-[14px] bg-muted text-foreground text-[14px] font-semibold"
                    onClick={() => {
                      hapticLight();
                      markAsForgiven(s);
                      toast.info('Settlement forgiven');
                    }}
                  >
                    Forgive
                  </motion.button>
                </div>
              ) : (
                <div className="flex justify-end mt-2">
                  <button
                    className="h-11 px-3 -mr-2 -mb-2 rounded-[14px] text-[13px] font-semibold text-muted-foreground flex items-center gap-1.5 active:bg-muted"
                    aria-label="Reset to not paid"
                    onClick={() => {
                      hapticLight();
                      markAsPending(s);
                      toast.info('Reset to pending');
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Undo
                  </button>
                </div>
              )}
            </ResultsCard>
          </motion.div>
        );
      })}
      {footer}
    </CollapsibleResults>
  );
}
