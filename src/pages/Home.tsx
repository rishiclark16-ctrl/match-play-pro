import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, X, Loader2, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoundCard } from '@/components/golf/RoundCard';
import { SpectatorRoundCard } from '@/components/golf/SpectatorRoundCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TechCard } from '@/components/ui/tech-card';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { RoundListSkeleton } from '@/components/ui/round-list-skeleton';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppBackground } from '@/components/ui/app-background';
import { useRounds } from '@/hooks/useRounds';
import { useRoundsQuery } from '@/hooks/useRoundsQuery';
import { useJoinRound } from '@/hooks/useJoinRound';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { useSpectatorRounds } from '@/hooks/useSpectatorRounds';
import { useOffline } from '@/contexts/OfflineContext';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { popIn } from '@/lib/animations';

export default function Home() {
  const navigate = useNavigate();
  const { deleteRound: deleteLocalRound } = useRounds();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { joinRound, loading: joinLoading, error: joinError, clearError } = useJoinRound();
  const { deleteRound: deleteSupabaseRound, loading: deleteLoading } = useDeleteRound();
  const { spectatorRounds, spectatorStats, leaveSpectating, fetchSpectatorRounds } = useSpectatorRounds();
  const { isOnline, isSyncing, pendingCount, backgroundSyncSupported, syncNow } = useOffline();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch rounds using React Query (provides caching, background refetch, retry logic)
  const {
    rounds,
    sharedRounds,
    roundStats,
    isLoading: loadingRounds,
    refetch: refetchRounds,
  } = useRoundsQuery();

  const handleDeleteRound = async (roundId: string) => {
    setDeletingRoundId(roundId);
    hapticLight();

    const success = await deleteSupabaseRound(roundId);

    if (success) {
      deleteLocalRound(roundId);
      await refetchRounds(); // Refetch to update the list
      hapticSuccess();
      toast.success('Round deleted');
    } else {
      hapticError();
      toast.error('Failed to delete round');
    }

    setDeletingRoundId(null);
  };

  const handleJoinRound = async () => {
    const round = await joinRound(joinCode.trim());
    if (round && user) {
      // Add user as spectator
      try {
        await supabase
          .from('round_spectators')
          .upsert({
            round_id: round.id,
            profile_id: user.id,
          }, {
            onConflict: 'round_id,profile_id'
          });
      } catch (err) {
        console.error('Error adding spectator:', err);
      }
      hapticSuccess();
      navigate(`/round/${round.id}?spectator=true`);
      setShowJoinModal(false);
      setJoinCode('');
    } else {
      hapticError();
    }
  };

  const handlePullRefresh = async () => {
    hapticLight();
    await Promise.all([refetchRounds(), fetchSpectatorRounds()]);
    hapticSuccess();
  };

  const handleLeaveSpectating = async (roundId: string) => {
    hapticLight();
    const success = await leaveSpectating(roundId);
    if (success) {
      hapticSuccess();
      toast.success('Stopped watching round');
    }
  };

  const activeRounds = rounds.filter(r => r.status === 'active');
  const completedRounds = rounds.filter(r => r.status === 'complete');
  const activeSharedRounds = sharedRounds.filter(r => r.status === 'active');
  const completedSharedRounds = sharedRounds.filter(r => r.status === 'complete');

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Technical Grid Background */}
      <AppBackground />

      {/* Fixed Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 px-6 pb-3 flex items-center justify-between relative z-10"
        style={{ paddingTop: '12px' }}
      >
        <div className="flex items-center gap-4">
          {/* Logo mark */}
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-2xl font-black text-primary-foreground tracking-tighter">M</span>
            </div>
            {/* Corner accent on logo */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">MATCH</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Golf Scorecard</p>
          </div>

          {/* Offline Indicator */}
          <OfflineIndicator
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            backgroundSyncSupported={backgroundSyncSupported}
            onSyncClick={syncNow}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            hapticLight();
            navigate('/profile');
          }}
          className="relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl touch-manipulation cursor-pointer select-none min-w-[48px] min-h-[48px]"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Avatar className="h-12 w-12 rounded-xl border-2 border-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Profile'} className="rounded-xl" />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background" />
        </motion.button>
      </motion.header>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-shrink-0 px-6 py-3 border-y border-border bg-muted/30 relative z-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active</p>
              <p className="text-2xl font-black tabular-nums text-foreground">{activeRounds.length}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Shared</p>
              <p className="text-2xl font-black tabular-nums text-accent-foreground">{sharedRounds.length}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Watching</p>
              <p className="text-2xl font-black tabular-nums text-primary">{spectatorRounds.length}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              hapticLight();
              setShowJoinModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold touch-manipulation cursor-pointer select-none active:bg-primary/20"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Eye className="w-4 h-4" />
            <span>Watch</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 relative z-10">
        <PullToRefresh onRefresh={handlePullRefresh} className="h-full min-h-0">
          <main className="px-6 py-4 pb-nav">
            {loadingRounds ? (
              <div className="pt-2">
                <RoundListSkeleton />
              </div>
            ) : (rounds.length > 0 || sharedRounds.length > 0 || spectatorRounds.length > 0) ? (
              <div className="space-y-6">
                {/* Spectating Rounds Section */}
                {spectatorRounds.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Watching Live</h2>
                    </div>
                    {spectatorRounds.map((round, index) => (
                      <motion.div
                        key={round.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, duration: 0.3 }}
                      >
                        <SpectatorRoundCard
                          round={round}
                          onClick={() => navigate(`/round/${round.id}?spectator=true`)}
                          onLeave={() => handleLeaveSpectating(round.id)}
                          currentHole={spectatorStats.get(round.id)?.currentHole}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Active Rounds Section */}
                {activeRounds.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">My Live Rounds</h2>
                    </div>
                    {activeRounds.map((round, index) => {
                      const stats = roundStats.get(round.id);
                      return (
                        <motion.div
                          key={round.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (index + spectatorRounds.length) * 0.08, duration: 0.3 }}
                        >
                          <RoundCard
                            round={round}
                            onClick={() => navigate(`/round/${round.id}`)}
                            onDelete={handleDeleteRound}
                            isDeleting={deletingRoundId === round.id}
                            playerCount={stats?.playerCount}
                            currentHole={stats?.currentHole}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Shared With Me Section - Active */}
                {activeSharedRounds.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent-foreground" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-accent-foreground">Shared With Me</h2>
                    </div>
                    {activeSharedRounds.map((round, index) => {
                      const stats = roundStats.get(round.id);
                      return (
                        <motion.div
                          key={round.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (index + spectatorRounds.length + activeRounds.length) * 0.08, duration: 0.3 }}
                        >
                          <RoundCard
                            round={round}
                            onClick={() => navigate(`/round/${round.id}`)}
                            playerCount={stats?.playerCount}
                            currentHole={stats?.currentHole}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Completed Rounds Section */}
                {completedRounds.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">My History</h2>
                    {completedRounds.map((round, index) => {
                      const stats = roundStats.get(round.id);
                      return (
                        <motion.div
                          key={round.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (index + activeRounds.length + activeSharedRounds.length + spectatorRounds.length) * 0.08, duration: 0.3 }}
                        >
                          <RoundCard
                            round={round}
                            onClick={() => navigate(`/round/${round.id}/complete`)}
                            onDelete={handleDeleteRound}
                            isDeleting={deletingRoundId === round.id}
                            playerCount={stats?.playerCount}
                            currentHole={stats?.currentHole}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Shared Completed Rounds Section */}
                {completedSharedRounds.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shared History</h2>
                    {completedSharedRounds.map((round, index) => {
                      const stats = roundStats.get(round.id);
                      return (
                        <motion.div
                          key={round.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (index + activeRounds.length + activeSharedRounds.length + completedRounds.length + spectatorRounds.length) * 0.08, duration: 0.3 }}
                        >
                          <RoundCard
                            round={round}
                            onClick={() => navigate(`/round/${round.id}/complete`)}
                            playerCount={stats?.playerCount}
                            currentHole={stats?.currentHole}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <TechCard corners className="p-8 max-w-xs mx-auto">
                  <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center mx-auto mb-6 border border-border">
                    <span className="text-4xl">⛳</span>
                  </div>
                  <h2 className="text-xl font-bold mb-2">No rounds yet</h2>
                  <p className="text-sm text-muted-foreground">
                    Start your first round to track scores with your group.
                  </p>
                  <Button
                    onClick={() => {
                      hapticLight();
                      navigate('/new-round');
                    }}
                    className="w-full mt-6 py-6 font-semibold rounded-xl bg-primary"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    New Round
                  </Button>
                </TechCard>
              </motion.div>
            )}
          </main>
        </PullToRefresh>
      </div>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
              onClick={() => setShowJoinModal(false)}
            />
            <motion.div
              variants={popIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50"
            >
              <TechCard variant="elevated" corners className="p-6 relative">
                {/* Corner accents */}
                <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-primary" />
                <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-primary/50" />

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowJoinModal(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>

                <div className="pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">Join</p>
                  <h3 className="text-xl font-bold mb-1">Enter Round Code</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter the 6-character code to join as spectator.
                  </p>
                </div>

                <Input
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    clearError();
                  }}
                  maxLength={6}
                  className="py-6 text-center text-2xl font-black tracking-[0.4em] uppercase rounded-xl bg-muted border-border font-mono"
                />

                {joinError && (
                  <p className="text-danger text-sm mt-3 font-medium">{joinError}</p>
                )}

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleJoinRound}
                    disabled={joinCode.length !== 6 || joinLoading}
                    className="w-full mt-5 py-6 text-base font-bold rounded-xl bg-primary"
                  >
                    {joinLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ChevronRight className="w-5 h-5 mr-1" />
                    )}
                    Join Round
                  </Button>
                </motion.div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Follow along and see scores in real-time
                </p>
              </TechCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
