import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceInput, ParseResult, ParsedScore } from '@/lib/voiceParser';
import { parseVoiceCommands, hasScoreContent } from '@/lib/voiceCommands';
import {
  feedbackListeningStart,
  feedbackListeningStop,
  feedbackVoiceSuccess,
  feedbackVoiceError,
  feedbackAllScored,
  feedbackNextHole,
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
}

interface UseVoiceScoringReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  showVoiceModal: boolean;
  parseResult: ParseResult | null;
  voiceSuccessPlayerIds: Set<string>;
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
}: UseVoiceScoringOptions): UseVoiceScoringReturn {
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [voiceSuccessPlayerIds, setVoiceSuccessPlayerIds] = useState<Set<string>>(new Set());
  const previousIsListening = useRef(false);

  const {
    isListening,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
    transcript,
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

  // Process voice transcript when it arrives
  useEffect(() => {
    if (!transcript) return;

    const playerList = players.map(p => ({ id: p.id, name: p.name }));
    const commands = parseVoiceCommands(transcript, playerList, games);
    const navCommand = commands.find(c => c.type === 'next_hole' || c.type === 'previous_hole');

    if (navCommand) {
      if (navCommand.type === 'next_hole' && navCommand.holeNumber) {
        onNavigateToHole(Math.min(totalHoles, Math.max(1, navCommand.holeNumber)));
        feedbackNextHole();
        toast.info(`Hole ${navCommand.holeNumber}`, { duration: 1500 });
        resetVoice();
        return;
      } else if (navCommand.type === 'next_hole') {
        if (currentHole < totalHoles) {
          onNavigateToHole(currentHole + 1);
          feedbackNextHole();
          toast.info(`Hole ${currentHole + 1}`, { duration: 1500 });
        }
        resetVoice();
        return;
      } else if (navCommand.type === 'previous_hole') {
        if (currentHole > 1) {
          onNavigateToHole(currentHole - 1);
          feedbackNextHole();
          toast.info(`Hole ${currentHole - 1}`, { duration: 1500 });
        }
        resetVoice();
        return;
      }
    }

    if (hasScoreContent(transcript)) {
      const result = parseVoiceInput(transcript, playerList, par);

      if (result.confidence === 'high' && result.scores.length > 0) {
        // High confidence - save immediately
        result.scores.forEach(({ playerId, score }) => {
          onScoreSaved(playerId, score);
        });

        setVoiceSuccessPlayerIds(new Set(result.scores.map(s => s.playerId)));
        setTimeout(() => setVoiceSuccessPlayerIds(new Set()), 1500);

        if (result.scores.length === players.length) {
          feedbackAllScored();
          toast.success(`All ${result.scores.length} scores saved! 🎉`, { duration: 5000 });
        } else {
          feedbackVoiceSuccess();
          const scoresSummary = result.scores
            .map(s => `${s.playerName.split(' ')[0]} ${s.score}`)
            .join(', ');
          toast.success(scoresSummary, { duration: 5000 });
        }

        resetVoice();
      } else if (result.scores.length > 0) {
        // Medium confidence - show modal for confirmation
        setParseResult(result);
        setShowVoiceModal(true);
        resetVoice();
      } else {
        // Low confidence - show error modal
        feedbackVoiceError();
        setParseResult(result);
        setShowVoiceModal(true);
        resetVoice();
      }
    } else {
      // No score content detected
      feedbackVoiceError();
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
  }, [transcript, players, currentHole, totalHoles, par, games, onScoreSaved, onNavigateToHole, resetVoice]);

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
    toast.success(`${scores.length} score${scores.length > 1 ? 's' : ''} saved!`, { duration: 2000 });
  }, [onScoreSaved]);

  const handleVoiceRetry = useCallback(() => {
    setShowVoiceModal(false);
    setParseResult(null);
    setTimeout(() => {
      startListening();
    }, 300);
  }, [startListening]);

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
    handleVoicePress,
    handleVoiceConfirm,
    handleVoiceRetry,
    closeVoiceModal,
  };
}
