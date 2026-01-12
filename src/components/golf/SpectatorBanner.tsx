import { Eye } from 'lucide-react';
import { motion } from 'framer-motion';

export function SpectatorBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-primary/10 border-b border-primary/20 px-4 py-2"
    >
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
        <Eye className="w-4 h-4" />
        <span>Following this round live</span>
      </div>
    </motion.div>
  );
}
