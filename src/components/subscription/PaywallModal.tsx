import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crown, Users, Zap, Trophy, BarChart3, Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SubscriptionCard } from './SubscriptionCard';
import { useSubscription } from '@/hooks/useSubscription';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  PurchaseOffering,
} from '@/services/purchases';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string; // Optional context for what feature triggered the paywall
}

type PlanType = 'monthly' | 'annual';

// Feature comparison data
const PRO_FEATURES = [
  { icon: Users, label: 'Up to 8 players per round', free: '4 max' },
  { icon: Users, label: 'Unlimited friends', free: '4 max' },
  { icon: Zap, label: 'Nassau, Wolf, Best Ball, Stableford', free: 'Stroke & Match only' },
  { icon: Trophy, label: 'All prop bets & side games', free: 'CTP & Longest Drive' },
  { icon: BarChart3, label: 'Full stats & settlement tracking', free: 'Basic stats' },
];

export function PaywallModal({ open, onOpenChange, feature }: PaywallModalProps) {
  const { refreshSubscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [offerings, setOfferings] = useState<PurchaseOffering | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Fetch offerings on open
  useEffect(() => {
    if (open && Capacitor.isNativePlatform()) {
      setLoading(true);
      getOfferings()
        .then(setOfferings)
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Get prices from offerings or use defaults
  const monthlyPrice = offerings?.monthly?.localizedPrice || '$3.99';
  const annualPrice = offerings?.annual?.localizedPrice || '$24.99';
  const annualMonthlyEquivalent = offerings?.annual
    ? `$${(offerings.annual.price / 12).toFixed(2)}`
    : '$2.08';

  const handlePurchase = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Purchases are only available in the app');
      return;
    }

    const packageId = selectedPlan === 'annual' ? '$rc_annual' : '$rc_monthly';
    setPurchasing(true);

    try {
      const result = await purchasePackage(packageId);

      if (result.success) {
        await refreshSubscription();
        toast.success('Welcome to MATCH Golf Pro!');
        onOpenChange(false);
      } else if (result.cancelled) {
        // User cancelled, no action needed
      } else {
        toast.error(result.error || 'Purchase failed');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Restore is only available in the app');
      return;
    }

    setRestoring(true);

    try {
      const result = await restorePurchases();

      if (result.success && result.customerInfo?.isPro) {
        await refreshSubscription();
        toast.success('Subscription restored!');
        onOpenChange(false);
      } else if (result.success) {
        toast.info('No active subscription found');
      } else {
        toast.error(result.error || 'Restore failed');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 overflow-hidden">
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Upgrade to Pro</h2>
                  <p className="text-xs text-muted-foreground">Unlock the full experience</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-6 space-y-6">
            {/* Feature context */}
            {feature && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-primary/5 border border-primary/20"
              >
                <p className="text-sm text-center">
                  <span className="font-semibold text-primary">{feature}</span> is a Pro feature
                </p>
              </motion.div>
            )}

            {/* Pricing Cards */}
            <div className="grid grid-cols-2 gap-3">
              <SubscriptionCard
                title="Monthly"
                price={monthlyPrice}
                period="month"
                selected={selectedPlan === 'monthly'}
                onSelect={() => setSelectedPlan('monthly')}
                disabled={loading}
              />
              <SubscriptionCard
                title="Annual"
                price={annualPrice}
                period="year"
                badge="Save 48%"
                highlighted
                selected={selectedPlan === 'annual'}
                onSelect={() => setSelectedPlan('annual')}
                disabled={loading}
              />
            </div>

            {/* Monthly equivalent for annual */}
            <AnimatePresence mode="wait">
              {selectedPlan === 'annual' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center text-sm text-muted-foreground"
                >
                  That's only <span className="font-semibold text-foreground">{annualMonthlyEquivalent}/month</span>
                </motion.p>
              )}
            </AnimatePresence>

            {/* Feature Comparison */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                What you get
              </p>
              <div className="space-y-2">
                {PRO_FEATURES.map((feature, index) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{feature.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Free: {feature.free}
                      </p>
                    </div>
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 pb-safe space-y-3">
            <Button
              onClick={handlePurchase}
              disabled={purchasing || loading}
              className="w-full py-6 text-lg font-semibold bg-primary"
            >
              {purchasing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue with {selectedPlan === 'annual' ? 'Annual' : 'Monthly'}
                </>
              )}
            </Button>

            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </button>

            <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
              Cancel anytime. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
