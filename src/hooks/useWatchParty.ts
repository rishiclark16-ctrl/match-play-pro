import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WatchPartyMember {
  id: string;
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

interface WatchPartyState {
  isMember: boolean;
  isEligible: boolean;
  isRoundComplete: boolean;
  memberCount: number;
  members: WatchPartyMember[];
  loading: boolean;
  error: string | null;
}

export function useWatchParty(roundId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<WatchPartyState>({
    isMember: false,
    isEligible: false,
    isRoundComplete: false,
    memberCount: 0,
    members: [],
    loading: true,
    error: null,
  });

  // Check eligibility + existing membership on mount
  useEffect(() => {
    if (!roundId || !user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    async function init() {
      try {
        // Parallel: check friendship, check existing membership, check round status, get members
        const [friendCheck, memberCheck, roundCheck] = await Promise.all([
          supabase.rpc('is_friend_of_any_player', { p_round_id: roundId, p_user_id: user!.id }),
          supabase
            .from('watch_party_members')
            .select('id')
            .eq('round_id', roundId!)
            .eq('profile_id', user!.id)
            .is('left_at', null)
            .maybeSingle(),
          supabase
            .from('rounds')
            .select('status')
            .eq('id', roundId!)
            .single(),
        ]);

        const isEligible = friendCheck.data === true;
        const isMember = !!memberCheck.data;
        const isRoundComplete = roundCheck.data?.status === 'complete';

        // Check if user is a player (players can't be spectators)
        const { data: playerCheck } = await supabase
          .from('players')
          .select('id')
          .eq('round_id', roundId!)
          .eq('profile_id', user!.id)
          .maybeSingle();

        const isPlayer = !!playerCheck;

        setState(prev => ({
          ...prev,
          isEligible: isEligible && !isPlayer,
          isMember,
          isRoundComplete,
          loading: false,
          // Players accessing post-round are "eligible" in a different sense
          ...(isPlayer && isRoundComplete ? { isEligible: true } : {}),
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load Watch Party',
        }));
      }
    }

    init();
  }, [roundId, user]);

  // Fetch member list + subscribe to member changes
  useEffect(() => {
    if (!roundId || !user) return;

    async function fetchMembers() {
      const { data } = await supabase
        .from('watch_party_members')
        .select('id, profile_id, joined_at, profiles:profile_id(full_name, avatar_url)')
        .eq('round_id', roundId!)
        .is('left_at', null);

      if (data) {
        const members: WatchPartyMember[] = data.map((row: any) => ({
          id: row.id,
          profileId: row.profile_id,
          fullName: row.profiles?.full_name ?? null,
          avatarUrl: row.profiles?.avatar_url ?? null,
          joinedAt: row.joined_at,
        }));
        setState(prev => ({ ...prev, members, memberCount: members.length }));
      }
    }

    fetchMembers();

    // Subscribe to member changes
    const channel = supabase
      .channel(`watch_party_members:${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watch_party_members', filter: `round_id=eq.${roundId}` },
        () => { fetchMembers(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roundId, user]);

  // Subscribe to round status changes (for completion detection)
  useEffect(() => {
    if (!roundId) return;

    const channel = supabase
      .channel(`watch_party_round:${roundId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${roundId}` },
        (payload) => {
          if ((payload.new as any).status === 'complete') {
            setState(prev => ({ ...prev, isRoundComplete: true }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roundId]);

  const joinParty = useCallback(async (): Promise<boolean> => {
    if (!user || !roundId) return false;

    try {
      // Try upsert — handles re-joining after leaving
      const { error } = await supabase
        .from('watch_party_members')
        .upsert(
          { round_id: roundId, profile_id: user.id, left_at: null },
          { onConflict: 'round_id,profile_id' }
        );

      if (error) throw error;
      setState(prev => ({ ...prev, isMember: true }));
      return true;
    } catch {
      return false;
    }
  }, [user, roundId]);

  const leaveParty = useCallback(async (): Promise<boolean> => {
    if (!user || !roundId) return false;

    try {
      const { error } = await supabase
        .from('watch_party_members')
        .update({ left_at: new Date().toISOString() })
        .eq('round_id', roundId)
        .eq('profile_id', user.id);

      if (error) throw error;
      setState(prev => ({ ...prev, isMember: false }));
      return true;
    } catch {
      return false;
    }
  }, [user, roundId]);

  return {
    ...state,
    joinParty,
    leaveParty,
  };
}
