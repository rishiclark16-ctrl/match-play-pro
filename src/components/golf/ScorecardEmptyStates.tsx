import { motion } from 'framer-motion';

const MATCH_M_PATH = 'M16 58 L16 22 L40 46 L64 22 L64 58';

/**
 * Full-screen "Loading round..." state with the animated MATCH logo.
 * Rendered when the supabase round subscription is still in its initial fetch.
 */
export function ScorecardLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex flex-col items-center gap-5"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="MATCH logo"
        >
          <motion.path
            d={MATCH_M_PATH}
            stroke="#F0EE3A"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </svg>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/50 text-sm font-medium tracking-wider uppercase"
        >
          Loading round...
        </motion.p>
      </motion.div>
    </div>
  );
}

interface ScorecardNotFoundProps {
  onGoHome: () => void;
}

/**
 * "Round not found" error card with a Go Home button. Rendered when the
 * subscription has settled (loading=false) but no round was returned.
 */
export function ScorecardNotFound({ onGoHome }: ScorecardNotFoundProps) {
  return (
    <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-border/30 p-8 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d={MATCH_M_PATH}
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="text-muted-foreground"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold mb-1">Round not found</h2>
        <p className="text-muted-foreground text-sm mb-6">
          This round may have been deleted or the link is invalid.
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={onGoHome}
          className="w-full bg-foreground text-background font-bold py-3 rounded-xl touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          Go Home
        </motion.button>
      </motion.div>
    </div>
  );
}
