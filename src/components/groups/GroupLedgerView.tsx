import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GolfGroup } from '@/hooks/useGroups';
import { SettleUpSheet } from './SettleUpSheet';
import { PlayerLedgerSheet } from './PlayerLedgerSheet';
import { useAuth } from '@/hooks/useAuth';
import { useGroupLedger, PlayerBalance, LedgerEntry } from '@/hooks/useGroupLedger';
import { useHouseGame } from '@/hooks/useHouseGame';
import { useGroupFormats } from '@/hooks/useGroupFormats';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { GroupFormatPickerSheet } from './GroupFormatPickerSheet';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { sendPushToProfiles } from '@/lib/pushUtils';
import {
  computeMinimumSettlements,
  formatDate,
  ledgerSpringTransition,
} from './ledger/ledgerHelpers';
import { HouseGameCard } from './ledger/HouseGameCard';
import { GroupFormatAssignmentCard } from './ledger/GroupFormatAssignmentCard';
import { RunningTabList } from './ledger/RunningTabList';
import { RoundsHistoryList } from './ledger/RoundsHistoryList';
import { SettleAllConfirmDialog } from './ledger/SettleAllConfirmDialog';

interface GroupLedgerViewProps {
  group: GolfGroup;
  onBack: () => void;
}

export function GroupLedgerView({ group, onBack }: GroupLedgerViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { balances, entries, settlements, loading, settle } = useGroupLedger(group.id);
  const { houseGame, loading: houseLoading } = useHouseGame(group.id);
  const { assignment: groupFormatAssignment, assignFormat, removeAssignment } = useGroupFormats(group?.id ?? null);
  const { formats: myFormats } = usePersonalGameFormats();
  const publicFormats = myFormats.filter(f => f.isPublic);
  const [showFormatPicker, setShowFormatPicker] = useState(false);

  const isOwner = user?.id === group.ownerId;

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

  const handleSettleAllConfirm = async () => {
    setSettlingAll(true);
    const payments = computeMinimumSettlements(balances);
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
          title: 'All square ⛳',
          body: `${group.name} tab is settled. For now.`,
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
          transition={ledgerSpringTransition}
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
          <HouseGameCard
            houseGame={houseGame}
            isPro={isPro}
            onEdit={() => navigate(`/groups/${group.id}/house-game/edit`)}
            onCreate={() => navigate(`/groups/${group.id}/house-game/new`)}
            onShowPaywall={() => setShowPaywall(true)}
          />
        )}

        {/* Group Format Assignment — owner only */}
        {isOwner && (
          <>
            <GroupFormatAssignmentCard
              groupFormatAssignment={groupFormatAssignment}
              onShowFormatPicker={() => setShowFormatPicker(true)}
              onRemoveAssignment={removeAssignment}
            />
            <GroupFormatPickerSheet
              isOpen={showFormatPicker}
              onClose={() => setShowFormatPicker(false)}
              formats={publicFormats}
              currentFormatId={groupFormatAssignment?.formatId ?? null}
              onSelect={async (formatId) => {
                await assignFormat(formatId);
                setShowFormatPicker(false);
              }}
            />
          </>
        )}

        {/* Running Tab */}
        <RunningTabList
          loading={loading}
          balances={balances}
          currentUserId={user?.id}
          onPlayerTap={handlePlayerTap}
          onSettle={handleSettle}
        />

        {/* All Settled Up state */}
        <AnimatePresence>
          {allSettledUp && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={ledgerSpringTransition}
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
              transition={ledgerSpringTransition}
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
          <RoundsHistoryList
            rounds={roundsGrouped}
            expandedRoundId={expandedRoundId}
            setExpandedRoundId={setExpandedRoundId}
            currentUserId={user?.id}
            profileNameMap={profileNameMap}
          />
        )}
      </div>

      {/* Settle All Confirmation Dialog */}
      <SettleAllConfirmDialog
        open={showSettleAllConfirm}
        settling={settlingAll}
        onCancel={() => setShowSettleAllConfirm(false)}
        onConfirm={handleSettleAllConfirm}
      />

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
