import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { mock as bunMock } from 'bun:test';

// Use bun:test mock.module + dynamic import so substitutions don't leak
// into downstream test files in CI's shared-worker model.

beforeAll(() => {
  bunMock.module('@/hooks/useSubscription', () => ({
    useSubscription: () => ({ isPro: false, tier: 'free', loading: false }),
    // PlayersStep + FormatStep import TIER_LIMITS at module load.
    TIER_LIMITS: {
      free: { maxPlayers: 4, maxFriends: 4, maxGroups: 1, availableGames: ['stroke', 'match', 'skins'], skinsCarryover: false, hasFullStats: false, hasSettlementTracking: false },
      pro:  { maxPlayers: 8, maxFriends: Infinity, maxGroups: Infinity, availableGames: ['stroke', 'match', 'skins', 'nassau', 'wolf', 'stableford', 'best_ball', 'vegas', 'nines', 'defender', 'sixes', 'quota', 'rabbit'], skinsCarryover: true, hasFullStats: true, hasSettlementTracking: true },
    },
  }));
  bunMock.module('@/hooks/useCreateSupabaseRound', () => ({
    useCreateSupabaseRound: () => ({
      createRound: vi.fn().mockResolvedValue({ success: true, roundId: 'r1' }),
    }),
  }));
  bunMock.module('@/hooks/useCourses', () => ({
    useCourses: () => ({ courses: [], createCourse: vi.fn(), getDefaultHoles: () => [] }),
  }));
  bunMock.module('@/hooks/useGolfCourseSearch', () => ({
    useGolfCourseSearch: () => ({
      getCourseDetails: vi.fn(),
      convertToHoleInfo: vi.fn(() => []),
      getTeeInfo: vi.fn(() => null),
    }),
  }));
  bunMock.module('@/hooks/useProfile', () => ({
    useProfile: () => ({ profile: null, loading: false, updateProfile: vi.fn() }),
  }));
  bunMock.module('@/hooks/useFriends', () => ({
    useFriends: () => ({ friends: [], loading: false }),
  }));
  bunMock.module('@/hooks/useGroups', () => ({
    useGroups: () => ({ groups: [], loading: false }),
  }));
  bunMock.module('@/hooks/useHouseGame', () => ({
    useHouseGame: () => ({ houseGame: null, saving: false, saveHouseGame: vi.fn() }),
  }));
  bunMock.module('@/hooks/usePersonalGameFormats', () => ({
    usePersonalGameFormats: () => ({
      formats: [], cloneFormat: vi.fn(), saving: false, saveFormat: vi.fn(),
    }),
  }));
  bunMock.module('@/hooks/useGroupFormats', () => ({
    useGroupFormats: () => ({ assignment: null }),
  }));
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
  bunMock.restore();
});

async function renderNewRound() {
  const { default: NewRound } = await import('./NewRound');
  return render(
    <MemoryRouter initialEntries={['/new-round']}>
      <Routes>
        <Route path="/new-round" element={<NewRound />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('NewRound page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the mode-selection step on mount', async () => {
    await renderNewRound();
    expect(screen.getByText(/how do you want to play today/i)).toBeInTheDocument();
    expect(screen.getByText(/with others/i)).toBeInTheDocument();
    expect(screen.getByText(/^solo$/i)).toBeInTheDocument();
  });
});
