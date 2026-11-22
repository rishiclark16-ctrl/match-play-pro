import { motion } from 'framer-motion';

export function FeedItemSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[20px] border border-border bg-card p-4 space-y-3"
    >
      <div className="h-4 w-3/5 rounded-full bg-muted animate-pulse" />
      <div className="h-3 w-2/5 rounded-full bg-muted animate-pulse" />
      <div className="h-[72px] rounded-[14px] bg-muted/70 animate-pulse" />
    </motion.div>
  );
}
