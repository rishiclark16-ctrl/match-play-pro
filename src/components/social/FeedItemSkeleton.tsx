import { motion } from 'framer-motion';

export function FeedItemSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded-full w-3/4 animate-pulse" />
          <div className="h-2.5 bg-muted rounded-full w-1/2 animate-pulse" />
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full w-full animate-pulse" />
      <div className="h-2.5 bg-muted rounded-full w-4/5 animate-pulse" />
    </motion.div>
  );
}
