import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoundDetailParticipant {
  profileId: string | null;
  name: string;
  avatarUrl: string | null;
  isGuest: boolean;
}

export interface RoundDetailScore {
  playerId: string;
  holeNumber: number;
  strokes: number | null;
}

export interface RoundDetail {
  id: string;
  courseName: string;
  courseHoles: number;
  status: string;
  completedAt: string | null;
  participants: RoundDetailParticipant[];
  scores: RoundDetailScore[];
  games: any[];
}

export function useRoundDetailForSheet(roundId: string | null) {
  const [detail, setDetail] = useState<RoundDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roundId) { setDetail(null); return; }
    setLoading(true);

    (async () => {
      try {
        const [roundRes, playersRes, scoresRes] = await Promise.all([
          supabase.from('rounds').select('id, course_name, holes, status, completed_at, updated_at, games').eq('id', roundId).single(),
          supabase.from('players').select('id, profile_id, name, profiles:profile_id(full_name, avatar_url)').eq('round_id', roundId),
          supabase.from('scores').select('player_id, hole_number, strokes').eq('round_id', roundId).order('hole_number'),
        ]);

        if (roundRes.error) throw roundRes.error;
        const r = roundRes.data;
        const players = playersRes.data ?? [];
        const scores = scoresRes.data ?? [];

        setDetail({
          id: r.id,
          courseName: r.course_name,
          courseHoles: r.holes ?? 18,
          status: r.status,
          completedAt: r.completed_at ?? r.updated_at ?? null,
          participants: players.map((p: any) => ({
            profileId: p.profile_id,
            name: (p.profiles as any)?.full_name ?? p.name ?? 'Guest',
            avatarUrl: (p.profiles as any)?.avatar_url ?? null,
            isGuest: !p.profile_id,
          })),
          scores: scores.map((s: any) => ({
            playerId: s.player_id,
            holeNumber: s.hole_number,
            strokes: s.strokes,
          })),
          games: Array.isArray(r.games) ? r.games : [],
        });
      } catch (err) {
        console.error('useRoundDetailForSheet error:', err);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [roundId]);

  return { detail, loading };
}
