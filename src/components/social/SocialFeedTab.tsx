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
    <div className="px-4 pt-4 pb-4 space-y-5">
      {/* Season standings */}
      <SeasonLeaderboard />

      {/* Recent rounds section */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground mb-3 px-0.5">
          Recent Rounds
        </p>

        {loading ? (
          <div className="space-y-3">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-white rounded-2xl">
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
            className="text-center py-12 bg-white rounded-2xl"
          >
            <Flag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[14px] font-bold text-foreground mb-1">No rounds yet</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
              Completed rounds from you and your friends will show up here
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
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
      </div>

      <RoundDetailSheet
        roundId={selectedRoundId}
        creatorName={selectedItem?.creatorName}
        onClose={() => setSelectedRoundId(null)}
      />
    </div>
  );
}
