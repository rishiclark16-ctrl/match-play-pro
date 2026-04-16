import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceScoring } from './useVoiceScoring';

// Use vi.mock only for modules that do not have their own test files
// (to avoid contaminating voiceParser.test.ts / voiceFeedback.test.ts via shared module registry)
vi.mock('@/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Use spyOn (not vi.mock) for voiceParser, voiceCommands, and voiceFeedback to
// avoid contaminating their test files under bun's test runner.
import * as voiceParserModule from '@/lib/voiceParser';
import * as voiceCommandsModule from '@/lib/voiceCommands';
import * as voiceFeedbackModule from '@/lib/voiceFeedback';

import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { toast } from 'sonner';

// Accessor getters so test assertions see the live spy after beforeEach installs it
const feedbackListeningStart = () => voiceFeedbackModule.feedbackListeningStart;
const feedbackListeningStop = () => voiceFeedbackModule.feedbackListeningStop;
const feedbackVoiceSuccess = () => voiceFeedbackModule.feedbackVoiceSuccess;
const feedbackVoiceError = () => voiceFeedbackModule.feedbackVoiceError;
const feedbackAllScored = () => voiceFeedbackModule.feedbackAllScored;
const feedbackNextHole = () => voiceFeedbackModule.feedbackNextHole;

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

  let parseVoiceInputSpy: ReturnType<typeof vi.spyOn>;
  let parseVoiceCorrectionSpy: ReturnType<typeof vi.spyOn>;
  let parseVoiceCommandsSpy: ReturnType<typeof vi.spyOn>;
  let hasScoreContentSpy: ReturnType<typeof vi.spyOn>;
  const voiceFeedbackSpies: ReturnType<typeof vi.spyOn>[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up spies (not vi.mock) to avoid contaminating other test files under bun
    parseVoiceInputSpy = vi.spyOn(voiceParserModule, 'parseVoiceInput');
    parseVoiceCorrectionSpy = vi.spyOn(voiceParserModule, 'parseVoiceCorrection');
    parseVoiceCommandsSpy = vi.spyOn(voiceCommandsModule, 'parseVoiceCommands');
    hasScoreContentSpy = vi.spyOn(voiceCommandsModule, 'hasScoreContent');

    // Spy on voiceFeedback functions with no-op implementations so the real
    // audio/haptic code never runs, and restore after each test to prevent
    // contaminating voiceFeedback.test.ts (which depends on the real module state).
    voiceFeedbackSpies.length = 0;
    const noopFeedbackFns = [
      'feedbackListeningStart',
      'feedbackListeningStop',
      'feedbackVoiceSuccess',
      'feedbackVoiceError',
      'feedbackAllScored',
      'feedbackNextHole',
      'speakScoreConfirmation',
      'speakAllScored',
      'speakError',
      'speakCorrection',
      'speakNavigation',
      'speakScoreQuery',
      'speakMissingPlayers',
      'setSpeechEnabled',
    ] as const;
    for (const fn of noopFeedbackFns) {
      voiceFeedbackSpies.push(
        vi.spyOn(voiceFeedbackModule, fn).mockImplementation((() => {}) as never)
      );
    }

    // Default voice recognition mock
    mockVoiceRecognition = {
      isListening: false,
      isProcessing: false,
      isSupported: true,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      transcript: '',
      interimTranscript: null,
      alternatives: [],
      browserConfidence: null,
      audioLevel: 0,
      isNoisy: false,
      error: null,
      reset: vi.fn(),
    };

    (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);
    parseVoiceCommandsSpy.mockReturnValue([]);
    hasScoreContentSpy.mockReturnValue(false);
    parseVoiceCorrectionSpy.mockReturnValue(null);
    parseVoiceInputSpy.mockReturnValue({
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
    for (const spy of voiceFeedbackSpies) spy.mockRestore();
    voiceFeedbackSpies.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
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
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

      const { result } = renderHook(() => useVoiceScoring(defaultOptions));

      act(() => {
        result.current.handleVoicePress();
      });

      expect(mockVoiceRecognition.stopListening).toHaveBeenCalled();
    });

    it('should show error toast when voice not supported', () => {
      mockVoiceRecognition.isSupported = false;
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

      rerender();

      expect(feedbackListeningStart()).toHaveBeenCalled();
    });

    it('should trigger feedbackListeningStop when listening stops and processing', () => {
      // Start with listening
      mockVoiceRecognition.isListening = true;
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

      const { rerender } = renderHook(() => useVoiceScoring(defaultOptions));

      // Then stop listening and start processing
      mockVoiceRecognition.isListening = false;
      mockVoiceRecognition.isProcessing = true;
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

      rerender();

      expect(feedbackListeningStop()).toHaveBeenCalled();
    });
  });

  describe('processing transcripts', () => {
    describe('navigation commands', () => {
      it('should navigate to next hole on "next hole" command', () => {
        const onNavigateToHole = vi.fn();

        parseVoiceCommandsSpy.mockReturnValue([
          { type: 'next_hole' },
        ]);

        mockVoiceRecognition.transcript = 'next hole';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            currentHole: 5,
            onNavigateToHole,
          })
        );

        expect(onNavigateToHole).toHaveBeenCalledWith(6);
        expect(feedbackNextHole()).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalled();
      });

      it('should navigate to previous hole on "previous hole" command', () => {
        const onNavigateToHole = vi.fn();

        parseVoiceCommandsSpy.mockReturnValue([
          { type: 'previous_hole' },
        ]);

        mockVoiceRecognition.transcript = 'previous hole';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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

        parseVoiceCommandsSpy.mockReturnValue([
          { type: 'go_to_hole', holeNumber: 14 },
        ]);

        mockVoiceRecognition.transcript = 'go to hole 14';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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

        parseVoiceCommandsSpy.mockReturnValue([
          { type: 'previous_hole' },
        ]);

        mockVoiceRecognition.transcript = 'previous hole';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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

        parseVoiceCommandsSpy.mockReturnValue([
          { type: 'next_hole' },
        ]);

        mockVoiceRecognition.transcript = 'next hole';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            onFinishRound,
          })
        );

        expect(onFinishRound).toHaveBeenCalled();
        expect(feedbackVoiceSuccess()).toHaveBeenCalled();
      });

      it('should recognize various finish patterns', () => {
        const onFinishRound = vi.fn();

        const finishPhrases = ["we're done", 'end the round', 'round is complete'];

        finishPhrases.forEach((phrase) => {
          vi.clearAllMocks();

          mockVoiceRecognition.transcript = phrase;
          (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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

        parseVoiceCorrectionSpy.mockReturnValue({
          type: 'correction',
          playerId: 'p1',
          playerName: 'Michael Johnson',
          newScore: 6,
        });

        mockVoiceRecognition.transcript = 'change Mike to 6';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

        renderHook(() =>
          useVoiceScoring({
            ...defaultOptions,
            onScoreSaved,
          })
        );

        expect(onScoreSaved).toHaveBeenCalledWith('p1', 6);
        expect(feedbackVoiceSuccess()).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
      });
    });

    describe('score input', () => {
      it('should save scores immediately with high confidence', () => {
        const onScoreSaved = vi.fn();

        hasScoreContentSpy.mockReturnValue(true);
        parseVoiceInputSpy.mockReturnValue({
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
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
        expect(feedbackAllScored()).toHaveBeenCalled();
        expect(result.current.showVoiceModal).toBe(false);
      });

      it('should show modal for medium confidence scores', () => {
        hasScoreContentSpy.mockReturnValue(true);
        parseVoiceInputSpy.mockReturnValue({
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
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() => useVoiceScoring(defaultOptions));

        expect(result.current.showVoiceModal).toBe(true);
        expect(result.current.parseResult).not.toBeNull();
      });

      it('should show modal for low confidence / no scores', () => {
        hasScoreContentSpy.mockReturnValue(true);
        parseVoiceInputSpy.mockReturnValue({
          success: false,
          scores: [],
          unrecognized: ['random text'],
          rawTranscript: 'random text',
          confidence: 'low',
          confidenceReason: 'No scores parsed',
        });

        mockVoiceRecognition.transcript = 'random text';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() => useVoiceScoring(defaultOptions));

        expect(result.current.showVoiceModal).toBe(true);
        expect(feedbackVoiceError()).toHaveBeenCalled();
      });

      it('should show modal when alwaysConfirmVoice is true even for high confidence', () => {
        const onScoreSaved = vi.fn();

        hasScoreContentSpy.mockReturnValue(true);
        parseVoiceInputSpy.mockReturnValue({
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
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
        hasScoreContentSpy.mockReturnValue(false);

        mockVoiceRecognition.transcript = 'hello world';
        (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

        const { result } = renderHook(() => useVoiceScoring(defaultOptions));

        expect(result.current.showVoiceModal).toBe(true);
        expect(result.current.parseResult?.confidence).toBe('low');
        expect(feedbackVoiceError()).toHaveBeenCalled();
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
      expect(feedbackVoiceSuccess()).toHaveBeenCalled();
    });

    it('should NOT restart listening after confirm (single-utterance mode)', () => {
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

      expect(mockVoiceRecognition.startListening).not.toHaveBeenCalled();
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
      hasScoreContentSpy.mockReturnValue(true);
      parseVoiceInputSpy.mockReturnValue({
        success: true,
        scores: [{ playerId: 'p1', playerName: 'Michael', score: 4 }],
        unrecognized: [],
        rawTranscript: 'Mike 4',
        confidence: 'medium',
        confidenceReason: 'Single player',
      });

      mockVoiceRecognition.transcript = 'Mike 4';
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

      renderHook(() => useVoiceScoring(defaultOptions));

      expect(toast.error).toHaveBeenCalledWith('Microphone access denied');
      expect(mockVoiceRecognition.reset).toHaveBeenCalled();
    });
  });

  describe('continuous voice mode', () => {
    it('should NOT restart listening after high confidence save (single-utterance mode)', () => {
      hasScoreContentSpy.mockReturnValue(true);
      parseVoiceInputSpy.mockReturnValue({
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
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

      renderHook(() =>
        useVoiceScoring({
          ...defaultOptions,
          continuousVoice: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(mockVoiceRecognition.startListening).not.toHaveBeenCalled();
    });

    it('should not restart listening when continuousVoice is false', () => {
      hasScoreContentSpy.mockReturnValue(true);
      parseVoiceInputSpy.mockReturnValue({
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
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
      hasScoreContentSpy.mockReturnValue(true);
      parseVoiceInputSpy.mockReturnValue({
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
      (useVoiceRecognition as ReturnType<typeof vi.fn>).mockReturnValue(mockVoiceRecognition);

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
