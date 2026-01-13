import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Target, TrendingUp, Trophy, Users, Coins, Crown, Dog } from 'lucide-react';
import { Round, Player, Score, PlayerWithScores, HoleInfo, WolfHoleResult } from '@/types/golf';
import { getSkinsHoleContext, StrokesPerHoleMap } from '@/lib/games/skins';
import { getNassauHoleContext } from '@/lib/games/nassau';
import { getBestBallHoleContext } from '@/lib/games/bestball';
import { getWolfHoleContext } from '@/lib/games/wolf';
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
        playerName: player.name.split(' ')[0],
        strokes
      };
    }).filter(p => p.strokes > 0);
  }, [players, currentHole]);
  
  // Build the strokesPerHole map for net scoring
  const buildStrokesMap = useMemo((): StrokesPerHoleMap | undefined => {
    // Check if any game uses net scoring
    const anyGameUsesNet = round.games?.some(g => g.useNet);
    if (!anyGameUsesNet) return undefined;
    
    const map = new Map<string, Map<number, number>>();
    for (const player of players) {
      if (player.strokesPerHole) {
        map.set(player.id, player.strokesPerHole);
      }
    }
    return map.size > 0 ? map : undefined;
  }, [players, round.games]);
  
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
        playerName: player.name.split(' ')[0],
        message,
        urgency
      };
    }).filter(Boolean);
  }, [players, scores, currentHole, currentHoleInfo.par]);
  
  const hasContent = strokeAllocations.length > 0 || skinsContext || nassauContext || bestBallContext || wolfContext;
  
  if (!hasContent) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="font-semibold text-xs uppercase tracking-wide">Hole {currentHole} Summary</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-2">
              {/* Stroke Allocations */}
              {strokeAllocations.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Strokes:</span>
                  <div className="flex flex-wrap gap-2">
                    {strokeAllocations.map(({ playerId, playerName, strokes }) => (
                      <span
                        key={playerId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {playerName}
                        <span className="font-bold">
                          {'•'.repeat(Math.min(strokes, 3))}
                          {strokes > 3 && `+${strokes - 3}`}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Skins Context */}
              {skinsContext && (
                <div className={cn(
                  "flex items-center gap-2 text-sm p-2 rounded-lg",
                  skinsContext.carryovers > 0 ? "bg-warning/10 border border-warning/20" : "bg-muted/30"
                )}>
                  <Coins className={cn(
                    "w-4 h-4",
                    skinsContext.carryovers > 0 ? "text-warning" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "font-medium",
                    skinsContext.carryovers > 0 && "text-warning"
                  )}>
                    ${skinsContext.potValue} on the line
                    {skinsContext.carryovers > 0 && ` (${skinsContext.carryovers} carryover${skinsContext.carryovers > 1 ? 's' : ''})`}
                  </span>
                </div>
              )}
              
              {/* Nassau Context */}
              {nassauContext && (
                <div className={cn(
                  "flex items-center justify-between text-sm p-2 rounded-lg",
                  nassauContext.urgency === 'critical' ? "bg-danger/10 border border-danger/20" :
                  nassauContext.urgency === 'opportunity' ? "bg-success/10 border border-success/20" :
                  "bg-muted/30"
                )}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={cn(
                      "w-4 h-4",
                      nassauContext.urgency === 'critical' ? "text-danger" :
                      nassauContext.urgency === 'opportunity' ? "text-success" :
                      "text-muted-foreground"
                    )} />
                    <span className="font-medium">{nassauContext.segment}:</span>
                    <span>{nassauContext.status}</span>
                  </div>
                  {nassauContext.message && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      nassauContext.urgency === 'critical' ? "bg-danger/20 text-danger" :
                      nassauContext.urgency === 'opportunity' ? "bg-success/20 text-success" :
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
                  "flex items-center justify-between text-sm p-2 rounded-lg",
                  bestBallContext.urgency === 'critical' ? "bg-danger/10 border border-danger/20" :
                  bestBallContext.urgency === 'opportunity' ? "bg-success/10 border border-success/20" :
                  "bg-muted/30"
                )}>
                  <div className="flex items-center gap-2">
                    <Users className={cn(
                      "w-4 h-4",
                      bestBallContext.urgency === 'critical' ? "text-danger" :
                      bestBallContext.urgency === 'opportunity' ? "text-success" :
                      "text-muted-foreground"
                    )} />
                    <span className="font-medium">{bestBallContext.status}</span>
                  </div>
                  {bestBallContext.message && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      bestBallContext.urgency === 'critical' ? "bg-danger/20 text-danger" :
                      bestBallContext.urgency === 'opportunity' ? "bg-success/20 text-success" :
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
                  "flex items-center justify-between text-sm p-2 rounded-lg",
                  wolfContext.isBlindWolf ? "bg-warning/20 border border-warning/40" :
                  wolfContext.isLoneWolf ? "bg-warning/10 border border-warning/20" :
                  "bg-muted/30"
                )}>
                  <div className="flex items-center gap-2">
                    {wolfContext.isLoneWolf || wolfContext.isBlindWolf ? (
                      <Dog className="w-4 h-4 text-warning" />
                    ) : (
                      <Crown className="w-4 h-4 text-primary" />
                    )}
                    <span className="font-medium">{wolfContext.message}</span>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "font-bold",
                      wolfContext.carryovers > 0 ? "text-warning" : "text-primary"
                    )}>
                      ${wolfContext.potValue}
                    </span>
                    {wolfContext.carryovers > 0 && (
                      <span className="text-xs text-warning ml-1">
                        (+{wolfContext.carryovers})
                      </span>
                    )}
                  </div>
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
                        need.urgency === 'opportunity' && "text-success",
                        need.urgency === 'critical' && "text-danger"
                      )}>
                        {need.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
