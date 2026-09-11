import { useState } from 'react';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { sendPushToProfiles } from '@/lib/pushUtils';
import { Player, Round } from '@/types/golf';
import { NetSettlement } from '@/lib/games/settlement';

interface LedgerEntry {
  profileId: string;
  amount: number;
  gameBreakdown: { round: number };
}

interface UseAddToTabArgs {
  round: Round | null;
  id: string | undefined;
  settlements: NetSettlement[];
  rawPlayers: Player[];
  syncRoundToLedger: (
    roundId: string,
    groupId: string,
    entries: LedgerEntry[]
  ) => Promise<unknown>;
}

interface UseAddToTabResult {
  addingToTab: boolean;
  addedToGroupId: string | null;
  showGroupPicker: boolean;
  setShowGroupPicker: (open: boolean) => void;
  handleAddToTab: (groupId: string) => Promise<void>;
}

/**
 * Encapsulates the "Add round to group tab" UX:
 * - Aggregates per-player net amounts from settlements.
 * - Calls `syncRoundToLedger` and surfaces toast + haptic feedback.
 * - Sends a push to profiles that owe money so they see the tab update.
 *
 * Behavior is identical to the previous inline handler — this hook only
 * relocates the state + handler so the page stays slim.
 */
export function useAddToTab({
  round,
  id,
  settlements,
  rawPlayers,
  syncRoundToLedger,
}: UseAddToTabArgs): UseAddToTabResult {
  const [addingToTab, setAddingToTab] = useState(false);
  const [addedToGroupId, setAddedToGroupId] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const handleAddToTab = async (groupId: string) => {
    if (!round || !id) return;
    setAddingToTab(true);
    hapticLight();
    try {
      // Build per-player net amounts from settlements
      const netByPlayer = new Map<string, number>();
      settlements.forEach(s => {
        netByPlayer.set(s.fromPlayerId, (netByPlayer.get(s.fromPlayerId) ?? 0) - s.amount);
        netByPlayer.set(s.toPlayerId, (netByPlayer.get(s.toPlayerId) ?? 0) + s.amount);
      });

      const entries = rawPlayers
        .filter(p => p.profileId)
        .map(p => ({
          profileId: p.profileId!,
          amount: netByPlayer.get(p.id) ?? 0,
          gameBreakdown: { round: netByPlayer.get(p.id) ?? 0 },
        }));

      if (entries.length === 0) {
        toast.error('No linked profiles — players must have accounts to add to tab');
        return;
      }

      await syncRoundToLedger(id, groupId, entries);
      hapticSuccess();
      setAddedToGroupId(groupId);
      setShowGroupPicker(false);
      toast.success('Round added to group tab!');
      // Notify players with negative net amounts (they owe money)
      const owingProfileIds = entries
        .filter(e => e.amount < 0)
        .map(e => e.profileId);
      if (owingProfileIds.length > 0) {
        sendPushToProfiles({
          profileIds: owingProfileIds,
          title: 'Tab updated ⛳',
          body: `${round?.courseName ?? 'A round'} was added to your group tab`,
          data: { route: '/groups' },
          type: 'tabAddedTo',
        });
      }
    } catch {
      hapticError();
      toast.error('Failed to add to tab — try again');
    } finally {
      setAddingToTab(false);
    }
  };

  return {
    addingToTab,
    addedToGroupId,
    showGroupPicker,
    setShowGroupPicker,
    handleAddToTab,
  };
}
