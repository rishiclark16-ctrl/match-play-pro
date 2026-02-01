import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface GroupMember {
  id: string;
  profileId: string | null;
  guestName: string | null;
  guestHandicap: number | null;
  orderIndex: number;
  // Populated from profile if profileId exists
  name: string;
  handicap: number | null;
  avatarUrl: string | null;
}

export interface GolfGroup {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  members: GroupMember[];
  createdAt: string;
}

const PAGE_SIZE = 20;

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GolfGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchGroups = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch groups owned by user with pagination
      const { data: groupsData, error: groupsError, count } = await supabase
        .from('golf_groups')
        .select('*', { count: 'exact' })
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (groupsError) throw groupsError;

      // Update hasMore based on total count
      setHasMore(count ? from + PAGE_SIZE < count : false);

      if (!groupsData || groupsData.length === 0) {
        if (!append) setGroups([]);
        setLoading(false);
        return;
      }

      // Fetch members for all groups
      const groupIds = groupsData.map(g => g.id);
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .in('group_id', groupIds)
        .order('order_index', { ascending: true });

      if (membersError) throw membersError;

      // Get profile IDs for members who have profiles
      const profileIds = (membersData || [])
        .filter(m => m.profile_id)
        .map(m => m.profile_id as string);

      let profilesMap: Record<string, any> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, handicap, avatar_url')
          .in('id', profileIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      // Build groups with members
      const groupsWithMembers: GolfGroup[] = groupsData.map(group => {
        const members = (membersData || [])
          .filter(m => m.group_id === group.id)
          .map(m => {
            const profile = m.profile_id ? profilesMap[m.profile_id] : null;
            return {
              id: m.id,
              profileId: m.profile_id,
              guestName: m.guest_name,
              guestHandicap: m.guest_handicap,
              orderIndex: m.order_index,
              name: profile?.full_name || m.guest_name || 'Unknown',
              handicap: profile?.handicap ?? m.guest_handicap ?? null,
              avatarUrl: profile?.avatar_url || null,
            };
          });

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          ownerId: group.owner_id,
          members,
          createdAt: group.created_at,
        };
      });

      if (append) {
        setGroups(prev => [...prev, ...groupsWithMembers]);
      } else {
        setGroups(groupsWithMembers);
      }
    } catch {
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMoreGroups = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchGroups(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchGroups]);

  useEffect(() => {
    setPage(0);
    fetchGroups(0, false);
  }, [fetchGroups]);

  const createGroup = async (
    name: string,
    description: string | null,
    members: Array<{ profileId?: string; guestName?: string; guestHandicap?: number }>
  ): Promise<GolfGroup | null> => {
    if (!user) return null;

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('golf_groups')
        .insert({
          name,
          description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members
      if (members.length > 0) {
        const memberInserts = members.map((m, index) => ({
          group_id: group.id,
          profile_id: m.profileId || null,
          guest_name: m.guestName || null,
          guest_handicap: m.guestHandicap ?? null,
          order_index: index,
        }));

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(memberInserts);

        if (membersError) throw membersError;
      }

      await fetchGroups();
      return groups.find(g => g.id === group.id) || null;
    } catch {
      setError('Failed to create group');
      return null;
    }
  };

  const updateGroup = async (
    groupId: string,
    updates: { name?: string; description?: string | null }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('golf_groups')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (error) throw error;
      await fetchGroups();
      return true;
    } catch {
      return false;
    }
  };

  const deleteGroup = async (groupId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('golf_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      setGroups(prev => prev.filter(g => g.id !== groupId));
      return true;
    } catch {
      return false;
    }
  };

  const updateMembers = async (
    groupId: string,
    members: Array<{ profileId?: string; guestName?: string; guestHandicap?: number }>
  ): Promise<boolean> => {
    try {
      // Delete existing members
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      // Insert new members
      if (members.length > 0) {
        const memberInserts = members.map((m, index) => ({
          group_id: groupId,
          profile_id: m.profileId || null,
          guest_name: m.guestName || null,
          guest_handicap: m.guestHandicap ?? null,
          order_index: index,
        }));

        const { error } = await supabase
          .from('group_members')
          .insert(memberInserts);

        if (error) throw error;
      }

      await fetchGroups();
      return true;
    } catch {
      return false;
    }
  };

  return {
    groups,
    loading,
    loadingMore,
    hasMore,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    updateMembers,
    loadMoreGroups,
    refetch: () => {
      setPage(0);
      return fetchGroups(0, false);
    },
  };
}
