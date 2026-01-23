import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SharedRound {
  id: string;
  roundId: string;
  sharedById: string;
  sharedByName: string | null;
  courseName: string;
  playedAt: string;
  totalScore: number | null;
  seenAt: string | null;
}

export function useRoundSharing() {
  const { user } = useAuth();

  const shareRoundWithFriends = async (roundId: string, playerProfileIds: string[]): Promise<number> => {
    if (!user || playerProfileIds.length === 0) return 0;

    try {
      // Get mutual friends of all players in the round
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      if (!friendships || friendships.length === 0) return 0;

      // Get friend IDs
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Find friends who were also in the round
      const friendsInRound = playerProfileIds.filter(id => 
        id !== user.id && friendIds.includes(id)
      );

      if (friendsInRound.length === 0) return 0;

      // Create share entries
      const shareEntries = friendsInRound.map(friendId => ({
        round_id: roundId,
        shared_with_id: friendId,
        shared_by_id: user.id,
      }));

      const { error: insertError } = await supabase
        .from('round_shares')
        .upsert(shareEntries, { onConflict: 'round_id,shared_with_id' });

      if (insertError) throw insertError;

      return friendsInRound.length;
    } catch (err) {
      // Error handled by state
      return 0;
    }
  };

  const getSharedRounds = async (): Promise<SharedRound[]> => {
    if (!user) return [];

    try {
      const { data: shares, error: sharesError } = await supabase
        .from('round_shares')
        .select('id, round_id, shared_by_id, created_at, seen_at')
        .eq('shared_with_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (sharesError) throw sharesError;
      if (!shares || shares.length === 0) return [];

      // Get round details
      const roundIds = shares.map(s => s.round_id);
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, course_name, created_at')
        .in('id', roundIds);

      if (roundsError) throw roundsError;

      // Get sharer profiles
      const sharerIds = [...new Set(shares.map(s => s.shared_by_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', sharerIds);

      if (profilesError) throw profilesError;

      return shares.map(share => {
        const round = rounds?.find(r => r.id === share.round_id);
        const profile = profiles?.find(p => p.id === share.shared_by_id);
        
        const sharedRound: SharedRound = {
          id: share.id,
          roundId: share.round_id,
          sharedById: share.shared_by_id,
          sharedByName: profile?.full_name || null,
          courseName: round?.course_name || 'Unknown Course',
          playedAt: round?.created_at || share.created_at || new Date().toISOString(),
          totalScore: null, // Could fetch from scores table if needed
          seenAt: share.seen_at,
        };
        return sharedRound;
      });
    } catch (err) {
      // Error handled by state
      return [];
    }
  };

  const markShareAsSeen = async (shareId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('round_shares')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', shareId);

      return !error;
    } catch {
      return false;
    }
  };

  return {
    shareRoundWithFriends,
    getSharedRounds,
    markShareAsSeen,
  };
}
