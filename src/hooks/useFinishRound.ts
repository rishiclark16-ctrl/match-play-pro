import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { capture } from '@/lib/posthog';

interface UseFinishRoundArgs {
  round: { id: string; courseName: string; holes: number } | null;
  playerCount: number;
  completeRoundSupabase: () => void;
  completeRoundLocal: (roundId: string) => void;
  sendRoundCompletionNotifications: () => Promise<void> | void;
  setShowWinnerModal: (open: boolean) => void;
}

interface UseFinishRoundReturn {
  /** Finishes the round, fires notifications + analytics, navigates to /complete. */
  handleFinishRound: () => void;
  /**
   * Same as handleFinishRound but first dismisses the winner-confirmation modal
   * (used by the playoff/winner confirmation flow).
   */
  handleFinishWithWinner: () => void;
}

/**
 * Encapsulates the two ways a round can be marked complete from the scorecard:
 *  - direct finish (all holes scored, manual end)
 *  - finish with explicit winner from a playoff/dialog
 *
 * Both paths call completeRound on supabase + local store, fire push
 * notifications, send a posthog event, and navigate to the round-complete
 * page. Extracted from Scorecard.tsx so the page stays focused on render
 * orchestration.
 */
export function useFinishRound({
  round,
  playerCount,
  completeRoundSupabase,
  completeRoundLocal,
  sendRoundCompletionNotifications,
  setShowWinnerModal,
}: UseFinishRoundArgs): UseFinishRoundReturn {
  const navigate = useNavigate();

  const finish = useCallback(() => {
    if (!round) return;
    completeRoundSupabase();
    completeRoundLocal(round.id);
    sendRoundCompletionNotifications();
    capture('round_completed', {
      round_id: round.id,
      course_name: round.courseName,
      holes: round.holes,
      player_count: playerCount,
    });
    navigate(`/round/${round.id}/complete`);
  }, [round, completeRoundSupabase, completeRoundLocal, sendRoundCompletionNotifications, playerCount, navigate]);

  const handleFinishRound = useCallback(() => {
    finish();
  }, [finish]);

  const handleFinishWithWinner = useCallback(() => {
    setShowWinnerModal(false);
    finish();
  }, [finish, setShowWinnerModal]);

  return { handleFinishRound, handleFinishWithWinner };
}
