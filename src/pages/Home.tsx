import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppTutorial } from '@/components/onboarding/AppTutorial';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Flag } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { RoundListSkeleton } from '@/components/ui/round-list-skeleton';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRounds } from '@/hooks/useRounds';
import { useRoundsQuery } from '@/hooks/useRoundsQuery';
import { useJoinRound } from '@/hooks/useJoinRound';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { InviteFriendsRow } from '@/components/home/InviteFriendsRow';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { useSpectatorRounds } from '@/hooks/useSpectatorRounds';
import { useFriendActivity } from '@/hooks/useFriendActivity';
import { useOffline } from '@/contexts/OfflineContext';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NapkinMark } from '@/components/home/HomeRoundCard';
import { HomeLiveHero } from '@/components/home/HomeHero';
import { HomeActionRow } from '@/components/home/HomeActionRow';
import { HomeComposer } from '@/components/home/HomeComposer';
import { HomeStatsStrip, FriendsPlayingNow, RoundListSection } from '@/components/home/HomeSections';
import { JoinRoundModal } from '@/components/home/JoinRoundModal';

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(
    (location.state as Record<string, unknown> | null)?.showTutorial === true
  );
  const { deleteRound: deleteLocalRound } = useRounds();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { joinRound, loading: joinLoading, error: joinError, clearError } = useJoinRound();
  const { deleteRound: deleteSupabaseRound } = useDeleteRound();
  const { spectatorRounds, spectatorStats, leaveSpectating, fetchSpectatorRounds } = useSpectatorRounds();
  const { liveRounds: friendLiveRounds, refetch: refetchFriendActivity } = useFriendActivity();
  const { isOnline, isSyncing, pendingCount, backgroundSyncSupported, syncNow } = useOffline();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const { rounds, sharedRounds, roundStats, isLoading: loadingRounds, refetch: refetchRounds } = useRoundsQuery();

  const handleDeleteRound = async (roundId: string) => {
    setDeletingRoundId(roundId);
    hapticLight();
    const success = await deleteSupabaseRound(roundId);
    if (success) {
      deleteLocalRound(roundId);
      await refetchRounds();
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
      try {
        await supabase.from('round_spectators').upsert(
          { round_id: round.id, profile_id: user.id },
          { onConflict: 'round_id,profile_id' }
        );
      } catch (err) {
        console.error('[Home] Failed to add round spectator:', err);
      }
      hapticSuccess();
      navigate(`/round/${round.id}?spectator=true`);
      setShowJoinModal(false);
      setJoinCode('');
    } else {
      hapticError();
    }
  };

  const handleSpectateFriend = async (roundId: string) => {
    hapticLight();
    if (user) {
      try {
        await supabase.from('round_spectators').upsert(
          { round_id: roundId, profile_id: user.id },
          { onConflict: 'round_id,profile_id' }
        );
      } catch { /* non-critical */ }
    }
    navigate(`/round/${roundId}?spectator=true`);
  };

  const handlePullRefresh = async () => {
    hapticLight();
    await Promise.all([refetchRounds(), fetchSpectatorRounds(), refetchFriendActivity()]);
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
  const hasAnyRounds = rounds.length > 0 || sharedRounds.length > 0 || spectatorRounds.length > 0;

  // The hero carries the user's most recent live round; the rest list below it.
  const heroRound = activeRounds[0] ?? null;
  const otherActiveRounds = activeRounds.slice(1);
  const heroStats = heroRound ? roundStats.get(heroRound.id) : undefined;
  const firstName = profile?.full_name?.trim().split(' ')[0] || null;
  const statsFor = (id: string) => roundStats.get(id);
  const openLive = (id: string) => navigate(`/round/${id}`);
  const openDone = (id: string) => navigate(`/round/${id}/complete`);

  const headerContent = (
    <div className="px-5 pb-3 flex items-center justify-between pt-safe-content">
      <div className="flex items-center gap-[10px]">
        <NapkinMark size={36} />
        <h1 className="text-[26px] font-extrabold tracking-[-0.04em] leading-none text-foreground select-none">
          MATCH
        </h1>
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
        onClick={() => { hapticLight(); navigate('/profile'); }}
        aria-label="Open profile"
        className="relative h-11 w-11 touch-manipulation cursor-pointer select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Avatar className="h-11 w-11 rounded-[14px]">
          <AvatarImage src={profile?.avatar_url || undefined} className="rounded-[14px]" />
          <AvatarFallback className="rounded-[14px] bg-primary text-primary-foreground text-[14px] font-bold">
            {getInitials(profile?.full_name)}
          </AvatarFallback>
        </Avatar>
      </motion.button>
    </div>
  );

  return (
    <>
    <AnimatePresence>
      {showTutorial && <AppTutorial onDone={() => setShowTutorial(false)} />}
    </AnimatePresence>
    {/* disableScroll: PullToRefresh is the scroller, and it ends above the
        bottom nav (AppLayout's pb-nav), so nothing can sit under the nav. */}
    <AppLayout header={headerContent} mainClassName="px-0" disableScroll>
      <div className="h-full min-h-0">
        <PullToRefresh onRefresh={handlePullRefresh} className="h-full min-h-0">
          <div className="px-5 pt-1 pb-8 space-y-[14px]">

            {/* Hero: the live round, or a welcome to start one */}
            {heroRound ? (
              <HomeLiveHero
                round={heroRound}
                playerCount={heroStats?.playerCount}
                currentHole={heroStats?.currentHole}
                onOpen={() => openLive(heroRound.id)}
                onDelete={handleDeleteRound}
                isDeleting={deletingRoundId === heroRound.id}
              />
            ) : loadingRounds ? (
              <div className="h-[268px] rounded-[28px] bg-primary/90 animate-pulse" aria-hidden="true" />
            ) : (
              // 3.1: with no round live, the front door is "say it and play".
              <HomeComposer firstName={firstName} />
            )}

            {/* With a round live it stays on top; a new round is one line below it. */}
            {heroRound && <HomeComposer firstName={firstName} compact />}

            {/* Counts only once there's something to count; zeros read as bare */}
            {hasAnyRounds && (
              <HomeStatsStrip active={activeRounds.length} watching={spectatorRounds.length} rounds={rounds.length} />
            )}

            <div className="space-y-2">
              <HomeActionRow
                onClick={() => { hapticLight(); setShowJoinModal(true); }}
                ariaLabel="Watch a live round"
                icon={<Eye className="h-[19px] w-[19px]" />}
                title="Watch a round"
                subtitle="Follow a friend's card with a code"
              />
              <InviteFriendsRow name={profile?.full_name} friendCode={profile?.friend_code} />
            </div>

            <FriendsPlayingNow
              rounds={friendLiveRounds}
              onSpectate={handleSpectateFriend}
              onWatchParty={(id) => { hapticLight(); navigate(`/watch/${id}`); }}
            />

            {/* Round lists */}
            {loadingRounds ? (
              <div className="-mx-6"><RoundListSkeleton /></div>
            ) : hasAnyRounds ? (
              <div className="space-y-[14px] pt-1">
                <RoundListSection
                  title="Watching live" live rounds={spectatorRounds}
                  onOpen={(r) => navigate(`/round/${r.id}?spectator=true`)}
                  statsFor={(id) => ({ currentHole: spectatorStats.get(id)?.currentHole })}
                />
                <RoundListSection
                  title={heroRound ? 'Also live' : 'Live'} live rounds={otherActiveRounds}
                  indexOffset={spectatorRounds.length}
                  onOpen={(r) => openLive(r.id)} onDelete={handleDeleteRound}
                  deletingRoundId={deletingRoundId} statsFor={statsFor}
                />
                <RoundListSection
                  title="Shared with me" rounds={activeSharedRounds}
                  onOpen={(r) => openLive(r.id)} statsFor={statsFor}
                />
                <RoundListSection
                  title="History" rounds={completedRounds} showHole={false}
                  onOpen={(r) => openDone(r.id)} onDelete={handleDeleteRound}
                  deletingRoundId={deletingRoundId} statsFor={statsFor}
                />
                <RoundListSection
                  title="Shared history" rounds={completedSharedRounds} showHole={false}
                  onOpen={(r) => openDone(r.id)} statsFor={statsFor}
                />
              </div>
            ) : (
              /* Empty state: the welcome hero leads; this tells them what comes next */
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-[20px] border border-dashed border-border-strong px-5 py-6 text-center"
              >
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-muted text-primary">
                  <Flag className="h-5 w-5" />
                </span>
                <p className="text-[15px] font-semibold text-foreground">Your rounds land here</p>
                <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
                  Live cards, final scores and who owes who, every time you play.
                </p>
              </motion.div>
            )}
          </div>
        </PullToRefresh>
      </div>

      <JoinRoundModal
        open={showJoinModal}
        code={joinCode}
        onCodeChange={(c) => { setJoinCode(c); clearError(); }}
        error={joinError}
        loading={joinLoading}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinRound}
      />
    </AppLayout>
    </>
  );
}
