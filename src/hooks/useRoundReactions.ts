import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ReactionType = 'pay_up' | 'cold_blooded' | 'robbery' | 'press_that' | 'respect' | 'fraud';

export interface ReactionSummary {
  type: ReactionType;
  count: number;
  viewerReacted: boolean;
}

export function useRoundReactions(roundId: string | null) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReactions = useCallback(async () => {
    if (!roundId || !user) return;
    setLoading(true);
    try {
      // Try RPC first
      const { data, error } = await supabase.rpc('get_round_reactions', {
        target_round_id: roundId,
        viewer_id: user.id,
      });

      if (!error && data) {
        setReactions(
          (data as Record<string, unknown>[]).map(r => ({
            type: r.reaction_type as ReactionType,
            count: Number(r.count),
            viewerReacted: Boolean(r.viewer_reacted),
          }))
        );
        return;
      }

      // Fallback: direct query if RPC not available yet
      const { data: rawData } = await supabase
        .from('round_reactions')
        .select('reaction_type, user_id')
        .eq('round_id', roundId);

      if (rawData) {
        const grouped: Record<string, { count: number; viewerReacted: boolean }> = {};
        for (const r of rawData) {
          if (!grouped[r.reaction_type]) grouped[r.reaction_type] = { count: 0, viewerReacted: false };
          grouped[r.reaction_type].count++;
          if (r.user_id === user.id) grouped[r.reaction_type].viewerReacted = true;
        }
        setReactions(
          Object.entries(grouped).map(([type, data]) => ({
            type: type as ReactionType,
            count: data.count,
            viewerReacted: data.viewerReacted,
          }))
        );
      }
    } catch (err) {
      console.error('useRoundReactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [roundId, user]);

  const toggleReaction = useCallback(async (type: ReactionType) => {
    if (!roundId || !user) return;

    const existing = reactions.find(r => r.type === type);

    if (existing?.viewerReacted) {
      // Optimistic remove
      setReactions(prev =>
        prev
          .map(r => r.type === type ? { ...r, count: Math.max(0, r.count - 1), viewerReacted: false } : r)
          .filter(r => r.count > 0)
      );
      await supabase
        .from('round_reactions')
        .delete()
        .eq('round_id', roundId)
        .eq('user_id', user.id)
        .eq('reaction_type', type);
    } else {
      // Optimistic add
      setReactions(prev => {
        const exists = prev.find(r => r.type === type);
        if (exists) {
          return prev.map(r => r.type === type ? { ...r, count: r.count + 1, viewerReacted: true } : r);
        }
        return [...prev, { type, count: 1, viewerReacted: true }];
      });
      await supabase
        .from('round_reactions')
        .upsert({
          round_id: roundId,
          user_id: user.id,
          reaction_type: type,
        });
    }
  }, [roundId, user, reactions]);

  useEffect(() => { fetchReactions(); }, [fetchReactions]);

  return { reactions, loading, toggleReaction, refetch: fetchReactions };
}
