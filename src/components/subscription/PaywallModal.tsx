import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Loader2 } from 'lucide-react';
import { PRO_FEATURES, paywallHeadline, annualSavingsPercent } from './paywallCopy';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useSubscription } from '@/hooks/useSubscription';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  presentCodeRedemptionSheet,
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
  const savingsPct = annualSavingsPercent(offerings?.monthly?.price ?? 3.99, offerings?.annual?.price ?? 24.99);
  const headline = paywallHeadline(feature);

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

  const handleRedeemCode = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Code redemption is only available in the app');
      return;
    }
    const opened = await presentCodeRedemptionSheet();
    if (!opened) {
      toast.error('Could not open redemption sheet');
      return;
    }
    // After Apple's sheet closes, refresh entitlement; may take a moment for StoreKit to post.
    setTimeout(async () => {
      await refreshSubscription();
    }, 1500);
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
          <div className="relative px-6 pb-2 flex flex-col items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="absolute right-5 top-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Crown icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#F0EE3A] flex items-center justify-center mx-auto">
              <Crown className="text-[#0A0A0A] w-6 h-6" />
            </div>
            {/* MATCH Pro label */}
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4B800]">
              MATCH Pro
            </p>
            <h2 className="text-[24px] font-black tracking-[-0.04em] text-foreground text-center">
              {headline.title}
            </h2>
            <p className="text-[14px] text-muted-foreground text-center">
              {headline.subtitle}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-4 space-y-6">
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
                    <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                      <feat.icon className="w-4 h-4 text-[#F0EE3A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground leading-snug">{feat.label}</p>
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
          <div className="sticky bottom-0 bg-[#F8F8F6] border-t border-border/40 px-6 pt-4 pb-safe space-y-3">
            {/* Plan picker — price stays visible next to the purchase button */}
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Choose a plan">
              {([
                { id: 'annual' as const, label: 'Yearly', price: annualPrice, sub: `${annualMonthlyEquivalent}/mo`, badge: savingsPct > 0 ? `Save ${savingsPct}%` : null },
                { id: 'monthly' as const, label: 'Monthly', price: monthlyPrice, sub: 'per month', badge: null },
              ]).map(plan => (
                <button
                  key={plan.id}
                  role="radio"
                  aria-checked={selectedPlan === plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={
                    'relative rounded-2xl border-2 px-3 py-3 text-left transition-colors ' +
                    (selectedPlan === plan.id ? 'border-foreground bg-white' : 'border-transparent bg-muted')
                  }
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-2 bg-[#F0EE3A] text-[#0A0A0A] text-[10px] font-black rounded-full px-2 py-0.5">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{plan.label}</p>
                  <p className="text-[20px] font-black tracking-[-0.03em] text-foreground leading-tight">{plan.price}</p>
                  <p className="text-[11px] text-muted-foreground">{plan.sub}</p>
                </button>
              ))}
            </div>

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
                  Continue with {selectedPlan === 'annual' ? 'Yearly' : 'Monthly'}
                </>
              )}
            </motion.button>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="text-muted-foreground text-[13px] font-medium py-2"
              >
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </button>
              <span className="text-muted-foreground/40 text-[13px]">·</span>
              <button
                onClick={handleRedeemCode}
                className="text-muted-foreground text-[13px] font-medium py-2"
              >
                Redeem Code
              </button>
            </div>

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
