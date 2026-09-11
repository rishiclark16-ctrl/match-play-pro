import { SpectatorBanner } from '@/components/golf/SpectatorBanner';

interface ScorecardBannersProps {
  /** Spectator-only viewer (read-only). */
  isSpectator: boolean;
  /** True when the user can save scores. */
  isScorekeeper: boolean;
  /** True when preferred-lies is enabled by the active house-game config. */
  preferredLiesActive: boolean;
  /** Tracks whether the user has dismissed the preferred-lies banner this session. */
  preferredLiesDismissed: boolean;
  /** Called when the user taps "Dismiss" on the preferred-lies banner. */
  onDismissPreferredLies: () => void;
}

/**
 * Pre-Header banner stack for the scorecard:
 *  - SpectatorBanner when the viewer is read-only.
 *  - Preferred-lies "in effect" yellow strip with dismiss button.
 *
 * Extracted from Scorecard.tsx so the page render tree stays focused on
 * its main composition. Behavior is unchanged — the component is purely
 * presentational.
 */
export function ScorecardBanners({
  isSpectator,
  isScorekeeper,
  preferredLiesActive,
  preferredLiesDismissed,
  onDismissPreferredLies,
}: ScorecardBannersProps) {
  const showSpectatorBanner = isSpectator || !isScorekeeper;
  const showPreferredLies = preferredLiesActive && !preferredLiesDismissed;

  return (
    <>
      {showSpectatorBanner && (
        <SpectatorBanner isSpectator={isSpectator} isScorekeeper={isScorekeeper} />
      )}

      {showPreferredLies && (
        <div className="flex-shrink-0 bg-[#F0EE3A] px-4 py-2 flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#0A0A0A]">Preferred lies in effect</span>
          <button
            onClick={onDismissPreferredLies}
            className="text-[11px] font-bold text-[#0A0A0A]/60 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
