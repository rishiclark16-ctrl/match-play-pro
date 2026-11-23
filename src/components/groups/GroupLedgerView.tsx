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
import { cn } from '@/lib/utils';
import {
  computeMinimumSettlements,
  formatAmount,
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

  const me = balances.find(b => b.profileId === user?.id);
  const myNet = me?.netBalance ?? 0;
  const myNetLabel = Math.abs(myNet) < 0.005 ? 'Even' : `${myNet > 0 ? '+' : '-'}${formatAmount(myNet)}`;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background relative">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pb-3 pt-safe-content">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            aria-label="Back to groups"
            className="h-11 w-11 flex-shrink-0 rounded-[14px] bg-muted text-foreground flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-muted-foreground leading-none">Group tab</p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-[-0.03em] leading-tight text-foreground truncate">
              {group.name}
            </h1>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto overscroll-y-contain px-5 pb-nav"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Forest hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ledgerSpringTransition}
          className="mt-1 relative overflow-hidden rounded-[28px] bg-primary p-5 text-primary-foreground"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {group.members.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-10 w-10 rounded-[12px] ring-2 ring-primary">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback className="bg-white/15 text-white text-[12px] rounded-[12px] font-bold">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.members.length > 5 && (
                <div className="h-10 w-10 rounded-[12px] ring-2 ring-primary bg-white/15 flex items-center justify-center text-white text-[12px] font-bold">
                  +{group.members.length - 5}
                </div>
              )}
            </div>
            <p className="text-[13px] text-on-forest-muted">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
              {!loading && oldestEntry && <> · since {formatDate(oldestEntry.createdAt)}</>}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-[1.3fr_1fr_1fr] gap-2">
            {/* The one lime tile: where you stand */}
            <div className="rounded-[18px] bg-gold px-3.5 py-3 text-gold-foreground min-w-0">
              <p className="text-[12px] font-semibold leading-none text-gold-foreground/80">Your tab</p>
              <p
                className={cn(
                  'mt-2 text-[28px] font-extrabold leading-none tracking-[-0.04em] tabular-nums truncate',
                  myNet < -0.005 ? 'text-loss' : 'text-gold-foreground'
                )}
              >
                {loading ? '—' : myNetLabel}
              </p>
            </div>
            <div className="rounded-[18px] bg-white/10 px-3.5 py-3 min-w-0">
              <p className="text-[12px] font-semibold leading-none text-on-forest-muted">Rounds</p>
              <p className="mt-2 text-[28px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-white">
                {loading ? '—' : totalRounds}
              </p>
            </div>
            <div className="rounded-[18px] bg-white/10 px-3.5 py-3 min-w-0">
              <p className="text-[12px] font-semibold leading-none text-on-forest-muted">Total pot</p>
              <p className="mt-2 text-[28px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-white truncate">
                {loading ? '—' : `$${totalPot.toFixed(0)}`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Settle Up All Banner */}
        <AnimatePresence>
          {!loading && negativePlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={ledgerSpringTransition}
              className="mt-3 rounded-[20px] border border-border bg-card p-3.5 pl-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">Settle up all</p>
                <p className="text-[13px] text-muted-foreground truncate">
                  {negativePlayers.map(p => p.name.split(' ')[0]).join(', ')} owe{negativePlayers.length === 1 ? 's' : ''}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { hapticLight(); setShowSettleAllConfirm(true); }}
                className="h-11 flex-shrink-0 rounded-[14px] bg-foreground px-4 text-[14px] font-bold text-background"
              >
                Settle all
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All Settled Up state */}
        <AnimatePresence>
          {allSettledUp && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={ledgerSpringTransition}
              className="mt-3 rounded-[20px] bg-gold-muted p-3.5 flex items-center gap-3"
            >
              <div className="h-11 w-11 rounded-[14px] bg-primary flex items-center justify-center flex-shrink-0">
                <Check className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-primary">All square</p>
                <p className="text-[13px] text-primary/75">Everyone's balance is zeroed out</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Running Tab */}
        <RunningTabList
          loading={loading}
          balances={balances}
          currentUserId={user?.id}
          onPlayerTap={handlePlayerTap}
          onSettle={handleSettle}
        />

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
