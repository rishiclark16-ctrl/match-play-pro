import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { WatchPartyScoreHeader } from '@/components/golf/WatchPartyScoreHeader';
import { WatchPartyChat } from '@/components/golf/WatchPartyChat';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useWatchPartyChat } from '@/hooks/useWatchPartyChat';
import { useWatchPartyScores } from '@/hooks/useWatchPartyScores';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function WatchParty() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    isMember,
    isEligible,
    isRoundComplete,
    memberCount,
    loading: partyLoading,
    error: partyError,
    joinParty,
    leaveParty,
  } = useWatchParty(roundId ?? null);

  const {
    messages,
    loading: chatLoading,
    submitting,
    sendMessage,
  } = useWatchPartyChat(roundId ?? null);

  const {
    round,
    playerScores,
    currentHole,
    loading: scoresLoading,
  } = useWatchPartyScores(roundId ?? null, isMember);

  // Auto-join on mount if eligible and not already a member
  useEffect(() => {
    if (!partyLoading && isEligible && !isMember && !isRoundComplete) {
      joinParty();
    }
  }, [partyLoading, isEligible, isMember, isRoundComplete, joinParty]);

  // Show toast when round completes while watching
  useEffect(() => {
    if (isRoundComplete && isMember) {
      toast('Round complete! Players can now see the chat', {
        icon: '👀',
        duration: 5000,
      });
    }
  }, [isRoundComplete, isMember]);

  const handleLeave = async () => {
    await leaveParty();
    navigate('/');
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Loading state
  if (partyLoading || scoresLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
      </div>
    );
  }

  // Error / not eligible
  if (partyError || (!isEligible && !isRoundComplete)) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-white px-6 text-center">
        <span className="text-4xl mb-3">🚫</span>
        <p className="text-[15px] font-semibold text-gray-800 mb-1">Can't join this Watch Party</p>
        <p className="text-[13px] text-gray-500 mb-6">
          {partyError || 'You need to be friends with a player to watch.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-violet-600 font-semibold text-[14px]"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="h-dvh flex flex-col bg-white relative"
    >
      {/* Navigation bar */}
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2 border-b border-gray-100">
        <button onClick={handleBack} className="p-1.5 -ml-1.5" aria-label="Go back">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <span className="text-[15px] font-semibold text-gray-900">
          {isRoundComplete ? 'Watch Party Chat' : 'Watch Party'}
        </span>

        {!isRoundComplete ? (
          <button
            onClick={handleLeave}
            className="p-1.5 -mr-1.5 text-gray-400"
            aria-label="Leave watch party"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-8" /> // spacer
        )}
      </div>

      {/* Score header */}
      <WatchPartyScoreHeader
        round={round}
        playerScores={playerScores}
        currentHole={currentHole}
        memberCount={memberCount}
        isRoundComplete={isRoundComplete}
      />

      {/* Chat */}
      <WatchPartyChat
        messages={messages}
        currentUserId={user?.id ?? ''}
        isRoundComplete={isRoundComplete}
        submitting={submitting}
        onSend={sendMessage}
      />
    </motion.div>
  );
}
