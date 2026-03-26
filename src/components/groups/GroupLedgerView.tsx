import { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GolfGroup } from '@/hooks/useGroups';
import { SettleUpSheet } from './SettleUpSheet';
import { PlayerLedgerSheet } from './PlayerLedgerSheet';
import { useAuth } from '@/hooks/useAuth';
import { useGroupLedger, PlayerBalance, Settlement, LedgerEntry } from '@/hooks/useGroupLedger';

interface GroupLedgerViewProps {
  group: GolfGroup;
  onBack: () => void;
}

const springTransition = { type: 'spring', stiffness: 300, damping: 28 } as const;

function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  return `$${abs.toFixed(2).replace(/\.00$/, '')}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function GroupLedgerView({ group, onBack }: GroupLedgerViewProps) {
  const { user } = useAuth();
  const { balances, entries, settlements, loading, settle } = useGroupLedger(group.id);

  const [settleFromPlayer, setSettleFromPlayer] = useState<PlayerBalance | null>(null);
  const [settleToPlayer, setSettleToPlayer] = useState<PlayerBalance | null>(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [showSettleSheet, setShowSettleSheet] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBalance | null>(null);
  const [showPlayerSheet, setShowPlayerSheet] = useState(false);

  const negativePlayers = balances.filter(p => p.netBalance < 0);
  const positivePlayers = balances.filter(p => p.netBalance > 0);

  // Derive season stats from entries
  const uniqueRounds = new Set(entries.map(e => e.roundId));
  const totalRounds = uniqueRounds.size;
  const totalPot = entries
    .filter(e => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);
  const oldestEntry = entries.length > 0
    ? entries.reduce((oldest, e) => e.createdAt < oldest.createdAt ? e : oldest, entries[0])
    : null;

  // Recent entries — last 6 unique rounds, show one entry per round (first found)
  const recentRoundMap = new Map<string, LedgerEntry>();
  for (const entry of entries) {
    if (!recentRoundMap.has(entry.roundId)) {
      recentRoundMap.set(entry.roundId, entry);
    }
    if (recentRoundMap.size >= 6) break;
  }
  const recentEntries = Array.from(recentRoundMap.values());

  const handleSettle = (debtor: PlayerBalance) => {
    const creditor = positivePlayers[0] ?? null;
    setSettleFromPlayer(debtor);
    setSettleToPlayer(creditor);
    setSettleAmount(Math.abs(debtor.netBalance));
    setShowSettleSheet(true);
  };

  const handleSettleAll = () => {
    if (negativePlayers.length === 0) return;
    const debtor = negativePlayers[0];
    const creditor = positivePlayers[0] ?? null;
    setSettleFromPlayer(debtor);
    setSettleToPlayer(creditor);
    setSettleAmount(Math.abs(debtor.netBalance));
    setShowSettleSheet(true);
  };

  const handleSettled = () => {
    setShowSettleSheet(false);
    setSettleFromPlayer(null);
    setSettleToPlayer(null);
  };

  const handlePlayerTap = (player: PlayerBalance) => {
    setSelectedPlayer(player);
    setShowPlayerSheet(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8F8F6]">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pb-3 pt-safe-content border-b border-black/10">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-black tracking-[-0.04em] leading-tight text-foreground truncate">
              {group.name}
            </h1>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-black text-white rounded-full px-2.5 py-1">
            Season
          </span>
        </div>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-nav"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Dark Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="mt-4 bg-[#0A0A0A] rounded-3xl p-5 text-white"
        >
          {/* Avatar Stack */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-3">
              {group.members.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-10 w-10 rounded-xl border-2 border-[#0A0A0A]">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-xs rounded-xl font-bold">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.members.length > 5 && (
                <div className="h-10 w-10 rounded-xl border-2 border-[#0A0A0A] bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  +{group.members.length - 5}
                </div>
              )}
            </div>
            <p className="text-white/60 text-xs">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Season Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Rounds</p>
              <p className="text-white text-xl font-black">
                {loading ? '—' : totalRounds}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Total Pot</p>
              <p className="text-white text-xl font-black">
                {loading ? '—' : `$${totalPot.toFixed(0)}`}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Since</p>
              <p className="text-white text-xl font-black">
                {loading ? '—' : (oldestEntry ? formatDate(oldestEntry.createdAt) : '—')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Running Tab */}
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
                  transition={{ ...springTransition, delay: i * 0.05 }}
                  onClick={() => handlePlayerTap(player)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-black/5 last:border-b-0 text-left active:bg-black/5"
                >
                  <Avatar className="h-10 w-10 rounded-xl flex-shrink-0">
                    <AvatarImage src={player.avatarUrl || undefined} />
                    <AvatarFallback className="bg-black/10 text-foreground text-xs rounded-xl font-bold">
                      {player.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{player.name}</p>
                    <p className="text-xs text-black/40 mt-0.5">
                      {player.roundsWon} of {player.roundsPlayed} rounds up
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
                          handleSettle(player);
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

        {/* Settle Up All Banner */}
        <AnimatePresence>
          {!loading && negativePlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={springTransition}
              className="mt-4 bg-[#0A0A0A] rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-white font-bold text-sm">Settle Up All</p>
                <p className="text-white/50 text-xs mt-0.5">
                  {negativePlayers.map(p => p.name.split(' ')[0]).join(', ')} owe{negativePlayers.length === 1 ? 's' : ''}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSettleAll}
                className="bg-[#CBFF4D] text-black text-sm font-black rounded-xl px-4 py-2.5"
              >
                Send
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Rounds */}
        {!loading && recentEntries.length > 0 && (
          <div className="mt-5 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
              Recent Rounds
            </p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              {recentEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springTransition, delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-black/5 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {entry.courseName ?? 'Unknown Course'}
                    </p>
                    <p className="text-xs text-black/40 mt-0.5">
                      {formatDate(entry.roundDate ?? entry.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-black text-sm',
                      entry.amount >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    )}
                  >
                    {entry.amount >= 0 ? '+' : '-'}{formatAmount(entry.amount)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settle Up Sheet */}
      <SettleUpSheet
        fromPlayer={settleFromPlayer}
        toPlayer={settleToPlayer}
        amount={settleAmount}
        groupId={group.id}
        open={showSettleSheet}
        onClose={() => setShowSettleSheet(false)}
        onSettled={handleSettled}
        settle={settle}
      />

      {/* Player Ledger Sheet */}
      <PlayerLedgerSheet
        player={selectedPlayer}
        allPlayers={balances}
        currentUserId={user?.id ?? ''}
        groupId={group.id}
        open={showPlayerSheet}
        onClose={() => setShowPlayerSheet(false)}
        onSettle={(toProfileId) => {
          const debtor = balances.find(p => p.profileId === (user?.id ?? '')) ?? null;
          const creditor = balances.find(p => p.profileId === toProfileId) ?? null;
          setSettleFromPlayer(debtor);
          setSettleToPlayer(creditor);
          setSettleAmount(debtor ? Math.abs(debtor.netBalance) : 0);
          setShowPlayerSheet(false);
          setShowSettleSheet(true);
        }}
      />
    </div>
  );
}
