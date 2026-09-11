import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Course, HoleInfo } from '@/types/golf';

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

import { useApiCourseSelection } from './useApiCourseSelection';

const buildHoles = (count: number): HoleInfo[] =>
  Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    par: 4,
    handicap: i + 1,
    yards: 400,
  })) as HoleInfo[];

const buildCourse = (id: string, name: string, holes = 18): Course => ({
  id,
  name,
  holes: buildHoles(holes),
  slope: 130,
  rating: 72,
  createdAt: new Date('2026-01-01'),
});

interface DepsOverrides {
  getCourseDetails?: ReturnType<typeof vi.fn>;
  convertToHoleInfo?: ReturnType<typeof vi.fn>;
  getTeeInfo?: ReturnType<typeof vi.fn>;
  createCourse?: ReturnType<typeof vi.fn>;
  setSelectedCourse?: ReturnType<typeof vi.fn>;
  setHoleCount?: ReturnType<typeof vi.fn>;
}

const buildDeps = (overrides: DepsOverrides = {}) => ({
  getCourseDetails:
    overrides.getCourseDetails ??
    vi.fn().mockResolvedValue({
      course_name: 'Stub',
      tees: { male: [], female: [] },
    }),
  convertToHoleInfo: overrides.convertToHoleInfo ?? vi.fn().mockReturnValue(buildHoles(18)),
  getTeeInfo:
    overrides.getTeeInfo ??
    vi.fn().mockReturnValue({ slope_rating: 130, course_rating: 72 }),
  createCourse:
    overrides.createCourse ??
    vi.fn().mockImplementation((name: string) => buildCourse('local-1', name)),
  setSelectedCourse: overrides.setSelectedCourse ?? vi.fn(),
  setHoleCount: overrides.setHoleCount ?? vi.fn(),
});

