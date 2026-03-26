import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LedgerEntry {
  id: string;
  groupId: string;
  roundId: string;
  profileId: string;
  amount: number;
  gameBreakdown: Record<string, number>;
  createdAt: string;
  // joined from rounds
  courseName?: string;
  roundDate?: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromProfileId: string;
  toProfileId: string;
  amount: number;
  method: string;
  note?: string;
  settledAt: string;
}

export interface PlayerBalance {
  profileId: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  totalWon: number;
  totalLost: number;
  totalSettledOut: number;
  totalSettledIn: number;
  netBalance: number;
  roundsPlayed: number;
  roundsWon: number;
  entries: LedgerEntry[];
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

export function useGroupLedger(groupId: string | null) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<PlayerBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!groupId) {
      setEntries([]);
      setSettlements([]);
      setBalances([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch ledger entries joined with rounds for course_name and round date
      const { data: entriesRaw, error: entriesError } = await supabase
        .from('group_ledger_entries')
        .select(`
          id,
          group_id,
          round_id,
          profile_id,
          amount,
          game_breakdown,
          created_at,
          rounds (
            course_name,
            created_at
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch settlements
      const { data: settlementsRaw, error: settlementsError } = await supabase
        .from('group_settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (settlementsError) throw settlementsError;

      // Collect all unique profile IDs from entries and settlements
      const profileIdSet = new Set<string>();
      for (const e of entriesRaw || []) {
        if (e.profile_id) profileIdSet.add(e.profile_id);
      }
      for (const s of settlementsRaw || []) {
        if (s.from_profile_id) profileIdSet.add(s.from_profile_id);
        if (s.to_profile_id) profileIdSet.add(s.to_profile_id);
      }

      let profilesMap: Record<string, ProfileRow> = {};
      const profileIds = Array.from(profileIdSet);
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', profileIds);

        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, ProfileRow>);
      }

      // Map entries
      const mappedEntries: LedgerEntry[] = (entriesRaw || []).map(e => {
        const round = e.rounds as { course_name?: string | null; created_at?: string | null } | null;
        return {
          id: e.id,
          groupId: e.group_id,
          roundId: e.round_id,
          profileId: e.profile_id,
          amount: Number(e.amount),
          gameBreakdown: (e.game_breakdown as Record<string, number>) ?? {},
          createdAt: e.created_at,
          courseName: round?.course_name ?? undefined,
          roundDate: round?.created_at ?? undefined,
        };
      });

      // Map settlements
      const mappedSettlements: Settlement[] = (settlementsRaw || []).map(s => ({
        id: s.id,
        groupId: s.group_id,
        fromProfileId: s.from_profile_id,
        toProfileId: s.to_profile_id,
        amount: Number(s.amount),
        method: s.method,
        note: s.note ?? undefined,
        settledAt: s.settled_at,
      }));

      // Build player balances
      const balanceMap: Record<string, PlayerBalance> = {};

      const ensurePlayer = (profileId: string) => {
        if (!balanceMap[profileId]) {
          const profile = profilesMap[profileId];
          const name = profile?.full_name || 'Unknown';
          balanceMap[profileId] = {
            profileId,
            name,
            avatarUrl: profile?.avatar_url ?? null,
            initials: getInitials(name),
            totalWon: 0,
            totalLost: 0,
            totalSettledOut: 0,
            totalSettledIn: 0,
            netBalance: 0,
            roundsPlayed: 0,
            roundsWon: 0,
            entries: [],
          };
        }
        return balanceMap[profileId];
      };

      // Aggregate ledger entries per player
      for (const entry of mappedEntries) {
        const player = ensurePlayer(entry.profileId);
        player.entries.push(entry);
        player.roundsPlayed += 1;
        if (entry.amount > 0) {
          player.totalWon += entry.amount;
          player.roundsWon += 1;
        } else {
          player.totalLost += entry.amount;
        }
      }

      // Aggregate settlements per player
      for (const s of mappedSettlements) {
        // from_profile_id paid out (money leaving their pocket)
        const payer = ensurePlayer(s.fromProfileId);
        payer.totalSettledOut -= s.amount;

        // to_profile_id received money
        const receiver = ensurePlayer(s.toProfileId);
        receiver.totalSettledIn += s.amount;
      }

      // Compute net balance and produce sorted array
      const balanceList = Object.values(balanceMap).map(p => ({
        ...p,
        netBalance:
          p.totalWon + p.totalLost + p.totalSettledOut + p.totalSettledIn,
      }));

      balanceList.sort((a, b) => b.netBalance - a.netBalance);

      setEntries(mappedEntries);
      setSettlements(mappedSettlements);
      setBalances(balanceList);
    } catch (err) {
      console.error('[useGroupLedger] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add a single ledger entry (upsert by round_id + profile_id + group_id)
  const addEntry = useCallback(
    async (
      roundId: string,
      profileId: string,
      amount: number,
      gameBreakdown: Record<string, number>
    ): Promise<boolean> => {
      if (!groupId) return false;

      try {
        const { error } = await supabase
          .from('group_ledger_entries')
          .upsert(
            {
              group_id: groupId,
              round_id: roundId,
              profile_id: profileId,
              amount,
              game_breakdown: gameBreakdown,
            },
            { onConflict: 'group_id,round_id,profile_id' }
          );

        if (error) throw error;
        await fetchData();
        return true;
      } catch (err) {
        console.error('[useGroupLedger] addEntry error:', err);
        return false;
      }
    },
    [groupId, fetchData]
  );

  // Record a settlement between two players
  const settle = useCallback(
    async (
      fromProfileId: string,
      toProfileId: string,
      amount: number,
      method: string,
      note?: string
    ): Promise<boolean> => {
      if (!groupId) return false;

      try {
        const { error } = await supabase.from('group_settlements').insert({
          group_id: groupId,
          from_profile_id: fromProfileId,
          to_profile_id: toProfileId,
          amount,
          method,
          note: note ?? null,
          settled_at: new Date().toISOString(),
        });

        if (error) throw error;
        await fetchData();
        return true;
      } catch (err) {
        console.error('[useGroupLedger] settle error:', err);
        return false;
      }
    },
    [groupId, fetchData]
  );

  // Head-to-head stats between two players (based on rounds they both played)
  const headToHead = useCallback(
    (
      profileId1: string,
      profileId2: string
    ): { wins: number; losses: number; netAmount: number } => {
      // Group entries by round
      const roundMap: Record<string, Record<string, number>> = {};
      for (const entry of entries) {
        if (!roundMap[entry.roundId]) roundMap[entry.roundId] = {};
        roundMap[entry.roundId][entry.profileId] = entry.amount;
      }

      let wins = 0;
      let losses = 0;
      let netAmount = 0;

      for (const roundAmounts of Object.values(roundMap)) {
        const has1 = profileId1 in roundAmounts;
        const has2 = profileId2 in roundAmounts;
        if (!has1 || !has2) continue;

        const amt1 = roundAmounts[profileId1];
        const amt2 = roundAmounts[profileId2];
        netAmount += amt1;

        if (amt1 > amt2) wins += 1;
        else if (amt1 < amt2) losses += 1;
      }

      return { wins, losses, netAmount };
    },
    [entries]
  );

  return {
    balances,
    entries,
    settlements,
    loading,
    addEntry,
    settle,
    headToHead,
    refetch: fetchData,
  };
}
