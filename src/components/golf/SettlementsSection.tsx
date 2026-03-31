import { motion } from 'framer-motion';
import { DollarSign, ArrowRight, Check, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from './CollapsibleSection';
import { TrackedSettlement, SettlementStats } from '@/hooks/useSettlementTracking';
import { hapticSuccess, hapticLight } from '@/lib/haptics';
import { toast } from 'sonner';

interface SettlementsSectionProps {
  trackedSettlements: TrackedSettlement[];
  settlementStats: SettlementStats;
  isOpen: boolean;
  onToggle: () => void;
  markAsPaid: (settlement: TrackedSettlement) => void;
  markAsForgiven: (settlement: TrackedSettlement) => void;
  markAsPending: (settlement: TrackedSettlement) => void;
}

export function SettlementsSection({
  trackedSettlements,
  settlementStats,
  isOpen,
  onToggle,
  markAsPaid,
  markAsForgiven,
  markAsPending,
}: SettlementsSectionProps) {
  if (trackedSettlements.length === 0) return null;

  return (
    <CollapsibleSection
      title="Settlements"
      icon={DollarSign}
      isOpen={isOpen}
      onToggle={onToggle}
      count={settlementStats.pending > 0 ? settlementStats.pending : undefined}
      badge={
        settlementStats.pending === 0 ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-success/20 text-success uppercase">
            All Settled
          </span>
        ) : undefined
      }
    >
      {/* Settlement Stats Summary */}
      {trackedSettlements.length > 1 && (
        <div className="flex items-center justify-between p-2 mb-2 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{settlementStats.paid}</span> paid
            </span>
            {settlementStats.pending > 0 && (
              <span className="text-muted-foreground">
                <span className="font-semibold text-warning">{settlementStats.pending}</span>{' '}
                pending
              </span>
            )}
            {settlementStats.forgiven > 0 && (
              <span className="text-muted-foreground">
                <span className="font-semibold text-muted-foreground">
                  {settlementStats.forgiven}
                </span>{' '}
                forgiven
              </span>
            )}
          </div>
          {settlementStats.pendingAmount > 0 && (
            <span className="text-xs font-semibold text-warning">
              ${settlementStats.pendingAmount.toFixed(0)} remaining
            </span>
          )}
        </div>
      )}

      {/* Settlement Items */}
      {trackedSettlements.map((s, i) => (
        <motion.div
          key={i}
          layout
          className={cn(
            'bg-white rounded-2xl px-4 py-3.5 mb-2 transition-all',
            s.status === 'paid' && 'bg-[#F0FFF4]',
            s.status === 'forgiven' && 'opacity-70',
            s.status === 'pending' && 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'font-semibold text-foreground',
                  s.status !== 'pending' && 'text-muted-foreground'
                )}
              >
                {s.fromPlayerName.split(' ')[0]}
              </span>
              <ArrowRight className="w-4 h-4 text-[#F0EE3A] flex-shrink-0" />
              <span
                className={cn(
                  'font-semibold text-foreground',
                  s.status !== 'pending' && 'text-muted-foreground'
                )}
              >
                {s.toPlayerName.split(' ')[0]}
              </span>
            </div>
            <span
              className={cn(
                'font-black tabular-nums text-xl',
                s.status === 'paid' && 'text-[#22C55E]',
                s.status === 'forgiven' && 'text-muted-foreground line-through',
                s.status === 'pending' && 'text-[#EF4444]'
              )}
            >
              ${s.amount.toFixed(0)}
            </span>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
            {s.status === 'pending' ? (
              <div className="flex items-center gap-2">
                <button
                  className="bg-[#F0FFF4] border border-[#22C55E] text-[#22C55E] text-sm font-bold rounded-xl px-3 py-1.5"
                  onClick={() => {
                    hapticSuccess();
                    markAsPaid(s);
                    toast.success('Marked as paid!');
                  }}
                >
                  <Check className="w-3 h-3 inline mr-1" />
                  Paid
                </button>
                <button
                  className="text-muted-foreground text-sm font-medium border border-border rounded-xl px-3 py-1.5"
                  onClick={() => {
                    hapticLight();
                    markAsForgiven(s);
                    toast.info('Settlement forgiven');
                  }}
                >
                  <X className="w-3 h-3 inline mr-1" />
                  Forgive
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[11px] font-semibold text-muted-foreground flex items-center gap-1',
                    s.status === 'paid' && 'text-[#22C55E]'
                  )}
                >
                  {s.status === 'paid' && <Check className="w-3 h-3" />}
                  {s.status === 'paid' ? 'Paid' : 'Forgiven'}
                  {s.paidAt && (
                    <span className="text-muted-foreground ml-1">
                      • {format(s.paidAt, 'MMM d')}
                    </span>
                  )}
                </span>
                <button
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    hapticLight();
                    markAsPending(s);
                    toast.info('Reset to pending');
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </CollapsibleSection>
  );
}
