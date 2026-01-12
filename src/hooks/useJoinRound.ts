import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Round, HoleInfo, GameConfig } from '@/types/golf';

function transformRound(db: any): Round {
  return {
    id: db.id,
    courseId: db.course_id || '',
    courseName: db.course_name,
    holes: db.holes as 9 | 18,
    strokePlay: db.stroke_play,
    matchPlay: db.match_play,
    stakes: db.stakes ?? undefined,
    slope: db.slope ?? undefined,
    rating: db.rating ?? undefined,
    status: db.status as 'active' | 'complete',
    games: (db.games as GameConfig[]) || [],
    holeInfo: (db.hole_info as HoleInfo[]) || [],
    joinCode: db.join_code,
    createdAt: new Date(db.created_at),
    presses: [],
  };
}

export function useJoinRound() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRound = useCallback(async (joinCode: string): Promise<Round | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('rounds')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
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
