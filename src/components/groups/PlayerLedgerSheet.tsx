import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PlayerBalance, Settlement, LedgerEntry } from '@/hooks/useGroupLedger';

interface PlayerLedgerSheetProps {
  player: PlayerBalance | null;
  allPlayers: PlayerBalance[];
  currentUserId: string;
  groupId: string;
  open: boolean;
  onClose: () => void;
  onSettle: (toProfileId: string) => void;
}

const springTransition = { type: 'spring', stiffness: 300, damping: 28 } as const;

function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  return `$${abs.toFixed(2).replace(/\.00$/, '')}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Returns last 8 round results as 1 (win), -1 (loss), 0 (even) */
function getLastEightResults(player: PlayerBalance): number[] {
  const sorted = [...player.entries]
    .sort((a, b) => {
      const da = a.roundDate ?? a.createdAt ?? '';
      const db = b.roundDate ?? b.createdAt ?? '';
      return db.localeCompare(da);
    })
    .slice(0, 8);
  return sorted.map(e => (e.amount > 0 ? 1 : e.amount < 0 ? -1 : 0));
}

/** Compute head-to-head stats between focusPlayer and another player */
function computeH2H(
  focus: PlayerBalance,
  opponent: PlayerBalance
): { wins: number; losses: number; net: number } {
  const opponentRoundMap = new Map(opponent.entries.map(e => [e.roundId, e.amount]));
  let wins = 0;
  let losses = 0;
  let net = 0;
  for (const entry of focus.entries) {
    const oppAmount = opponentRoundMap.get(entry.roundId);
    if (oppAmount !== undefined) {
      if (entry.amount > 0 && oppAmount < 0) {
        wins++;
        net += entry.amount;
      } else if (entry.amount < 0 && oppAmount > 0) {
        losses++;
        net += entry.amount;
      }
    }
  }
  return { wins, losses, net };
}

export function PlayerLedgerSheet({
  player,
  allPlayers,
  currentUserId,
  groupId,
  open,
  onClose,
  onSettle,
}: PlayerLedgerSheetProps) {
  if (!player) return null;

  const results = getLastEightResults(player);
  const isPositive = player.netBalance >= 0;
  const balanceColor = isPositive ? '#CBFF4D' : '#EF4444';

  const others = allPlayers.filter(p => p.profileId !== player.profileId);

  // aggregate gameBreakdown totals across all entries
  const gameTypeTotals: Record<string, number> = {};
  for (const entry of player.entries) {
    for (const [game, amt] of Object.entries(entry.gameBreakdown)) {
      gameTypeTotals[game] = (gameTypeTotals[game] ?? 0) + amt;
    }
  }

  // Pad results to 8 bars
  const bars: number[] = [
    ...Array(Math.max(0, 8 - results.length)).fill(0),
    ...results,
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="h-[90vh] rounded-t-3xl p-0 overflow-hidden flex flex-col bg-[#F8F8F6]"
      >
        {/* Dark Hero */}
        <div className="bg-[#0A0A0A] px-6 pt-6 pb-6 flex-shrink-0">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 rounded-2xl mb-3 border-2 border-white/10">
              <AvatarImage src={player.avatarUrl || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-2xl rounded-2xl font-black">
                {player.initials}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-white text-xl font-black tracking-[-0.03em]">{player.name}</h2>

            <p
              className="text-4xl font-black mt-3 tracking-[-0.04em]"
              style={{ color: balanceColor }}
            >
              {isPositive ? '+' : '-'}{formatAmount(player.netBalance)}
            </p>
            <p className="text-white/40 text-xs mt-1">
              {player.roundsPlayed} rounds played
            </p>

            {/* 8-bar mini chart */}
            <div className="flex items-end gap-1 mt-4 h-8">
              {bars.map((r, i) => (
                <div
                  key={i}
                  className="w-5 rounded-sm"
                  style={{
                    height: r === 0 ? '40%' : '100%',
                    backgroundColor:
                      r === 1 ? '#22C55E' : r === -1 ? '#EF4444' : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>
            <p className="text-white/30 text-[10px] mt-1 uppercase tracking-wider">Last 8 rounds</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-8"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Head-to-Head */}
          {others.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
                Head-to-Head
              </p>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                {others.map((opp, i) => {
                  const h2h = computeH2H(player, opp);
                  return (
                    <motion.div
                      key={opp.profileId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springTransition, delay: i * 0.05 }}
                      className="flex items-center gap-3 px-4 py-3 border-b border-black/5 last:border-b-0"
                    >
                      <Avatar className="h-8 w-8 rounded-xl flex-shrink-0">
                        <AvatarImage src={opp.avatarUrl || undefined} />
                        <AvatarFallback className="bg-black/10 text-foreground text-xs rounded-xl font-bold">
                          {opp.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{opp.name}</p>
                        <p className="text-xs text-black/40 mt-0.5">
                          {h2h.wins}W – {h2h.losses}L
                        </p>
                      </div>
                      <span
                        className={cn(
                          'font-black text-sm',
                          h2h.net >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        )}
                      >
                        {h2h.net >= 0 ? '+' : '-'}{formatAmount(h2h.net)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settle button if negative and not current user */}
          {player.netBalance < 0 && player.profileId !== currentUserId && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onSettle(player.profileId)}
              className="w-full mt-4 bg-[#EF4444] text-white font-black text-base rounded-2xl py-4"
            >
              Settle Up — {formatAmount(player.netBalance)}
            </motion.button>
          )}

          {/* Round History */}
          {player.entries.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
                Round History
              </p>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                {[...player.entries]
                  .sort((a, b) =>
                    (b.roundDate ?? b.createdAt ?? '').localeCompare(a.roundDate ?? a.createdAt ?? '')
                  )
                  .map((entry, i) => {
                    const gameTypes = Object.entries(entry.gameBreakdown)
                      .filter(([, v]) => v !== 0)
                      .map(([k, v]) => `${k}: ${v >= 0 ? '+' : ''}${formatAmount(v)}`)
                      .join(' · ');

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springTransition, delay: i * 0.04 }}
                        className="flex items-start gap-3 px-4 py-3 border-b border-black/5 last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {entry.courseName ?? 'Unknown Course'}
                          </p>
                          {gameTypes && (
                            <p className="text-[11px] text-black/40 mt-0.5 truncate">{gameTypes}</p>
                          )}
                          <p className="text-[11px] text-black/30 mt-0.5">
                            {formatDate(entry.roundDate ?? entry.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'font-black text-sm mt-0.5 flex-shrink-0',
                            entry.amount >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                          )}
                        >
                          {entry.amount >= 0 ? '+' : '-'}{formatAmount(entry.amount)}
                        </span>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
