import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Loader2, Check } from 'lucide-react';
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
      <SheetContent side="bottom" className="h-[90vh] bg-background rounded-t-[28px] p-0 overflow-hidden [&>button]:hidden">
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Sheet handle + close */}
          <div className="relative flex items-center justify-center h-12 flex-shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-border-strong" />
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="absolute right-3 top-1.5 w-11 h-11 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-[18px] h-[18px] text-foreground" />
            </button>
          </div>

          {/* Header: Forest hero card */}
          <div className="px-5">
            <div className="bg-primary rounded-[28px] px-5 pt-4 pb-5 text-white">
              <span className="inline-flex items-center gap-1.5 bg-gold text-gold-foreground rounded-full pl-2 pr-3 h-7 text-[12px] font-bold">
                <Crown className="w-3.5 h-3.5" />
                MATCH Pro
              </span>
              <h2 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em] leading-[1.1]">
                {headline.title}
              </h2>
              <p className="mt-1.5 text-[14px] text-on-forest-muted leading-snug">
                {headline.subtitle}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-5 pt-4 pb-4">
            <p className="text-[12px] font-semibold text-muted-foreground px-1 mb-2">
              What you get
            </p>
            <div className="bg-card border border-border rounded-[20px] overflow-hidden">
              {PRO_FEATURES.map((feat, index) => (
                <motion.div
                  key={feat.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={'flex items-start gap-3 px-4 py-3.5' + (index < PRO_FEATURES.length - 1 ? ' border-b border-border' : '')}
                >
                  <div className="w-10 h-10 rounded-[12px] bg-muted flex items-center justify-center flex-shrink-0">
                    <feat.icon className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-foreground leading-snug">{feat.label}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Free: {feat.free}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-background border-t border-border px-5 pt-3.5 pb-safe space-y-2.5 shadow-[0_-12px_24px_rgba(250,250,247,0.9)]">
            {/* Plan picker — price stays visible next to the purchase button */}
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Choose a plan">
              {([
                { id: 'annual' as const, label: 'Yearly', price: annualPrice, sub: `${annualMonthlyEquivalent}/mo`, badge: savingsPct > 0 ? `Save ${savingsPct}%` : null },
                { id: 'monthly' as const, label: 'Monthly', price: monthlyPrice, sub: 'per month', badge: null },
              ]).map(plan => {
                const selected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={
                      'relative rounded-[20px] bg-card px-4 py-2.5 text-left transition-colors ' +
                      (selected ? 'border-2 border-primary' : 'border border-border m-px')
                    }
                  >
                    {plan.badge && (
                      <span className="absolute -top-2.5 right-3 bg-gold text-gold-foreground text-[11px] font-bold rounded-full px-2 py-0.5">
                        {plan.badge}
                      </span>
                    )}
                    <span
                      aria-hidden
                      className={
                        'absolute bottom-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ' +
                        (selected ? 'bg-primary' : 'border-2 border-border-strong')
                      }
                    >
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                    </span>
                    <p className="text-[13px] font-semibold text-muted-foreground">{plan.label}</p>
                    <p className="text-[22px] font-extrabold tracking-[-0.02em] text-foreground leading-tight tabular-nums">{plan.price}</p>
                    <p className="text-[12px] text-muted-foreground">{plan.sub}</p>
                  </button>
                );
              })}
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePurchase}
              disabled={purchasing || loading}
              className="w-full bg-ink text-ink-foreground rounded-[20px] h-[60px] font-bold text-[17px] flex items-center justify-center disabled:opacity-60"
            >
              {purchasing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue with {selectedPlan === 'annual' ? 'Yearly' : 'Monthly'}
                </>
              )}
            </motion.button>

            <div className="flex items-center justify-center gap-2 -my-1">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="text-muted-foreground text-[14px] font-semibold h-11 px-3"
              >
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </button>
              <span className="text-border-strong text-[14px]" aria-hidden>·</span>
              <button
                onClick={handleRedeemCode}
                className="text-muted-foreground text-[14px] font-semibold h-11 px-3"
              >
                Redeem Code
              </button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground leading-snug">
              Cancel anytime. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            </p>
            <p className="text-[11px] text-center text-muted-foreground pb-2 !mt-1">
              <a href="https://matchgolf.info/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Privacy Policy</a>
              {' · '}
              <a href="https://matchgolf.info/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Terms of Use</a>
            </p>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
