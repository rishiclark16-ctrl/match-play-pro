import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateJoinCode } from '@/lib/validation';

interface JoinRoundResult {
  id: string;
  course_name: string;
  status: string;
  created_at: string;
}

export function useJoinRound() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRound = useCallback(async (joinCode: string): Promise<JoinRoundResult | null> => {
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
      // Use SECURITY DEFINER RPC to bypass RLS — user has no access to the
      // round yet, so a direct table query would return nothing.
      const { data, error: rpcError } = await supabase
        .rpc('lookup_round_by_join_code', { code: validation.data });

      if (rpcError) {
        setError('Failed to join round');
        return null;
      }

      const rows = data as JoinRoundResult[] | null;
      if (!rows || rows.length === 0) {
        setError('Round not found. Check the code and try again.');
        return null;
      }

      return rows[0];
    } catch (err) {
      setError('Failed to join round');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { joinRound, loading, error, clearError: () => setError(null) };
}
