import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronDown, Sparkles, Pencil, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GolfGroup } from '@/hooks/useGroups';
import { SettleUpSheet } from './SettleUpSheet';
import { PlayerLedgerSheet } from './PlayerLedgerSheet';
import { useAuth } from '@/hooks/useAuth';
import { useGroupLedger, PlayerBalance, LedgerEntry } from '@/hooks/useGroupLedger';
import { useHouseGame } from '@/hooks/useHouseGame';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { summarizeConfig, buildScoringConfig } from '@/lib/houseGame/engine';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { sendPushToProfiles } from '@/lib/pushUtils';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { balances, entries, settlements, loading, settle } = useGroupLedger(group.id);
  const { houseGame, loading: houseLoading } = useHouseGame(group.id);

  const [showPaywall, setShowPaywall] = useState(false);

  const [settleFromPlayer, setSettleFromPlayer] = useState<PlayerBalance | null>(null);
  const [settleToPlayer, setSettleToPlayer] = useState<PlayerBalance | null>(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [showSettleSheet, setShowSettleSheet] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBalance | null>(null);
  const [showPlayerSheet, setShowPlayerSheet] = useState(false);

  const [showSettleAllConfirm, setShowSettleAllConfirm] = useState(false);
  const [settlingAll, setSettlingAll] = useState(false);
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);

  const negativePlayers = balances.filter(p => p.netBalance < 0);
  const positivePlayers = balances.filter(p => p.netBalance > 0);
  const allSettledUp = !loading && balances.length > 0 && balances.every(p => Math.abs(p.netBalance) < 0.01);

  // Derive season stats from entries
  const uniqueRounds = new Set(entries.map(e => e.roundId));
  const totalRounds = uniqueRounds.size;
  const totalPot = entries
    .filter(e => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);
  const oldestEntry = entries.length > 0
    ? entries.reduce((oldest, e) => e.createdAt < oldest.createdAt ? e : oldest, entries[0])
    : null;

  // Group entries by round for the history section
  const roundsGrouped = useMemo(() => {
    const roundMap = new Map<string, {
      roundId: string;
      courseName: string;
      roundDate: string;
      entries: LedgerEntry[];
      myAmount: number;
    }>();
    for (const entry of entries) {
      if (!roundMap.has(entry.roundId)) {
        roundMap.set(entry.roundId, {
          roundId: entry.roundId,
          courseName: entry.courseName ?? 'Unknown Course',
          roundDate: entry.roundDate ?? entry.createdAt,
          entries: [],
          myAmount: 0,
        });
      }
      const round = roundMap.get(entry.roundId)!;
      round.entries.push(entry);
      if (entry.profileId === user?.id) {
        round.myAmount += entry.amount;
      }
    }
    return Array.from(roundMap.values()).slice(0, 6);
  }, [entries, user?.id]);

  // Build profile name map for history display
  const profileNameMap = useMemo(() => {
    const map = new Map<string, string>();
    balances.forEach(b => map.set(b.profileId, b.name));
    return map;
  }, [balances]);

  // Compute minimum set of payments to zero all balances
  const computeMinimumSettlements = () => {
    const debtors = balances
      .filter(p => p.netBalance < 0)
      .map(p => ({ id: p.profileId, amount: Math.abs(p.netBalance) }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = balances
      .filter(p => p.netBalance > 0)
      .map(p => ({ id: p.profileId, amount: p.netBalance }))
      .sort((a, b) => b.amount - a.amount);

    const payments: { fromProfileId: string; toProfileId: string; amount: number }[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const payment = Math.min(debtors[di].amount, creditors[ci].amount);
      if (payment > 0.005) {
        payments.push({
          fromProfileId: debtors[di].id,
          toProfileId: creditors[ci].id,
          amount: Math.round(payment * 100) / 100,
        });
      }
      debtors[di].amount -= payment;
      creditors[ci].amount -= payment;
      if (debtors[di].amount < 0.005) di++;
      if (creditors[ci].amount < 0.005) ci++;
    }
    return payments;
  };

  const handleSettleAllConfirm = async () => {
    setSettlingAll(true);
    const payments = computeMinimumSettlements();
    let success = true;
    for (const payment of payments) {
      const ok = await settle(payment.fromProfileId, payment.toProfileId, payment.amount, 'cash');
      if (!ok) { success = false; break; }
    }
    setSettlingAll(false);
    setShowSettleAllConfirm(false);
    if (success) {
      hapticSuccess();
      toast.success('All settled up!');
      // Notify all group members except the current user
      const otherProfileIds = balances
        .map(b => b.profileId)
        .filter(id => id !== user?.id);
      if (otherProfileIds.length > 0) {
        sendPushToProfiles({
          profileIds: otherProfileIds,
          title: 'Tab Settled',
          body: `${group.name} tab has been settled`,
          data: { route: '/groups' },
          type: 'tabSettled',
        });
      }
    } else {
      hapticError();
      toast.error('Failed to settle — try again');
    }
  };

  const handleSettle = (debtor: PlayerBalance) => {
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
    <div className="h-full flex flex-col overflow-hidden bg-[#F8F8F6] relative">
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

        {/* House Game Section */}
        {!houseLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.1 }}
            className="mt-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
              House Game
            </p>
            {houseGame ? (
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-[#F0EE3A] flex-shrink-0" style={{ filter: 'drop-shadow(0 0 4px #F0EE3A88)' }} />
                      <span className="text-[13px] font-black text-foreground truncate">{houseGame.name}</span>
                    </div>
                    {(() => {
                      const config = buildScoringConfig(houseGame.activePrimitives);
                      const lines = summarizeConfig(config).slice(0, 3);
                      return lines.length > 0 ? (
                        <ul className="space-y-0.5">
                          {lines.map((line, i) => (
                            <li key={i} className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                              {line}
                            </li>
                          ))}
                          {summarizeConfig(config).length > 3 && (
                            <li className="text-[11px] text-muted-foreground/60">
                              +{summarizeConfig(config).length - 3} more rules
                            </li>
                          )}
                        </ul>
                      ) : null;
                    })()}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { hapticLight(); navigate(`/groups/${group.id}/house-game/edit`); }}
                    className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"
                  >
                    <Pencil className="w-4 h-4 text-foreground" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  hapticLight();
                  if (!isPro) { setShowPaywall(true); return; }
                  navigate(`/groups/${group.id}/house-game/new`);
                }}
                className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F0EE3A] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Build Your House Game</p>
                  <p className="text-[12px] text-muted-foreground">Describe your Saturday game in plain English</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[9px] font-black bg-foreground text-[#F0EE3A] px-1.5 py-0.5 rounded-md">PRO</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.button>
            )}
          </motion.div>
        )}

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
                    <p className="font-bold text-sm text-foreground truncate">
                      {player.profileId === user?.id ? 'You' : player.name.split(' ')[0]}
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

        {/* All Settled Up state */}
        <AnimatePresence>
          {allSettledUp && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={springTransition}
              className="mt-4 bg-[#F0FFF4] border border-[#22C55E]/30 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[#15803D] font-bold text-sm">All settled up</p>
                <p className="text-[#15803D]/60 text-xs mt-0.5">Everyone's balances are zeroed out</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                onClick={() => { hapticLight(); setShowSettleAllConfirm(true); }}
                className="bg-[#CBFF4D] text-black text-sm font-black rounded-xl px-4 py-2.5"
              >
                Settle All
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Rounds */}
        {!loading && roundsGrouped.length > 0 && (
          <div className="mt-5 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
              History
            </p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              {roundsGrouped.map((round, i) => (
                <motion.div
                  key={round.roundId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springTransition, delay: i * 0.05 }}
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
                                  {entry.profileId === user?.id
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
        )}
      </div>

      {/* Settle All Confirmation Dialog */}
      <AnimatePresence>
        {showSettleAllConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-40"
              onClick={() => !settlingAll && setShowSettleAllConfirm(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springTransition}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 px-5 pt-5 pb-safe-content"
            >
              <div className="w-10 h-1 rounded-full bg-black/10 mx-auto mb-5" />
              <p className="text-[18px] font-black text-foreground mb-1">Settle all debts?</p>
              <p className="text-sm text-muted-foreground mb-5">
                This will zero out all balances in this group. Each player's running tab will reset.
              </p>
              <div className="flex gap-3">
                <button
                  disabled={settlingAll}
                  onClick={() => setShowSettleAllConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-bold text-foreground"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={settlingAll}
                  onClick={handleSettleAllConfirm}
                  className="flex-1 py-3.5 rounded-2xl bg-[#0A0A0A] text-sm font-black text-white disabled:opacity-50"
                >
                  {settlingAll ? 'Settling...' : 'Settle All'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="House Game"
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
