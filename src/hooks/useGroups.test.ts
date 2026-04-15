import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGroups } from './useGroups';

const mockSupabaseClient = {
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })),
  removeChannel: vi.fn(),
};
const mockUser = { id: 'user-123', email: 'test@test.com' };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

describe('useGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: vi.fn(),
            delete: vi.fn(),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });
    });

    it('should start with loading state', () => {
      const { result } = renderHook(() => useGroups());
      expect(result.current.loading).toBe(true);
    });

    it('should complete loading after fetch', async () => {
      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should return empty groups array when no groups', async () => {
      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groups).toEqual([]);
    });

    it('should not have more items by default', async () => {
      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('fetching groups', () => {
    it('should fetch and map groups with members correctly', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Saturday Morning Group',
          description: 'Weekly tee time',
          owner_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockMembers = [
        { id: 'member-1', group_id: 'group-1', profile_id: 'friend-1', guest_name: null, guest_handicap: null, order_index: 0 },
        { id: 'member-2', group_id: 'group-1', profile_id: null, guest_name: 'Guest Player', guest_handicap: 20, order_index: 1 },
      ];

      const mockProfiles = [
        { id: 'friend-1', full_name: 'John Doe', handicap: 10, avatar_url: 'avatar.jpg' },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: mockGroups, error: null, count: 1 }),
                }),
              }),
            }),
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groups).toHaveLength(1);
      expect(result.current.groups[0]).toMatchObject({
        id: 'group-1',
        name: 'Saturday Morning Group',
        description: 'Weekly tee time',
        ownerId: 'user-123',
      });

      // Check members
      expect(result.current.groups[0].members).toHaveLength(2);

      // Profile member
      expect(result.current.groups[0].members[0]).toMatchObject({
        id: 'member-1',
        profileId: 'friend-1',
        name: 'John Doe',
        handicap: 10,
      });

      // Guest member
      expect(result.current.groups[0].members[1]).toMatchObject({
        id: 'member-2',
        profileId: null,
        guestName: 'Guest Player',
        name: 'Guest Player',
        handicap: 20,
      });
    });

    it('should handle pagination when more groups exist', async () => {
      const mockGroups = Array.from({ length: 20 }, (_, i) => ({
        id: `group-${i}`,
        name: `Group ${i}`,
        description: null,
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      }));

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: mockGroups, error: null, count: 25 }),
                }),
              }),
            }),
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // With 25 total and PAGE_SIZE=20, hasMore should be true
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('createGroup', () => {
    it('should create a group and add members', async () => {
      const insertGroupMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-group-id', name: 'New Group', description: null, owner_id: 'user-123' },
            error: null,
          }),
        }),
      });

      const insertMembersMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
            insert: insertGroupMock,
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: insertMembersMock,
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createGroup('New Group', 'Description', [
          { profileId: 'friend-1' },
          { guestName: 'Guest', guestHandicap: 15 },
        ]);
      });

      expect(insertGroupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Group',
          description: 'Description',
          owner_id: 'user-123',
        })
      );

      expect(insertMembersMock).toHaveBeenCalledWith([
        expect.objectContaining({ group_id: 'new-group-id', profile_id: 'friend-1', order_index: 0 }),
        expect.objectContaining({ group_id: 'new-group-id', guest_name: 'Guest', guest_handicap: 15, order_index: 1 }),
      ]);
    });

    it('should return null if user not authenticated', async () => {
      // Override useAuth mock for this test
      const useAuthMock = await import('./useAuth');
      (useAuthMock.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newGroup = await result.current.createGroup('Test', null, []);

      expect(newGroup).toBeNull();

      // Restore mock
      (useAuthMock.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser });
    });
  });

  describe('updateGroup', () => {
    it('should update group name and description', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.updateGroup('group-1', {
        name: 'Updated Name',
        description: 'Updated Description',
      });

      expect(success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          description: 'Updated Description',
        })
      );
    });
  });

  describe('deleteGroup', () => {
    it('should call delete and return success', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
            delete: deleteMock,
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.deleteGroup('group-1');

      expect(success).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should return false on delete error', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
            delete: deleteMock,
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.deleteGroup('group-1');

      expect(success).toBe(false);
    });
  });

  describe('updateMembers', () => {
    it('should replace all members in a group', async () => {
      const deleteMembersMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const insertMembersMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            delete: deleteMembersMock,
            insert: insertMembersMock,
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.updateMembers('group-1', [
        { profileId: 'new-friend' },
        { guestName: 'New Guest', guestHandicap: 25 },
      ]);

      expect(success).toBe(true);
      expect(deleteMembersMock).toHaveBeenCalled();
      expect(insertMembersMock).toHaveBeenCalledWith([
        expect.objectContaining({ group_id: 'group-1', profile_id: 'new-friend', order_index: 0 }),
        expect.objectContaining({ group_id: 'group-1', guest_name: 'New Guest', guest_handicap: 25, order_index: 1 }),
      ]);
    });
  });

  describe('loadMoreGroups', () => {
    it('should fetch next page and append results', async () => {
      let callCount = 0;
      const firstPageGroups = Array.from({ length: 20 }, (_, i) => ({
        id: `group-${i}`,
        name: `Group ${i}`,
        description: null,
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      }));

      const secondPageGroups = Array.from({ length: 5 }, (_, i) => ({
        id: `group-${i + 20}`,
        name: `Group ${i + 20}`,
        description: null,
        owner_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      }));

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                      return Promise.resolve({ data: firstPageGroups, error: null, count: 25 });
                    }
                    return Promise.resolve({ data: secondPageGroups, error: null, count: 25 });
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'group_members') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groups).toHaveLength(20);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.loadMoreGroups();
      });

      expect(result.current.groups).toHaveLength(25);
    });

    it('should not load more if already loading', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // hasMore is false, so loadMoreGroups should do nothing
      const initialGroupsLength = result.current.groups.length;

      await act(async () => {
        await result.current.loadMoreGroups();
      });

      expect(result.current.groups.length).toBe(initialGroupsLength);
    });
  });

  describe('error handling', () => {
    it('should set error state on fetch failure', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockRejectedValue(new Error('Database error')),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load groups');
    });
  });

  describe('refetch', () => {
    it('should reset page and refetch data', async () => {
      let fetchCount = 0;

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'golf_groups') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockImplementation(() => {
                    fetchCount++;
                    return Promise.resolve({ data: [], error: null, count: 0 });
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useGroups());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialFetchCount = fetchCount;

      await act(async () => {
        await result.current.refetch();
      });

      expect(fetchCount).toBeGreaterThan(initialFetchCount);
    });
  });
});
