import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Round, Player, Score, Press, GameConfig } from '@/types/golf';
import { Json } from '@/integrations/supabase/types';
import {
  transformRound,
  transformPlayer,
  transformScore,
  transformPress,
  DbRound,
  DbPlayer,
  DbScore,
  DbPress,
} from '@/lib/transformers';
import { withRetry, isSupabaseRetryable } from '@/lib/retry';
import { captureException } from '@/lib/sentry';
import { toast } from 'sonner';

export interface AsyncOperationResult {
  success: boolean;
  error?: string;
}

export function useSupabaseRound(roundId: string | null) {
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Fetch initial data
  useEffect(() => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    async function fetchRound() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch round
        const { data: roundData, error: roundError } = await supabase
          .from('rounds')
          .select('*')
          .eq('id', roundId)
          .maybeSingle();

        if (roundError) throw roundError;
        if (!roundData) {
          setError('Round not found');
          setLoading(false);
          return;
        }

        // Fetch players with profile avatar
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*, profiles:profile_id(avatar_url)')
          .eq('round_id', roundId)
          .order('order_index');

        if (playersError) throw playersError;

        // Fetch scores
        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select('*')
          .eq('round_id', roundId);

        if (scoresError) throw scoresError;

        // Fetch presses
        const { data: pressesData, error: pressesError } = await supabase
          .from('presses')
          .select('*')
          .eq('round_id', roundId);

        if (pressesError) throw pressesError;

        // Transform to app types
        const transformedRound = transformRound(roundData);
        const transformedPresses = (pressesData || []).map(p => transformPress(p));
        
        setRound({ ...transformedRound, presses: transformedPresses });
        setPlayers((playersData || []).map(p => transformPlayer(p)));
        setScores((scoresData || []).map(s => transformScore(s)));
        setPresses(transformedPresses);
        setIsOnline(true);
      } catch (err) {
        console.error('Error fetching round:', err);
        setError('Failed to load round');
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    }

    fetchRound();
  }, [roundId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roundId) return;

    const channel = supabase
      .channel(`round:${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScore = transformScore(payload.new as DbScore);
            setScores(prev => {
              const existing = prev.findIndex(
                s => s.playerId === newScore.playerId && s.holeNumber === newScore.holeNumber
              );
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newScore;
                return updated;
              }
              return [...prev, newScore];
            });
          } else if (payload.eventType === 'DELETE') {
            const oldScore = payload.old as { id?: string };
            setScores(prev => prev.filter(s => s.id !== oldScore.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPlayer = transformPlayer(payload.new as DbPlayer);
            setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.orderIndex - b.orderIndex));
          } else if (payload.eventType === 'DELETE') {
            const oldPlayer = payload.old as { id?: string };
            setPlayers(prev => prev.filter(p => p.id !== oldPlayer.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${roundId}` },
        (payload) => {
          const updated = transformRound(payload.new as DbRound);
          setRound(prev => prev ? { ...updated, presses: prev.presses } : updated);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presses', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPress = transformPress(payload.new as DbPress);
            setPresses(prev => [...prev, newPress]);
            setRound(prev => prev ? { ...prev, presses: [...prev.presses, newPress] } : prev);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription error:', err);
          setIsOnline(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  // Save score (with optimistic update)
  const saveScore = useCallback(async (playerId: string, holeNumber: number, strokes: number) => {
    if (!roundId) return;

    // Optimistic update - use crypto.randomUUID with fallback for older browsers
    const tempId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newScore: Score = {
      id: tempId,
      roundId,
      playerId,
      holeNumber,
      strokes
    };

    setScores(prev => {
      const existing = prev.findIndex(
        s => s.playerId === playerId && s.holeNumber === holeNumber
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], strokes };
        return updated;
      }
      return [...prev, newScore];
    });

    // Sync to Supabase with retry
    try {
      await withRetry(
        async () => {
          const { error } = await supabase
            .from('scores')
            .upsert({
              round_id: roundId,
              player_id: playerId,
              hole_number: holeNumber,
              strokes,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'player_id,hole_number'
            });

          if (error) throw error;
        },
        {
          maxAttempts: 3,
          isRetryable: isSupabaseRetryable,
        }
      );
      setIsOnline(true);
    } catch (err) {
      console.error('Error saving score after retries:', err);
      setIsOnline(false);
      // Keep optimistic update - will sync when back online
    }
  }, [roundId]);

  // Add press
  const addPress = useCallback(async (press: Press): Promise<AsyncOperationResult> => {
    if (!roundId) return { success: false, error: 'No round ID' };

    try {
      const { error } = await supabase
        .from('presses')
        .insert({
          round_id: roundId,
          initiated_by: press.initiatedBy || null,
          start_hole: press.startHole,
          stakes: press.stakes,
          status: press.status
        });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add press';
      console.error('Error adding press:', err);
      captureException(err instanceof Error ? err : new Error(message), {
        context: 'addPress',
        roundId,
        pressStartHole: press.startHole
      });
      toast.error('Failed to add press', { description: 'Please try again' });
      return { success: false, error: message };
    }
  }, [roundId]);

  // Complete round
  const completeRound = useCallback(async (): Promise<AsyncOperationResult> => {
    if (!roundId) return { success: false, error: 'No round ID' };

    try {
      const { error } = await supabase
        .from('rounds')
        .update({ status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', roundId);

      if (error) throw error;
      setRound(prev => prev ? { ...prev, status: 'complete' } : null);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete round';
      console.error('Error completing round:', err);
      captureException(err instanceof Error ? err : new Error(message), {
        context: 'completeRound',
        roundId
      });
      toast.error('Failed to complete round', { description: 'Please try again' });
      return { success: false, error: message };
    }
  }, [roundId]);

  // Update games configuration
  const updateGames = useCallback(async (games: GameConfig[]): Promise<AsyncOperationResult> => {
    if (!roundId) return { success: false, error: 'No round ID' };

    try {
      const { error } = await supabase
        .from('rounds')
        .update({
          games: games as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', roundId);

      if (error) throw error;
      setRound(prev => prev ? { ...prev, games } : null);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update games';
      console.error('Error updating games:', err);
      captureException(err instanceof Error ? err : new Error(message), {
        context: 'updateGames',
        roundId,
        gameTypes: games.map(g => g.type)
      });
      toast.error('Failed to update games', { description: 'Please try again' });
      return { success: false, error: message };
    }
  }, [roundId]);

  return {
    round,
    players,
    scores,
    presses,
    loading,
    error,
    isOnline,
    saveScore,
    addPress,
    completeRound,
    updateGames,
  };
}
