import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface HeadToHeadRecord {
  wins: number;
  losses: number;
  pushes: number;
  netAmount: number;
  roundCount: number;
}

export function useHeadToHead(friendProfileId: string | null) {
  const { user } = useAuth();
  const [record, setRecord] = useState<HeadToHeadRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !friendProfileId) return;
    setLoading(true);
    supabase
      .rpc('get_head_to_head', { viewer_id: user.id, other_id: friendProfileId })
      .single()
      .then(({ data, error }) => {
        if (error) { console.error('useHeadToHead error:', error); return; }
        if (data) {
          setRecord({
            wins: Number(data.wins ?? 0),
            losses: Number(data.losses ?? 0),
            pushes: Number(data.pushes ?? 0),
            netAmount: Number(data.net_amount ?? 0),
            roundCount: Number(data.round_count ?? 0),
          });
        }
      })
      .finally(() => setLoading(false));
  }, [user, friendProfileId]);

  return { record, loading };
}
