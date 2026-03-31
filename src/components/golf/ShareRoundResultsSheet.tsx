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

    // TODO: Implement in-app friend notification via Supabase
    // For now, show a success message
    await new Promise(resolve => setTimeout(resolve, 500));

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
      iconBg: 'bg-[#0A0A0A]',
      onClick: handleNativeShare,
    },
    {
      label: 'Messages',
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#22C55E]',
      onClick: handleSMS,
    },
    {
      label: 'Email',
      icon: <Mail className="w-5 h-5 text-white" />,
      iconBg: 'bg-blue-500',
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
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 bg-[#F8F8F6] rounded-t-3xl z-50 shadow-2xl max-h-[90vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 shrink-0">
              <h3 className="text-[20px] font-black tracking-[-0.04em] text-[#0A0A0A]">
                Share Results
              </h3>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pb-4">
              {/* Share preview card */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-4 overflow-hidden">
                {/* Top accent stripe */}
                <div className="h-1 bg-[#F0EE3A]" />
                <div className="p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    MATCH Golf
                  </p>
                  <p className="font-black text-[18px] tracking-[-0.04em] mt-1">
                    {round.courseName}
                  </p>
                  {winner && (
                    <p className="text-[13px] mt-1 text-muted-foreground">
                      {hasTie ? (
                        <span>Tied</span>
                      ) : (
                        <>
                          Winner: <span className="text-[#22C55E] font-black">{winner.name}</span>
                        </>
                      )}
                    </p>
                  )}
                  <div className="mt-3 p-3 rounded-xl bg-[#F8F8F6] text-[12px] font-mono whitespace-pre-wrap max-h-28 overflow-y-auto text-muted-foreground">
                    {shortSummary}
                  </div>
                </div>
              </div>

              {/* Section label */}
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-6 mb-3">
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
                  className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-2 px-4 py-3 flex items-center gap-3 w-[calc(100%-48px)]"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', option.iconBg)}>
                    {option.icon}
                  </div>
                  <span className="font-semibold text-foreground">{option.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </motion.button>
              ))}

              {/* Copy link button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCopy}
                className="bg-foreground text-background rounded-2xl h-[52px] font-bold mx-6 mt-3 w-[calc(100%-48px)] flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Summary
                  </>
                )}
              </motion.button>

              {/* Friends Section */}
              {friendsNotInRound.length > 0 && (
                <div className="mt-6">
                  {/* Section label */}
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-6 mb-3">
                    Send to Friends ({selectedFriendIds.size} selected)
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
                            'bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-2 px-4 py-3 flex items-center gap-3 w-[calc(100%-48px)] transition-all',
                            selectedFriendIds.has(friend.id) && 'ring-2 ring-foreground'
                          )}
                        >
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {friend.avatarUrl ? (
                              <img
                                src={friend.avatarUrl}
                                alt={friend.fullName || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground">
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
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                              selectedFriendIds.has(friend.id)
                                ? 'bg-foreground border-foreground'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {selectedFriendIds.has(friend.id) && (
                              <Check className="w-3 h-3 text-background" />
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
              <div className="px-6 pb-6 pt-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSendToFriends}
                  disabled={isSending}
                  className="bg-foreground text-background rounded-2xl h-[52px] font-bold w-full flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Send to {selectedFriendIds.size} Friend{selectedFriendIds.size > 1 ? 's' : ''}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
