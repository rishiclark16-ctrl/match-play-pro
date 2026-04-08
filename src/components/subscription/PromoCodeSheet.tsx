import { useState } from 'react';
import { Loader2, Gift, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { hapticSuccess, hapticError, hapticLight } from '@/lib/haptics';
import { toast } from 'sonner';

interface PromoCodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
}

export function PromoCodeSheet({ open, onOpenChange, onSuccess }: PromoCodeSheetProps) {
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsRedeeming(true);
    hapticLight();

    try {
      // Refresh session first — stale tokens cause silent 401 failures
      await supabase.auth.refreshSession();

      const { data, error } = await supabase.functions.invoke('redeem-promo', {
        body: { code: trimmed },
      });

      // supabase.functions.invoke wraps non-2xx as FunctionsHttpError with a
      // generic message. Try to extract the actual error from the response body.
      if (error) {
        let msg = 'Failed to redeem code. Please try again.';
        try {
          // FunctionsHttpError stores the Response in .context
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {
          // Fall through to generic message
        }
        hapticError();
        toast.error(msg);
        return;
      }

      // Business logic errors returned as 200 with { success: false, error }
      if (data && !data.success) {
        hapticError();
        toast.error(data.error || 'Failed to redeem code');
        return;
      }

      hapticSuccess();
      setRedeemed(true);

      // Refresh subscription state so the app immediately reflects Pro
      await onSuccess();

      setTimeout(() => {
        onOpenChange(false);
        setRedeemed(false);
        setCode('');
      }, 2000);
    } catch {
      hapticError();
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCode('');
    setRedeemed(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Centered modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-6 pointer-events-none"
          >
            <div className="bg-[#0A0A0A] rounded-3xl w-full max-w-sm pointer-events-auto shadow-2xl">
              <div className="px-6 pt-5 pb-6">
                {redeemed ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center py-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-[22px] font-black text-white tracking-[-0.03em]">
                      Pro Activated!
                    </p>
                    <p className="text-[13px] text-white/40 mt-1">
                      Enjoy lifetime access to all features
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Close button */}
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white/50" />
                      </button>
                    </div>

                    {/* Icon + header */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#F0EE3A]/15 flex items-center justify-center mb-3">
                        <Gift className="w-6 h-6 text-[#F0EE3A]" />
                      </div>
                      <p className="text-[20px] font-black text-white tracking-[-0.03em]">
                        Redeem Promo Code
                      </p>
                      <p className="text-[13px] text-white/40 mt-1">
                        Enter your code to unlock Pro for free
                      </p>
                    </div>

                    {/* Input */}
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      maxLength={50}
                      autoFocus
                      autoCapitalize="characters"
                      className="w-full bg-white/10 border-white/10 text-white placeholder:text-white/30 font-mono text-[16px] tracking-wider h-12 rounded-xl text-center mb-4"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRedeem(); }}
                    />

                    {/* Redeem button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleRedeem}
                      disabled={!code.trim() || isRedeeming}
                      className="w-full bg-[#F0EE3A] text-[#0A0A0A] font-black rounded-xl h-12 text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {isRedeeming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Redeem Code'
                      )}
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
