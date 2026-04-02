import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Target, TrendingUp, Users, Coins, Crown, Dog } from 'lucide-react';
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
}

export function HoleSummary({ round, players, scores, currentHole, currentHoleInfo }: HoleSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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

      // Show skins pot context from house skins sub-result
      let potMessage: string | null = null;
      if (houseResult.skinsResult) {
        const carryovers = houseResult.skinsResult.carryover;
        const potPerSkin = houseResult.skinsResult.potPerSkin;
        const potValue = potPerSkin * (1 + carryovers);
        potMessage = carryovers > 0
          ? `$${potValue} on the line (${carryovers} carryover${carryovers > 1 ? 's' : ''})`
          : `$${potPerSkin} on the line`;
      }

      return { bonuses, potMessage };
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

  const hasContent = strokeAllocations.length > 0 || skinsContext || nassauContext || bestBallContext || wolfContext || houseContext;

  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-muted/30 px-4 py-3 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center">
          <Target className="w-4 h-4 text-muted-foreground mr-2" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Hole {currentHole} Summary
          </span>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <motion.div
        animate={{ height: isExpanded ? 'auto' : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ overflow: 'hidden' }}
      >
        <div className="px-4 pb-4 space-y-2 pt-2">
          {/* Stroke Allocations */}
          {strokeAllocations.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Strokes:</span>
              <div className="flex flex-wrap gap-2">
                {strokeAllocations.map(({ playerId, playerName, strokes }) => (
                  <span
                    key={playerId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/30 text-foreground text-xs font-medium"
                  >
                    {playerName}
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(strokes, 3) }).map((_, i) => (
                        <span key={i} className="w-2 h-2 rounded-full bg-[#F0EE3A] inline-block" />
                      ))}
                      {strokes > 3 && <span className="font-bold">+{strokes - 3}</span>}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skins Context */}
          {skinsContext && (
            <div className={cn(
              "flex items-center gap-2 text-sm px-3 py-2",
              skinsContext.carryovers > 0 ? "bg-[#FFFBEB] border-l-4 border-[#F0EE3A] rounded-r-xl" : "bg-muted/30 rounded-xl"
            )}>
              <Coins className={cn(
                "w-4 h-4",
                skinsContext.carryovers > 0 ? "text-amber-600" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-medium",
                skinsContext.carryovers > 0 && "text-amber-700"
              )}>
                <span className="font-black text-foreground">${skinsContext.potValue}</span> on the line
                {skinsContext.carryovers > 0 && ` (${skinsContext.carryovers} carryover${skinsContext.carryovers > 1 ? 's' : ''})`}
              </span>
            </div>
          )}

          {/* Nassau Context */}
          {nassauContext && (
            <div className={cn(
              "flex items-center justify-between text-sm px-3 py-2",
              nassauContext.urgency === 'critical' ? "bg-[#FEF2F2] border-l-4 border-[#EF4444] rounded-r-xl" :
              nassauContext.urgency === 'opportunity' ? "bg-[#F0FFF4] border-l-4 border-[#22C55E] rounded-r-xl" :
              "bg-muted/30 rounded-xl"
            )}>
              <div className="flex items-center gap-2">
                <TrendingUp className={cn(
                  "w-4 h-4",
                  nassauContext.urgency === 'critical' ? "text-[#EF4444]" :
                  nassauContext.urgency === 'opportunity' ? "text-[#22C55E]" :
                  "text-muted-foreground"
                )} />
                <span className="font-medium">{nassauContext.segment}:</span>
                <span>{nassauContext.status}</span>
              </div>
              {nassauContext.message && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  nassauContext.urgency === 'critical' ? "bg-[#FEF2F2] text-[#EF4444]" :
                  nassauContext.urgency === 'opportunity' ? "bg-[#F0FFF4] text-[#22C55E]" :
                  "bg-muted text-muted-foreground"
                )}>
                  {nassauContext.message}
                </span>
              )}
            </div>
          )}

          {/* Best Ball Context */}
          {bestBallContext && (
            <div className={cn(
              "flex items-center justify-between text-sm px-3 py-2",
              bestBallContext.urgency === 'critical' ? "bg-[#FEF2F2] border-l-4 border-[#EF4444] rounded-r-xl" :
              bestBallContext.urgency === 'opportunity' ? "bg-[#F0FFF4] border-l-4 border-[#22C55E] rounded-r-xl" :
              "bg-muted/30 rounded-xl"
            )}>
              <div className="flex items-center gap-2">
                <Users className={cn(
                  "w-4 h-4",
                  bestBallContext.urgency === 'critical' ? "text-[#EF4444]" :
                  bestBallContext.urgency === 'opportunity' ? "text-[#22C55E]" :
                  "text-muted-foreground"
                )} />
                <span className="font-medium">{bestBallContext.status}</span>
              </div>
              {bestBallContext.message && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  bestBallContext.urgency === 'critical' ? "bg-[#FEF2F2] text-[#EF4444]" :
                  bestBallContext.urgency === 'opportunity' ? "bg-[#F0FFF4] text-[#22C55E]" :
                  "bg-muted text-muted-foreground"
                )}>
                  {bestBallContext.message}
                </span>
              )}
            </div>
          )}

          {/* Wolf Context */}
          {wolfContext && (
            <div className={cn(
              "flex items-center justify-between text-sm px-3 py-2",
              wolfContext.isBlindWolf ? "bg-[#FFFBEB] border-l-4 border-[#F0EE3A] rounded-r-xl" :
              wolfContext.isLoneWolf ? "bg-[#FFFBEB] border-l-4 border-[#F0EE3A] rounded-r-xl" :
              "bg-muted/30 rounded-xl"
            )}>
              <div className="flex items-center gap-2">
                {wolfContext.isLoneWolf || wolfContext.isBlindWolf ? (
                  <Dog className="w-4 h-4 text-amber-600" />
                ) : (
                  <Crown className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium">{wolfContext.message}</span>
              </div>
              <div className="text-right">
                <span className="font-black text-foreground">
                  ${wolfContext.potValue}
                </span>
                {wolfContext.carryovers > 0 && (
                  <span className="text-xs text-amber-600 ml-1">
                    (+{wolfContext.carryovers})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* House Game Context */}
          {houseContext && (
            <div className="space-y-1.5">
              {houseContext.potMessage && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 bg-[#FFFBEB] border-l-4 border-[#F0EE3A] rounded-r-xl">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span className="font-medium">
                    <span className="font-black text-foreground">{houseContext.potMessage}</span>
                  </span>
                </div>
              )}
              {houseContext.bonuses.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  {houseContext.bonuses.map((b, i) => (
                    <span key={`${b}-${i}`} className="text-[10px] font-bold bg-[#F0EE3A] text-[#0A0A0A] px-2 py-0.5 rounded-full">
                      {b === 'bonus_par5_double' ? '2× Par 5' :
                       b === 'bonus_birdie_unit' ? 'Birdie Bonus' :
                       b === 'bonus_eagle_unit' ? 'Eagle Bonus' :
                       b === 'bonus_last_hole_double' ? '2× Last Hole' :
                       b === 'bonus_greenie' ? 'Greenie' :
                       b.replace(/^bonus_/, '').replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {playerNeeds.length > 0 && (
            <div className="pt-1 border-t border-border/30 space-y-1">
              {playerNeeds.map((need) => need && (
                <div
                  key={need.playerId}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{need.playerName}:</span>
                  <span className={cn(
                    "font-medium",
                    need.urgency === 'opportunity' && "text-[#22C55E]",
                    need.urgency === 'critical' && "text-[#EF4444]"
                  )}>
                    {need.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
