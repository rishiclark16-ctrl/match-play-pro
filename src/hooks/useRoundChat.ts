import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RoundMessage {
  id: string;
  roundId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: string;
}

export function useRoundChat(roundId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RoundMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('round_messages')
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
      setMessages(
        (data ?? []).map((row: any) => ({
          id: row.id,
          roundId: row.round_id,
          authorId: row.author_id,
          authorName: row.profiles?.full_name ?? 'Unknown',
          authorAvatar: row.profiles?.avatar_url ?? null,
          body: row.body,
          createdAt: row.created_at,
        }))
      );
    } catch (err) {
      console.error('useRoundChat fetchMessages error:', err);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  // Real-time subscription
  useEffect(() => {
    if (!roundId) { setMessages([]); return; }
    fetchMessages();

    const channel = supabase
      .channel(`round_messages:${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_messages', filter: `round_id=eq.${roundId}` },
        () => { fetchMessages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roundId, fetchMessages]);

  const sendMessage = useCallback(async (body: string): Promise<boolean> => {
    if (!user || !roundId || !body.trim()) return false;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('round_messages').insert({
        round_id: roundId,
        author_id: user.id,
        body: body.trim(),
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('useRoundChat sendMessage error:', err);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, roundId]);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('round_messages')
        .delete()
        .eq('id', messageId)
        .eq('author_id', user?.id ?? '');
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err) {
      console.error('useRoundChat deleteMessage error:', err);
      return false;
    }
  }, [user]);

  return { messages, loading, submitting, sendMessage, deleteMessage };
}
