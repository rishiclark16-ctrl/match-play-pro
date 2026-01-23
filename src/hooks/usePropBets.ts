import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PropBet } from '@/types/betting';
import { captureException } from '@/lib/sentry';
import { toast } from 'sonner';

export interface PropBetOperationResult {
  success: boolean;
  error?: string;
}

export function usePropBets(roundId: string | undefined) {
  const [propBets, setPropBets] = useState<PropBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch prop bets for round
  const fetchPropBets = useCallback(async () => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('prop_bets')
        .select('*')
        .eq('round_id', roundId)
        .order('hole_number', { ascending: true });

      if (fetchError) throw fetchError;

      const transformed: PropBet[] = (data || []).map(row => ({
        id: row.id,
        roundId: row.round_id,
        type: row.type as PropBet['type'],
        holeNumber: row.hole_number,
        stakes: row.stakes,
        description: row.description,
        winnerId: row.winner_id,
        createdBy: row.created_by,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      }));

      setPropBets(transformed);
    } catch (err) {
      // Error handled by state
      setError(err instanceof Error ? err.message : 'Failed to fetch prop bets');
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  // Initial fetch
  useEffect(() => {
    fetchPropBets();
  }, [fetchPropBets]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roundId) return;

    const channel = supabase
      .channel(`prop_bets_${roundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prop_bets',
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBet: PropBet = {
              id: payload.new.id,
              roundId: payload.new.round_id,
              type: payload.new.type as PropBet['type'],
              holeNumber: payload.new.hole_number,
              stakes: payload.new.stakes,
              description: payload.new.description,
              winnerId: payload.new.winner_id,
              createdBy: payload.new.created_by,
              createdAt: new Date(payload.new.created_at),
            };
            setPropBets(prev => [...prev, newBet]);
          } else if (payload.eventType === 'UPDATE') {
            setPropBets(prev =>
              prev.map(bet =>
                bet.id === payload.new.id
                  ? {
                      ...bet,
                      winnerId: payload.new.winner_id,
                      description: payload.new.description,
                      stakes: payload.new.stakes,
                    }
                  : bet
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPropBets(prev => prev.filter(bet => bet.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  // Add prop bet with Supabase persistence
  const addPropBet = useCallback(async (propBet: PropBet): Promise<PropBetOperationResult> => {
    // Optimistic update
    setPropBets(prev => [...prev, propBet]);

    try {
      const { error } = await supabase
        .from('prop_bets')
        .insert({
          id: propBet.id,
          round_id: propBet.roundId,
          type: propBet.type,
          hole_number: propBet.holeNumber,
          stakes: propBet.stakes,
          description: propBet.description || null,
          winner_id: propBet.winnerId || null,
          created_by: propBet.createdBy || null,
        });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      // Rollback optimistic update
      setPropBets(prev => prev.filter(bet => bet.id !== propBet.id));

      const message = err instanceof Error ? err.message : 'Failed to add prop bet';
      // Error handled by toast
      captureException(err instanceof Error ? err : new Error(message), {
        context: 'addPropBet',
        roundId: propBet.roundId,
        propBetType: propBet.type,
        holeNumber: propBet.holeNumber
      });
      toast.error('Failed to add prop bet', { description: 'Please try again' });
      return { success: false, error: message };
    }
  }, []);

  // Update prop bet with Supabase persistence
  const updatePropBet = useCallback(async (propBet: PropBet): Promise<PropBetOperationResult> => {
    // Store previous state for rollback
    const previousBets = [...propBets];

    // Optimistic update
    setPropBets(prev =>
      prev.map(bet => (bet.id === propBet.id ? propBet : bet))
    );

    try {
      const { error } = await supabase
        .from('prop_bets')
        .update({
          winner_id: propBet.winnerId || null,
          description: propBet.description || null,
          stakes: propBet.stakes,
        })
        .eq('id', propBet.id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      // Rollback optimistic update
      setPropBets(previousBets);

      const message = err instanceof Error ? err.message : 'Failed to update prop bet';
      // Error handled by toast
      captureException(err instanceof Error ? err : new Error(message), {
        context: 'updatePropBet',
        propBetId: propBet.id,
        roundId: propBet.roundId
      });
      toast.error('Failed to update prop bet', { description: 'Please try again' });
      return { success: false, error: message };
    }
  }, [propBets]);

  // Get prop bets for a specific hole
  const getPropBetsForHole = useCallback(
    (holeNumber: number) => propBets.filter(pb => pb.holeNumber === holeNumber),
    [propBets]
  );

  // Calculate total prop bet winnings for settlement
  const calculatePropBetSettlements = useCallback(() => {
    const settlements: Map<string, number> = new Map();

    propBets.forEach(bet => {
      if (!bet.winnerId) return;

      // Winner gets the pot (stakes per player)
      // For now, simplified: winner gets stakes from each other player
      settlements.set(bet.winnerId, (settlements.get(bet.winnerId) || 0) + bet.stakes);
    });

    return settlements;
  }, [propBets]);

  return {
    propBets,
    loading,
    error,
    addPropBet,
    updatePropBet,
    getPropBetsForHole,
    calculatePropBetSettlements,
    refetch: fetchPropBets,
  };
}
