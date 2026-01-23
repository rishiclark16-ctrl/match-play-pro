import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseScorekeeperResult {
  isScorekeeper: boolean;
  isCreator: boolean;
  scorekeeperIds: string[];
  loading: boolean;
  addScorekeeper: (profileId: string) => Promise<void>;
  removeScorekeeper: (profileId: string) => Promise<void>;
}

export function useScorekeeper(roundId: string | undefined, players: { id: string; profileId?: string | null; orderIndex?: number }[]): UseScorekeeperResult {
  const { user } = useAuth();
  const [scorekeeperIds, setScorekeeperIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch scorekeeper IDs from round
  const fetchScorekeeperIds = useCallback(async () => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('scorekeeper_ids')
        .eq('id', roundId)
        .single();

      if (error) throw error;
      setScorekeeperIds((data?.scorekeeper_ids as string[]) || []);
    } catch (err) {
      // Error handled
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    fetchScorekeeperIds();
  }, [fetchScorekeeperIds]);

  // Subscribe to round changes for realtime scorekeeper updates
  useEffect(() => {
    if (!roundId) return;

    const channel = supabase
      .channel(`round_scorekeepers_${roundId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `id=eq.${roundId}`,
        },
        (payload) => {
          if (payload.new?.scorekeeper_ids) {
            setScorekeeperIds(payload.new.scorekeeper_ids as string[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  // Check if current user is the round creator (orderIndex = 0)
  const isCreator = useMemo(() => {
    if (!user?.id || players.length === 0) return false;
    const creatorPlayer = players.find(p => p.orderIndex === 0);
    return creatorPlayer?.profileId === user.id;
  }, [user?.id, players]);

  // Check if current user is a scorekeeper
  const isScorekeeper = useMemo(() => {
    if (!user?.id) return false;
    // Creator is always a scorekeeper
    if (isCreator) return true;
    // Check if user's profile_id is in scorekeeper_ids
    return scorekeeperIds.includes(user.id);
  }, [user?.id, isCreator, scorekeeperIds]);

  // Add a scorekeeper (only creator can do this)
  const addScorekeeper = useCallback(async (profileId: string) => {
    if (!roundId || !isCreator) return;

    const newIds = [...scorekeeperIds, profileId];
    
    const { error } = await supabase
      .from('rounds')
      .update({ scorekeeper_ids: newIds })
      .eq('id', roundId);

    if (error) {
      // Error handled by toast
      throw error;
    }

    setScorekeeperIds(newIds);
  }, [roundId, isCreator, scorekeeperIds]);

  // Remove a scorekeeper (only creator can do this)
  const removeScorekeeper = useCallback(async (profileId: string) => {
    if (!roundId || !isCreator) return;

    const newIds = scorekeeperIds.filter(id => id !== profileId);
    
    const { error } = await supabase
      .from('rounds')
      .update({ scorekeeper_ids: newIds })
      .eq('id', roundId);

    if (error) {
      // Error handled by toast
      throw error;
    }

    setScorekeeperIds(newIds);
  }, [roundId, isCreator, scorekeeperIds]);

  return {
    isScorekeeper,
    isCreator,
    scorekeeperIds,
    loading,
    addScorekeeper,
    removeScorekeeper,
  };
}
