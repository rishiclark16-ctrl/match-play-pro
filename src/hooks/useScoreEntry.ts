import { useCallback } from 'react';
import { toast } from 'sonner';
import { hapticSuccess } from '@/lib/haptics';
import { fireScoreSideEffects as fireScoreSideEffectsImpl } from '@/lib/scoreSideEffects';
import type { PlayerWithScores, Round } from '@/types/golf';

interface ScoreEntryUser {
  id: string;
  user_metadata?: { full_name?: string };
}

interface UseScoreEntryArgs {
  round: Round | null;
  user: ScoreEntryUser | null;
  playersWithScores: PlayerWithScores[];
  currentHole: number;
  currentHolePar: number;
  selectedPlayerId: string | null;
  saveScoreToSupabase: (playerId: string, hole: number, score: number) => void;
  setPlayerScore: (roundId: string, playerId: string, hole: number, score: number) => void;
}

interface UseScoreEntryReturn {
  /**
   * Persists a score for an arbitrary player on the current hole. No haptic,
   * no toast — used by voice scoring where audio feedback already fires.
   */
  handleSaveScore: (playerId: string, score: number) => void;
  /**
   * Persists a score from the +/- quick score buttons on each PlayerCard.
   * Adds a haptic success.
   */
  handleQuickScore: (playerId: string, score: number) => void;
  /**
   * Persists a score from the score-input modal for the currently selected
   * player. Adds a haptic + success toast. No-op if no player is selected.
   */
  handleScoreSelect: (score: number) => void;
  /**
   * Fires the hole-in-one / eagle / score-entered-for-you push notification
   * side effects. Exposed so other code paths (voice, etc.) can re-use the
   * same fire-and-forget hype pipeline.
   */
  fireScoreSideEffects: (playerId: string, score: number) => void;
}

/**
 * Score-entry handlers used by Scorecard.tsx. Centralizes the three save
 * paths (voice / quick buttons / modal) so they share identical persistence
 * logic and side effects:
 *  - Optimistic Supabase upsert via `saveScoreToSupabase`.
 *  - Local-store mirror via `setPlayerScore` for offline fallback.
 *  - Fire-and-forget `fireScoreSideEffects` for hole-in-one / eagle pushes.
 *
 * Extracted from Scorecard.tsx so the page stays focused on render
 * orchestration. Behavior is unchanged — the only difference vs. the inline
 * versions is that the modal handler now keys off the snapshot of
 * `selectedPlayerId` passed in via the args object.
 */
export function useScoreEntry({
  round,
  user,
  playersWithScores,
  currentHole,
  currentHolePar,
  selectedPlayerId,
  saveScoreToSupabase,
  setPlayerScore,
}: UseScoreEntryArgs): UseScoreEntryReturn {
  // Fire hole-in-one / eagle / score-entered-for-you side-effect pushes.
  // Non-critical — never throws, never blocks save.
  const fireScoreSideEffects = useCallback(
    (playerId: string, score: number) => {
      if (!round || !user) return;
      fireScoreSideEffectsImpl({
        round,
        user,
        playersWithScores,
        currentHole,
        currentHolePar,
        playerId,
        score,
      });
    },
    [round, user, playersWithScores, currentHole, currentHolePar],
  );

  const handleSaveScore = useCallback(
    (playerId: string, score: number) => {
      if (!round) return;
      saveScoreToSupabase(playerId, currentHole, score);
      setPlayerScore(round.id, playerId, currentHole, score);
      fireScoreSideEffects(playerId, score);
    },
    [round, currentHole, saveScoreToSupabase, setPlayerScore, fireScoreSideEffects],
  );

  const handleQuickScore = useCallback(
    (playerId: string, score: number) => {
      if (!round) return;
      hapticSuccess();
      saveScoreToSupabase(playerId, currentHole, score);
      setPlayerScore(round.id, playerId, currentHole, score);
      fireScoreSideEffects(playerId, score);
    },
    [round, currentHole, saveScoreToSupabase, setPlayerScore, fireScoreSideEffects],
  );

  const handleScoreSelect = useCallback(
    (score: number) => {
      if (selectedPlayerId && round) {
        hapticSuccess();
        saveScoreToSupabase(selectedPlayerId, currentHole, score);
        setPlayerScore(round.id, selectedPlayerId, currentHole, score);
        fireScoreSideEffects(selectedPlayerId, score);
        toast.success('Score saved', { duration: 1500 });
      }
    },
    [selectedPlayerId, round, currentHole, saveScoreToSupabase, setPlayerScore, fireScoreSideEffects],
  );

  return {
    handleSaveScore,
    handleQuickScore,
    handleScoreSelect,
    fireScoreSideEffects,
  };
}
