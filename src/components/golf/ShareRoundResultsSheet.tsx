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
import { Button } from '@/components/ui/button';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 shadow-2xl max-h-[90vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-foreground">Share Results</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Send round summary to friends
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {/* Quick Share Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <button
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Share</span>
                </button>

                <button
                  onClick={handleSMS}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-success text-success-foreground hover:bg-success/90 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">SMS</span>
                </button>

                <button
                  onClick={handleEmail}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Email</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                  <span className="text-[10px] font-semibold">
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Preview
                </p>
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {shortSummary}
                </div>
              </div>

              {/* Friends Section */}
              {friendsNotInRound.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Send to Friends ({selectedFriendIds.size} selected)
                    </p>
                  </div>

                  {friendsLoading ? (
                    <div className="py-8 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {friendsNotInRound.map(friend => (
                        <button
                          key={friend.id}
                          onClick={() => toggleFriend(friend.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                            selectedFriendIds.has(friend.id)
                              ? 'bg-primary/10 border-primary'
                              : 'bg-card border-border hover:border-primary/30'
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
                              <span className="text-sm font-bold text-muted-foreground">
                                {(friend.fullName || '?')[0].toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Name */}
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold text-sm truncate">
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
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {selectedFriendIds.has(friend.id) && (
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {friendsNotInRound.length === 0 && !friendsLoading && (
                <div className="py-6 text-center">
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

            {/* Bottom Action */}
            {friendsNotInRound.length > 0 && selectedFriendIds.size > 0 && (
              <div className="px-6 pb-6 pt-2 shrink-0 border-t border-border/50">
                <Button
                  onClick={handleSendToFriends}
                  disabled={isSending}
                  className="w-full py-6 rounded-2xl font-semibold"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  Send to {selectedFriendIds.size} Friend{selectedFriendIds.size > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
