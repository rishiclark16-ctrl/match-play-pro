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
        className="bg-primary/10 border-b border-primary/20 px-4 py-2"
      >
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
          <Eye className="w-4 h-4" />
          <span>Watching this round live</span>
        </div>
      </motion.div>
    );
  }

  // If user is a player but not a scorekeeper
  if (!isScorekeeper) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-muted border-b border-border px-4 py-2"
      >
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>View only – scorekeeper enters scores</span>
        </div>
      </motion.div>
    );
  }

  return null;
}
