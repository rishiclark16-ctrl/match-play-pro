import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag } from 'lucide-react';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { useAuth } from '@/hooks/useAuth';
import { FeedItem } from './FeedItem';
import { FeedItemSkeleton } from './FeedItemSkeleton';
import { RoundDetailSheet } from './RoundDetailSheet';
import { SeasonLeaderboard } from './SeasonLeaderboard';

export function SocialFeedTab() {
  const { user } = useAuth();
  const { items, loading, error, refetch } = useSocialFeed();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const selectedItem = items.find(i => i.roundId === selectedRoundId);

  return (
    <div className="px-5 pt-2 pb-6 space-y-[18px]">
      {/* Season standings: the Forest hero */}
      <SeasonLeaderboard />

      <section>
        <p className="text-[13px] font-semibold text-muted-foreground mb-2 px-1">Recent rounds</p>

        {loading ? (
          <div className="space-y-2">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        ) : error ? (
          <div className="rounded-[20px] border border-border bg-card px-6 py-8 text-center">
            <p className="text-[14px] text-muted-foreground mb-3">{error}</p>
            <button
              onClick={refetch}
              className="h-11 rounded-[14px] bg-muted px-4 text-[14px] font-semibold text-primary"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] border border-dashed border-border-strong px-6 py-8 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-muted text-primary">
              <Flag className="h-6 w-6" />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground">No rounds yet</h3>
            <p className="mx-auto mt-1 max-w-[250px] text-[13px] leading-relaxed text-muted-foreground">
              Finished rounds from you and your friends show up here, with the winner and the money.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div
                  key={item.roundId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                >
                  <FeedItem
                    item={item}
                    onPress={() => setSelectedRoundId(item.roundId)}
                    currentUserId={user?.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <RoundDetailSheet
        roundId={selectedRoundId}
        creatorName={selectedItem?.creatorName}
        onClose={() => setSelectedRoundId(null)}
      />
    </div>
  );
}
