import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FeedPlayerScore {
  playerId: string;
  profileId: string | null;
  name: string;
  totalStrokes: number;
  holesPlayed: number;
}

export interface FeedReactionSummary {
  type: string;
  count: number;
}

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
  playerScores: FeedPlayerScore[];
  reactions: FeedReactionSummary[];
  totalReactions: number;
  holes: number;
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

      const rows = (data as RpcFeedRow[]) ?? [];
      const roundIds = rows.map(r => r.round_id);

      // Fetch scores, players, and reactions in parallel for all feed rounds
      const [scoresRes, playersRes, reactionsRes, roundsRes] = await Promise.all([
        roundIds.length > 0
          ? supabase.from('scores').select('round_id, player_id, strokes').in('round_id', roundIds)
          : { data: [] },
        roundIds.length > 0
          ? supabase.from('players').select('id, round_id, profile_id, name, is_ghost').in('round_id', roundIds)
          : { data: [] },
        roundIds.length > 0
          ? supabase.from('round_reactions').select('round_id, reaction_type').in('round_id', roundIds)
          : { data: [] },
        roundIds.length > 0
          ? supabase.from('rounds').select('id, holes').in('id', roundIds)
          : { data: [] },
      ]);

      const allScores = (scoresRes.data ?? []) as { round_id: string; player_id: string; strokes: number }[];
      const allPlayers = (playersRes.data ?? []) as { id: string; round_id: string; profile_id: string | null; name: string; is_ghost: boolean }[];
      const allReactions = (reactionsRes.data ?? []) as { round_id: string; reaction_type: string }[];
      const allRounds = (roundsRes.data ?? []) as { id: string; holes: number }[];

      const mapped: FeedRoundItem[] = rows.map((row) => {
        // Build player scores
        const roundPlayers = allPlayers.filter(p => p.round_id === row.round_id && !p.is_ghost);
        const roundScores = allScores.filter(s => s.round_id === row.round_id);

        const playerScores: FeedPlayerScore[] = roundPlayers.map(p => {
          const pScores = roundScores.filter(s => s.player_id === p.id);
          return {
            playerId: p.id,
            profileId: p.profile_id,
            name: p.name,
            totalStrokes: pScores.reduce((sum, s) => sum + s.strokes, 0),
            holesPlayed: pScores.length,
          };
        }).filter(ps => ps.holesPlayed > 0)
          .sort((a, b) => a.totalStrokes - b.totalStrokes);

        // Aggregate reactions by type
        const roundReactions = allReactions.filter(r => r.round_id === row.round_id);
        const reactionMap: Record<string, number> = {};
        for (const r of roundReactions) {
          reactionMap[r.reaction_type] = (reactionMap[r.reaction_type] || 0) + 1;
        }
        const reactions: FeedReactionSummary[] = Object.entries(reactionMap)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);

        const roundInfo = allRounds.find(r => r.id === row.round_id);

        return {
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
          playerScores,
          reactions,
          totalReactions: roundReactions.length,
          holes: roundInfo?.holes ?? 18,
        };
      });
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
