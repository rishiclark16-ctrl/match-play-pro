import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Round, Player, Score, PlayerWithScores, HoleInfo, WolfHoleResult } from '@/types/golf';
import { getSkinsHoleContext, StrokesPerHoleMap } from '@/lib/games/skins';
import { getNassauHoleContext } from '@/lib/games/nassau';
import { getBestBallHoleContext } from '@/lib/games/bestball';
import { getWolfHoleContext } from '@/lib/games/wolf';
import { calculateHouseGame } from '@/lib/games/houseGame';
import { buildScoringConfig } from '@/lib/houseGame/engine';
import { getStrokesPerHole } from '@/lib/handicapUtils';
import { cn } from '@/lib/utils';

interface HoleSummaryProps {
  round: Round;
  players: PlayerWithScores[];
  scores: Score[];
  currentHole: number;
  currentHoleInfo: HoleInfo;
  /** Opens the stroke-allocation sheet; makes the strokes tile tappable. */
  onShowStrokes?: () => void;
}

/**
 * Bet tiles for the current hole, rendered inside the Forest hole hero card.
 * Derivations are unchanged from the old "Hole summary" card; only the
 * presentation moved into the hero.
 */
export function HoleSummary({ round, players, scores, currentHole, currentHoleInfo, onShowStrokes }: HoleSummaryProps) {

  const skinsGame = round.games?.find(g => g.type === 'skins');
  const nassauGame = round.games?.find(g => g.type === 'nassau');
  const bestBallGame = round.games?.find(g => g.type === 'bestball');
  const matchPlayGame = round.games?.find(g => g.type === 'match');
  const wolfGame = round.games?.find(g => g.type === 'wolf');

  // Get stroke allocations for this hole
  const strokeAllocations = useMemo(() => {
    return players.map(player => {
      const strokes = player.strokesPerHole?.get(currentHole) || 0;
      return {
        playerId: player.id,
        playerName: (player.name || 'Player').split(' ')[0],
        strokes
      };
    }).filter(p => p.strokes > 0);
  }, [players, currentHole]);

  // Build the strokesPerHole map for net scoring
  // Always build if players have strokes data - individual games decide whether to use it
  const buildStrokesMap = useMemo((): StrokesPerHoleMap | undefined => {
    const map = new Map<string, Map<number, number>>();
    for (const player of players) {
      if (player.strokesPerHole) {
        map.set(player.id, player.strokesPerHole);
      }
    }
    return map.size > 0 ? map : undefined;
  }, [players]);

  // Calculate carryover for skins
  const skinsContext = useMemo(() => {
    if (!skinsGame) return null;
    const useStrokesMap = skinsGame.useNet ? buildStrokesMap : undefined;
    return getSkinsHoleContext(
      scores,
      players,
      currentHole,
      skinsGame.stakes,
      skinsGame.carryover ?? true,
      round.holes,
      useStrokesMap
    );
  }, [skinsGame, scores, players, currentHole, round.holes, buildStrokesMap]);

  // Get Nassau context
  const nassauContext = useMemo(() => {
    if (!nassauGame || players.length !== 2) return null;
    const useStrokesMap = nassauGame.useNet ? buildStrokesMap : undefined;
    return getNassauHoleContext(
      scores,
      players,
      currentHole,
      nassauGame.stakes,
      round.presses || [],
      round.holes,
      useStrokesMap
    );
  }, [nassauGame, scores, players, currentHole, round.presses, round.holes, buildStrokesMap]);

  // Get Best Ball context
  const bestBallContext = useMemo(() => {
    if (!bestBallGame?.teams || bestBallGame.teams.length < 2) return null;
    const useStrokesMap = bestBallGame.useNet ? buildStrokesMap : undefined;
    return getBestBallHoleContext(
      scores,
      players,
      bestBallGame.teams,
      round.holeInfo,
      currentHole,
      useStrokesMap
    );
  }, [bestBallGame, scores, players, round.holeInfo, currentHole, buildStrokesMap]);

  // Get Wolf context
  const wolfContext = useMemo(() => {
    if (!wolfGame || players.length !== 4) return null;
    return getWolfHoleContext(
      players,
      currentHole,
      wolfGame.wolfResults || [],
      wolfGame.stakes,
      wolfGame.carryover ?? true
    );
  }, [wolfGame, players, currentHole]);

  // House game context — skins pot + active bonuses for this hole
  const houseGameEntry = round.games?.find(g => g.type === 'house');
  const houseContext = useMemo(() => {
    if (!houseGameEntry?.activePrimitives?.length || !round.holeInfo?.length) return null;
    try {
      const config = buildScoringConfig(houseGameEntry.activePrimitives);
      if (!config.skins && !config.nassau) return null; // only show if there's a pot to display
      const totalHoles = (round.holes <= 9 ? 9 : 18) as 9 | 18;
      const houseResult = calculateHouseGame(
        scores, players, round.holeInfo, config, round.slope ?? 113, totalHoles, houseGameEntry.bbbResults,
      );
      const holeResult = houseResult.holeResults.find(r => r.holeNumber === currentHole);
      const bonuses = holeResult?.activeBonuses ?? [];

      // Skins pot from the house skins sub-result
      let pot: { value: number; carryovers: number } | null = null;
      if (houseResult.skinsResult) {
        const carryovers = houseResult.skinsResult.carryover;
        const potPerSkin = houseResult.skinsResult.potPerSkin;
        pot = { value: potPerSkin * (1 + carryovers), carryovers };
      }

      return { bonuses, pot };
    } catch { return null; }
  }, [houseGameEntry, scores, players, round.holeInfo, currentHole, round.holes, round.slope]);

  // Calculate what each player needs this hole (after opponent has scored)
  const playerNeeds = useMemo(() => {
    if (players.length !== 2) return [];

    const currentHoleScores = scores.filter(s => s.holeNumber === currentHole);
    if (currentHoleScores.length === 0) return [];

    return players.map(player => {
      const myScore = currentHoleScores.find(s => s.playerId === player.id);
      const opponentScore = currentHoleScores.find(s => s.playerId !== player.id);

      if (!opponentScore) return null;

      const myStrokes = player.strokesPerHole?.get(currentHole) || 0;
      const opponent = players.find(p => p.id !== player.id);
      const oppStrokes = opponent?.strokesPerHole?.get(currentHole) || 0;

      const oppNetScore = opponentScore.strokes - oppStrokes;

      // What gross score do I need to tie or beat?
      const needToTie = oppNetScore + myStrokes;
      const needToWin = needToTie - 1;

      let message = '';
      let urgency: 'normal' | 'opportunity' | 'critical' = 'normal';

      if (myScore) {
        const myNetScore = myScore.strokes - myStrokes;
        if (myNetScore < oppNetScore) {
          message = 'Won hole';
          urgency = 'opportunity';
        } else if (myNetScore === oppNetScore) {
          message = 'Halved';
        } else {
          message = 'Lost hole';
          urgency = 'critical';
        }
      } else {
        if (needToWin <= currentHoleInfo.par - 1) {
          message = `Par or better wins`;
          urgency = 'opportunity';
        } else if (needToWin === currentHoleInfo.par) {
          message = `Need birdie to win`;
          urgency = 'critical';
        } else {
          message = `${needToTie} to halve`;
        }
      }

      return {
        playerId: player.id,
        playerName: (player.name || 'Player').split(' ')[0],
        message,
        urgency
      };
    }).filter(Boolean);
  }, [players, scores, currentHole, currentHoleInfo.par]);

  const hasHandicaps = players.some(p => p.strokesPerHole && Array.from(p.strokesPerHole.values()).some(v => v > 0));

  // ── Build the tile list. Exactly one tile (the hottest number) is lime. ──
  const tiles: BetTile[] = [];
  if (skinsContext) {
    tiles.push({
      key: 'skins',
      label: skinsContext.carryovers > 0 ? `Skins · ${skinsContext.carryovers} carried` : 'Skins pot',
      value: `$${skinsContext.potValue}`,
      hot: true,
    });
  }
  if (houseContext?.pot) {
    tiles.push({
      key: 'house-pot',
      label: houseContext.pot.carryovers > 0 ? `Pot · ${houseContext.pot.carryovers} carried` : 'Pot',
      value: `$${houseContext.pot.value}`,
      hot: true,
    });
  }
  if (wolfContext) {
    tiles.push({
      key: 'wolf',
      label: wolfContext.isBlindWolf ? 'Blind wolf' : wolfContext.isLoneWolf ? 'Lone wolf' : 'Wolf',
      value: `$${wolfContext.potValue}${wolfContext.carryovers > 0 ? ` +${wolfContext.carryovers}` : ''}`,
      sub: wolfContext.message,
      hot: true,
    });
  }
  if (nassauContext) {
    tiles.push({ key: 'nassau', label: nassauContext.segment, value: tidyStatus(nassauContext.status), sub: nassauContext.message });
  }
  if (bestBallContext) {
    tiles.push({ key: 'bestball', label: 'Best ball', value: tidyStatus(bestBallContext.status), sub: bestBallContext.message });
  }
  if (strokeAllocations.length > 0 || (hasHandicaps && onShowStrokes)) {
    tiles.push({
      key: 'strokes',
      label: strokeAllocations.some(a => a.strokes > 1) ? 'Get shots' : 'Gets a shot',
      value: strokeAllocations.length === 0
        ? 'Nobody'
        : strokeAllocations.length <= 2
        ? strokeAllocations.map(a => (a.strokes > 1 ? `${a.playerName} ×${a.strokes}` : a.playerName)).join(', ')
        : `${strokeAllocations.length} players`,
      sub: strokeAllocations.length > 2
        ? strokeAllocations.map(a => (a.strokes > 1 ? `${a.playerName} ×${a.strokes}` : a.playerName)).join(', ')
        : undefined,
      onPress: hasHandicaps ? onShowStrokes : undefined,
    });
  }
  if (houseContext && houseContext.bonuses.length > 0) {
    tiles.push({ key: 'bonus', label: 'Bonus hole', value: houseContext.bonuses.map(bonusLabel).join(', ') });
  }
  for (const need of playerNeeds) {
    if (!need) continue;
    tiles.push({ key: `need-${need.playerId}`, label: need.playerName, value: need.message });
  }

  if (tiles.length === 0) return null;

  // Only the first "hot" tile gets the lime treatment.
  const hotKey = tiles.find(t => t.hot)?.key ?? null;

  return (
    <div
      className={cn(
        'grid gap-2',
        tiles.length === 1 && 'grid-cols-1',
        tiles.length === 2 && 'grid-cols-2',
        tiles.length >= 3 && 'grid-flow-col auto-cols-[minmax(108px,1fr)] overflow-x-auto scrollbar-hide -mx-5 px-5',
      )}
      aria-label={`Hole ${currentHole} bets`}
    >
      {tiles.map(tile => {
        const isHot = tile.key === hotKey;
        const body = (
          <>
            <span className={cn('flex items-center gap-1 text-[12px] font-semibold leading-tight', isHot ? 'text-[#14532D]' : 'text-[#CFE3D6]')}>
              <span className="truncate">{tile.label}</span>
              {tile.onPress && <ChevronRight className="w-3 h-3 shrink-0" strokeWidth={2.5} />}
            </span>
            <span className="mt-0.5 text-[18px] font-extrabold leading-tight tracking-[-0.01em] truncate">{tile.value}</span>
            {tile.sub && (
              <span className={cn('mt-0.5 text-[11px] font-medium leading-tight truncate', isHot ? 'text-[#14532D]' : 'text-[#CFE3D6]')}>
                {tile.sub}
              </span>
            )}
          </>
        );
        const tileClass = cn(
          'min-w-0 rounded-[14px] px-3 py-2.5 text-left min-h-[56px] flex flex-col justify-center',
          isHot ? 'bg-[#BEF264] text-[#14532D]' : 'bg-white/10 text-white',
        );
        return tile.onPress ? (
          <button
            key={tile.key}
            type="button"
            onClick={tile.onPress}
            aria-label={`${tile.label}: ${tile.value}. Show stroke allocation`}
            className={cn(tileClass, 'touch-manipulation active:bg-white/20')}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {body}
          </button>
        ) : (
          <div key={tile.key} className={tileClass}>{body}</div>
        );
      })}
    </div>
  );
}

interface BetTile {
  key: string;
  label: string;
  value: string;
  sub?: string;
  hot?: boolean;
  onPress?: () => void;
}

/** "Mike 2 UP" -> "Mike 2 up" (sentence case for display only). */
function tidyStatus(status: string): string {
  return status.replace(/\bUP\b/g, 'up').replace(/\bDN\b/g, 'down').replace(/^All Square$/i, 'All square');
}

function bonusLabel(b: string): string {
  switch (b) {
    case 'bonus_par5_double': return '2× par 5';
    case 'bonus_birdie_unit': return 'Birdie bonus';
    case 'bonus_eagle_unit': return 'Eagle bonus';
    case 'bonus_last_hole_double': return '2× last hole';
    case 'bonus_greenie': return 'Greenie';
    default: return b.replace(/^bonus_/, '').replace(/_/g, ' ');
  }
}
