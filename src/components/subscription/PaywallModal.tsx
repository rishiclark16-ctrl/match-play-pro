import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crown, Users, Zap, Trophy, BarChart3, Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
      <SheetContent side="bottom" className="h-[90vh] bg-[#F8F8F6] rounded-t-3xl p-0 overflow-hidden [&>button]:hidden">
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Sheet handle */}
          <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3" />

          {/* Header */}
          <div className="px-6 pb-4 flex flex-col items-center gap-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex-1" />
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Crown icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#F0EE3A] flex items-center justify-center mx-auto">
              <Crown className="text-[#0A0A0A] w-7 h-7" />
            </div>
            {/* MATCH Pro label */}
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4B800]">
              MATCH Pro
            </p>
            <h2 className="text-[24px] font-black tracking-[-0.04em] text-foreground text-center">
              Unlock the full experience
            </h2>
            <p className="text-[14px] text-muted-foreground text-center">
              Play more games, track more stats, and bring more players to every round.
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-4 space-y-6">
            {/* Feature context */}
            {feature && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-[#F0EE3A]/20 border border-[#F0EE3A]/40"
              >
                <p className="text-sm text-center">
                  <span className="font-black text-[#0A0A0A]">{feature}</span> is a Pro feature
                </p>
              </motion.div>
            )}

            {/* Plan toggle */}
            <div className="bg-muted rounded-xl p-1 flex mx-0">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={
                  selectedPlan === 'monthly'
                    ? 'bg-white rounded-lg shadow-sm flex-1 py-2 font-bold text-foreground text-center'
                    : 'flex-1 py-2 text-muted-foreground text-center'
                }
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPlan('annual')}
                className={
                  selectedPlan === 'annual'
                    ? 'bg-white rounded-lg shadow-sm flex-1 py-2 font-bold text-foreground text-center flex items-center justify-center gap-1.5'
                    : 'flex-1 py-2 text-muted-foreground text-center flex items-center justify-center gap-1.5'
                }
              >
                Annual
                <span className="bg-[#F0EE3A] text-[#0A0A0A] text-[10px] font-black rounded-full px-2 py-0.5">
                  Best value
                </span>
              </button>
            </div>

            {/* Price display */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[40px] font-black tracking-[-0.04em]">
                  {selectedPlan === 'annual' ? annualPrice : monthlyPrice}
                </span>
                <span className="text-[14px] text-muted-foreground">
                  /{selectedPlan === 'annual' ? 'year' : 'month'}
                </span>
              </div>
              <AnimatePresence mode="wait">
                {selectedPlan === 'annual' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="bg-[#F0FFF4] text-[#22C55E] text-[11px] font-bold rounded-full px-2.5 py-0.5">
                      Save 48% · {annualMonthlyEquivalent}/mo
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Feature list */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                What you get
              </p>
              <div className="space-y-0">
                {PRO_FEATURES.map((feat, index) => (
                  <motion.div
                    key={feat.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#F0FFF4] border border-[#BBF7D0] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#22C55E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-foreground">{feat.label}</p>
                      <p className="text-[12px] text-muted-foreground">
                        Free: {feat.free}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#F8F8F6] px-6 py-4 pb-safe space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePurchase}
              disabled={purchasing || loading}
              className="w-full bg-[#F0EE3A] text-[#0A0A0A] rounded-2xl h-[52px] font-black text-[16px] flex items-center justify-center disabled:opacity-60"
            >
              {purchasing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue with {selectedPlan === 'annual' ? 'Annual' : 'Monthly'}
                </>
              )}
            </motion.button>

            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full text-muted-foreground text-[13px] font-medium text-center py-2"
            >
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </button>

            <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
              Cancel anytime. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            </p>
            <p className="text-[10px] text-center text-muted-foreground">
              <a href="https://matchgolf.info/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>
              {' · '}
              <a href="https://matchgolf.info/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Use</a>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
