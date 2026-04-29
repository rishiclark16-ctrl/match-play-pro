import { useCallback, useEffect } from 'react';
import { useVoiceScoring } from '@/hooks/useVoiceScoring';
import { useVoiceNicknames } from '@/hooks/useVoiceNicknames';
import { useHandsFreeVoice } from '@/hooks/useHandsFreeVoice';
import { setSpeechEnabled } from '@/lib/voiceFeedback';
import type { ParseResult, ParsedScore } from '@/lib/voiceParser';
import type { PlayerWithScores, GameConfig } from '@/types/golf';
import type { AppSettings } from '@/hooks/useSettings';

interface UseScorecardVoiceArgs {
  round: { id: string; holes: number; games?: GameConfig[] } | null;
  currentHole: number;
  currentHolePar: number;
  playersWithScores: PlayerWithScores[];
  settings: AppSettings;
  onSaveScore: (playerId: string, score: number) => void;
  onNavigateToHole: (hole: number) => void;
  onFinishRound: () => void;
  onOpenLeaderboard: () => void;
}

interface UseScorecardVoiceReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  showVoiceModal: boolean;
  parseResult: ParseResult | null;
  voiceSuccessPlayerIds: Set<string>;
  interimTranscript: string | null;
  audioLevel: number;
  isNoisy: boolean;
  isHandsFreeActive: boolean;
  handleVoicePress: () => void;
  handleVoiceConfirm: (scores: ParsedScore[]) => void;
  handleVoiceRetry: () => void;
  closeVoiceModal: () => void;
}

/**
 * Orchestrates the voice-scoring stack used by Scorecard.tsx:
 *   - Wires the speech-feedback toggle to the global voice setting.
 *   - Wraps useVoiceNicknames so the page can ignore nickname mechanics.
 *   - Configures useVoiceScoring with the right callbacks for the page
 *     (save score, navigate, finish, open leaderboard).
 *   - Layers useHandsFreeVoice on top so always-on listening mode works.
 *
 * Extracted from Scorecard.tsx so the page stays focused on render
 * orchestration. Behavior is unchanged: every dependency it consumes is
 * threaded through the args object so the caller still owns scoring side
 * effects, navigation, and overlay state.
 */
export function useScorecardVoice({
  round,
  currentHole,
  currentHolePar,
  playersWithScores,
  settings,
  onSaveScore,
  onNavigateToHole,
  onFinishRound,
  onOpenLeaderboard,
}: UseScorecardVoiceArgs): UseScorecardVoiceReturn {
  // Sync speech feedback setting whenever it changes
  useEffect(() => {
    setSpeechEnabled(settings.speechFeedback);
  }, [settings.speechFeedback]);

  // Voice nicknames for custom name learning. Currently consumed implicitly
  // by useVoiceScoring through the player names; we still call it so the
  // hook can run its persistence side effects.
  useVoiceNicknames();

  // Helper to get a player's current score on the current hole
  const getPlayerCurrentScore = useCallback(
    (playerId: string): number | null => {
      const player = playersWithScores.find(p => p.id === playerId);
      if (!player) return null;
      const holeScore = player.scores.find(s => s.holeNumber === currentHole);
      return holeScore?.strokes ?? null;
    },
    [playersWithScores, currentHole],
  );

  const {
    isListening,
    isProcessing,
    isSupported,
    showVoiceModal,
    parseResult,
    voiceSuccessPlayerIds,
    interimTranscript,
    audioLevel,
    isNoisy,
    handleVoicePress,
    handleVoiceConfirm,
    handleVoiceRetry,
    closeVoiceModal,
  } = useVoiceScoring({
    players: playersWithScores,
    currentHole,
    totalHoles: round?.holes || 18,
    par: currentHolePar,
    games: round?.games || [],
    onScoreSaved: onSaveScore,
    onNavigateToHole,
    onFinishRound,
    onOpenLeaderboard,
    getPlayerScore: getPlayerCurrentScore,
    continuousVoice: settings.continuousVoice,
    alwaysConfirmVoice: settings.alwaysConfirmVoice,
  });

  // Hands-free continuous voice mode
  const { isActive: isHandsFreeActive } = useHandsFreeVoice({
    onTranscript: useCallback(() => {
      // In hands-free mode, simulate a voice press to process the transcript
      // The useVoiceScoring hook handles the actual parsing
      handleVoicePress();
    }, [handleVoicePress]),
    enabled: settings.handsFreeVoice && !isListening && !showVoiceModal,
    playerNames: playersWithScores.map(p => p.name),
  });

  return {
    isListening,
    isProcessing,
    isSupported,
    showVoiceModal,
    parseResult,
    voiceSuccessPlayerIds,
    interimTranscript,
    audioLevel,
    isNoisy,
    isHandsFreeActive,
    handleVoicePress,
    handleVoiceConfirm,
    handleVoiceRetry,
    closeVoiceModal,
  };
}
