import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSubscription, TIER_LIMITS, Subscription } from './useSubscription';

// Mock objects - defined before vi.mock so they're available in factory functions
const mockSupabaseClient = {
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })),
  removeChannel: vi.fn(),
};
const mockUser = { id: 'test-user-id', email: 'test@test.com' };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({}),
  WebPlugin: class WebPlugin {},
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn(), vibrate: vi.fn(), selectionStart: vi.fn(), selectionChanged: vi.fn(), selectionEnd: vi.fn() },
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

vi.mock('@/services/purchases', () => ({
  checkProStatus: vi.fn().mockResolvedValue(false),
  getCustomerInfo: vi.fn().mockResolvedValue(null),
  syncSubscriptionToSupabase: vi.fn().mockResolvedValue(false),
}));

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TIER_LIMITS configuration', () => {
    it('should define free tier limits correctly', () => {
      expect(TIER_LIMITS.free.maxPlayers).toBe(4);
      expect(TIER_LIMITS.free.maxFriends).toBe(4);
      expect(TIER_LIMITS.free.maxGroups).toBe(1);
      expect(TIER_LIMITS.free.availableGames).toEqual(['stroke', 'match', 'skins']);
      expect(TIER_LIMITS.free.skinsCarryover).toBe(false);
      expect(TIER_LIMITS.free.hasFullStats).toBe(false);
      expect(TIER_LIMITS.free.hasSettlementTracking).toBe(false);
    });

    it('should define pro tier limits correctly', () => {
      expect(TIER_LIMITS.pro.maxPlayers).toBe(8);
      expect(TIER_LIMITS.pro.maxFriends).toBe(Infinity);
      expect(TIER_LIMITS.pro.maxGroups).toBe(Infinity);
      expect(TIER_LIMITS.pro.availableGames).toContain('nassau');
      expect(TIER_LIMITS.pro.availableGames).toContain('wolf');
      expect(TIER_LIMITS.pro.availableGames).toContain('bestball');
      expect(TIER_LIMITS.pro.availableGames).toContain('stableford');
      expect(TIER_LIMITS.pro.skinsCarryover).toBe(true);
      expect(TIER_LIMITS.pro.hasFullStats).toBe(true);
      expect(TIER_LIMITS.pro.hasSettlementTracking).toBe(true);
    });

    it('should have more games in pro than free', () => {
      expect(TIER_LIMITS.pro.availableGames.length).toBeGreaterThan(
        TIER_LIMITS.free.availableGames.length
      );
    });

    it('should have free games as subset of pro games', () => {
      TIER_LIMITS.free.availableGames.forEach((game) => {
        expect(TIER_LIMITS.pro.availableGames).toContain(game);
      });
    });
  });

  describe('free tier behavior', () => {
    beforeEach(() => {
      // Mock no subscription (free user)
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
    });

    it('should return isPro as false when no subscription', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(false);
      expect(result.current.subscription).toBeNull();
    });

    it('should return free tier limits when no subscription', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.limits).toEqual(TIER_LIMITS.free);
    });

    it('should allow adding players up to free tier limit', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddPlayer(0)).toBe(true);
      expect(result.current.canAddPlayer(3)).toBe(true);
      expect(result.current.canAddPlayer(4)).toBe(false);
      expect(result.current.canAddPlayer(5)).toBe(false);
    });

    it('should allow adding friends up to free tier limit', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddFriend(0)).toBe(true);
      expect(result.current.canAddFriend(3)).toBe(true);
      expect(result.current.canAddFriend(4)).toBe(false);
    });

    it('should allow only 1 group in free tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddGroup(0)).toBe(true);
      expect(result.current.canAddGroup(1)).toBe(false);
    });

    it('should only allow basic games in free tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Free games
      expect(result.current.canUseGame('stroke')).toBe(true);
      expect(result.current.canUseGame('match')).toBe(true);
      expect(result.current.canUseGame('skins')).toBe(true);

      // Pro games
      expect(result.current.canUseGame('nassau')).toBe(false);
      expect(result.current.canUseGame('wolf')).toBe(false);
      expect(result.current.canUseGame('bestball')).toBe(false);
      expect(result.current.canUseGame('stableford')).toBe(false);
    });

    it('should not allow skins carryover in free tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canUseSkinsCarryover()).toBe(false);
    });

    it('should only allow basic prop bets in free tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canUsePropBet('ctp')).toBe(true);
      expect(result.current.canUsePropBet('longest_drive')).toBe(true);
      expect(result.current.canUsePropBet('greenie')).toBe(false);
      expect(result.current.canUsePropBet('custom')).toBe(false);
    });
  });

  describe('pro tier behavior', () => {
    const activeProSubscription: Subscription = {
      id: 'sub-123',
      user_id: 'test-user-id',
      status: 'active',
      tier: 'pro',
      product_id: 'pro_monthly',
      original_transaction_id: 'txn-123',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      grace_period_expires_at: null,
      cancellation_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: activeProSubscription, error: null }),
          }),
        }),
      });
    });

    it('should return isPro as true for active pro subscription', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(true);
      expect(result.current.subscription).not.toBeNull();
    });

    it('should return pro tier limits', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.limits).toEqual(TIER_LIMITS.pro);
    });

    it('should allow adding up to 8 players in pro tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddPlayer(7)).toBe(true);
      expect(result.current.canAddPlayer(8)).toBe(false);
    });

    it('should allow unlimited friends in pro tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddFriend(100)).toBe(true);
      expect(result.current.canAddFriend(1000)).toBe(true);
    });

    it('should allow unlimited groups in pro tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddGroup(10)).toBe(true);
      expect(result.current.canAddGroup(100)).toBe(true);
    });

    it('should allow all games in pro tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canUseGame('stroke')).toBe(true);
      expect(result.current.canUseGame('match')).toBe(true);
      expect(result.current.canUseGame('skins')).toBe(true);
      expect(result.current.canUseGame('nassau')).toBe(true);
      expect(result.current.canUseGame('wolf')).toBe(true);
      expect(result.current.canUseGame('bestball')).toBe(true);
      expect(result.current.canUseGame('stableford')).toBe(true);
    });

    it('should allow skins carryover in pro tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canUseSkinsCarryover()).toBe(true);
    });

    it('should allow all prop bets in pro tier', async () => {
      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canUsePropBet('ctp')).toBe(true);
      expect(result.current.canUsePropBet('longest_drive')).toBe(true);
      expect(result.current.canUsePropBet('greenie')).toBe(true);
      expect(result.current.canUsePropBet('sandie')).toBe(true);
      expect(result.current.canUsePropBet('custom')).toBe(true);
    });
  });

  describe('subscription status edge cases', () => {
    it('should treat expired subscription as free tier', async () => {
      const expiredSubscription: Subscription = {
        id: 'sub-123',
        user_id: 'test-user-id',
        status: 'expired',
        tier: 'pro',
        product_id: 'pro_monthly',
        original_transaction_id: 'txn-123',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        grace_period_expires_at: null,
        cancellation_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: expiredSubscription, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(false);
      expect(result.current.limits).toEqual(TIER_LIMITS.free);
    });

    it('should treat grace period subscription as pro tier', async () => {
      const gracePeriodSubscription: Subscription = {
        id: 'sub-123',
        user_id: 'test-user-id',
        status: 'grace_period',
        tier: 'pro',
        product_id: 'pro_monthly',
        original_transaction_id: 'txn-123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        grace_period_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        cancellation_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: gracePeriodSubscription, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(true);
    });

    it('should treat cancelled subscription as free tier', async () => {
      const cancelledSubscription: Subscription = {
        id: 'sub-123',
        user_id: 'test-user-id',
        status: 'cancelled',
        tier: 'pro',
        product_id: 'pro_monthly',
        original_transaction_id: 'txn-123',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        grace_period_expires_at: null,
        cancellation_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: cancelledSubscription, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(false);
    });

    it('should treat past expiration as free tier even if status is active', async () => {
      const expiredActiveSubscription: Subscription = {
        id: 'sub-123',
        user_id: 'test-user-id',
        status: 'active',
        tier: 'pro',
        product_id: 'pro_monthly',
        original_transaction_id: 'txn-123',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        grace_period_expires_at: null,
        cancellation_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: expiredActiveSubscription, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(false);
    });

    it('should treat subscription with free tier as not pro', async () => {
      const freeSubscription: Subscription = {
        id: 'sub-123',
        user_id: 'test-user-id',
        status: 'active',
        tier: 'free',
        product_id: null,
        original_transaction_id: null,
        expires_at: null,
        grace_period_expires_at: null,
        cancellation_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: freeSubscription, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should default to free tier on database error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
          }),
        }),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPro).toBe(false);
      expect(result.current.limits).toEqual(TIER_LIMITS.free);
    });
  });

  describe('refreshSubscription', () => {
    it('should be callable and refetch subscription data', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks and call refresh
      vi.clearAllMocks();

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await act(async () => {
        await result.current.refreshSubscription();
      });

      // Verify subscription was fetched again
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions');
    });
  });
});
