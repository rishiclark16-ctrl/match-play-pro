import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { hapticSuccess } from '@/lib/haptics';
import { buildConfig } from '@/engine/HouseGameEngine';
import { buildScoringConfig } from '@/lib/houseGame/engine';
import type { GameConfig, PlayerWithScores } from '@/types/golf';

type HouseGameConfig = ReturnType<typeof buildConfig>;
type HouseScoringConfig = ReturnType<typeof buildScoringConfig>;

interface UseHouseGameDerivationsArgs {
  round: { id: string; games?: GameConfig[] } | null;
  selectedPlayerId: string | null;
  playersWithScores: PlayerWithScores[];
  currentHole: number;
  currentHolePar: number;
  /** True when every player has a score for the current hole. */
  allCurrentHoleScored: boolean;
  saveScoreToSupabase: (playerId: string, hole: number, score: number) => void;
  setPlayerScore: (roundId: string, playerId: string, hole: number, score: number) => void;
  setSelectedPlayerId: (id: string | null) => void;
}

interface UseHouseGameDerivationsReturn {
  /** The house-game entry from round.games (memoized). */
  houseGameEntry: GameConfig | undefined;
  /** Compiled HouseGameEngine config for the active primitives, or null. */
  houseGameConfig: HouseGameConfig | null;
  /** Raw scoring-config (separate compile from buildScoringConfig). Memoized. */
  rawHouseScoringConfig: HouseScoringConfig | null;
  /** Pickup score for the selected player, or undefined when not applicable. */
  pickupScore: number | undefined;
  /** Records a pickup score for the selected player and clears selection. */
  handlePickup: () => void;
  /** Whether the Bingo Bango Bongo entry sheet should be visible. */
  showBBBSheet: boolean;
  /** Hole number being edited in the BBB sheet (snapshot at open time). */
  bbbHole: number;
  /** Imperatively dismiss the BBB sheet (used after save). */
  closeBBBSheet: () => void;
}

/**
 * Centralizes all house-game derived state used by Scorecard.tsx:
 *  - The active house-game entry on the round.
 *  - The compiled HouseGameEngine config + scoring config.
 *  - The "pickup" score (par + 2 + handicap strokes) for the currently
 *    selected player when casual rules + pickupRule are active.
 *  - The handler that commits a pickup score and dismisses the score input.
 *
 * Extracted from Scorecard.tsx so the page stays focused on render
 * orchestration. Pure derivations + a single callback — no effects.
 */
export function useHouseGameDerivations({
  round,
  selectedPlayerId,
  playersWithScores,
  currentHole,
  currentHolePar,
  allCurrentHoleScored,
  saveScoreToSupabase,
  setPlayerScore,
  setSelectedPlayerId,
}: UseHouseGameDerivationsArgs): UseHouseGameDerivationsReturn {
  const houseGameEntry = useMemo(
    () => round?.games?.find(g => g.type === 'house'),
    [round?.games],
  );

  const houseGameConfig = useMemo(() => {
    if (!houseGameEntry?.activePrimitives?.length) return null;
    try {
      return buildConfig(houseGameEntry.activePrimitives);
    } catch {
      return null;
    }
  }, [houseGameEntry?.activePrimitives]);

  const rawHouseScoringConfig = useMemo(() => {
    if (!houseGameEntry?.activePrimitives?.length) return null;
    try {
      return buildScoringConfig(houseGameEntry.activePrimitives);
    } catch {
      return null;
    }
  }, [houseGameEntry?.activePrimitives]);

  // Pickup score for selected player (par + 2 + handicap strokes on current hole)
  const pickupScore = useMemo(() => {
    if (!houseGameConfig?.casualRules || !selectedPlayerId) return undefined;
    if (!rawHouseScoringConfig?.pickupRule) return undefined;
    const player = playersWithScores.find(p => p.id === selectedPlayerId);
    const handicapStrokes = player?.strokesPerHole?.get(currentHole) ?? 0;
    return currentHolePar + 2 + handicapStrokes;
  }, [
    houseGameConfig,
    rawHouseScoringConfig,
    selectedPlayerId,
    playersWithScores,
    currentHole,
    currentHolePar,
  ]);

  const handlePickup = useCallback(() => {
    if (!selectedPlayerId || !round || pickupScore === undefined) return;
    hapticSuccess();
    saveScoreToSupabase(selectedPlayerId, currentHole, pickupScore);
    setPlayerScore(round.id, selectedPlayerId, currentHole, pickupScore);
    setSelectedPlayerId(null);
    toast.success('Pickup recorded', { duration: 1500 });
  }, [
    selectedPlayerId,
    round,
    pickupScore,
    currentHole,
    saveScoreToSupabase,
    setPlayerScore,
    setSelectedPlayerId,
  ]);

  // Bingo Bango Bongo entry sheet — opens automatically when every player has
  // a score for the current hole and BBB is part of the active house game.
  const [showBBBSheet, setShowBBBSheet] = useState(false);
  const [bbbHole, setBBBHole] = useState(1);
  const closeBBBSheet = useCallback(() => setShowBBBSheet(false), []);

  useEffect(() => {
    if (!houseGameConfig) return;
    if (!rawHouseScoringConfig?.bingoBangoBongo) return;
    if (!allCurrentHoleScored) return;

    // Only show if no BBB result recorded for this hole yet
    const existing = houseGameEntry?.bbbResults ?? [];
    const alreadyRecorded = existing.some(r => r.holeNumber === currentHole);
    if (alreadyRecorded) return;

    setBBBHole(currentHole);
    setShowBBBSheet(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCurrentHoleScored, currentHole]);

  return {
    houseGameEntry,
    houseGameConfig,
    rawHouseScoringConfig,
    pickupScore,
    handlePickup,
    showBBBSheet,
    bbbHole,
    closeBBBSheet,
  };
}
