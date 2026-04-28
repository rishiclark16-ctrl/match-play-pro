import { buildConfig } from '@/engine/HouseGameEngine';
import { createDefaultTeams } from './games/bestball';
import type { GameConfig, Team } from '@/types/golf';
import type { PersonalGameFormat } from '@/types/houseGame';

interface PlayerSlot { id: string; name: string }

interface BuildGamesArgs {
  validPlayerCount: number;
  validPlayers: PlayerSlot[];
  // Stroke / match
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
  // House / personal formats
  houseGame: PersonalGameFormat | null | undefined;
  houseGameEnabled: boolean;
  selectedPersonalFormat: PersonalGameFormat | null | undefined;
  /** Generates ids for new game configs. Injected so tests can stub. */
  generateId: () => string;
}

interface BuildGamesResult {
  games: GameConfig[];
  /** True if any 'house' format is in the games array (used to suppress stroke play). */
  hasHouseGame: boolean;
}

/**
 * Builds the `games[]` array passed to createRound() based on the per-game
 * scoring toggles, gating each entry on player-count constraints.
 *
 * Extracted from NewRound.handleStartRound — keeps the page-level handler
 * focused on side-effects (auth/redirect) instead of config marshaling.
 */
export function buildGamesFromToggles(args: BuildGamesArgs): BuildGamesResult {
  const {
    validPlayerCount, validPlayers,
    matchPlay, matchPlayFormat, matchPlayTeamA, matchPlayTeamB, stakes,
    skinsEnabled, skinsStakes, skinsCarryover,
    nassauEnabled, nassauStakes, nassauAutoPress,
    stablefordEnabled, stablefordModified,
    bestBallEnabled, bestBallTeams,
    wolfEnabled, wolfStakes, wolfCarryover,
    vegasEnabled, vegasStakes, vegasCarryover,
    ninesEnabled, ninesStakes,
    defenderEnabled, defenderStakes,
    sixesEnabled, sixesStakes,
    houseGame, houseGameEnabled, selectedPersonalFormat,
    generateId,
  } = args;

  const games: GameConfig[] = [];

  if (skinsEnabled) {
    games.push({
      id: generateId(),
      type: 'skins',
      stakes: Number(skinsStakes) || 2,
      carryover: skinsCarryover,
    });
  }

  if (nassauEnabled) {
    games.push({
      id: generateId(),
      type: 'nassau',
      stakes: Number(nassauStakes) || 5,
      autoPress: nassauAutoPress,
    });
  }

  if (stablefordEnabled) {
    games.push({
      id: generateId(),
      type: 'stableford',
      stakes: 0,
      modifiedStableford: stablefordModified,
    });
  }

  if (bestBallEnabled && validPlayerCount >= 2) {
    const teams =
      bestBallTeams.length > 0
        ? bestBallTeams
        : createDefaultTeams(
            validPlayers.map((p, i) => ({ id: p.id, roundId: '', name: p.name, orderIndex: i }))
          );
    games.push({ id: generateId(), type: 'bestball', stakes: 0, teams });
  }

  if (wolfEnabled && (validPlayerCount === 3 || validPlayerCount === 4)) {
    games.push({
      id: generateId(),
      type: 'wolf',
      stakes: Number(wolfStakes) || 2,
      carryover: wolfCarryover,
    });
  }

  if (vegasEnabled && validPlayerCount === 4) {
    games.push({
      id: generateId(),
      type: 'vegas',
      stakes: Number(vegasStakes) || 1,
      carryover: vegasCarryover,
    });
  }

  if (ninesEnabled && validPlayerCount === 3) {
    games.push({
      id: generateId(),
      type: 'nines',
      stakes: Number(ninesStakes) || 1,
    });
  }

  if (defenderEnabled && (validPlayerCount === 3 || validPlayerCount === 4)) {
    games.push({
      id: generateId(),
      type: 'defender',
      stakes: Number(defenderStakes) || 1,
    });
  }

  if (sixesEnabled && validPlayerCount === 4) {
    games.push({
      id: generateId(),
      type: 'sixes',
      stakes: Number(sixesStakes) || 1,
    });
  }

  // House game — add as a single 'house' entry containing all primitives
  if (houseGame && houseGameEnabled && houseGame.activePrimitives.length > 0) {
    const hgConfig = buildConfig(houseGame.activePrimitives);
    games.push({
      id: generateId(),
      type: 'house',
      stakes: hgConfig.settlementConfig.unitValue,
      activePrimitives: houseGame.activePrimitives,
      houseGameId: houseGame.id,
    });
  }

  // Personal saved format — add as a 'house' entry when selected
  if (selectedPersonalFormat && selectedPersonalFormat.activePrimitives.length > 0) {
    const pfConfig = buildConfig(selectedPersonalFormat.activePrimitives);
    games.push({
      id: generateId(),
      type: 'house',
      stakes: pfConfig.settlementConfig.unitValue,
      activePrimitives: selectedPersonalFormat.activePrimitives,
      houseGameId: selectedPersonalFormat.id,
    });
  }

  if (matchPlay && stakes) {
    const mpFormat = validPlayerCount >= 3 ? matchPlayFormat : 'singles';
    const matchConfig: GameConfig = {
      id: generateId(),
      type: 'match',
      stakes: Number(stakes) || 0,
      matchPlayFormat: mpFormat,
    };
    if (mpFormat === 'fourball' && matchPlayTeamA.length > 0 && matchPlayTeamB.length > 0) {
      matchConfig.matchPlayTeams = [
        { id: 'team-a', name: 'Team A', playerIds: matchPlayTeamA, color: '#22C55E' },
        { id: 'team-b', name: 'Team B', playerIds: matchPlayTeamB, color: '#6366F1' },
      ];
    }
    games.push(matchConfig);
  }

  return {
    games,
    hasHouseGame: games.some(g => g.type === 'house'),
  };
}
