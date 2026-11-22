import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpcomingRounds, UpcomingRound } from '@/hooks/useUpcomingRounds';
import { UpcomingRoundCard } from './UpcomingRoundCard';
import { RoundChatSheet } from './RoundChatSheet';
import { CreateUpcomingSheet } from './CreateUpcomingSheet';
import { FeedItemSkeleton } from './FeedItemSkeleton';

export function UpcomingRoundsTab() {
  const { user } = useAuth();
  const { rounds, loading, error, refetch } = useUpcomingRounds();
  const [selectedRound, setSelectedRound] = useState<UpcomingRound | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="px-5 pt-2 pb-6 space-y-[18px]">
      {/* Primary CTA */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setCreateOpen(true)}
        className="w-full h-[60px] rounded-[20px] bg-foreground text-background text-[16px] font-bold flex items-center justify-center gap-2.5"
      >
        <CalendarPlus className="h-5 w-5" />
        Schedule a round
      </motion.button>

      <section>
        <p className="text-[13px] font-semibold text-muted-foreground mb-2 px-1">Upcoming</p>

        {loading ? (
          <div className="space-y-2">
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
        ) : rounds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] border border-dashed border-border-strong px-6 py-8 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-muted text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground">Nothing on the tee sheet</h3>
            <p className="mx-auto mt-1 max-w-[250px] text-[13px] leading-relaxed text-muted-foreground">
              Schedule a round to lock in the time, invite the group and talk trash before you play.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {rounds.map((round, i) => (
                <motion.div
                  key={round.roundId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                >
                  <UpcomingRoundCard
                    round={round}
                    onPress={() => setSelectedRound(round)}
                    currentUserId={user?.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Sheets */}
      <RoundChatSheet
        round={selectedRound}
        onClose={() => setSelectedRound(null)}
      />
      <CreateUpcomingSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </div>
  );
}
