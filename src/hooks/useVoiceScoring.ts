import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceInput, parseVoiceCorrection, ParseResult, ParsedScore } from '@/lib/voiceParser';
import { parseVoiceCommands, hasScoreContent } from '@/lib/voiceCommands';
import {
  feedbackListeningStart,
  feedbackListeningStop,
  feedbackVoiceSuccess,
  feedbackVoiceError,
  feedbackAllScored,
  feedbackNextHole,
  speakScoreConfirmation,
  speakAllScored,
  speakError,
  speakCorrection,
  speakNavigation,
  speakScoreQuery,
  speakMissingPlayers,
  setSpeechEnabled,
} from '@/lib/voiceFeedback';
import { toast } from 'sonner';
import { GameConfig } from '@/types/golf';

interface Player {
  id: string;
  name: string;
}

interface UseVoiceScoringOptions {
  players: Player[];
  currentHole: number;
  totalHoles: number;
  par: number;
  games: GameConfig[];
  onScoreSaved: (playerId: string, score: number) => void;
  onNavigateToHole: (hole: number) => void;
  onFinishRound?: () => void;
  onClearHole?: () => void;
  onSkipHole?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenGameBuilder?: () => void;
  getPlayerScore?: (playerId: string) => number | null;
  continuousVoice?: boolean;
  alwaysConfirmVoice?: boolean;
}

interface UseVoiceScoringReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  showVoiceModal: boolean;
  parseResult: ParseResult | null;
  voiceSuccessPlayerIds: Set<string>;
  interimTranscript: string | null;
  audioLevel: number;
  isNoisy: boolean;
  handleVoicePress: () => void;
  handleVoiceConfirm: (scores: ParsedScore[]) => void;
  handleVoiceRetry: () => void;
  closeVoiceModal: () => void;
}

