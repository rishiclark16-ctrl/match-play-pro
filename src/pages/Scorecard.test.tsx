import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Scorecard from './Scorecard';

// ── Hook mocks ────────────────────────────────────────────────────────────
// The page wires ~14 domain hooks. Each is stubbed with the minimum non-throwing
// return shape so we can exercise the early-return branches (loading, not-found).

const mockUseSupabaseRound = vi.fn();
vi.mock('@/hooks/useSupabaseRound', () => ({
  useSupabaseRound: (...args: unknown[]) => mockUseSupabaseRound(...args),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 't@t.com' } }),
}));

vi.mock('@/hooks/useKeepAwake', () => ({
  useKeepAwake: () => undefined,
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { tutorialDismissed: true, tutorialViewCount: 99, voiceEnabled: false, handsFreeEnabled: false, speakResults: false },
    updateSettings: vi.fn(),
    loaded: true,
  }),
}));

vi.mock('@/hooks/usePropBets', () => ({
  usePropBets: () => ({
    propBets: [],
    addPropBet: vi.fn().mockResolvedValue({ success: true }),
    updatePropBet: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

vi.mock('@/hooks/useScorekeeper', () => ({
  useScorekeeper: () => ({
    isScorekeeper: true,
    isCreator: true,
    scorekeeperIds: [],
    addScorekeeper: vi.fn(),
    removeScorekeeper: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRounds', () => ({
  useRounds: () => ({
    getRoundById: () => null,
    getPlayersWithScores: () => [],
    setPlayerScore: vi.fn(),
    completeRound: vi.fn(),
    getScoresForRound: () => [],
    addPress: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAutoAdvance', () => ({
  useAutoAdvance: () => ({ countdown: null, advanceToNextHole: vi.fn() }),
}));

vi.mock('@/hooks/usePlayoff', () => ({
  usePlayoff: () => ({
    playoffActive: false,
    playoffHole: null,
    startPlayoff: vi.fn(),
    endPlayoff: vi.fn(),
    playoffPlayers: [],
    playoffWinner: null,
    setPlayoffWinner: vi.fn(),
  }),
}));

vi.mock('@/hooks/useVoiceScoring', () => ({
  useVoiceScoring: () => ({
    isListening: false,
    transcript: '',
    startListening: vi.fn(),
    stopListening: vi.fn(),
    confirmModalOpen: false,
    pendingResult: null,
    confirmResult: vi.fn(),
    cancelResult: vi.fn(),
  }),
}));

vi.mock('@/hooks/useVoiceNicknames', () => ({
  useVoiceNicknames: () => ({
    getNicknamesForPlayer: () => [],
    suggestNickname: vi.fn(),
  }),
}));

vi.mock('@/hooks/useHandsFreeVoice', () => ({
  useHandsFreeVoice: () => ({ isActive: false }),
}));

vi.mock('@/hooks/usePlayersWithScores', () => ({
  usePlayersWithScores: () => [],
}));

vi.mock('@/hooks/useSettlementPreview', () => ({
  useSettlementPreview: () => [],
}));

// Only mock what's actually exercised on the early-return render paths.
// Mocking @/lib/voiceFeedback / posthog / pushUtils etc. here would
// overwrite their module exports for the entire test process and break
// downstream test files (CI runs share workers).
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
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

// ── Helpers ───────────────────────────────────────────────────────────────
function renderScorecard() {
  return render(
    <MemoryRouter initialEntries={['/round/test-round-id']}>
      <Routes>
        <Route path="/round/:id" element={<Scorecard />} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────
describe('Scorecard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the loading state while round data is being fetched', () => {
    mockUseSupabaseRound.mockReturnValue({
      round: null,
      players: [],
      scores: [],
      saveScore: vi.fn(),
      addPress: vi.fn(),
      completeRound: vi.fn(),
      updateGames: vi.fn(),
      loading: true,
    });
    renderScorecard();
    expect(screen.getByText(/loading round/i)).toBeInTheDocument();
  });

  it('renders the "round not found" error card when no round is returned', () => {
    mockUseSupabaseRound.mockReturnValue({
      round: null,
      players: [],
      scores: [],
      saveScore: vi.fn(),
      addPress: vi.fn(),
      completeRound: vi.fn(),
      updateGames: vi.fn(),
      loading: false,
    });
    renderScorecard();
    expect(screen.getByText(/round not found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });
});
