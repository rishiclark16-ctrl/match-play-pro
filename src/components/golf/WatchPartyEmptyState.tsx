import { motion } from 'framer-motion';

export function WatchPartyEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <span className="text-4xl mb-3">🤫</span>
      <p className="text-[15px] font-semibold text-gray-800 mb-1">
        You're in the Watch Party!
      </p>
      <p className="text-[13px] text-gray-500 max-w-[260px]">
        Chat about the round — players can't see this until it's over.
      </p>
    </motion.div>
  );
}
