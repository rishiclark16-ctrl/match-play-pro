import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceScoring } from './useVoiceScoring';

// Mock dependencies
vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: vi.fn(),
}));

vi.mock('@/lib/voiceParser', () => ({
  parseVoiceInput: vi.fn(),
  parseVoiceCorrection: vi.fn(),
}));

vi.mock('@/lib/voiceCommands', () => ({
  parseVoiceCommands: vi.fn(),
  hasScoreContent: vi.fn(),
}));

vi.mock('@/lib/voiceFeedback', () => ({
  feedbackListeningStart: vi.fn(),
  feedbackListeningStop: vi.fn(),
  feedbackVoiceSuccess: vi.fn(),
  feedbackVoiceError: vi.fn(),
  feedbackAllScored: vi.fn(),
  feedbackNextHole: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceInput, parseVoiceCorrection } from '@/lib/voiceParser';
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

const mockPlayers = [
  { id: 'p1', name: 'Michael Johnson' },
  { id: 'p2', name: 'Bob Smith' },
  { id: 'p3', name: 'Tim Davis' },
  { id: 'p4', name: 'Adam Wilson' },
];

const defaultOptions = {
  players: mockPlayers,
  currentHole: 1,
  totalHoles: 18,
  par: 4,
  games: [],
  onScoreSaved: vi.fn(),
  onNavigateToHole: vi.fn(),
  onFinishRound: vi.fn(),
  continuousVoice: true,
  alwaysConfirmVoice: false,
};

describe('useVoiceScoring', () => {
  let mockVoiceRecognition: {
    isListening: boolean;
    isProcessing: boolean;
    isSupported: boolean;
    startListening: ReturnType<typeof vi.fn>;
    stopListening: ReturnType<typeof vi.fn>;
    transcript: string;
    error: string | null;
    reset: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default voice recognition mock
    mockVoiceRecognition = {
      isListening: false,
      isProcessing: false,
      isSupported: true,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      transcript: '',
      error: null,
      reset: vi.fn(),
    };

    vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);
    vi.mocked(parseVoiceCommands).mockReturnValue([]);
    vi.mocked(hasScoreContent).mockReturnValue(false);
    vi.mocked(parseVoiceCorrection).mockReturnValue(null);
    vi.mocked(parseVoiceInput).mockReturnValue({
      success: false,
      scores: [],
      unrecognized: [],
      rawTranscript: '',
      confidence: 'low',
      confidenceReason: 'No scores parsed',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      expect(result.current.isListening).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.showVoiceModal).toBe(false);
      expect(result.current.parseResult).toBeNull();
      expect(result.current.voiceSuccessPlayerIds.size).toBe(0);
    });

    it('should reflect isSupported from useVoiceRecognition', () => {
      mockVoiceRecognition.isSupported = false;
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('handleVoicePress', () => {
    it('should start listening when not listening', () => {
      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      act(() => {
        result.current.handleVoicePress();
      });

      expect(mockVoiceRecognition.startListening).toHaveBeenCalled();
    });

    it('should stop listening when already listening', () => {
      mockVoiceRecognition.isListening = true;
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      act(() => {
        result.current.handleVoicePress();
      });

      expect(mockVoiceRecognition.stopListening).toHaveBeenCalled();
    });

    it('should show error toast when voice not supported', () => {
      mockVoiceRecognition.isSupported = false;
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      act(() => {
        result.current.handleVoicePress();
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Voice not supported. Use Chrome or Safari.',
        expect.any(Object)
      );
    });
  });

  describe('listening state feedback', () => {
    it('should trigger feedbackListeningStart when listening starts', () => {
      const { rerender } = renderHook(() => useVoiceScoring(defaultOptions));

      // Simulate listening state change
      mockVoiceRecognition.isListening = true;
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      rerender();

      expect(feedbackListeningStart).toHaveBeenCalled();
    });

    it('should trigger feedbackListeningStop when listening stops and processing', () => {
      // Start with listening
      mockVoiceRecognition.isListening = true;
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      const { rerender } = renderHook(() => useVoiceScoring(defaultOptions));

      // Then stop listening and start processing
      mockVoiceRecognition.isListening = false;
      mockVoiceRecognition.isProcessing = true;
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      rerender();

      expect(feedbackListeningStop).toHaveBeenCalled();
    });
  });

  describe('processing transcripts', () => {
    describe('navigation commands', () => {
      it('should navigate to next hole on "next hole" command', () => {
        const onNavigateToHole = vi.fn();

        vi.mocked(parseVoiceCommands).mockReturnValue([
          { type: 'next_hole' },
        ]);

        mockVoiceRecognition.transcript = 'next hole';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            currentHole: 5,
            onNavigateToHole,
          })
        );

        expect(onNavigateToHole).toHaveBeenCalledWith(6);
        expect(feedbackNextHole).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalled();
      });

      it('should navigate to previous hole on "previous hole" command', () => {
        const onNavigateToHole = vi.fn();

        vi.mocked(parseVoiceCommands).mockReturnValue([
          { type: 'previous_hole' },
        ]);

        mockVoiceRecognition.transcript = 'previous hole';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            currentHole: 5,
            onNavigateToHole,
          })
        );

        expect(onNavigateToHole).toHaveBeenCalledWith(4);
      });

      it('should navigate to specific hole on "go to hole X" command', () => {
        const onNavigateToHole = vi.fn();

        vi.mocked(parseVoiceCommands).mockReturnValue([
          { type: 'go_to_hole', holeNumber: 14 },
        ]);

        mockVoiceRecognition.transcript = 'go to hole 14';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            onNavigateToHole,
          })
        );

        expect(onNavigateToHole).toHaveBeenCalledWith(14);
      });

      it('should not go below hole 1', () => {
        const onNavigateToHole = vi.fn();

        vi.mocked(parseVoiceCommands).mockReturnValue([
          { type: 'previous_hole' },
        ]);

        mockVoiceRecognition.transcript = 'previous hole';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            currentHole: 1,
            onNavigateToHole,
          })
        );

        expect(onNavigateToHole).not.toHaveBeenCalled();
      });

      it('should not exceed total holes', () => {
        const onNavigateToHole = vi.fn();

        vi.mocked(parseVoiceCommands).mockReturnValue([
          { type: 'next_hole' },
        ]);

        mockVoiceRecognition.transcript = 'next hole';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            currentHole: 18,
            totalHoles: 18,
            onNavigateToHole,
          })
        );

        expect(onNavigateToHole).not.toHaveBeenCalled();
      });
    });

    describe('finish round command', () => {
      it('should call onFinishRound when finish command detected', () => {
        const onFinishRound = vi.fn();

        mockVoiceRecognition.transcript = 'finish round';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            onFinishRound,
          })
        );

        expect(onFinishRound).toHaveBeenCalled();
        expect(feedbackVoiceSuccess).toHaveBeenCalled();
      });

      it('should recognize various finish patterns', () => {
        const onFinishRound = vi.fn();

        const finishPhrases = ["we're done", 'end the round', 'round is complete'];

        finishPhrases.forEach((phrase) => {
          vi.clearAllMocks();

          mockVoiceRecognition.transcript = phrase;
          vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

          renderHook(() =>
            useVoiceScoring({
              ...defaultOptions,
              onFinishRound,
            })
          );

          expect(onFinishRound).toHaveBeenCalled();
        });
      });
    });

    describe('correction commands', () => {
      it('should apply correction immediately', () => {
        const onScoreSaved = vi.fn();

        vi.mocked(parseVoiceCorrection).mockReturnValue({
          type: 'correction',
          playerId: 'p1',
          playerName: 'Michael Johnson',
          newScore: 6,
        });

        mockVoiceRecognition.transcript = 'change Mike to 6';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            onScoreSaved,
          })
        );

        expect(onScoreSaved).toHaveBeenCalledWith('p1', 6);
        expect(feedbackVoiceSuccess).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
      });
    });

    describe('score input', () => {
      it('should save scores immediately with high confidence', () => {
        const onScoreSaved = vi.fn();

        vi.mocked(hasScoreContent).mockReturnValue(true);
        vi.mocked(parseVoiceInput).mockReturnValue({
          success: true,
          scores: [
            { playerId: 'p1', playerName: 'Michael Johnson', score: 4 },
            { playerId: 'p2', playerName: 'Bob Smith', score: 5 },
            { playerId: 'p3', playerName: 'Tim Davis', score: 4 },
            { playerId: 'p4', playerName: 'Adam Wilson', score: 6 },
          ],
          unrecognized: [],
          rawTranscript: 'Mike 4, Bob 5, Tim 4, Adam 6',
          confidence: 'high',
          confidenceReason: 'All players matched',
        });

        mockVoiceRecognition.transcript = 'Mike 4, Bob 5, Tim 4, Adam 6';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            onScoreSaved,
          })
        );

        expect(onScoreSaved).toHaveBeenCalledTimes(4);
        expect(onScoreSaved).toHaveBeenCalledWith('p1', 4);
        expect(onScoreSaved).toHaveBeenCalledWith('p2', 5);
        expect(onScoreSaved).toHaveBeenCalledWith('p3', 4);
        expect(onScoreSaved).toHaveBeenCalledWith('p4', 6);
        expect(feedbackAllScored).toHaveBeenCalled();
        expect(result.current.showVoiceModal).toBe(false);
      });

      it('should show modal for medium confidence scores', () => {
        vi.mocked(hasScoreContent).mockReturnValue(true);
        vi.mocked(parseVoiceInput).mockReturnValue({
          success: true,
          scores: [
            { playerId: 'p1', playerName: 'Michael Johnson', score: 4 },
          ],
          unrecognized: ['something'],
          rawTranscript: 'Mike 4 something',
          confidence: 'medium',
          confidenceReason: 'Partial match',
        });

        mockVoiceRecognition.transcript = 'Mike 4 something';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() => useVoiceScoring(defaultOptions));

        expect(result.current.showVoiceModal).toBe(true);
        expect(result.current.parseResult).not.toBeNull();
      });

      it('should show modal for low confidence / no scores', () => {
        vi.mocked(hasScoreContent).mockReturnValue(true);
        vi.mocked(parseVoiceInput).mockReturnValue({
          success: false,
          scores: [],
          unrecognized: ['random text'],
          rawTranscript: 'random text',
          confidence: 'low',
          confidenceReason: 'No scores parsed',
        });

        mockVoiceRecognition.transcript = 'random text';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() => useVoiceScoring(defaultOptions));

        expect(result.current.showVoiceModal).toBe(true);
        expect(feedbackVoiceError).toHaveBeenCalled();
      });

      it('should show modal when alwaysConfirmVoice is true even for high confidence', () => {
        const onScoreSaved = vi.fn();

        vi.mocked(hasScoreContent).mockReturnValue(true);
        vi.mocked(parseVoiceInput).mockReturnValue({
          success: true,
          scores: [
            { playerId: 'p1', playerName: 'Michael Johnson', score: 4 },
            { playerId: 'p2', playerName: 'Bob Smith', score: 5 },
            { playerId: 'p3', playerName: 'Tim Davis', score: 4 },
            { playerId: 'p4', playerName: 'Adam Wilson', score: 6 },
          ],
          unrecognized: [],
          rawTranscript: 'all scores',
          confidence: 'high',
          confidenceReason: 'All players matched',
        });

        mockVoiceRecognition.transcript = 'all scores';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            onScoreSaved,
            alwaysConfirmVoice: true,
          })
        );

        expect(onScoreSaved).not.toHaveBeenCalled();
        expect(result.current.showVoiceModal).toBe(true);
      });
    });

    describe('no score content', () => {
      it('should show error modal when no score content detected', () => {
        vi.mocked(hasScoreContent).mockReturnValue(false);

        mockVoiceRecognition.transcript = 'hello world';
        vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() => useVoiceScoring(defaultOptions));

        expect(result.current.showVoiceModal).toBe(true);
        expect(result.current.parseResult?.confidence).toBe('low');
        expect(feedbackVoiceError).toHaveBeenCalled();
      });
    });
  });

  describe('handleVoiceConfirm', () => {
    it('should save confirmed scores and close modal', () => {
      const onScoreSaved = vi.fn();

      const { result } = renderHook(() =>
        useVoiceScoring({
          ...defaultOptions,
          onScoreSaved,
        })
      );

      const scores = [
        { playerId: 'p1', playerName: 'Michael Johnson', score: 4 },
        { playerId: 'p2', playerName: 'Bob Smith', score: 5 },
      ];

      act(() => {
        result.current.handleVoiceConfirm(scores);
      });

      expect(onScoreSaved).toHaveBeenCalledWith('p1', 4);
      expect(onScoreSaved).toHaveBeenCalledWith('p2', 5);
      expect(result.current.showVoiceModal).toBe(false);
      expect(result.current.parseResult).toBeNull();
      expect(feedbackVoiceSuccess).toHaveBeenCalled();
    });

    it('should restart listening in continuous mode', () => {
      const { result } = renderHook(() =>
        useVoiceScoring({
          ...defaultOptions,
          continuousVoice: true,
        })
      );

      act(() => {
        result.current.handleVoiceConfirm([{ playerId: 'p1', playerName: 'Mike', score: 4 }]);
      });

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(mockVoiceRecognition.startListening).toHaveBeenCalled();
    });
  });

  describe('handleVoiceRetry', () => {
    it('should close modal and restart listening', () => {
      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      // Set up modal as open
      act(() => {
        // Manually trigger the retry
        result.current.handleVoiceRetry();
      });

      expect(result.current.showVoiceModal).toBe(false);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockVoiceRecognition.startListening).toHaveBeenCalled();
    });
  });

  describe('closeVoiceModal', () => {
    it('should close modal and clear parse result', () => {
      vi.mocked(hasScoreContent).mockReturnValue(true);
      vi.mocked(parseVoiceInput).mockReturnValue({
        success: true,
        scores: [{ playerId: 'p1', playerName: 'Michael', score: 4 }],
        unrecognized: [],
        rawTranscript: 'Mike 4',
        confidence: 'medium',
        confidenceReason: 'Single player',
      });

      mockVoiceRecognition.transcript = 'Mike 4';
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      expect(result.current.showVoiceModal).toBe(true);

      act(() => {
        result.current.closeVoiceModal();
      });

      expect(result.current.showVoiceModal).toBe(false);
      expect(result.current.parseResult).toBeNull();
    });
  });

  describe('voice errors', () => {
    it('should show toast on voice error', () => {
      mockVoiceRecognition.error = 'Microphone access denied';
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      renderHook(() => useVoiceScoring(defaultOptions));

      expect(toast.error).toHaveBeenCalledWith('Microphone access denied');
      expect(mockVoiceRecognition.reset).toHaveBeenCalled();
    });
  });

  describe('continuous voice mode', () => {
    it('should restart listening after high confidence save', () => {
      vi.mocked(hasScoreContent).mockReturnValue(true);
      vi.mocked(parseVoiceInput).mockReturnValue({
        success: true,
        scores: [
          { playerId: 'p1', playerName: 'Michael Johnson', score: 4 },
          { playerId: 'p2', playerName: 'Bob Smith', score: 5 },
          { playerId: 'p3', playerName: 'Tim Davis', score: 4 },
          { playerId: 'p4', playerName: 'Adam Wilson', score: 6 },
        ],
        unrecognized: [],
        rawTranscript: 'all scores',
        confidence: 'high',
        confidenceReason: 'All players matched',
      });

      mockVoiceRecognition.transcript = 'all scores';
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      renderHook(() =>
        useVoiceScoring({
          ...defaultOptions,
          continuousVoice: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(mockVoiceRecognition.startListening).toHaveBeenCalled();
    });

    it('should not restart listening when continuousVoice is false', () => {
      vi.mocked(hasScoreContent).mockReturnValue(true);
      vi.mocked(parseVoiceInput).mockReturnValue({
        success: true,
        scores: [
          { playerId: 'p1', playerName: 'Michael Johnson', score: 4 },
          { playerId: 'p2', playerName: 'Bob Smith', score: 5 },
          { playerId: 'p3', playerName: 'Tim Davis', score: 4 },
          { playerId: 'p4', playerName: 'Adam Wilson', score: 6 },
        ],
        unrecognized: [],
        rawTranscript: 'all scores',
        confidence: 'high',
        confidenceReason: 'All players matched',
      });

      mockVoiceRecognition.transcript = 'all scores';
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      renderHook(() =>
        useVoiceScoring({
          ...defaultOptions,
          continuousVoice: false,
        })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockVoiceRecognition.startListening).not.toHaveBeenCalled();
    });
  });

  describe('voiceSuccessPlayerIds', () => {
    it('should set and clear success player ids after high confidence save', () => {
      vi.mocked(hasScoreContent).mockReturnValue(true);
      vi.mocked(parseVoiceInput).mockReturnValue({
        success: true,
        scores: [
          { playerId: 'p1', playerName: 'Michael Johnson', score: 4 },
          { playerId: 'p2', playerName: 'Bob Smith', score: 5 },
          { playerId: 'p3', playerName: 'Tim Davis', score: 4 },
          { playerId: 'p4', playerName: 'Adam Wilson', score: 6 },
        ],
        unrecognized: [],
        rawTranscript: 'all scores',
        confidence: 'high',
        confidenceReason: 'All players matched',
      });

      mockVoiceRecognition.transcript = 'all scores';
      vi.mocked(useVoiceRecognition).mockReturnValue(mockVoiceRecognition);

      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      expect(result.current.voiceSuccessPlayerIds.has('p1')).toBe(true);
      expect(result.current.voiceSuccessPlayerIds.has('p2')).toBe(true);
      expect(result.current.voiceSuccessPlayerIds.has('p3')).toBe(true);
      expect(result.current.voiceSuccessPlayerIds.has('p4')).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(result.current.voiceSuccessPlayerIds.size).toBe(0);
    });
  });
});
