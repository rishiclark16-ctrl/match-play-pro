import { useState, ReactNode } from 'react';
import { Lock, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription, GameType } from '@/hooks/useSubscription';
import { PropBetType } from '@/types/betting';
import { PaywallModal } from './PaywallModal';
import { ProBadge } from './ProBadge';
import { cn } from '@/lib/utils';

type FeatureType =
  | { type: 'game'; game: GameType }
  | { type: 'propBet'; propBet: PropBetType }
  | { type: 'skinsCarryover' }
  | { type: 'players'; currentCount: number }
  | { type: 'friends'; currentCount: number }
  | { type: 'groups'; currentCount: number }
  | { type: 'fullStats' }
  | { type: 'settlementTracking' }
  | { type: 'roundExport' };

interface FeatureGateProps {
  feature: FeatureType;
  featureLabel?: string; // Human-readable label for paywall
  children: ReactNode;
  fallback?: ReactNode;
  showBadge?: boolean;
  showLockOverlay?: boolean;
  className?: string;
}

/**
 * FeatureGate - Wrapper component for gating Pro features
 *
 * Usage:
 * <FeatureGate feature={{ type: 'game', game: 'nassau' }} featureLabel="Nassau">
 *   <NassauCard />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  featureLabel,
  children,
  fallback,
  showBadge = true,
  showLockOverlay = true,
  className,
}: FeatureGateProps) {
  const subscription = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // Check if user has access to this feature
  const hasAccess = (() => {
    switch (feature.type) {
      case 'game':
        return subscription.canUseGame(feature.game);
      case 'propBet':
        return subscription.canUsePropBet(feature.propBet);
      case 'skinsCarryover':
        return subscription.canUseSkinsCarryover();
      case 'players':
        return subscription.canAddPlayer(feature.currentCount);
      case 'friends':
        return subscription.canAddFriend(feature.currentCount);
      case 'groups':
        return subscription.canAddGroup(feature.currentCount);
      case 'fullStats':
        return subscription.limits.hasFullStats;
      case 'settlementTracking':
        return subscription.limits.hasSettlementTracking;
      case 'roundExport':
        return subscription.limits.hasRoundExport;
      default:
        return true;
    }
  })();

  // If user has access, render children directly
  if (hasAccess) {
    return <>{children}</>;
  }

  // If fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: render with lock overlay
  return (
    <>
      <div className={cn('relative', className)}>
        {/* Original content with reduced opacity */}
        <div className="opacity-50 pointer-events-none select-none">{children}</div>

        {/* Lock overlay */}
        {showLockOverlay && (
          <button
            onClick={() => setShowPaywall(true)}
            className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-xl cursor-pointer hover:bg-background/70 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            {showBadge && <ProBadge variant="subtle" />}
          </button>
        )}
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature={featureLabel}
      />
    </>
  );
}

/**
 * UpgradePrompt - Inline paywall teaser card for gated features
 */
interface UpgradePromptProps {
  featureName: string;
  description?: string;
  onUpgrade: () => void;
}

export function UpgradePrompt({ featureName, description, onUpgrade }: UpgradePromptProps) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#F0EE3A] flex items-center justify-center text-[#0A0A0A] flex-shrink-0">
        <Crown className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-[16px] tracking-[-0.02em] text-foreground">{featureName}</p>
        {description && (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onUpgrade}
        className="bg-foreground text-background rounded-xl px-4 py-2 text-[13px] font-bold flex-shrink-0"
      >
        Upgrade
      </motion.button>
    </div>
  );
}

/**
 * useFeatureGate - Hook version for programmatic gating
 */
export function useFeatureGate() {
  const subscription = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>();

  const checkAccess = (feature: FeatureType): boolean => {
    switch (feature.type) {
      case 'game':
        return subscription.canUseGame(feature.game);
      case 'propBet':
        return subscription.canUsePropBet(feature.propBet);
      case 'skinsCarryover':
        return subscription.canUseSkinsCarryover();
      case 'players':
        return subscription.canAddPlayer(feature.currentCount);
      case 'friends':
        return subscription.canAddFriend(feature.currentCount);
      case 'groups':
        return subscription.canAddGroup(feature.currentCount);
      case 'fullStats':
        return subscription.limits.hasFullStats;
      case 'settlementTracking':
        return subscription.limits.hasSettlementTracking;
      case 'roundExport':
        return subscription.limits.hasRoundExport;
      default:
        return true;
    }
  };

  const requireAccess = (feature: FeatureType, featureLabel?: string): boolean => {
    if (checkAccess(feature)) {
      return true;
    }
    setPaywallFeature(featureLabel);
    setShowPaywall(true);
    return false;
  };

  const PaywallComponent = (
    <PaywallModal
      open={showPaywall}
      onOpenChange={setShowPaywall}
      feature={paywallFeature}
    />
  );

  return {
    checkAccess,
    requireAccess,
    showPaywall: () => setShowPaywall(true),
    PaywallComponent,
    isPro: subscription.isPro,
    limits: subscription.limits,
  };
}
