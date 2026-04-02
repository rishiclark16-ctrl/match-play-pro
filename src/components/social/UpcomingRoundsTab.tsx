import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus } from 'lucide-react';
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
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Schedule button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setCreateOpen(true)}
        className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Schedule a Round
      </motion.button>

      {/* Round list */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground mb-3 px-0.5">
          Upcoming
        </p>

        {loading ? (
          <div className="space-y-3">
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
        ) : rounds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-6 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-[13px] font-bold text-foreground mb-1">No upcoming rounds</h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
              Schedule a round with friends to plan your next game and chat before you play.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
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
      </div>

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