export function useVoiceScoring({
  players,
  currentHole,
  totalHoles,
  par,
  games,
  onScoreSaved,
  onNavigateToHole,
  onFinishRound,
  onClearHole,
  onSkipHole,
  onOpenLeaderboard,
  onOpenGameBuilder,
  getPlayerScore,
  continuousVoice = true,
  alwaysConfirmVoice = false,
}: UseVoiceScoringOptions): UseVoiceScoringReturn {
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [voiceSuccessPlayerIds, setVoiceSuccessPlayerIds] = useState<Set<string>>(new Set());
  const previousIsListening = useRef(false);
  const continuousVoiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isListening,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    alternatives,
    browserConfidence,
    audioLevel,
    isNoisy,
    error: voiceError,
    reset: resetVoice,
  } = useVoiceRecognition();

  // Track listening state changes for audio feedback
  useEffect(() => {
    if (isListening && !previousIsListening.current) {
      feedbackListeningStart();
    } else if (!isListening && previousIsListening.current && isProcessing) {
      feedbackListeningStop();
    }
    previousIsListening.current = isListening;
  }, [isListening, isProcessing]);

  const restartListeningForContinuousMode = useCallback(() => {
    if (continuousVoice && isSupported) {
      if (continuousVoiceTimeoutRef.current) {
        clearTimeout(continuousVoiceTimeoutRef.current);
      }
      continuousVoiceTimeoutRef.current = setTimeout(() => {
        startListening();
      }, 1500);
    }
  }, [continuousVoice, isSupported, startListening]);

  // Adjust confidence based on browser's Speech API confidence score
  const adjustConfidence = useCallback((result: ParseResult): ParseResult => {
    if (browserConfidence === null) return result;

    // If browser confidence is low, downgrade our confidence
    if (browserConfidence < 0.3 && result.confidence === 'high') {
      return { ...result, confidence: 'medium', confidenceReason: 'Low speech recognition confidence' };
    }
    if (browserConfidence < 0.5 && result.confidence === 'high') {
      return { ...result, confidence: 'medium', confidenceReason: `Speech confidence: ${Math.round(browserConfidence * 100)}%` };
    }

    return result;
  }, [browserConfidence]);

  // Try parsing alternatives if primary transcript fails
  const tryAlternatives = useCallback((playerList: Array<{ id: string; name: string }>): ParseResult | null => {
    for (const alt of alternatives) {
      if (hasScoreContent(alt)) {
        const result = parseVoiceInput(alt, playerList, par);
        if (result.scores.length > 0 && result.confidence !== 'low') {
          return result;
        }
      }
    }
    return null;
  }, [alternatives, par]);

  // Process voice transcript when it arrives
  useEffect(() => {
    if (!transcript) return;

    const playerList = players.map(p => ({ id: p.id, name: p.name }));
    const commands = parseVoiceCommands(transcript, playerList, games);
    const normalizedTranscript = transcript.toLowerCase().trim();

    // Check for finish round command
    const finishPatterns = [
      /\b(?:finish|end|complete|done\s+with)\s+(?:the\s+)?round\b/i,
      /\bround\s+(?:is\s+)?(?:finished|complete|done|over)\b/i,
      /\bwe'?re?\s+done\b/i,
      /\bthat'?s?\s+(?:it|the\s+round)\b/i,
    ];

    if (finishPatterns.some(p => p.test(normalizedTranscript)) && onFinishRound) {
      feedbackVoiceSuccess();
      toast.success('Finishing round...', { duration: 1500 });
      onFinishRound();
      resetVoice();
      return;
    }

    // Handle new command types
    const clearCmd = commands.find(c => c.type === 'clear_hole');
    if (clearCmd && onClearHole) {
      feedbackVoiceSuccess();
      toast.success('Scores cleared for this hole', { duration: 2000 });
      onClearHole();
      resetVoice();
      restartListeningForContinuousMode();
      return;
    }

    const skipCmd = commands.find(c => c.type === 'skip_hole');
    if (skipCmd && onSkipHole) {
      feedbackVoiceSuccess();
      toast.info('Hole skipped', { duration: 1500 });
      onSkipHole();
      resetVoice();
      restartListeningForContinuousMode();
      return;
    }

    const queryScoreCmd = commands.find(c => c.type === 'query_score');
    if (queryScoreCmd && queryScoreCmd.queryPlayerId && getPlayerScore) {
      const score = getPlayerScore(queryScoreCmd.queryPlayerId);
      if (score !== null) {
        speakScoreQuery(queryScoreCmd.queryPlayerName || '', score, currentHole);
        toast.info(`${(queryScoreCmd.queryPlayerName || '').split(' ')[0]}: ${score}`, { duration: 2000 });
      } else {
        toast.info(`${(queryScoreCmd.queryPlayerName || '').split(' ')[0]} hasn't scored yet`, { duration: 2000 });
      }
      resetVoice();
      restartListeningForContinuousMode();
      return;
    }

    const queryMissingCmd = commands.find(c => c.type === 'query_missing');
    if (queryMissingCmd && getPlayerScore) {
      const missing = players.filter(p => getPlayerScore(p.id) === null);
      if (missing.length === 0) {
        toast.success('Everyone has scored!', { duration: 2000 });
      } else {
        const names = missing.map(p => p.name);
        speakMissingPlayers(names);
        toast.info(`Waiting: ${names.map(n => n.split(' ')[0]).join(', ')}`, { duration: 3000 });
      }
      resetVoice();
      restartListeningForContinuousMode();
      return;
    }

    const queryParCmd = commands.find(c => c.type === 'query_par');
    if (queryParCmd) {
      speakNavigation(currentHole, par);
      toast.info(`Hole ${currentHole} — Par ${par}`, { duration: 2000 });
      resetVoice();
      restartListeningForContinuousMode();
      return;
    }

    const leaderboardCmd = commands.find(c => c.type === 'query_leaderboard');
    if (leaderboardCmd && onOpenLeaderboard) {
      feedbackVoiceSuccess();
      onOpenLeaderboard();
      resetVoice();
      return;
    }

    const gameBuilderCmd = commands.find(c => c.type === 'start_game_builder');
    if (gameBuilderCmd && onOpenGameBuilder) {
      feedbackVoiceSuccess();
      toast.success('Opening game builder...', { duration: 1500 });
      onOpenGameBuilder();
      resetVoice();
      return;
    }

    const speechToggleCmd = commands.find(c => c.type === 'speech_toggle');
    if (speechToggleCmd) {
      setSpeechEnabled(!!speechToggleCmd.enabled);
      toast.success(speechToggleCmd.enabled ? 'Voice feedback on' : 'Voice feedback off', { duration: 1500 });
      resetVoice();
      restartListeningForContinuousMode();
      return;
    }

    // Check for navigation commands
    const navCommand = commands.find(c => c.type === 'next_hole' || c.type === 'previous_hole' || c.type === 'go_to_hole');

    if (navCommand) {
      if (navCommand.type === 'go_to_hole' && navCommand.holeNumber) {
        const targetHole = Math.min(totalHoles, Math.max(1, navCommand.holeNumber));
        onNavigateToHole(targetHole);
        feedbackNextHole();
        speakNavigation(targetHole);
        toast.info(`Hole ${targetHole}`, { duration: 1500 });
        resetVoice();
        restartListeningForContinuousMode();
        return;
      } else if (navCommand.type === 'next_hole' && navCommand.holeNumber) {
        const targetHole = Math.min(totalHoles, Math.max(1, navCommand.holeNumber));
        onNavigateToHole(targetHole);
        feedbackNextHole();
        speakNavigation(targetHole);
        toast.info(`Hole ${targetHole}`, { duration: 1500 });
        resetVoice();
        restartListeningForContinuousMode();
        return;
      } else if (navCommand.type === 'next_hole') {
        if (currentHole < totalHoles) {
          onNavigateToHole(currentHole + 1);
          feedbackNextHole();
          speakNavigation(currentHole + 1);
          toast.info(`Hole ${currentHole + 1}`, { duration: 1500 });
        }
        resetVoice();
        restartListeningForContinuousMode();
        return;
      } else if (navCommand.type === 'previous_hole') {
        if (currentHole > 1) {
          onNavigateToHole(currentHole - 1);
          feedbackNextHole();
          speakNavigation(currentHole - 1);
          toast.info(`Hole ${currentHole - 1}`, { duration: 1500 });
        }
        resetVoice();
        restartListeningForContinuousMode();
        return;
      }
    }

    // Check for correction commands first (e.g., "change Mike to 6")
    const correction = parseVoiceCorrection(transcript, playerList, par);
    if (correction) {
      onScoreSaved(correction.playerId, correction.newScore);
      feedbackVoiceSuccess();
      speakCorrection(correction.playerName, correction.newScore);
      toast.success(`${correction.playerName.split(' ')[0]} → ${correction.newScore}`, { duration: 2000 });
      resetVoice();
      restartListeningForContinuousMode();
      return;
    }

    if (hasScoreContent(transcript)) {
      let result = parseVoiceInput(transcript, playerList, par);

      // If primary transcript failed or got low confidence, try alternatives
      if ((result.scores.length === 0 || result.confidence === 'low') && alternatives.length > 0) {
        const altResult = tryAlternatives(playerList);
        if (altResult && altResult.scores.length > result.scores.length) {
          result = altResult;
        }
      }

      // Adjust confidence using browser's Speech API confidence score
      result = adjustConfidence(result);

      if (result.confidence === 'high' && result.scores.length > 0 && !alwaysConfirmVoice) {
        // High confidence - save immediately
        result.scores.forEach(({ playerId, score }) => {
          onScoreSaved(playerId, score);
        });

        setVoiceSuccessPlayerIds(new Set(result.scores.map(s => s.playerId)));
        setTimeout(() => setVoiceSuccessPlayerIds(new Set()), 1500);

        if (result.scores.length === players.length) {
          feedbackAllScored();
          speakAllScored(currentHole);
          toast.success(`All ${result.scores.length} scores saved!`, { duration: 5000 });
        } else {
          feedbackVoiceSuccess();
          speakScoreConfirmation(result.scores);
          const scoresSummary = result.scores
            .map(s => `${s.playerName.split(' ')[0]} ${s.score}`)
            .join(', ');
          toast.success(scoresSummary, { duration: 5000 });
        }

        resetVoice();
        restartListeningForContinuousMode();
      } else if (result.scores.length > 0) {
        // Medium confidence or alwaysConfirm - show modal for confirmation
        setParseResult(result);
        setShowVoiceModal(true);
        resetVoice();
      } else {
        // Low confidence - show error modal
        feedbackVoiceError();
        speakError();
        setParseResult(result);
        setShowVoiceModal(true);
        resetVoice();
      }
    } else {
      // No score content detected
      feedbackVoiceError();
      speakError();
      setParseResult({
        success: false,
        scores: [],
        unrecognized: [transcript],
        rawTranscript: transcript,
        confidence: 'low',
        confidenceReason: 'No score content detected',
      });
      setShowVoiceModal(true);
      resetVoice();
    }
  }, [transcript, players, currentHole, totalHoles, par, games, onScoreSaved, onNavigateToHole, onFinishRound, onClearHole, onSkipHole, onOpenLeaderboard, onOpenGameBuilder, getPlayerScore, resetVoice, alwaysConfirmVoice, restartListeningForContinuousMode, alternatives, adjustConfidence, tryAlternatives]);

  // Show voice errors
  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
      resetVoice();
    }
  }, [voiceError, resetVoice]);

  const handleVoicePress = useCallback(() => {
    if (isListening) {
      stopListening();
    } else if (!isSupported) {
      toast.error('Voice not supported. Use Chrome or Safari.', {
        description: 'Or tap players to enter scores manually.',
      });
    } else {
      startListening();
    }
  }, [isListening, isSupported, stopListening, startListening]);

  const handleVoiceConfirm = useCallback((scores: ParsedScore[]) => {
    scores.forEach(({ playerId, score }) => {
      onScoreSaved(playerId, score);
    });
    setShowVoiceModal(false);
    setParseResult(null);
    feedbackVoiceSuccess();
    speakScoreConfirmation(scores);
    toast.success(`${scores.length} score${scores.length > 1 ? 's' : ''} saved!`, { duration: 2000 });

    restartListeningForContinuousMode();
  }, [onScoreSaved, restartListeningForContinuousMode]);

  const handleVoiceRetry = useCallback(() => {
    setShowVoiceModal(false);
    setParseResult(null);
    setTimeout(() => {
      startListening();
    }, 300);
  }, [startListening]);

  // Clean up continuous voice timeout on unmount
  useEffect(() => {
    return () => {
      if (continuousVoiceTimeoutRef.current) {
        clearTimeout(continuousVoiceTimeoutRef.current);
        continuousVoiceTimeoutRef.current = null;
      }
    };
  }, []);

  const closeVoiceModal = useCallback(() => {
    setShowVoiceModal(false);
    setParseResult(null);
  }, []);

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
    handleVoicePress,
    handleVoiceConfirm,
    handleVoiceRetry,
    closeVoiceModal,
  };
}
