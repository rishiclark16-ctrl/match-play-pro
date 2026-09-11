import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

const captureMock = vi.fn();
vi.mock('@/lib/posthog', () => ({
  capture: (...args: unknown[]) => captureMock(...args),
}));

import { useFinishRound } from './useFinishRound';

const baseRound = { id: 'round-42', courseName: 'Pebble Beach', holes: 18 };

describe('useFinishRound', () => {
  let completeRoundSupabase: ReturnType<typeof vi.fn>;
  let completeRoundLocal: ReturnType<typeof vi.fn>;
  let sendRoundCompletionNotifications: ReturnType<typeof vi.fn>;
  let setShowWinnerModal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock.mockReset();
    captureMock.mockReset();
    completeRoundSupabase = vi.fn();
    completeRoundLocal = vi.fn();
    sendRoundCompletionNotifications = vi.fn();
    setShowWinnerModal = vi.fn();
  });

  it('handleFinishRound is a no-op when round is null', () => {
    const { result } = renderHook(() =>
      useFinishRound({
        round: null,
        playerCount: 4,
        completeRoundSupabase,
        completeRoundLocal,
        sendRoundCompletionNotifications,
        setShowWinnerModal,
      }),
    );

    act(() => {
      result.current.handleFinishRound();
    });

    expect(completeRoundSupabase).not.toHaveBeenCalled();
    expect(completeRoundLocal).not.toHaveBeenCalled();
    expect(sendRoundCompletionNotifications).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('handleFinishWithWinner is a no-op (apart from closing the modal) when round is null', () => {
    const { result } = renderHook(() =>
      useFinishRound({
        round: null,
        playerCount: 4,
        completeRoundSupabase,
        completeRoundLocal,
        sendRoundCompletionNotifications,
        setShowWinnerModal,
      }),
    );

    act(() => {
      result.current.handleFinishWithWinner();
    });

    expect(setShowWinnerModal).toHaveBeenCalledWith(false);
    expect(completeRoundSupabase).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('handleFinishRound completes the round, fires notifications, captures analytics, and navigates', () => {
    const { result } = renderHook(() =>
      useFinishRound({
        round: baseRound,
        playerCount: 3,
        completeRoundSupabase,
        completeRoundLocal,
        sendRoundCompletionNotifications,
        setShowWinnerModal,
      }),
    );

    act(() => {
      result.current.handleFinishRound();
    });

    expect(completeRoundSupabase).toHaveBeenCalledTimes(1);
    expect(completeRoundLocal).toHaveBeenCalledWith('round-42');
    expect(sendRoundCompletionNotifications).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('round_completed', {
      round_id: 'round-42',
      course_name: 'Pebble Beach',
      holes: 18,
      player_count: 3,
    });
    expect(navigateMock).toHaveBeenCalledWith('/round/round-42/complete');
    // Winner-modal flow not used in plain finish
    expect(setShowWinnerModal).not.toHaveBeenCalled();
  });

  it('handleFinishWithWinner closes the winner modal first, then runs the finish flow', () => {
    const { result } = renderHook(() =>
      useFinishRound({
        round: baseRound,
        playerCount: 2,
        completeRoundSupabase,
        completeRoundLocal,
        sendRoundCompletionNotifications,
        setShowWinnerModal,
      }),
    );

    act(() => {
      result.current.handleFinishWithWinner();
    });

    expect(setShowWinnerModal).toHaveBeenCalledWith(false);
    expect(setShowWinnerModal).toHaveBeenCalledTimes(1);

    expect(completeRoundSupabase).toHaveBeenCalledTimes(1);
    expect(completeRoundLocal).toHaveBeenCalledWith('round-42');
    expect(sendRoundCompletionNotifications).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('round_completed', {
      round_id: 'round-42',
      course_name: 'Pebble Beach',
      holes: 18,
      player_count: 2,
    });
    expect(navigateMock).toHaveBeenCalledWith('/round/round-42/complete');
  });
});
