import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { sendPushToProfiles } from '@/lib/pushUtils';
import {
  friendRequestRateLimiter,
  searchRateLimiter,
  formatResetTime,
} from '@/lib/rateLimiter';

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

const PAGE_SIZE = 20;

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchFriends = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) return;

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Get accepted friendships where user is either sender or receiver
      const { data: friendships, error: friendshipsError, count } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status', { count: 'exact' })
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .order('accepted_at', { ascending: false })
        .range(from, to);

      if (friendshipsError) throw friendshipsError;

      // Update hasMore based on total count
      setHasMore(count ? from + PAGE_SIZE < count : false);

      if (!friendships || friendships.length === 0) {
        if (!append) setFriends([]);
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

      if (append) {
        setFriends(prev => [...prev, ...friendsList]);
      } else {
        setFriends(friendsList);
      }
    } catch (err) {
      // Error handled by state
      setError('Failed to load friends');
    }
  }, [user]);

  const loadMoreFriends = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchFriends(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchFriends]);

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
      // Error handled by state
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
      // Error handled by state
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

    // Send push notification to the recipient
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const senderName = senderProfile?.full_name || 'Someone';
    sendPushToProfiles({
      profileIds: [profileId],
      title: 'New Friend Request',
      body: `${senderName} wants to be your friend`,
      data: { type: 'friend_request', senderId: user.id },
      type: 'friendRequests',
    });

    await fetchSentRequests();
    return { success: true };
  };

  const sendFriendRequest = async (friendCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check rate limit
    const rateLimitResult = friendRequestRateLimiter.checkAndRecord(user.id);
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: `Too many friend requests. Please wait ${formatResetTime(rateLimitResult.resetInMs)} and try again.`,
      };
    }

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
      // Error handled by toast
      return { success: false, error: 'Failed to send request' };
    }
  };

  const sendFriendRequestByEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check rate limit
    const rateLimitResult = friendRequestRateLimiter.checkAndRecord(user.id);
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: `Too many friend requests. Please wait ${formatResetTime(rateLimitResult.resetInMs)} and try again.`,
      };
    }

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        return { success: false, error: 'No user found with that email' };
      }

      return await createFriendship(profile.id);
    } catch (err) {
      // Error handled by toast
      return { success: false, error: 'Failed to send request' };
    }
  };

  const sendFriendRequestByPhone = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check rate limit
    const rateLimitResult = friendRequestRateLimiter.checkAndRecord(user.id);
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: `Too many friend requests. Please wait ${formatResetTime(rateLimitResult.resetInMs)} and try again.`,
      };
    }

    try {
      // Normalize phone - remove common formatting characters
      const normalizedPhone = phone.replace(/[\s\-()+ ]/g, '').trim();

      // Find user by phone in profiles (try both with and without formatting)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .not('phone', 'is', null);

      if (profileError) throw profileError;

      // Find matching phone (normalize stored phones too)
      const matchingProfile = profiles?.find((p) => {
        const storedPhone = p.phone?.replace(/[\s\-()+ ]/g, '') || '';
        return (
          storedPhone === normalizedPhone ||
          storedPhone.endsWith(normalizedPhone) ||
          normalizedPhone.endsWith(storedPhone)
        );
      });

      if (!matchingProfile) {
        return { success: false, error: 'No user found with that phone number' };
      }

      return await createFriendship(matchingProfile.id);
    } catch (err) {
      // Error handled by toast
      return { success: false, error: 'Failed to send request' };
    }
  };

  const acceptFriendRequest = async (friendshipId: string): Promise<boolean> => {
    try {
      // Get the sender's ID before updating
      const { data: friendship } = await supabase
        .from('friendships')
        .select('user_id')
        .eq('id', friendshipId)
        .single();

      const { error } = await supabase
        .from('friendships')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', friendshipId);

      if (error) throw error;

      // Notify the original sender that their request was accepted
      if (friendship?.user_id && user) {
        const { data: accepterProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const accepterName = accepterProfile?.full_name || 'Someone';
        sendPushToProfiles({
          profileIds: [friendship.user_id],
          title: 'Friend Request Accepted',
          body: `${accepterName} accepted your friend request`,
          data: { type: 'friend_accepted', friendId: user.id },
          type: 'friendRequests',
        });
      }

      await Promise.all([fetchFriends(), fetchPendingRequests()]);
      return true;
    } catch (err) {
      // Error handled by toast
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
      // Error handled by toast
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
      // Error handled by toast
      return false;
    }
  };

  const searchByName = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 2) return [];
    if (!user) return [];

    const rateLimitResult = searchRateLimiter.checkAndRecord(user.id);
    if (!rateLimitResult.allowed) return [];

    try {
      // Search by name OR email prefix (e.g. "rishiclark16" matches email)
      // Normalize query for phone matching (strip formatting)
      const phoneQuery = query.replace(/[\s\-()+ ]/g, '');
      const isPhoneLike = /^\d{3,}$/.test(phoneQuery);

      let orFilter = `full_name.ilike.%${query}%,email.ilike.${query}%`;
      if (isPhoneLike) {
        orFilter += `,phone.ilike.%${phoneQuery}%`;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, handicap, avatar_url, friend_code, email, phone')
        .or(orFilter)
        .neq('id', user.id)
        .limit(10);

      if (error || !data) return [];

      // Deduplicate by id (in case both name and email match)
      const seen = new Set<string>();
      return data.filter(d => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      }).map(d => ({
        id: d.id,
        fullName: d.full_name,
        handicap: d.handicap,
        avatarUrl: d.avatar_url,
        friendCode: d.friend_code,
      }));
    } catch {
      return [];
    }
  }, [user]);

  const searchByCode = useCallback(async (code: string): Promise<SearchResult | null> => {
    if (!code || code.length < 3) return null;
    if (!user) return null;

    const rateLimitResult = searchRateLimiter.checkAndRecord(user.id);
    if (!rateLimitResult.allowed) return null;

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
  }, [user]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    loadingMore,
    hasMore,
    error,
    sendFriendRequest,
    sendFriendRequestByProfileId: createFriendship,
    sendFriendRequestByEmail,
    sendFriendRequestByPhone,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    searchByCode,
    searchByName,
    loadMoreFriends,
    refetch: () => {
      setPage(0);
      return Promise.all([fetchFriends(0, false), fetchPendingRequests(), fetchSentRequests()]);
    },
  };
}
