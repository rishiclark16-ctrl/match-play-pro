import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WatchPartyMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  isPostReveal: boolean;
  isPlayer: boolean;
  createdAt: string;
}

export function useWatchPartyChat(roundId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_watch_party_messages', { p_round_id: roundId });

      if (error) throw error;

      setMessages(
        ((data ?? []) as any[]).map((row) => ({
          id: row.id,
          authorId: row.author_id,
          authorName: row.author_name ?? 'Unknown',
          authorAvatar: row.author_avatar ?? null,
          body: row.body,
          isPostReveal: row.is_post_reveal,
          isPlayer: row.is_player,
          createdAt: row.created_at,
        }))
      );
    } catch (err) {
      console.error('useWatchPartyChat fetchMessages error:', err);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  // Initial fetch + real-time subscription
  useEffect(() => {
    if (!roundId) {
      setMessages([]);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`watch_party_chat:${roundId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'watch_party_messages', filter: `round_id=eq.${roundId}` },
        () => { fetchMessages(); }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'watch_party_messages', filter: `round_id=eq.${roundId}` },
        () => { fetchMessages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roundId, fetchMessages]);

  const sendMessage = useCallback(async (body: string, isRoundComplete: boolean): Promise<boolean> => {
    if (!user || !roundId || !body.trim()) return false;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('watch_party_messages')
        .insert({
          round_id: roundId,
          author_id: user.id,
          body: body.trim(),
          is_post_reveal: isRoundComplete,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('useWatchPartyChat sendMessage error:', err);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, roundId]);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('watch_party_messages')
        .delete()
        .eq('id', messageId)
        .eq('author_id', user?.id ?? '');

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err) {
      console.error('useWatchPartyChat deleteMessage error:', err);
      return false;
    }
  }, [user]);

  return { messages, loading, submitting, sendMessage, deleteMessage, refetch: fetchMessages };
}
