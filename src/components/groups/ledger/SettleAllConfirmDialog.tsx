import { motion, AnimatePresence } from 'framer-motion';
import { ledgerSpringTransition } from './ledgerHelpers';

interface SettleAllConfirmDialogProps {
  open: boolean;
  settling: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SettleAllConfirmDialog({ open, settling, onCancel, onConfirm }: SettleAllConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0F1F17]/40 z-40"
            onClick={() => !settling && onCancel()}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={ledgerSpringTransition}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[28px] z-50 px-5 pt-3 pb-[120px]"
          >
            <div className="w-10 h-1 rounded-full bg-border-strong mx-auto mb-5" />
            <p className="text-[22px] font-extrabold tracking-[-0.02em] text-foreground mb-1">Settle all debts?</p>
            <p className="text-[14px] leading-relaxed text-muted-foreground mb-5">
              This will zero out all balances in this group. Each player's running tab will reset.
            </p>
            <div className="flex gap-3">
              <button
                disabled={settling}
                onClick={onCancel}
                className="flex-1 h-[56px] rounded-[20px] bg-muted text-[15px] font-bold text-foreground"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={settling}
                onClick={onConfirm}
                className="flex-1 h-[56px] rounded-[20px] bg-foreground text-[15px] font-bold text-background disabled:opacity-50"
              >
                {settling ? 'Settling...' : 'Settle all'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
