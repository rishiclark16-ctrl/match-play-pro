import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rss } from 'lucide-react';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { FeedItem } from './FeedItem';
import { FeedItemSkeleton } from './FeedItemSkeleton';
import { RoundDetailSheet } from './RoundDetailSheet';

export function SocialFeedTab() {
  const { items, loading, error, refetch } = useSocialFeed();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const selectedItem = items.find(i => i.roundId === selectedRoundId);

  return (
    <div className="px-4 pt-4 pb-4 space-y-3">
      {loading ? (
        <>
          <FeedItemSkeleton />
          <FeedItemSkeleton />
          <FeedItemSkeleton />
        </>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-[13px] text-muted-foreground mb-3">{error}</p>
          <button
            onClick={refetch}
            className="text-[12px] font-bold text-foreground bg-muted px-4 py-2 rounded-xl"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Rss className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-[15px] font-bold text-foreground mb-1">No activity yet</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Add friends to see their rounds and results here
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.roundId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <FeedItem
                item={item}
                onPress={() => setSelectedRoundId(item.roundId)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <RoundDetailSheet
        roundId={selectedRoundId}
        creatorName={selectedItem?.creatorName}
        onClose={() => setSelectedRoundId(null)}
      />
    </div>
  );
}
