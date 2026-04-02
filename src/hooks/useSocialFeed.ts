import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FeedRoundItem {
  roundId: string;
  courseName: string;
  completedAt: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string | null;
  participantIds: string[];
  participantNames: string[];
  commentCount: number;
  games: Record<string, unknown>[];
}

interface RpcFeedRow {
  round_id: string;
  course_name: string;
  completed_at: string;
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  participant_ids: string[];
  participant_names: string[];
  comment_count: number;
  games: Record<string, unknown>[];
}

export function useSocialFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedRoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_social_feed_rounds', {
        viewer_id: user.id,
      });
      if (rpcError) throw rpcError;
      const mapped: FeedRoundItem[] = (data as RpcFeedRow[] ?? []).map((row) => ({
        roundId: row.round_id,
        courseName: row.course_name,
        completedAt: row.completed_at,
        creatorId: row.creator_id,
        creatorName: row.creator_name,
        creatorAvatar: row.creator_avatar ?? null,
        participantIds: row.participant_ids ?? [],
        participantNames: row.participant_names ?? [],
        commentCount: Number(row.comment_count ?? 0),
        games: Array.isArray(row.games) ? row.games : [],
      }));
      setItems(mapped);
    } catch (err: unknown) {
      console.error('useSocialFeed error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { items, loading, error, refetch: fetchFeed };
}
