import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { mock as bunMock } from 'bun:test';

// ── Module mocks via bun:test mock.module ─────────────────────────────────
// Using mock.module instead of vi.mock so the substitutions don't leak into
// downstream test files when bun's CI workers share module state.

const mockUseSupabaseRound = vi.fn();

beforeAll(() => {
  bunMock.module('@/hooks/useSupabaseRound', () => ({
    useSupabaseRound: (...args: unknown[]) => mockUseSupabaseRound(...args),
  }));
  bunMock.module('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { id: 'test-user', email: 't@t.com' } }),
  }));
  bunMock.module('@/hooks/useKeepAwake', () => ({ useKeepAwake: () => undefined }));
  bunMock.module('@/hooks/useSettings', () => ({
    useSettings: () => ({
      settings: { tutorialDismissed: true, tutorialViewCount: 99, voiceEnabled: false, handsFreeEnabled: false, speakResults: false },
      updateSettings: vi.fn(),
      loaded: true,
    }),
  }));
  bunMock.module('@/hooks/usePropBets', () => ({
    usePropBets: () => ({
      propBets: [],
      addPropBet: vi.fn().mockResolvedValue({ success: true }),
      updatePropBet: vi.fn().mockResolvedValue({ success: true }),
    }),
  }));
  bunMock.module('@/hooks/useScorekeeper', () => ({
    useScorekeeper: () => ({
      isScorekeeper: true, isCreator: true, scorekeeperIds: [],
      addScorekeeper: vi.fn(), removeScorekeeper: vi.fn(),
    }),
  }));
  bunMock.module('@/hooks/useRounds', () => ({
    useRounds: () => ({
      getRoundById: () => null,
      getPlayersWithScores: () => [],
      setPlayerScore: vi.fn(),
      completeRound: vi.fn(),
      getScoresForRound: () => [],
      addPress: vi.fn(),
    }),
  }));
  bunMock.module('@/hooks/useAutoAdvance', () => ({
    useAutoAdvance: () => ({ countdown: null, advanceToNextHole: vi.fn() }),
  }));
  bunMock.module('@/hooks/usePlayoff', () => ({
    usePlayoff: () => ({
      playoffActive: false, playoffHole: null,
      startPlayoff: vi.fn(), endPlayoff: vi.fn(),
      playoffPlayers: [], playoffWinner: null, setPlayoffWinner: vi.fn(),
    }),
  }));
  bunMock.module('@/hooks/useVoiceScoring', () => ({
    useVoiceScoring: () => ({
      isListening: false, transcript: '',
      startListening: vi.fn(), stopListening: vi.fn(),
      confirmModalOpen: false, pendingResult: null,
      confirmResult: vi.fn(), cancelResult: vi.fn(),
    }),
  }));
  bunMock.module('@/hooks/useVoiceNicknames', () => ({
    useVoiceNicknames: () => ({ getNicknamesForPlayer: () => [], suggestNickname: vi.fn() }),
  }));
  bunMock.module('@/hooks/useHandsFreeVoice', () => ({
    useHandsFreeVoice: () => ({ isActive: false }),
  }));
  bunMock.module('@/hooks/usePlayersWithScores', () => ({ usePlayersWithScores: () => [] }));
  bunMock.module('@/hooks/useSettlementPreview', () => ({ useSettlementPreview: () => [] }));
  bunMock.module('@/integrations/supabase/client', () => ({
    supabase: {
      from: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    },
  }));
  bunMock.module('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  }));
});

afterAll(() => {
  // Restore real implementations so other test files run unaffected.
  bunMock.restore();
});

// Render helper — page is dynamically imported AFTER mocks are installed.
async function renderScorecard() {
  const { default: Scorecard } = await import('./Scorecard');
  return render(
    <MemoryRouter initialEntries={['/round/test-round-id']}>
      <Routes>
        <Route path="/round/:id" element={<Scorecard />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Scorecard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the loading state while round data is being fetched', async () => {
    mockUseSupabaseRound.mockReturnValue({
      round: null, players: [], scores: [],
      saveScore: vi.fn(), addPress: vi.fn(),
      completeRound: vi.fn(), updateGames: vi.fn(),
      loading: true,
    });
    await renderScorecard();
    expect(screen.getByText(/loading round/i)).toBeInTheDocument();
  });

  it('renders the "round not found" error card when no round is returned', async () => {
    mockUseSupabaseRound.mockReturnValue({
      round: null, players: [], scores: [],
      saveScore: vi.fn(), addPress: vi.fn(),
      completeRound: vi.fn(), updateGames: vi.fn(),
      loading: false,
    });
    await renderScorecard();
    expect(screen.getByText(/round not found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });
});
