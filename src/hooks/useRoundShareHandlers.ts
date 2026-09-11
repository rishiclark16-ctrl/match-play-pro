import { useState } from 'react';
import { toast } from 'sonner';
import { Player, PlayerWithScores, Round, Score } from '@/types/golf';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { shareResults, shareText } from '@/lib/shareResults';

interface UseRoundShareHandlersArgs {
  round: Round | null;
  playersWithScores: PlayerWithScores[];
  rawScores: Score[];
}

interface UseRoundShareHandlersResult {
  isSharing: boolean;
  shareMode: 'image' | 'text' | null;
  handleShareImage: () => Promise<void>;
  handleShareText: () => Promise<void>;
}

/**
 * Wraps the two share entrypoints used on RoundComplete:
 * - Image share (canvas → native share sheet, falls back to text on failure).
 * - Text share (native share sheet or clipboard copy).
 *
 * State + side effects (toasts, haptics) match the previous inline handlers
 * exactly; the page just consumes the returned handlers.
 */
export function useRoundShareHandlers({
  round,
  playersWithScores,
  rawScores,
}: UseRoundShareHandlersArgs): UseRoundShareHandlersResult {
  const [isSharing, setIsSharing] = useState(false);
  const [shareMode, setShareMode] = useState<'image' | 'text' | null>(null);

  const handleShareImage = async () => {
    if (!round) return;
    hapticLight();
    setIsSharing(true);
    setShareMode('image');

    const players: Player[] = playersWithScores.map(p => ({
      id: p.id,
      roundId: round.id,
      name: p.name,
      handicap: p.handicap,
      orderIndex: 0,
    }));

    try {
      await shareResults(round, players, rawScores);
      hapticSuccess();
      toast.success('Results shared!');
    } catch {
      hapticError();
      toast.error('Failed to share. Trying text instead...');
      try {
        await shareText(round, playersWithScores);
        hapticSuccess();
        toast.success('Results copied to clipboard!');
      } catch {
        toast.error('Share failed. Please try again.');
      }
    } finally {
      setIsSharing(false);
      setShareMode(null);
    }
  };

  const handleShareText = async () => {
    if (!round) return;
    hapticLight();
    setIsSharing(true);
    setShareMode('text');

    try {
      await shareText(round, playersWithScores);
      hapticSuccess();
      toast.success(navigator.share ? 'Results shared!' : 'Results copied to clipboard!');
    } catch {
      hapticError();
      toast.error('Failed to share');
    } finally {
      setIsSharing(false);
      setShareMode(null);
    }
  };

  return {
    isSharing,
    shareMode,
    handleShareImage,
    handleShareText,
  };
}
