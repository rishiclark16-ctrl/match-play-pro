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
            'p-3 rounded-lg border transition-all',
            s.status === 'paid' && 'bg-success/5 border-success/20',
            s.status === 'forgiven' && 'bg-muted/30 border-border/30 opacity-60',
            s.status === 'pending' && 'bg-muted/50 border-border/50'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn('font-medium', s.status !== 'pending' && 'text-muted-foreground')}
              >
                {s.fromPlayerName.split(' ')[0]}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span
                className={cn('font-medium', s.status !== 'pending' && 'text-muted-foreground')}
              >
                {s.toPlayerName.split(' ')[0]}
              </span>
            </div>
            <span
              className={cn(
                'font-bold tabular-nums',
                s.status === 'paid' && 'text-success',
                s.status === 'forgiven' && 'text-muted-foreground line-through',
                s.status === 'pending' && 'text-primary'
              )}
            >
              ${s.amount.toFixed(0)}
            </span>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
            {s.status === 'pending' ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 gap-1 text-xs border-success/30 text-success hover:bg-success hover:text-success-foreground"
                  onClick={() => {
                    hapticSuccess();
                    markAsPaid(s);
                    toast.success('Marked as paid!');
                  }}
                >
                  <Check className="w-3 h-3" />
                  Paid
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    hapticLight();
                    markAsForgiven(s);
                    toast.info('Settlement forgiven');
                  }}
                >
                  <X className="w-3 h-3" />
                  Forgive
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-medium flex items-center gap-1',
                    s.status === 'paid' && 'text-success',
                    s.status === 'forgiven' && 'text-muted-foreground'
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    hapticLight();
                    markAsPending(s);
                    toast.info('Reset to pending');
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </CollapsibleSection>
  );
}
