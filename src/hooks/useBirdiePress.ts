import { useEffect } from 'react';
import { toast } from 'sonner';
import { createPress } from '@/lib/games/nassau';
import type { Press, PlayerWithScores, GameConfig } from '@/types/golf';

interface UseBirdiePressArgs {
  round: {
    id: string;
    holes: number;
    games?: GameConfig[];
    presses?: Press[];
  } | null;
  roundScores: unknown; // included only as a re-render trigger; logic uses player.scores
  currentHole: number;
  currentHolePar: number;
  playersWithScores: PlayerWithScores[];
  houseGameConfig: { pressRules: { trigger: string } } | null;
  onAddPress: (press: Press) => void;
}

/**
 * House-game birdie press: when any player nets a birdie on the current hole,
 * auto-fire a press starting next hole. Capped at 3 active presses.
 *
 * Extracted from Scorecard.tsx for clarity. The original effect deliberately
 * omitted some deps from its array (eslint-disabled) to avoid double-firing;
 * we preserve that semantic here.
 */
export function useBirdiePress({
  round,
  roundScores,
  currentHole,
  currentHolePar,
  playersWithScores,
  houseGameConfig,
  onAddPress,
}: UseBirdiePressArgs): void {
  useEffect(() => {
    if (!round || !houseGameConfig) return;
    if (houseGameConfig.pressRules.trigger !== 'birdie') return;
    const houseGame = round.games?.find(g => g.type === 'house');
    if (!houseGame) return;
    const stakes = houseGame.stakes || 1;
    const existingPresses = round.presses || [];
    if (existingPresses.length >= 3) return;

    for (const player of playersWithScores) {
      const score = player.scores.find(s => s.holeNumber === currentHole);
      if (!score) continue;
      const handicapStrokes = player.strokesPerHole?.get(currentHole) ?? 0;
      const netDiff = score.strokes - handicapStrokes - currentHolePar;
      if (netDiff !== -1) continue;

      const nextHole = currentHole + 1;
      if (nextHole > round.holes) continue;
      const alreadyPressed = existingPresses.some(
        p => p.startHole === nextHole && p.initiatedBy === player.id
      );
      if (alreadyPressed) continue;

      const press = createPress(player.id, nextHole, stakes);
      onAddPress(press);
      toast.info(
        `Birdie Press! ${player.name.split(' ')[0]} nets a birdie`,
        { description: `Press $${stakes} starting hole ${nextHole}`, duration: 4000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundScores, currentHole, round]);
}
