import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { buildGamesFromToggles } from '@/lib/buildGamesFromToggles';
import { generateId } from '@/types/golf';
import type { Course, HoleInfo, Team, TeeSet } from '@/types/golf';
import type { PersonalGameFormat } from '@/types/houseGame';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
  manualStrokes?: number;
  profileId?: string;
  isGhost?: boolean;
  teeSetId?: string;
}

interface RoundPlayer {
  name: string;
  handicap: number | undefined;
  manualStrokes: number;
  teamId: string | undefined;
  profileId: string | undefined;
  isGhost: boolean;
  teeSetId?: string;
}

interface CreateRoundParams {
  courseId: string;
  courseName: string;
  holes: number;
  holeInfo: HoleInfo[];
  strokePlay: boolean;
  matchPlay: boolean;
  stakes?: number;
  slope?: number;
  rating?: number;
  handicapMode: 'auto' | 'manual';
  games: ReturnType<typeof buildGamesFromToggles>['games'];
  teeSets?: TeeSet[];
  mixedTees: boolean;
  players: RoundPlayer[];
}

interface CreateRoundResult {
  round?: { id: string; joinCode?: string };
  error?: { message: string; isAuthError?: boolean };
}

interface StartRoundInputs {
  selectedCourse: Course | null;
  holeCount: number;
  players: PlayerData[];
  handicapMode: 'auto' | 'manual';
  // Stroke / match
  strokePlay: boolean;
  matchPlay: boolean;
  matchPlayFormat: 'singles' | 'fourball';
  matchPlayTeamA: string[];
  matchPlayTeamB: string[];
  stakes: string;
  // Side games
  skinsEnabled: boolean; skinsStakes: string; skinsCarryover: boolean;
  nassauEnabled: boolean; nassauStakes: string; nassauAutoPress: boolean;
  stablefordEnabled: boolean; stablefordModified: boolean;
  bestBallEnabled: boolean; bestBallTeams: Team[];
  wolfEnabled: boolean; wolfStakes: string; wolfCarryover: boolean;
  vegasEnabled: boolean; vegasStakes: string; vegasCarryover: boolean;
  ninesEnabled: boolean; ninesStakes: string;
  defenderEnabled: boolean; defenderStakes: string;
  sixesEnabled: boolean; sixesStakes: string;
  // Mixed tees
  mixedTees: boolean;
  roundTeeSets: TeeSet[];
  playerTeeIds: Map<string, string>;
  // House / personal formats
  // Use a loose shape — the runtime only reads `activePrimitives`, and the
  // page passes a `HouseGame` whose actual type is incompatible with PersonalGameFormat.
  houseGame: { activePrimitives?: { id: string }[] } | null | undefined;
  houseGameEnabled: boolean;
  selectedPersonalFormat: PersonalGameFormat | null | undefined;
  // Ghost
  ghostPrimitiveActive: boolean;
  ghostName: string;
  ghostHandicap: number | undefined;
}

interface UseStartRoundArgs {
  createRound: (params: CreateRoundParams) => Promise<CreateRoundResult>;
}

export interface UseStartRoundReturn {
  isCreating: boolean;
  /** Builds games from current toggles, appends ghost player if active, calls createRound, navigates on success. */
  startRound: (inputs: StartRoundInputs) => Promise<void>;
}

/**
 * Encapsulates the multi-step "Start Round" submit flow:
 *   1. Build `games[]` from toggles via `buildGamesFromToggles`
 *   2. Append a ghost player if the format primitive is active
 *   3. When a house game is active, suppress redundant stroke-play scoring
 *   4. Call createRound; toast + navigate on outcome
 *
 * Owns its own `isCreating` flag.
 */
