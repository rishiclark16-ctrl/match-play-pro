import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Friend {
  id: string;
  friendshipId: string;
  fullName: string | null;
  handicap: number | null;
  avatarUrl: string | null;
  friendCode: string | null;
  homeCourse: string | null;
  lastRoundScore?: number | null;
  lastRoundDate?: string | null;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string | null;
  senderHandicap: number | null;
  senderAvatar: string | null;
  senderHomeCourse: string | null;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  fullName: string | null;
  handicap: number | null;
  avatarUrl: string | null;
  friendCode: string | null;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      // Get accepted friendships where user is either sender or receiver
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        return;
      }

      // Get friend IDs
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Fetch friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, handicap, avatar_url, friend_code, home_course_name')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      // Map profiles to friends with friendship IDs
      const friendsList: Friend[] = (profiles || []).map(profile => {
        const friendship = friendships.find(f => 
          f.user_id === profile.id || f.friend_id === profile.id
        );
        return {
          id: profile.id,
          friendshipId: friendship?.id || '',
          fullName: profile.full_name,
          handicap: profile.handicap,
          avatarUrl: profile.avatar_url,
          friendCode: profile.friend_code,
          homeCourse: profile.home_course_name,
        };
      });

      setFriends(friendsList);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to load friends');
    }
  }, [user]);

  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;

    try {
      // Get pending requests where user is the receiver
      const { data: requests, error: requestsError } = await supabase
        .from('friendships')
        .select('id, user_id, created_at')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      if (!requests || requests.length === 0) {
        setPendingRequests([]);
        return;
      }

      // Get sender profiles
      const senderIds = requests.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, handicap, avatar_url, home_course_name')
        .in('id', senderIds);

      if (profilesError) throw profilesError;

      const pendingList: FriendRequest[] = requests.map(request => {
        const profile = profiles?.find(p => p.id === request.user_id);
        return {
          id: request.id,
          senderId: request.user_id,
          senderName: profile?.full_name || null,
          senderHandicap: profile?.handicap || null,
          senderAvatar: profile?.avatar_url || null,
          senderHomeCourse: profile?.home_course_name || null,
          createdAt: request.created_at,
        };
      });

      setPendingRequests(pendingList);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  }, [user]);

  const fetchSentRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setSentRequests((data || []).map(r => r.friend_id));
    } catch (err) {
      console.error('Error fetching sent requests:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchFriends(), fetchPendingRequests(), fetchSentRequests()])
        .finally(() => setLoading(false));
    } else {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setLoading(false);
    }
  }, [user, fetchFriends, fetchPendingRequests, fetchSentRequests]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          fetchFriends();
          fetchPendingRequests();
          fetchSentRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFriends, fetchPendingRequests, fetchSentRequests]);

  // Helper to check and create friendship
  const createFriendship = async (profileId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    if (profileId === user.id) {
      return { success: false, error: "You can't add yourself" };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, error: 'Already friends' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Request already pending' };
      }
    }

    // Create friend request
    const { error: insertError } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: profileId,
        status: 'pending',
      });

    if (insertError) throw insertError;

    await fetchSentRequests();
    return { success: true };
  };

  const sendFriendRequest = async (friendCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Find user by friend code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('friend_code', friendCode.toUpperCase())
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Friend code not found' };
      }

      return await createFriendship(profile.id);
    } catch (err) {
      console.error('Error sending friend request:', err);
      return { success: false, error: 'Failed to send request' };
    }
  };

  const sendFriendRequestByEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Find user by email in auth.users via a lookup
      // We need to check auth.users, but we can't query it directly from client
      // Instead, we'll search profiles with a workaround using the user's ID
      // Actually, we need to create an RPC function or use an edge function for this
      // For now, let's check if we can do a workaround

      // Check if user exists by querying the friendships system
      // Since we can't query auth.users directly, we'll need to rely on
      // the user having set up their profile or use an edge function

      // For MVP: Query profiles where we'd need email - but profiles don't store email
      // Let's return a helpful message
      return { 
        success: false, 
        error: 'Email lookup requires the user to share their friend code. Ask them for their code!' 
      };
    } catch (err) {
      console.error('Error sending friend request by email:', err);
      return { success: false, error: 'Failed to send request' };
    }
  };

  const sendFriendRequestByPhone = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Similar to email - profiles don't store phone numbers by default
      // For MVP: Return helpful message
      return { 
        success: false, 
        error: 'Phone lookup requires the user to share their friend code. Ask them for their code!' 
      };
    } catch (err) {
      console.error('Error sending friend request by phone:', err);
      return { success: false, error: 'Failed to send request' };
    }
  };

  const acceptFriendRequest = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', friendshipId);

      if (error) throw error;

      await Promise.all([fetchFriends(), fetchPendingRequests()]);
      return true;
    } catch (err) {
      console.error('Error accepting friend request:', err);
      return false;
    }
  };

  const declineFriendRequest = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchPendingRequests();
      return true;
    } catch (err) {
      console.error('Error declining friend request:', err);
      return false;
    }
  };

  const removeFriend = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      await fetchFriends();
      return true;
    } catch (err) {
      console.error('Error removing friend:', err);
      return false;
    }
  };

  const searchByCode = async (code: string): Promise<SearchResult | null> => {
    if (!code || code.length < 3) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, handicap, avatar_url, friend_code')
        .eq('friend_code', code.toUpperCase())
        .single();

      if (error || !data) return null;
      
      return {
        id: data.id,
        fullName: data.full_name,
        handicap: data.handicap,
        avatarUrl: data.avatar_url,
        friendCode: data.friend_code,
      };
    } catch {
      return null;
    }
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    error,
    sendFriendRequest,
    sendFriendRequestByEmail,
    sendFriendRequestByPhone,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    searchByCode,
    refetch: () => Promise.all([fetchFriends(), fetchPendingRequests(), fetchSentRequests()]),
  };
}