describe('useApiCourseSelection', () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('starts with no loading state, no pending course, and tee selector hidden', () => {
    const { result } = renderHook(() => useApiCourseSelection(buildDeps()));

    expect(result.current.isLoadingApiCourse).toBe(false);
    expect(result.current.showTeeSelector).toBe(false);
    expect(result.current.pendingCourseDetails).toBeNull();
    expect(result.current.courseApiDetails).toBeNull();
  });

  it('finalizes immediately when the course has no tees', async () => {
    const detailsNoTees = {
      course_name: 'Beach Course',
      location: { city: 'Pebble', state: 'CA' },
      tees: { male: [], female: [] },
    };
    const deps = buildDeps({
      getCourseDetails: vi.fn().mockResolvedValue(detailsNoTees),
      convertToHoleInfo: vi.fn().mockReturnValue(buildHoles(18)),
      createCourse: vi.fn().mockReturnValue(buildCourse('c-1', 'Beach Course')),
    });

    const { result } = renderHook(() => useApiCourseSelection(deps));

    await act(async () => {
      await result.current.handleSelectApiCourse({ id: 'api-1', course_name: 'Beach Course' });
    });

    expect(deps.getCourseDetails).toHaveBeenCalledWith('api-1');
    expect(deps.convertToHoleInfo).toHaveBeenCalledTimes(1);
    expect(deps.createCourse).toHaveBeenCalledTimes(1);
    expect(deps.setSelectedCourse).toHaveBeenCalledTimes(1);
    expect(deps.setHoleCount).toHaveBeenCalledWith(18);
    expect(result.current.showTeeSelector).toBe(false);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('opens the tee selector when the course has tees instead of finalizing', async () => {
    const detailsWithTees = {
      course_name: 'Pinehurst No. 2',
      location: { city: 'Pinehurst', state: 'NC' },
      tees: { male: [{ tee_name: 'Blue', slope_rating: 135, course_rating: 73 }], female: [] },
    };
    const deps = buildDeps({
      getCourseDetails: vi.fn().mockResolvedValue(detailsWithTees),
    });

    const { result } = renderHook(() => useApiCourseSelection(deps));

    await act(async () => {
      await result.current.handleSelectApiCourse({ id: 'api-2', course_name: 'Pinehurst No. 2' });
    });

    expect(result.current.showTeeSelector).toBe(true);
    expect(result.current.pendingCourseDetails).toEqual(detailsWithTees);
    expect(deps.convertToHoleInfo).not.toHaveBeenCalled();
    expect(deps.createCourse).not.toHaveBeenCalled();
    expect(deps.setSelectedCourse).not.toHaveBeenCalled();
  });

  it('toggles isLoadingApiCourse off after completion', async () => {
    const deps = buildDeps();
    const { result } = renderHook(() => useApiCourseSelection(deps));

    await act(async () => {
      await result.current.handleSelectApiCourse({ id: 'api-1', course_name: 'Test' });
    });

    await waitFor(() => {
      expect(result.current.isLoadingApiCourse).toBe(false);
    });
  });

  it('shows an error toast when getCourseDetails throws', async () => {
    const deps = buildDeps({
      getCourseDetails: vi.fn().mockRejectedValue(new Error('network fail')),
    });
    const { result } = renderHook(() => useApiCourseSelection(deps));

    await act(async () => {
      await result.current.handleSelectApiCourse({ id: 'broken', course_name: 'X' });
    });

    expect(toastError).toHaveBeenCalledWith('Failed to load course details');
    expect(result.current.isLoadingApiCourse).toBe(false);
  });

  it('handleTeeSelect finalizes with the chosen tee info and closes the selector', async () => {
    const detailsWithTees = {
      course_name: 'Augusta National',
      location: { city: 'Augusta', state: 'GA' },
      tees: { male: [{ tee_name: 'Masters', slope_rating: 137, course_rating: 76.2 }], female: [] },
    };
    const deps = buildDeps({
      getCourseDetails: vi.fn().mockResolvedValue(detailsWithTees),
      getTeeInfo: vi.fn().mockReturnValue({ slope_rating: 137, course_rating: 76.2 }),
      convertToHoleInfo: vi.fn().mockReturnValue(buildHoles(18)),
      createCourse: vi.fn().mockReturnValue(buildCourse('c-aug', 'Augusta National (Masters)')),
    });

    const { result } = renderHook(() => useApiCourseSelection(deps));

    // 1. Select course → opens tee selector
    await act(async () => {
      await result.current.handleSelectApiCourse({ id: 'api-aug', course_name: 'Augusta National' });
    });
    expect(result.current.showTeeSelector).toBe(true);

    // 2. Pick a tee → finalizes
    act(() => {
      result.current.handleTeeSelect('Masters', 'male');
    });

    expect(deps.getTeeInfo).toHaveBeenCalledWith(detailsWithTees, 'Masters', 'male');
    expect(deps.convertToHoleInfo).toHaveBeenCalledWith(detailsWithTees, 'Masters', 'male');
    expect(deps.createCourse).toHaveBeenCalledTimes(1);
    expect(deps.setSelectedCourse).toHaveBeenCalledTimes(1);
    expect(deps.setHoleCount).toHaveBeenCalledWith(18);
    expect(result.current.showTeeSelector).toBe(false);
    expect(result.current.pendingCourseDetails).toBeNull();
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('handleTeeSelect is a no-op when there is no pending course', () => {
    const deps = buildDeps();
    const { result } = renderHook(() => useApiCourseSelection(deps));

    act(() => {
      result.current.handleTeeSelect('Blue', 'male');
    });

    expect(deps.getTeeInfo).not.toHaveBeenCalled();
    expect(deps.createCourse).not.toHaveBeenCalled();
    expect(deps.setSelectedCourse).not.toHaveBeenCalled();
  });

  it('uses 9 for setHoleCount when convertToHoleInfo returns 9 holes', async () => {
    const deps = buildDeps({
      convertToHoleInfo: vi.fn().mockReturnValue(buildHoles(9)),
    });
    const { result } = renderHook(() => useApiCourseSelection(deps));

    await act(async () => {
      await result.current.handleSelectApiCourse({ id: 'api-9', course_name: 'Short Course' });
    });

    expect(deps.setHoleCount).toHaveBeenCalledWith(9);
  });
});
