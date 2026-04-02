import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UpcomingRound {
  roundId: string;
  courseName: string;
  teeTime: string | null;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string | null;
  invitedIds: string[];
  participantIds: string[];
  participantNames: string[];
  messageCount: number;
  createdAt: string;
}

interface RpcUpcomingRow {
  round_id: string;
  course_name: string;
  tee_time?: string | null;
  creator_id: string;
  creator_name?: string | null;
  creator_avatar?: string | null;
  invited_ids?: string[];
  participant_ids?: string[];
  participant_names?: string[];
  message_count?: number;
  created_at: string;
}

interface FallbackPlayerProfile {
  full_name?: string | null;
  avatar_url?: string | null;
}

interface FallbackPlayer {
  id: string;
  profile_id: string | null;
  name: string | null;
  profiles: FallbackPlayerProfile | null;
}

interface FallbackRound {
  id: string;
  course_name: string;
  created_by: string;
  created_at: string;
  players: FallbackPlayer[];
}

export function useUpcomingRounds() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<UpcomingRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRounds = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Try RPC first
      const { data, error: rpcError } = await supabase.rpc('get_upcoming_rounds', {
        viewer_id: user.id,
      });

      if (!rpcError && data) {
        setRounds(
          (data as RpcUpcomingRow[]).map(row => ({
            roundId: row.round_id,
            courseName: row.course_name,
            teeTime: row.tee_time ?? null,
            creatorId: row.creator_id,
            creatorName: row.creator_name ?? 'Unknown',
            creatorAvatar: row.creator_avatar ?? null,
            invitedIds: row.invited_ids ?? [],
            participantIds: row.participant_ids ?? [],
            participantNames: row.participant_names ?? [],
            messageCount: Number(row.message_count ?? 0),
            createdAt: row.created_at,
          }))
        );
        return;
      }

      // Fallback: direct query — get pending rounds where user is a participant
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('rounds')
        .select(`
          id, course_name, created_by, created_at,
          players(id, profile_id, name, profiles:profile_id(full_name, avatar_url))
        `)
        .in('status', ['pending'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (fallbackError) throw fallbackError;

      const mapped: UpcomingRound[] = ((fallbackData ?? []) as unknown as FallbackRound[])
        .filter((r) => {
          const createdByMe = r.created_by === user.id;
          const participating = (r.players ?? []).some((p) => p.profile_id === user.id);
          return createdByMe || participating;
        })
        .map((r) => {
          const players = r.players ?? [];
          const creatorPlayer = players.find((p) => p.profile_id === r.created_by);
          const creatorName = creatorPlayer?.profiles?.full_name ?? creatorPlayer?.name ?? 'Unknown';
          const creatorAvatar = creatorPlayer?.profiles?.avatar_url ?? null;

          return {
            roundId: r.id,
            courseName: r.course_name,
            teeTime: null,
            creatorId: r.created_by,
            creatorName,
            creatorAvatar,
            invitedIds: [],
            participantIds: players
              .map((p) => p.profile_id)
              .filter(Boolean) as string[],
            participantNames: players
              .map((p) => p.profiles?.full_name ?? p.name)
              .filter(Boolean) as string[],
            messageCount: 0,
            createdAt: r.created_at,
          };
        });

      setRounds(mapped);
    } catch (err: unknown) {
      console.error('useUpcomingRounds error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load upcoming rounds');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  return { rounds, loading, error, refetch: fetchRounds };
}
