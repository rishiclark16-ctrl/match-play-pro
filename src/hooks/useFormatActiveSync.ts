import { useEffect, useState } from 'react';

interface ToggleSnapshot {
  strokePlay: boolean;
  matchPlay: boolean;
  skinsEnabled: boolean;
  nassauEnabled: boolean;
  stablefordEnabled: boolean;
  bestBallEnabled: boolean;
  wolfEnabled: boolean;
  vegasEnabled: boolean;
  ninesEnabled: boolean;
  defenderEnabled: boolean;
  sixesEnabled: boolean;
}

interface UseFormatActiveSyncArgs {
  formatActive: boolean;
  /** Current toggle values (read once when formatActive flips on). */
  current: ToggleSnapshot;
  /** Setter map — called to disable/restore each toggle. */
  setters: { [K in keyof ToggleSnapshot]: (value: boolean) => void };
}

/**
 * When a saved-format becomes active, disable every per-game scoring toggle
 * and remember the prior values so they can be restored when the user
 * deselects the format.
 *
 * Extracted from NewRound.tsx — keeps the page free of the bookkeeping.
 */
export function useFormatActiveSync({
  formatActive,
  current,
  setters,
}: UseFormatActiveSyncArgs): void {
  const [savedToggles, setSavedToggles] = useState<ToggleSnapshot | null>(null);

  useEffect(() => {
    if (formatActive) {
      // Save current toggles and disable them all
      setSavedToggles({ ...current });
      setters.strokePlay(false);
      setters.matchPlay(false);
      setters.skinsEnabled(false);
      setters.nassauEnabled(false);
      setters.stablefordEnabled(false);
      setters.bestBallEnabled(false);
      setters.wolfEnabled(false);
      setters.vegasEnabled(false);
      setters.ninesEnabled(false);
      setters.defenderEnabled(false);
      setters.sixesEnabled(false);
    } else if (savedToggles) {
      // Restore previous toggles
      setters.strokePlay(savedToggles.strokePlay);
      setters.matchPlay(savedToggles.matchPlay);
      setters.skinsEnabled(savedToggles.skinsEnabled);
      setters.nassauEnabled(savedToggles.nassauEnabled);
      setters.stablefordEnabled(savedToggles.stablefordEnabled);
      setters.bestBallEnabled(savedToggles.bestBallEnabled);
      setters.wolfEnabled(savedToggles.wolfEnabled);
      setters.vegasEnabled(savedToggles.vegasEnabled);
      setters.ninesEnabled(savedToggles.ninesEnabled);
      setters.defenderEnabled(savedToggles.defenderEnabled);
      setters.sixesEnabled(savedToggles.sixesEnabled);
      setSavedToggles(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatActive]);
}
