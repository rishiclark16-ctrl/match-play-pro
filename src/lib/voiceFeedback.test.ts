import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setSpeechEnabled,
  isSpeechEnabled,
  speakScoreConfirmation,
  speakAllScored,
  speakError,
  speakHelpPrompt,
  speakScoreQuery,
  speakMissingPlayers,
  speakCorrection,
  speakNavigation,
} from './voiceFeedback';

const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => [] as SpeechSynthesisVoice[]);

beforeEach(() => {
  vi.useFakeTimers();

  (globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance = class {
    text = '';
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  };

  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      onvoiceschanged: null,
    },
    writable: true,
    configurable: true,
  });

  setSpeechEnabled(true);
  mockSpeak.mockClear();
  mockCancel.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('speech toggle', () => {
  it('should default to enabled', () => {
    expect(isSpeechEnabled()).toBe(true);
  });

  it('should toggle speech on/off', () => {
    setSpeechEnabled(false);
    expect(isSpeechEnabled()).toBe(false);
    setSpeechEnabled(true);
    expect(isSpeechEnabled()).toBe(true);
  });

  it('should not speak when disabled', () => {
    setSpeechEnabled(false);
    speakScoreConfirmation([{ playerName: 'Mike Johnson', score: 4 }]);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('should speak when enabled', () => {
    mockGetVoices.mockReturnValue([{ lang: 'en-US', name: 'Samantha' }]);
    speakScoreConfirmation([{ playerName: 'Mike Johnson', score: 4 }]);
    vi.advanceTimersByTime(5000);
    expect(mockSpeak).toHaveBeenCalled();
  });
});

describe('speech functions do not throw when disabled', () => {
  beforeEach(() => {
    setSpeechEnabled(false);
  });

  it('speakScoreConfirmation single', () => {
    expect(() => speakScoreConfirmation([{ playerName: 'Mike Johnson', score: 4 }])).not.toThrow();
  });

  it('speakScoreConfirmation multiple', () => {
    expect(() => speakScoreConfirmation([
      { playerName: 'Mike Johnson', score: 4 },
      { playerName: 'Bob Smith', score: 5 },
    ])).not.toThrow();
  });

  it('speakAllScored', () => {
    expect(() => speakAllScored(7)).not.toThrow();
  });

  it('speakError', () => {
    expect(() => speakError()).not.toThrow();
  });

  it('speakHelpPrompt', () => {
    expect(() => speakHelpPrompt(['Mike Johnson', 'Bob Smith'])).not.toThrow();
  });

  it('speakScoreQuery', () => {
    expect(() => speakScoreQuery('Mike Johnson', 4, 7)).not.toThrow();
  });

  it('speakMissingPlayers single', () => {
    expect(() => speakMissingPlayers(['Tim Davis'])).not.toThrow();
  });

  it('speakMissingPlayers multiple', () => {
    expect(() => speakMissingPlayers(['Tim Davis', 'Adam Wilson'])).not.toThrow();
  });

  it('speakCorrection', () => {
    expect(() => speakCorrection('Mike Johnson', 6)).not.toThrow();
  });

  it('speakNavigation with par', () => {
    expect(() => speakNavigation(8, 4)).not.toThrow();
  });

  it('speakNavigation without par', () => {
    expect(() => speakNavigation(8)).not.toThrow();
  });
});

describe('speech functions call speak when enabled', () => {
  beforeEach(() => {
    mockGetVoices.mockReturnValue([{ lang: 'en-US', name: 'Google' }]);
  });

  it('speakAllScored calls speechSynthesis.speak', () => {
    speakAllScored(7);
    vi.advanceTimersByTime(5000);
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('speakError calls speechSynthesis.speak', () => {
    speakError();
    vi.advanceTimersByTime(5000);
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('speakNavigation calls speechSynthesis.speak', () => {
    speakNavigation(8, 4);
    vi.advanceTimersByTime(5000);
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('speakCorrection calls speechSynthesis.speak', () => {
    speakCorrection('Mike Johnson', 6);
    vi.advanceTimersByTime(5000);
    expect(mockSpeak).toHaveBeenCalled();
  });
});
