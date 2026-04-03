import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppTutorial } from '@/components/onboarding/AppTutorial';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Loader2, ChevronRight, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { useSpectatorRounds } from '@/hooks/useSpectatorRounds';
import { useFriendActivity, FriendLiveRound } from '@/hooks/useFriendActivity';
import { useOffline } from '@/contexts/OfflineContext';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { popIn, staggerItem } from '@/lib/animations';
import { Round } from '@/types/golf';
import { cn } from '@/lib/utils';

// ─── Direction B Round Card ───────────────────────────────────────────────────
function B_RoundCard({
  round,
  onClick,
  onDelete,
  isDeleting,
  playerCount,
  currentHole,
}: {
  round: Round;
  onClick: () => void;
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
  playerCount?: number;
  currentHole?: number;
}) {
  const isActive = round.status === 'active';
  const roundGames = (round as Round & { games?: unknown[] }).games;
  const games: string[] = Array.isArray(roundGames)
    ? roundGames.map((g: unknown) => {
        if (typeof g === 'string') return g;
        if (g && typeof g === 'object') {
          const obj = g as Record<string, unknown>;
          return String(obj.type ?? obj.name ?? '');
        }
        return '';
      })
    : [];

  const holesTotal = round.holes ?? 18;
  const progress = currentHole && holesTotal ? currentHole / holesTotal : 0;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(round.id);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'rounded-2xl p-[18px] cursor-pointer relative overflow-hidden',
        isActive
          ? 'bg-[#0A0A0A] shadow-[0_4px_24px_rgba(0,0,0,0.35)]'
          : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]'
      )}
    >
      {/* Top row: course name + status pill */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={cn(
          'text-[17px] tracking-[-0.03em] leading-snug flex-1 pr-3',
          isActive ? 'font-black text-white' : 'font-bold text-foreground'
        )}>
          {round.courseName}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {isActive ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#F0EE3A]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F0EE3A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F0EE3A]" />
              </span>
              LIVE
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-[10px] py-1 rounded-full bg-[#F3F4F6] text-[#6B7280]">
              Done
            </span>
          )}
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDeleteClick}
              disabled={isDeleting}
              aria-label="Delete round"
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center',
                isActive
                  ? 'bg-white/10 text-white/50 active:text-white'
                  : 'bg-muted/70 text-muted-foreground active:text-destructive'
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-2.5">
        {playerCount && (
          <span className={cn(
            'flex items-center gap-1 text-[12px]',
            isActive ? 'text-white/60' : 'text-[#6B7280]'
          )}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <strong className={cn('font-semibold', isActive ? 'text-white/80' : 'text-[#374151]')}>{playerCount}</strong> players
          </span>
        )}
        <span className={cn('text-[12px]', isActive ? 'text-white/60' : 'text-[#6B7280]')}>
          {round.holes} holes
        </span>
      </div>

      {/* Game tags */}
      {games.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {games.map((g, i) => (
            <span
              key={`${g}-${i}`}
              className={cn(
                'text-[11px] font-medium px-[9px] py-[3px] rounded-[6px] uppercase tracking-wide',
                isActive
                  ? 'bg-white/10 text-white/50'
                  : 'bg-[#F3F4F6] text-[#374151]'
              )}
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar for live rounds */}
      {isActive && currentHole && currentHole > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-[4px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F0EE3A] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-white/60 whitespace-nowrap">
            Hole {currentHole}/{holesTotal}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2.5">
      {live && (
        <span className="w-[6px] h-[6px] rounded-full bg-[#22C55E] shadow-[0_0_0_3px_rgba(34,197,94,0.15)] flex-shrink-0" />
      )}
      <span className="text-[11px] font-semibold text-[#888] uppercase tracking-[0.08em]">{children}</span>
    </div>
  );
}

// ─── Animated Logo ────────────────────────────────────────────────────────────
function AnimatedLogo() {
  return (
    <div className="w-10 h-10 rounded-[12px] bg-foreground flex items-center justify-center flex-shrink-0">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" overflow="visible">
        {/* Stick */}
        <line x1="7" y1="2.5" x2="7" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Animated flag pennant */}
        <motion.polygon
          points="7,2.5 17,6.5 7,10.5"
          fill="#F0EE3A"
          style={{ transformOrigin: '7px 6.5px' }}
          animate={{ scaleX: [1, 0.82, 1], skewY: [0, 4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

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

  const headerContent = (
    <div className="px-6 pb-4 flex items-center justify-between pt-safe-content">
      {/* Logo */}
      <div className="flex items-center gap-[10px]">
        <AnimatedLogo />
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.04em] leading-none text-foreground">MATCH</h1>
        </div>
        <OfflineIndicator
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          backgroundSyncSupported={backgroundSyncSupported}
          onSyncClick={syncNow}
        />
      </div>

      {/* Avatar */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { hapticLight(); navigate('/profile'); }}
        aria-label="Open profile"
        className="relative touch-manipulation cursor-pointer select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Avatar className="h-10 w-10 rounded-[12px]">
          <AvatarImage src={profile?.avatar_url || undefined} className="rounded-[12px]" />
          <AvatarFallback className="rounded-[12px] bg-foreground text-background text-sm font-bold">
            {getInitials(profile?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-[2px] -right-[2px] w-[11px] h-[11px] rounded-full bg-[#22C55E] border-2 border-background" />
      </motion.button>
    </div>
  );

  return (
    <>
    <AnimatePresence>
      {showTutorial && <AppTutorial onDone={() => setShowTutorial(false)} />}
    </AnimatePresence>
    <AppLayout header={headerContent} mainClassName="px-0">
      <div className="flex-1 min-h-0">
        <PullToRefresh onRefresh={handlePullRefresh} className="h-full min-h-0">
          <div className="px-6 pb-nav">

            {/* Stats Row — 3 white cards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 }}
              className="grid grid-cols-3 gap-[10px] mb-5"
            >
              <div className="bg-white rounded-2xl px-4 py-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                <p className="text-[10px] font-medium text-[#888] tracking-[0.04em] mb-1">Active</p>
                <p className="text-[28px] font-extrabold text-foreground leading-none tracking-[-0.04em]">{activeRounds.length}</p>
                <p className="text-[10px] text-[#22C55E] font-semibold mt-[2px]">● Live</p>
              </div>
              <div className="bg-white rounded-2xl px-4 py-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                <p className="text-[10px] font-medium text-[#888] tracking-[0.04em] mb-1">Watching</p>
                <p className="text-[28px] font-extrabold text-foreground leading-none tracking-[-0.04em]">{spectatorRounds.length}</p>
                <p className="text-[10px] text-[#888] mt-[2px]">spectating</p>
              </div>
              <div className="bg-white rounded-2xl px-4 py-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                <p className="text-[10px] font-medium text-[#888] tracking-[0.04em] mb-1">Rounds</p>
                <p className="text-[28px] font-extrabold text-foreground leading-none tracking-[-0.04em]">{rounds.length}</p>
                <p className="text-[10px] text-[#888] mt-[2px]">total</p>
              </div>
            </motion.div>

            {/* New Round CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="mb-5"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { hapticLight(); navigate('/new-round'); }}
                aria-label="Start new round"
                className="w-full bg-foreground rounded-2xl px-[22px] py-[18px] flex items-center justify-between touch-manipulation cursor-pointer select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-[38px] h-[38px] bg-white/10 rounded-[10px] flex items-center justify-center flex-shrink-0">
                    <Plus className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-bold text-white tracking-[-0.02em]">New Round</p>
                    <p className="text-[11px] text-white/45 mt-[1px]">Set up games + players</p>
                  </div>
                </div>
                <div className="w-[30px] h-[30px] bg-white/8 rounded-[8px] flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
              </motion.button>
            </motion.div>

            {/* Watch button — inline below new round */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08 }}
              className="mb-6"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { hapticLight(); setShowJoinModal(true); }}
                aria-label="Watch a live round"
                className="w-full bg-white rounded-2xl px-[22px] py-[14px] flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)] touch-manipulation cursor-pointer select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-[34px] h-[34px] bg-muted rounded-[9px] flex items-center justify-center flex-shrink-0">
                    <Eye className="w-[16px] h-[16px] text-foreground/60" />
                  </div>
                  <p className="text-[14px] font-semibold text-foreground/70 tracking-[-0.01em]">Watch a round</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </motion.div>

            {/* Friends Playing Now */}
            {friendLiveRounds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Friends Playing Now</p>
                </div>
                <div className="space-y-2">
                  {friendLiveRounds.map((fr) => (
                    <motion.button
                      key={fr.roundId}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        hapticLight();
                        if (user) {
                          try {
                            await supabase.from('round_spectators').upsert(
                              { round_id: fr.roundId, profile_id: user.id },
                              { onConflict: 'round_id,profile_id' }
                            );
                          } catch { /* non-critical */ }
                        }
                        navigate(`/round/${fr.roundId}?spectator=true`);
                      }}
                      className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-left"
                    >
                      <Avatar className="w-9 h-9 rounded-xl flex-shrink-0">
                        <AvatarImage src={fr.creatorAvatar ?? undefined} />
                        <AvatarFallback className="rounded-xl text-[11px] font-black bg-muted">
                          {fr.creatorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-foreground truncate">{fr.courseName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fr.playerNames.slice(0, 3).join(', ')}
                          {fr.playerNames.length > 3 && ` +${fr.playerNames.length - 3}`}
                          {fr.currentHole > 0 && ` · Hole ${fr.currentHole}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Eye className="w-3.5 h-3.5 text-[#22C55E]" />
                        <span className="text-[11px] font-bold text-[#22C55E]">Watch</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Round Lists */}
            {loadingRounds ? (
              <RoundListSkeleton />
            ) : hasAnyRounds ? (
              <div className="space-y-6">
                {/* Spectating */}
                {spectatorRounds.length > 0 && (
                  <div>
                    <SectionLabel live>Watching Live</SectionLabel>
                    <div className="space-y-2">
                      {spectatorRounds.map((round, i) => (
                        <motion.div key={round.id} variants={staggerItem} initial="initial" animate="animate" custom={i}>
                          <B_RoundCard
                            round={round}
                            onClick={() => navigate(`/round/${round.id}?spectator=true`)}
                            currentHole={spectatorStats.get(round.id)?.currentHole}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active */}
                {activeRounds.length > 0 && (
                  <div>
                    <SectionLabel live>Live</SectionLabel>
                    <div className="space-y-2">
                      {activeRounds.map((round, i) => {
                        const stats = roundStats.get(round.id);
                        return (
                          <motion.div key={round.id} variants={staggerItem} initial="initial" animate="animate" custom={i + spectatorRounds.length}>
                            <B_RoundCard
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
                  </div>
                )}

                {/* Shared active */}
                {activeSharedRounds.length > 0 && (
                  <div>
                    <SectionLabel>Shared With Me</SectionLabel>
                    <div className="space-y-2">
                      {activeSharedRounds.map((round, i) => {
                        const stats = roundStats.get(round.id);
                        return (
                          <motion.div key={round.id} variants={staggerItem} initial="initial" animate="animate" custom={i + spectatorRounds.length + activeRounds.length}>
                            <B_RoundCard
                              round={round}
                              onClick={() => navigate(`/round/${round.id}`)}
                              playerCount={stats?.playerCount}
                              currentHole={stats?.currentHole}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* History */}
                {completedRounds.length > 0 && (
                  <div>
                    <SectionLabel>History</SectionLabel>
                    <div className="space-y-2">
                      {completedRounds.map((round, i) => {
                        const stats = roundStats.get(round.id);
                        return (
                          <motion.div key={round.id} variants={staggerItem} initial="initial" animate="animate" custom={i + activeRounds.length + activeSharedRounds.length + spectatorRounds.length}>
                            <B_RoundCard
                              round={round}
                              onClick={() => navigate(`/round/${round.id}/complete`)}
                              onDelete={handleDeleteRound}
                              isDeleting={deletingRoundId === round.id}
                              playerCount={stats?.playerCount}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shared history */}
                {completedSharedRounds.length > 0 && (
                  <div>
                    <SectionLabel>Shared History</SectionLabel>
                    <div className="space-y-2">
                      {completedSharedRounds.map((round, i) => {
                        const stats = roundStats.get(round.id);
                        return (
                          <motion.div key={round.id} variants={staggerItem} initial="initial" animate="animate" custom={i + activeRounds.length + activeSharedRounds.length + completedRounds.length + spectatorRounds.length}>
                            <B_RoundCard
                              round={round}
                              onClick={() => navigate(`/round/${round.id}/complete`)}
                              playerCount={stats?.playerCount}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 200 }}
                  className="w-[72px] h-[72px] rounded-[18px] bg-foreground flex items-center justify-center mx-auto mb-5"
                >
                  <svg width="36" height="36" viewBox="0 0 80 80" fill="none">
                    <path d="M16 58 L16 22 L40 46 L64 22 L64 58" stroke="white" strokeWidth="7.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
                <h2 className="text-[24px] font-extrabold tracking-[-0.03em] mb-2">Ready to Play?</h2>
                <p className="text-[14px] text-[#888] mb-8 leading-relaxed max-w-[240px]">
                  Track scores, side games, and settlements with your group.
                </p>
                <Button
                  onClick={() => { hapticLight(); navigate('/new-round'); }}
                  className="w-full max-w-[260px] py-4 font-bold rounded-2xl bg-foreground text-background text-[15px] h-auto"
                >
                  <Plus className="w-5 h-5 mr-2" strokeWidth={2.5} />
                  Start New Round
                </Button>
              </motion.div>
            )}
          </div>
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
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
              onClick={() => setShowJoinModal(false)}
            />
            <motion.div
              variants={popIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50"
            >
              <div className="bg-white rounded-3xl p-6 shadow-2xl">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#888] mb-1">Watch Live</p>
                    <h3 className="text-[22px] font-extrabold tracking-[-0.03em]">Enter Round Code</h3>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowJoinModal(false)}
                    className="w-8 h-8 rounded-xl bg-[#F3F4F6] flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-[#6B7280]" />
                  </motion.button>
                </div>

                <Input
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); clearError(); }}
                  maxLength={6}
                  className="py-5 text-center text-2xl font-black tracking-[0.4em] uppercase rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] font-mono h-auto mb-4"
                />

                {joinError && <p className="text-danger text-sm mb-3 font-medium">{joinError}</p>}

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleJoinRound}
                    disabled={joinCode.length !== 6 || joinLoading}
                    className="w-full py-4 text-[15px] font-bold rounded-2xl bg-foreground text-background h-auto"
                  >
                    {joinLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ChevronRight className="w-5 h-5 mr-1" />}
                    Join Round
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
    </>
  );
}