export function useStartRound({ createRound }: UseStartRoundArgs): UseStartRoundReturn {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const startRound = useCallback(async (inputs: StartRoundInputs) => {
    if (!inputs.selectedCourse || isCreating) return;
    setIsCreating(true);

    try {
      const holeInfo: HoleInfo[] = inputs.selectedCourse.holes.slice(0, inputs.holeCount);
      const validPlayerList = inputs.players.filter(p => p.name.trim());

      // Cast to bypass HouseGame vs PersonalGameFormat surface mismatch — runtime
      // only reads `activePrimitives` which both shapes have.
      const { games, hasHouseGame } = buildGamesFromToggles({
        validPlayerCount: validPlayerList.length,
        validPlayers: validPlayerList.map(p => ({ id: p.id, name: p.name })),
        matchPlay: inputs.matchPlay,
        matchPlayFormat: inputs.matchPlayFormat,
        matchPlayTeamA: inputs.matchPlayTeamA,
        matchPlayTeamB: inputs.matchPlayTeamB,
        stakes: inputs.stakes,
        skinsEnabled: inputs.skinsEnabled, skinsStakes: inputs.skinsStakes, skinsCarryover: inputs.skinsCarryover,
        nassauEnabled: inputs.nassauEnabled, nassauStakes: inputs.nassauStakes, nassauAutoPress: inputs.nassauAutoPress,
        stablefordEnabled: inputs.stablefordEnabled, stablefordModified: inputs.stablefordModified,
        bestBallEnabled: inputs.bestBallEnabled, bestBallTeams: inputs.bestBallTeams,
        wolfEnabled: inputs.wolfEnabled, wolfStakes: inputs.wolfStakes, wolfCarryover: inputs.wolfCarryover,
        vegasEnabled: inputs.vegasEnabled, vegasStakes: inputs.vegasStakes, vegasCarryover: inputs.vegasCarryover,
        ninesEnabled: inputs.ninesEnabled, ninesStakes: inputs.ninesStakes,
        defenderEnabled: inputs.defenderEnabled, defenderStakes: inputs.defenderStakes,
        sixesEnabled: inputs.sixesEnabled, sixesStakes: inputs.sixesStakes,
        houseGame: inputs.houseGame as PersonalGameFormat | null | undefined,
        houseGameEnabled: inputs.houseGameEnabled,
        selectedPersonalFormat: inputs.selectedPersonalFormat,
        generateId,
      });

      const roundPlayers: RoundPlayer[] = inputs.players
        .filter(p => p.name.trim())
        .map(p => ({
          name: p.name.trim(),
          handicap: p.handicap,
          manualStrokes: p.manualStrokes ?? 0,
          teamId: inputs.bestBallTeams.find(t => t.playerIds.includes(p.id))?.id,
          profileId: p.profileId,
          isGhost: false,
          teeSetId: inputs.mixedTees ? inputs.playerTeeIds.get(p.id) : undefined,
        }));

      if (inputs.ghostPrimitiveActive && inputs.houseGameEnabled) {
        roundPlayers.push({
          name: inputs.ghostName.trim() || 'Ghost',
          handicap: inputs.ghostHandicap,
          manualStrokes: 0,
          teamId: undefined,
          profileId: undefined,
          isGhost: true,
        });
      }

      // When a house game format is active, disable stroke play so the scorecard
      // shows the format's scoring (skins, nassau, etc.) instead of redundant stroke totals.
      const effectiveStrokePlay = hasHouseGame ? false : inputs.strokePlay;

      const result = await createRound({
        courseId: inputs.selectedCourse.id,
        courseName: inputs.selectedCourse.name,
        holes: inputs.holeCount,
        holeInfo,
        strokePlay: effectiveStrokePlay,
        matchPlay: inputs.matchPlay,
        stakes: inputs.stakes ? Number(inputs.stakes) : undefined,
        slope: inputs.selectedCourse.slope,
        rating: inputs.selectedCourse.rating,
        handicapMode: inputs.handicapMode,
        games,
        teeSets: inputs.mixedTees ? inputs.roundTeeSets : undefined,
        mixedTees: inputs.mixedTees,
        players: roundPlayers,
      });

      if (result.round) {
        toast.success(`Round created! Join code: ${result.round.joinCode}`);
        navigate(`/round/${result.round.id}`);
      } else if (result.error) {
        toast.error(result.error.message);
        if (result.error.isAuthError) {
          navigate('/auth');
        }
      } else {
        toast.error('Failed to create round. Please try again.');
      }
    } catch {
      toast.error('Failed to create round. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [createRound, isCreating, navigate]);

  return { isCreating, startRound };
}
