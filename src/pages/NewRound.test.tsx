import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NewRound from './NewRound';

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: false, tier: 'free', loading: false }),
}));

vi.mock('@/hooks/useCreateSupabaseRound', () => ({
  useCreateSupabaseRound: () => ({
    createRound: vi.fn().mockResolvedValue({ success: true, roundId: 'r1' }),
  }),
}));

vi.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({
    courses: [],
    createCourse: vi.fn(),
    getDefaultHoles: () => [],
  }),
}));

vi.mock('@/hooks/useGolfCourseSearch', () => ({
  useGolfCourseSearch: () => ({
    getCourseDetails: vi.fn(),
    convertToHoleInfo: vi.fn(() => []),
    getTeeInfo: vi.fn(() => null),
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: null, loading: false, updateProfile: vi.fn() }),
}));

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ friends: [], loading: false }),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({ groups: [], loading: false }),
}));

vi.mock('@/hooks/useHouseGame', () => ({
  useHouseGame: () => ({ houseGame: null, saving: false, saveHouseGame: vi.fn() }),
}));

vi.mock('@/hooks/usePersonalGameFormats', () => ({
  usePersonalGameFormats: () => ({
    formats: [],
    cloneFormat: vi.fn(),
    saving: false,
    saveFormat: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGroupFormats', () => ({
  useGroupFormats: () => ({ assignment: null }),
}));

vi.mock('@/lib/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticError: vi.fn(),
  hapticWarning: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

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

function renderNewRound() {
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

  it('renders the mode-selection step on mount', () => {
    renderNewRound();
    expect(screen.getByText(/how do you want to play today/i)).toBeInTheDocument();
    expect(screen.getByText(/with others/i)).toBeInTheDocument();
    expect(screen.getByText(/^solo$/i)).toBeInTheDocument();
  });
});
