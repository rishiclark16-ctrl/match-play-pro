import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RoundComment {
  id: string;
  roundId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: string;
}

export function useRoundComments(roundId: string | null) {
  const { user } = useAuth();
  const [comments, setComments] = useState<RoundComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('round_comments')
        .select(`
          id,
          round_id,
          author_id,
          body,
          created_at,
          profiles:author_id ( full_name, avatar_url )
        `)
        .eq('round_id', roundId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const mapped: RoundComment[] = (data ?? []).map((row: any) => ({
        id: row.id,
        roundId: row.round_id,
        authorId: row.author_id,
        authorName: row.profiles?.full_name ?? 'Unknown',
        authorAvatar: row.profiles?.avatar_url ?? null,
        body: row.body,
        createdAt: row.created_at,
      }));
      setComments(mapped);
    } catch (err) {
      console.error('useRoundComments fetchComments error:', err);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  // Real-time subscription
  useEffect(() => {
    if (!roundId) return;
    fetchComments();

    const channel = supabase
      .channel(`round_comments:${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_comments', filter: `round_id=eq.${roundId}` },
        () => { fetchComments(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roundId, fetchComments]);

  const addComment = useCallback(async (body: string): Promise<boolean> => {
    if (!user || !roundId || !body.trim()) return false;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('round_comments').insert({
        round_id: roundId,
        author_id: user.id,
        body: body.trim(),
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('useRoundComments addComment error:', err);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, roundId]);

  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('round_comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user?.id ?? '');
      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
      return true;
    } catch (err) {
      console.error('useRoundComments deleteComment error:', err);
      return false;
    }
  }, [user]);

  return { comments, loading, submitting, addComment, deleteComment };
}
