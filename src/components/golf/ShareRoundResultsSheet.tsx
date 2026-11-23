import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Users,
  ChevronRight,
  Loader2,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFriends, Friend } from '@/hooks/useFriends';
import { PlayerWithScores, Round } from '@/types/golf';
import { NetSettlement } from '@/lib/games/settlement';
import { generateRoundSummary, generateShortSummary } from '@/lib/roundSummary';
import { SkinsResult } from '@/lib/games/skins';
import { NassauResult } from '@/lib/games/nassau';
import { MatchPlayResult } from '@/lib/games/matchPlay';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { sendPushToProfiles } from '@/lib/pushUtils';
import { toast } from 'sonner';

interface ShareRoundResultsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  round: Round;
  players: PlayerWithScores[];
  settlements: NetSettlement[];
  winner: PlayerWithScores | null;
  hasTie: boolean;
  useNetScoring: boolean;
  matchPlayResult?: MatchPlayResult | null;
  skinsResult?: SkinsResult;
  nassauResult?: NassauResult;
}

export function ShareRoundResultsSheet({
  isOpen,
  onClose,
  round,
  players,
  settlements,
  winner,
  hasTie,
  useNetScoring,
  matchPlayResult,
  skinsResult,
  nassauResult,
}: ShareRoundResultsSheetProps) {
  const { friends, loading: friendsLoading } = useFriends();
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Generate the full summary
  const fullSummary = useMemo(() => {
    return generateRoundSummary({
      round,
      players,
      settlements,
      winner,
      hasTie,
      useNetScoring,
      matchPlayResult,
      skinsResult,
      nassauResult,
    });
  }, [round, players, settlements, winner, hasTie, useNetScoring, matchPlayResult, skinsResult, nassauResult]);

  // Generate short summary for SMS
  const shortSummary = useMemo(() => {
    return generateShortSummary({
      round,
      players,
      settlements,
      winner,
      hasTie,
      useNetScoring,
    });
  }, [round, players, settlements, winner, hasTie, useNetScoring]);

  // Filter friends who weren't in the round
  const friendsNotInRound = useMemo(() => {
    const playerProfileIds = new Set(
      players.map(p => p.profileId).filter(Boolean)
    );
    return friends.filter(f => !playerProfileIds.has(f.id));
  }, [friends, players]);

  // Toggle friend selection
  const toggleFriend = (friendId: string) => {
    hapticLight();
    setSelectedFriendIds(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  // Copy to clipboard
  const handleCopy = async () => {
    hapticLight();
    try {
      await navigator.clipboard.writeText(fullSummary);
      setCopied(true);
      hapticSuccess();
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      hapticError();
      toast.error('Failed to copy');
    }
  };

  // Share via native share sheet
  const handleNativeShare = async () => {
    hapticLight();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${round.courseName} - Round Complete`,
          text: fullSummary,
        });
        hapticSuccess();
        toast.success('Shared!');
      } catch (err) {
        // User cancelled - that's ok
        if (err instanceof Error && err.name !== 'AbortError') {
          hapticError();
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  // Share via SMS
  const handleSMS = () => {
    hapticLight();
    const smsBody = encodeURIComponent(shortSummary);
    // On iOS, use &body= for SMS. On Android, use ?body=
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    window.open(`sms:${separator}body=${smsBody}`, '_blank');
    toast.success('Opening messages...');
  };

  // Share via Email
  const handleEmail = () => {
    hapticLight();
    const subject = encodeURIComponent(`Golf Round Results - ${round.courseName}`);
    const body = encodeURIComponent(fullSummary);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast.success('Opening email...');
  };

  // Send to selected friends (in-app share)
  const handleSendToFriends = async () => {
    if (selectedFriendIds.size === 0) {
      toast.error('Select at least one friend');
      return;
    }

    setIsSending(true);
    hapticLight();

    // Send push notification to selected friends
    const friendIds = Array.from(selectedFriendIds);
    try {
      await sendPushToProfiles({
        profileIds: friendIds,
        title: 'Round results shared ⛳',
        body: `Check out the results from ${round?.courseName ?? 'a recent round'}`,
        data: { roundId: round?.id, route: round?.id ? `/round/${round.id}/complete` : undefined },
        type: 'roundCompleted',
      });
    } catch {
      // Push is non-critical — continue with success flow
    }

    hapticSuccess();
    toast.success(`Shared with ${selectedFriendIds.size} friend${selectedFriendIds.size > 1 ? 's' : ''}!`);
    setSelectedFriendIds(new Set());
    setIsSending(false);
    onClose();
  };

  // Share option rows config
  const shareOptions = [
    {
      label: 'Share',
      icon: <Share2 className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#14532D]',
      onClick: handleNativeShare,
    },
    {
      label: 'Messages',
      icon: <MessageSquare className="w-5 h-5 text-foreground" />,
      iconBg: 'bg-muted',
      onClick: handleSMS,
    },
    {
      label: 'Email',
      icon: <Mail className="w-5 h-5 text-foreground" />,
      iconBg: 'bg-muted',
      onClick: handleEmail,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F1F17]/40 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-[28px] z-50 max-h-[90vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-3 mt-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 shrink-0">
              <h3 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground">
                Share results
              </h3>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5 text-foreground" />
              </motion.button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pb-4">
              {/* Share preview card */}
              <div className="bg-card rounded-[20px] border border-border mx-5 mb-4 overflow-hidden">
                <div className="p-4">
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    MATCH Golf · Preview
                  </p>
                  <p className="font-bold text-[18px] tracking-[-0.01em] mt-0.5 text-foreground">
                    {round.courseName}
                  </p>
                  {winner && (
                    <p className="text-[13px] mt-1 text-muted-foreground">
                      {hasTie ? (
                        <span>Tied</span>
                      ) : (
                        <>
                          Winner: <span className="text-[#14532D] font-bold">{winner.name}</span>
                        </>
                      )}
                    </p>
                  )}
                  <div className="mt-3 p-3 rounded-[14px] bg-muted text-[12px] font-mono whitespace-pre-wrap max-h-28 overflow-y-auto text-foreground/80">
                    {shortSummary}
                  </div>
                </div>
              </div>

              {/* Section label */}
              <p className="text-[13px] font-semibold text-muted-foreground px-6 mb-2">
                Share via
              </p>

              {/* Share option rows */}
              {shareOptions.map((option, index) => (
                <motion.button
                  key={option.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={option.onClick}
                  className="bg-card rounded-[20px] border border-border mx-5 mb-2 px-4 min-h-[60px] flex items-center gap-3 w-[calc(100%-40px)]"
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', option.iconBg)}>
                    {option.icon}
                  </div>
                  <span className="text-[16px] font-semibold text-foreground">{option.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </motion.button>
              ))}

              {/* Copy link button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCopy}
                className="bg-[#0F1F17] text-white rounded-[20px] h-[60px] text-[16px] font-semibold mx-5 mt-3 w-[calc(100%-40px)] flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy summary
                  </>
                )}
              </motion.button>

              {/* Friends Section */}
              {friendsNotInRound.length > 0 && (
                <div className="mt-6">
                  {/* Section label */}
                  <p className="text-[13px] font-semibold text-muted-foreground px-6 mb-2">
                    Send to friends ({selectedFriendIds.size} selected)
                  </p>

                  {friendsLoading ? (
                    <div className="py-8 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-0 max-h-48 overflow-y-auto">
                      {friendsNotInRound.map((friend, index) => (
                        <motion.button
                          key={friend.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleFriend(friend.id)}
                          className={cn(
                            'bg-card rounded-[20px] border border-border mx-5 mb-2 px-4 min-h-[60px] flex items-center gap-3 w-[calc(100%-40px)] transition-all',
                            selectedFriendIds.has(friend.id) && 'border-[#14532D] ring-1 ring-[#14532D]'
                          )}
                        >
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {friend.avatarUrl ? (
                              <img
                                src={friend.avatarUrl}
                                alt={friend.fullName || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-foreground">
                                {(friend.fullName || '?')[0].toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Name */}
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">
                              {friend.fullName || 'Unknown'}
                            </p>
                            {friend.handicap !== null && (
                              <p className="text-xs text-muted-foreground">
                                HCP {friend.handicap}
                              </p>
                            )}
                          </div>

                          {/* Checkbox */}
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                              selectedFriendIds.has(friend.id)
                                ? 'bg-[#14532D] border-[#14532D]'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {selectedFriendIds.has(friend.id) && (
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {friendsNotInRound.length === 0 && !friendsLoading && (
                <div className="py-6 text-center mt-4">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    All your friends were in this round!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the share buttons above to send results
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Action — send to friends */}
            {friendsNotInRound.length > 0 && selectedFriendIds.size > 0 && (
              <div className="px-5 pb-5 pt-2 shrink-0 border-t border-border">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSendToFriends}
                  disabled={isSending}
                  className="bg-[#0F1F17] text-white rounded-[20px] h-[60px] text-[16px] font-semibold w-full flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Send to {selectedFriendIds.size} friend{selectedFriendIds.size > 1 ? 's' : ''}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
