import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Round } from '@/types/golf';
import { transformRound } from '@/lib/transformers';
import { validateJoinCode } from '@/lib/validation';

export function useJoinRound() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRound = useCallback(async (joinCode: string): Promise<Round | null> => {
    setLoading(true);
    setError(null);

    // Validate join code format before making API call
    const validation = validateJoinCode(joinCode);
    if (!validation.success) {
      setError(validation.error ?? 'Invalid join code');
      setLoading(false);
      return null;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('rounds')
        .select('*')
        .eq('join_code', validation.data)
        .maybeSingle();

      if (fetchError) {
        setError('Failed to join round');
        return null;
      }

      if (!data) {
        setError('Round not found. Check the code and try again.');
        return null;
      }

      return transformRound(data);
    } catch (err) {
      setError('Failed to join round');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { joinRound, loading, error, clearError: () => setError(null) };
}
