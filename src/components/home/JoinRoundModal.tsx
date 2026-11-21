import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Eye } from 'lucide-react';
import { popIn } from '@/lib/animations';

interface JoinRoundModalProps {
  open: boolean;
  code: string;
  onCodeChange: (code: string) => void;
  error: string | null | undefined;
  loading: boolean;
  onClose: () => void;
  onJoin: () => void;
}

/** "Watch a round" code entry dialog on Home. */
export function JoinRoundModal({ open, code, onCodeChange, error, loading, onClose, onJoin }: JoinRoundModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F1F17]/40 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />
          <motion.div
            variants={popIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-round-title"
          >
            <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_24px_60px_-20px_rgba(15,31,23,0.35)]">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="h-11 w-11 rounded-[14px] bg-muted text-primary flex items-center justify-center">
                    <Eye className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-muted-foreground">Watch live</p>
                    <h3 id="join-round-title" className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
                      Enter round code
                    </h3>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1 -mt-1 h-11 w-11 rounded-[14px] bg-muted flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-foreground" />
                </motion.button>
              </div>

              <input
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                aria-label="Round code"
                className="w-full h-[68px] rounded-[20px] border border-border bg-muted/60 text-center font-mono text-[28px] font-extrabold uppercase tracking-[0.4em] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary focus:bg-card"
              />
              <p className="mt-2 px-1 text-[13px] text-muted-foreground">
                Ask the scorekeeper for the 6-character code on their card.
              </p>

              {error && <p className="mt-3 px-1 text-[14px] font-medium text-[#B42318]">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onJoin}
                disabled={code.length !== 6 || loading}
                className="mt-5 w-full h-[60px] rounded-[20px] bg-foreground text-background text-[16px] font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                Join round
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
