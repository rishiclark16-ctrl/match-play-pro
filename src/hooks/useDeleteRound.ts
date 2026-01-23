import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDeleteRound() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteRound = useCallback(async (roundId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Delete in order: scores -> players -> presses -> round
      // Due to foreign key constraints
      
      // Delete all scores for this round
      const { error: scoresError } = await supabase
        .from('scores')
        .delete()
        .eq('round_id', roundId);
      
      if (scoresError) throw scoresError;

      // Delete all players for this round
      const { error: playersError } = await supabase
        .from('players')
        .delete()
        .eq('round_id', roundId);
      
      if (playersError) throw playersError;

      // Delete all presses for this round
      const { error: pressesError } = await supabase
        .from('presses')
        .delete()
        .eq('round_id', roundId);
      
      if (pressesError) throw pressesError;

      // Finally delete the round
      const { error: roundError } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);
      
      if (roundError) throw roundError;

      return true;
    } catch (err) {
      // Error handled by toast
      setError(err instanceof Error ? err.message : 'Failed to delete round');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deleteRound,
    loading,
    error,
  };
}
