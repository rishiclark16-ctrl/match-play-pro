import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PropBetType } from '@/types/betting';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { logger } from '@/lib/logger';
import {
  checkProStatus,
  getCustomerInfo,
  syncSubscriptionToSupabase,
} from '@/services/purchases';

// Subscription status types
export type SubscriptionStatus = 'free' | 'active' | 'expired' | 'cancelled' | 'grace_period';
export type SubscriptionTier = 'free' | 'pro';

// Game types for gating
export type GameType = 'stroke' | 'match' | 'skins' | 'nassau' | 'wolf' | 'bestball' | 'stableford';

// Subscription record from database
export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  product_id: string | null;
  original_transaction_id: string | null;
  expires_at: string | null;
  grace_period_expires_at: string | null;
  cancellation_date: string | null;
  created_at: string;
  updated_at: string;
}

// Tier limits configuration
export const TIER_LIMITS = {
  free: {
    maxPlayers: 4,
    maxFriends: 4,
    maxGroups: 1,
    availableGames: ['stroke', 'match', 'skins'] as GameType[],
    skinsCarryover: false,
    availablePropBets: ['ctp', 'longest_drive'] as PropBetType[],
    hasFullStats: false,
    hasSettlementTracking: false,
    hasRoundExport: false,
  },
  pro: {
    maxPlayers: 8,
    maxFriends: Infinity,
    maxGroups: Infinity,
    availableGames: ['stroke', 'match', 'skins', 'nassau', 'wolf', 'bestball', 'stableford'] as GameType[],
    skinsCarryover: true,
    availablePropBets: ['ctp', 'longest_drive', 'greenie', 'sandie', 'barkie', 'polie', 'arnie', 'ferret', 'snake', 'custom'] as PropBetType[],
    hasFullStats: true,
    hasSettlementTracking: true,
    hasRoundExport: true,
  },
} as const;

export type TierLimits = typeof TIER_LIMITS.free | typeof TIER_LIMITS.pro;

export interface UseSubscriptionReturn {
  // Core state
  isPro: boolean;
  isLoading: boolean;
  subscription: Subscription | null;

  // Computed limits
  limits: TierLimits;

  // Feature check helpers
  canAddPlayer: (currentCount: number) => boolean;
  canAddFriend: (currentCount: number) => boolean;
  canAddGroup: (currentCount: number) => boolean;
  canUseGame: (gameType: GameType) => boolean;
  canUsePropBet: (propBetType: PropBetType) => boolean;
  canUseSkinsCarryover: () => boolean;

  // Actions
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nativeIsPro, setNativeIsPro] = useState(false);
  const nativeCheckDone = useRef(false);

  // Fetch subscription from database
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching subscription', error);
        setSubscription(null);
      } else {
        setSubscription(data as Subscription | null);
      }
    } catch (err) {
      logger.error('Error fetching subscription', err);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Check RevenueCat native status as fallback (iOS only)
  const checkNativeStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user) return;

    try {
      const rcIsPro = await checkProStatus();
      logger.debug('RevenueCat pro status', { data: { rcIsPro } });
      setNativeIsPro(rcIsPro);

      // If RevenueCat says pro, try to sync to database
      if (rcIsPro) {
        const info = await getCustomerInfo();
        if (info) {
          logger.debug('Syncing RevenueCat status to database', { data: { info } });
          const synced = await syncSubscriptionToSupabase(info);
          if (synced) {
            // Re-fetch from DB to pick up the synced data
            await fetchSubscription();
          }
        }
      }
    } catch (err) {
      logger.error('Native status check failed', err);
    }
  }, [user, fetchSubscription]);

  // Fetch on mount and user change
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // After initial DB load, check RevenueCat as fallback on native
  useEffect(() => {
    if (isLoading || !user) return;
    if (nativeCheckDone.current) return;
    nativeCheckDone.current = true;

    checkNativeStatus();
  }, [isLoading, user, checkNativeStatus]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSubscription]);

  // Refresh subscription when app resumes from background (native only)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    let listener: { remove: () => void } | null = null;

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        logger.debug('App resumed — refreshing subscription status');
        fetchSubscription();
        checkNativeStatus();
      }
    }).then(l => { listener = l; });

    return () => {
      listener?.remove();
    };
  }, [user, fetchSubscription, checkNativeStatus]);

  // Determine if user has Pro access from database
  const dbIsPro = useMemo(() => {
    if (!subscription) return false;

    if (subscription.tier !== 'pro') return false;
    if (!['active', 'grace_period'].includes(subscription.status)) return false;

    if (subscription.expires_at) {
      const expiresAt = new Date(subscription.expires_at);
      if (expiresAt < new Date()) return false;
    }

    return true;
  }, [subscription]);

  // Combine database + native RevenueCat check
  const isPro = dbIsPro || nativeIsPro;

  // Get current tier limits
  const limits = useMemo(() => {
    return isPro ? TIER_LIMITS.pro : TIER_LIMITS.free;
  }, [isPro]);

  // Feature check helpers
  const canAddPlayer = useCallback(
    (currentCount: number) => currentCount < limits.maxPlayers,
    [limits.maxPlayers]
  );

  const canAddFriend = useCallback(
    (currentCount: number) => currentCount < limits.maxFriends,
    [limits.maxFriends]
  );

  const canAddGroup = useCallback(
    (currentCount: number) => currentCount < limits.maxGroups,
    [limits.maxGroups]
  );

  const canUseGame = useCallback(
    (gameType: GameType) => limits.availableGames.includes(gameType),
    [limits.availableGames]
  );

  const canUsePropBet = useCallback(
    (propBetType: PropBetType) => limits.availablePropBets.includes(propBetType),
    [limits.availablePropBets]
  );

  const canUseSkinsCarryover = useCallback(
    () => limits.skinsCarryover,
    [limits.skinsCarryover]
  );

  // Refresh checks both database and native RevenueCat
  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
    await checkNativeStatus();
  }, [fetchSubscription, checkNativeStatus]);

  return {
    isPro,
    isLoading,
    subscription,
    limits,
    canAddPlayer,
    canAddFriend,
    canAddGroup,
    canUseGame,
    canUsePropBet,
    canUseSkinsCarryover,
    refreshSubscription,
  };
}
