import { useState } from 'react';
import { Loader2, Gift, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { hapticSuccess, hapticError, hapticLight } from '@/lib/haptics';
import { toast } from 'sonner';

interface PromoCodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
      const { data, error } = await supabase.functions.invoke('redeem-promo', {
        body: { code: trimmed },
      });

      if (error) {
        hapticError();
        toast.error(error.message || 'Failed to redeem code');
        return;
      }

      if (data?.error) {
        hapticError();
        toast.error(data.error);
        return;
      }

      hapticSuccess();
      setRedeemed(true);
      onSuccess();

      // Auto-close after showing success
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] rounded-t-[28px] safe-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pb-8 pt-2">
              {redeemed ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center py-8"
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
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-[#F0EE3A]/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-[#F0EE3A]" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-white tracking-[-0.03em]">
                        Redeem Promo Code
                      </p>
                      <p className="text-[12px] text-white/40">
                        Enter your code to unlock Pro
                      </p>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="flex gap-3">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      maxLength={50}
                      autoFocus
                      autoCapitalize="characters"
                      className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/30 font-mono text-[16px] tracking-wider h-12 rounded-xl"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRedeem(); }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleRedeem}
                      disabled={!code.trim() || isRedeeming}
                      className="bg-[#F0EE3A] text-[#0A0A0A] font-black rounded-xl px-5 h-12 text-[14px] disabled:opacity-40 flex items-center gap-2"
                    >
                      {isRedeeming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Redeem'
                      )}
                    </motion.button>
                  </div>

                  {/* Cancel */}
                  <button
                    onClick={handleClose}
                    className="w-full text-center text-[13px] font-bold text-white/30 mt-5 py-2"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
