import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PlayerBalance, Settlement, LedgerEntry } from '@/hooks/useGroupLedger';

interface SettleUpSheetProps {
  fromPlayer: PlayerBalance | null;
  toPlayer: PlayerBalance | null;
  amount: number;
  groupId: string;
  open: boolean;
  onClose: () => void;
  onSettled: () => void;
  settle: (fromId: string, toId: string, amount: number, method: string, note?: string) => Promise<boolean>;
}

const springTransition = { type: 'spring', stiffness: 300, damping: 28 } as const;

function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  return `$${abs.toFixed(2).replace(/\.00$/, '')}`;
}

/** Aggregate gameBreakdown totals across entries for fromPlayer */
function getGameTotals(player: PlayerBalance | null): Record<string, number> {
  if (!player) return {};
  const totals: Record<string, number> = {};
  for (const entry of player.entries) {
    for (const [game, amt] of Object.entries(entry.gameBreakdown)) {
      totals[game] = (totals[game] ?? 0) + amt;
    }
  }
  return totals;
}

type PayMethod = 'venmo' | 'cashapp' | 'cash';

interface MethodConfig {
  id: PayMethod;
  label: string;
  emoji: string;
  color: string;
}

const METHODS: MethodConfig[] = [
  { id: 'venmo', label: 'Venmo', emoji: '💸', color: '#3D95CE' },
  { id: 'cashapp', label: 'Cash App', emoji: '💵', color: '#00D64F' },
  { id: 'cash', label: 'Mark as Cash Paid', emoji: '🤝', color: '#0A0A0A' },
];

export function SettleUpSheet({
  fromPlayer,
  toPlayer,
  amount,
  groupId,
  open,
  onClose,
  onSettled,
  settle,
}: SettleUpSheetProps) {
  const [loadingMethod, setLoadingMethod] = useState<PayMethod | null>(null);

  const gameTotals = getGameTotals(fromPlayer);
  const gameEntries = Object.entries(gameTotals).filter(([, v]) => v !== 0);
  const roundsCount = fromPlayer?.entries.length ?? 0;

  const handleMethod = async (method: PayMethod) => {
    if (!fromPlayer || !toPlayer) return;
    setLoadingMethod(method);

    try {
      if (method === 'venmo') {
        const note = `Golf – ${toPlayer.name}`;
        const url = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(toPlayer.name)}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
        window.location.href = url;
      } else if (method === 'cashapp') {
        window.location.href = `cashapp://pay`;
      }

      const success = await settle(fromPlayer.profileId, toPlayer.profileId, amount, method);

      if (success) {
        toast.success(`Settled up with ${toPlayer.name}`);
        onSettled();
      } else {
        toast.error('Settlement failed. Please try again.');
      }
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl p-0 overflow-hidden flex flex-col bg-[#F8F8F6]"
      >
        {/* Dark Hero */}
        <div className="bg-[#0A0A0A] px-6 pt-6 pb-6 flex-shrink-0">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

          {/* From → To avatars */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-14 w-14 rounded-2xl border-2 border-white/10">
                <AvatarImage src={fromPlayer?.avatarUrl || undefined} />
                <AvatarFallback className="bg-white/20 text-white text-base rounded-2xl font-black">
                  {fromPlayer?.initials ?? '?'}
                </AvatarFallback>
              </Avatar>
              <p className="text-white/60 text-xs font-medium truncate max-w-[72px] text-center">
                {fromPlayer?.name.split(' ')[0] ?? ''}
              </p>
            </div>

            <div className="flex items-center gap-1 pb-4">
              <div className="w-6 h-0.5 bg-white/30 rounded-full" />
              <span className="text-white/40 text-xs">owes</span>
              <div className="w-6 h-0.5 bg-white/30 rounded-full" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-14 w-14 rounded-2xl border-2 border-white/10">
                <AvatarImage src={toPlayer?.avatarUrl || undefined} />
                <AvatarFallback className="bg-white/20 text-white text-base rounded-2xl font-black">
                  {toPlayer?.initials ?? '?'}
                </AvatarFallback>
              </Avatar>
              <p className="text-white/60 text-xs font-medium truncate max-w-[72px] text-center">
                {toPlayer?.name.split(' ')[0] ?? ''}
              </p>
            </div>
          </div>

          {/* Big amount */}
          <p className="text-center text-4xl font-black tracking-[-0.04em]" style={{ color: '#CBFF4D' }}>
            {formatAmount(amount)}
          </p>
          <p className="text-center text-white/40 text-xs mt-1.5">
            Across {roundsCount} round{roundsCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-8"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Breakdown */}
          {gameEntries.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
                Breakdown
              </p>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                {gameEntries.map(([game, total], i) => (
                  <motion.div
                    key={game}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springTransition, delay: i * 0.05 }}
                    className="flex items-center justify-between px-4 py-3 border-b border-black/5 last:border-b-0"
                  >
                    <p className="font-semibold text-sm text-foreground capitalize">{game}</p>
                    <span
                      className={cn(
                        'font-black text-sm',
                        total < 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'
                      )}
                    >
                      {total >= 0 ? '+' : '-'}{formatAmount(total)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
              Send via
            </p>
            <div className="flex flex-col gap-3">
              {METHODS.map((method, i) => (
                <motion.button
                  key={method.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: i * 0.06 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={loadingMethod !== null}
                  onClick={() => handleMethod(method.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50"
                  style={{ backgroundColor: method.color }}
                >
                  <span className="text-xl">{method.emoji}</span>
                  <span className="flex-1 text-left">{method.label}</span>
                  {loadingMethod === method.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
