import { Eye, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface SpectatorBannerProps {
  isSpectator?: boolean;
  isScorekeeper?: boolean;
}

export function SpectatorBanner({ isSpectator = true, isScorekeeper = false }: SpectatorBannerProps) {
  // If user is a spectator (via URL param)
  if (isSpectator) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-[#ECFCCB] border-b-2 border-[#14532D] px-4 py-2.5 flex items-center gap-2"
      >
        <Eye className="text-[#14532D] w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold text-[#14532D]">Watching this round live</span>
      </motion.div>
    );
  }

  // If user is a player but not a scorekeeper
  if (!isScorekeeper) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-muted/50 border-b border-border px-4 py-2.5 flex items-center gap-2"
      >
        <Lock className="text-muted-foreground w-4 h-4 shrink-0" />
        <span className="text-sm text-muted-foreground">View only – scorekeeper enters scores</span>
      </motion.div>
    );
  }

  return null;
}
