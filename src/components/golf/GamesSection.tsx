import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Trophy, AlertCircle, Star, Users, Crown, Dog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Round, Player, Score, Press } from '@/types/golf';
import { calculateSkins, SkinsResult } from '@/lib/games/skins';
import { calculateNassau, NassauResult, formatNassauStatus, canPress, createPress } from '@/lib/games/nassau';
import { calculateStableford, StablefordResult, getStablefordPointsColor } from '@/lib/games/stableford';
import { calculateBestBall, BestBallResult, formatBestBallStatus } from '@/lib/games/bestball';
import { calculateWolf, WolfResult, getWolfForHole } from '@/lib/games/wolf';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GamesSectionProps {
  round: Round;
  players: Player[];
  scores: Score[];
  currentHole: number;
  onAddPress: (press: Press) => void;
}

export function GamesSection({ round, players, scores, currentHole, onAddPress }: GamesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [pressConfirmPlayer, setPressConfirmPlayer] = useState<Player | null>(null);
  
  const skinsGame = round.games?.find(g => g.type === 'skins');
  const nassauGame = round.games?.find(g => g.type === 'nassau');
  const stablefordGame = round.games?.find(g => g.type === 'stableford');
  const bestBallGame = round.games?.find(g => g.type === 'bestball');
  const wolfGame = round.games?.find(g => g.type === 'wolf');
  
  // Calculate the highest hole with all players scored
  const holesPlayed = useMemo(() => {
    let maxHole = 0;
    for (let hole = 1; hole <= round.holes; hole++) {
      const holeScores = scores.filter(s => s.holeNumber === hole);
      if (holeScores.length === players.length) {
        maxHole = hole;
      } else {
        break;
      }
    }
    return maxHole;
  }, [scores, players.length, round.holes]);
  
  // Calculate skins results
  const skinsResult: SkinsResult | null = useMemo(() => {
    if (!skinsGame || players.length < 2) return null;
    return calculateSkins(
      scores,
      players,
      holesPlayed,
      skinsGame.stakes,
      skinsGame.carryover ?? true
    );
  }, [skinsGame, scores, players, holesPlayed]);
  
  // Calculate Nassau results
  const nassauResult: NassauResult | null = useMemo(() => {
    if (!nassauGame || players.length !== 2) return null;
    return calculateNassau(
      scores,
      players,
      nassauGame.stakes,
      round.presses || [],
      round.holes
    );
  }, [nassauGame, scores, players, round.presses, round.holes]);
  
  // Calculate Stableford results
  const stablefordResult: StablefordResult | null = useMemo(() => {
    if (!stablefordGame || players.length < 2) return null;
    return calculateStableford(
      scores,
      players,
      round.holeInfo,
      stablefordGame.modifiedStableford ?? false
    );
  }, [stablefordGame, scores, players, round.holeInfo]);
  
  // Calculate Best Ball results
  const bestBallResult: BestBallResult | null = useMemo(() => {
    if (!bestBallGame?.teams || bestBallGame.teams.length < 2) return null;
    return calculateBestBall(
      scores,
      players,
      bestBallGame.teams,
      round.holeInfo,
      holesPlayed
    );
  }, [bestBallGame, scores, players, round.holeInfo, holesPlayed]);
  
  // Calculate Wolf results
  const wolfResult: WolfResult | null = useMemo(() => {
    if (!wolfGame || players.length !== 4) return null;
    return calculateWolf(
      scores,
      players,
      wolfGame.wolfResults || [],
      wolfGame.stakes,
      wolfGame.carryover ?? true,
      round.holes
    );
  }, [wolfGame, scores, players, round.holes]);
  
  // Check if any player can press
  const pressablePlayer = useMemo(() => {
    if (!nassauResult || players.length !== 2) return null;
    
    const [p1, p2] = players;
    const p1Standing = nassauResult.overall.margin * (nassauResult.overall.winnerId === p1.id ? 1 : -1);
    const p2Standing = nassauResult.overall.margin * (nassauResult.overall.winnerId === p2.id ? 1 : -1);
    
    if (canPress(currentHole, p1Standing, round.presses || [], round.holes)) {
      return { player: p1, standing: p1Standing };
    }
    if (canPress(currentHole, p2Standing, round.presses || [], round.holes)) {
      return { player: p2, standing: p2Standing };
    }
    return null;
  }, [nassauResult, players, currentHole, round.presses, round.holes]);
  
  if (!skinsGame && !nassauGame && !stablefordGame && !bestBallGame && !wolfGame) return null;
  
  const handleConfirmPress = () => {
    if (pressConfirmPlayer && nassauGame) {
      const press = createPress(pressConfirmPlayer.id, currentHole, nassauGame.stakes);
      onAddPress(press);
      setPressConfirmPlayer(null);
    }
  };
  
  return (
    <>
      <div className="card-premium overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-muted/30"
        >
          <span className="font-semibold text-sm uppercase tracking-wide">Games</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
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
              <div className="p-4 space-y-4">
                {/* Skins Section */}
                {skinsGame && skinsResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        SKINS (${skinsGame.stakes}/hole)
                      </h4>
                      {skinsResult.carryover > 0 && (
                        <span className="text-xs text-warning px-2 py-0.5 bg-warning/10 rounded-full">
                          {skinsResult.carryover} carrying...
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {skinsResult.standings.map((standing) => (
                        <div
                          key={standing.playerId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>{standing.playerName}:</span>
                            <span className="font-medium">
                              {standing.skins} <Trophy className="w-3 h-3 inline text-primary" />
                            </span>
                          </div>
                          <span className={cn(
                            "font-medium",
                            standing.earnings > 0 && "text-success",
                            standing.earnings < 0 && "text-danger",
                            standing.earnings === 0 && "text-muted-foreground"
                          )}>
                            {standing.earnings >= 0 ? '+' : ''}${standing.earnings}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Divider */}
                {skinsGame && nassauGame && (
                  <div className="border-t border-border/50" />
                )}
                
                {/* Nassau Section */}
                {nassauGame && nassauResult && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">NASSAU (${nassauGame.stakes})</h4>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Front 9:</span>
                        <span className="font-medium">
                          {formatNassauStatus(
                            nassauResult.front9.winnerId,
                            nassauResult.front9.margin,
                            players
                          )}
                        </span>
                      </div>
                      
                      {round.holes === 18 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Back 9:</span>
                          <span className="font-medium">
                            {nassauResult.back9.holesPlayed > 0 
                              ? formatNassauStatus(
                                  nassauResult.back9.winnerId,
                                  nassauResult.back9.margin,
                                  players
                                )
                              : '—'
                            }
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Overall:</span>
                        <span className="font-medium">
                          {formatNassauStatus(
                            nassauResult.overall.winnerId,
                            nassauResult.overall.margin,
                            players
                          )}
                        </span>
                      </div>
                    </div>
                    
                    {/* Presses */}
                    {(round.presses?.length || 0) > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                        <span className="text-xs text-muted-foreground uppercase">Presses</span>
                        {round.presses?.map((press, i) => (
                          <div key={press.id} className="text-xs flex justify-between">
                            <span>Press #{i + 1} (hole {press.startHole})</span>
                            <span className="text-muted-foreground">${press.stakes}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Press Button */}
                    {pressablePlayer && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-3 bg-warning/10 rounded-lg border border-warning/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-warning" />
                          <span className="text-sm font-medium">
                            {pressablePlayer.player.name} is {Math.abs(pressablePlayer.standing)} down
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                          onClick={() => setPressConfirmPlayer(pressablePlayer.player)}
                        >
                          Press ${nassauGame.stakes}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}
                
                {/* Divider before Stableford */}
                {(skinsGame || nassauGame) && stablefordGame && (
                  <div className="border-t border-border/50" />
                )}
                
                {/* Stableford Section */}
                {stablefordGame && stablefordResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        STABLEFORD {stablefordResult.modified && '(Modified)'}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {stablefordResult.holesScored} holes
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {stablefordResult.standings.map((standing, index) => (
                        <div
                          key={standing.playerId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {index === 0 && stablefordResult.holesScored > 0 && (
                              <Trophy className="w-3 h-3 text-primary" />
                            )}
                            <span>{standing.playerName}</span>
                          </div>
                          <span className={cn(
                            "font-bold tabular-nums",
                            getStablefordPointsColor(standing.totalPoints)
                          )}>
                            {standing.totalPoints} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Divider before Best Ball */}
                {(skinsGame || nassauGame || stablefordGame) && bestBallGame && (
                  <div className="border-t border-border/50" />
                )}
                
                {/* Best Ball Section */}
                {bestBallGame && bestBallResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        BEST BALL
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Thru {bestBallResult.holesPlayed}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {bestBallResult.standings.map((standing, index) => (
                        <div
                          key={standing.teamId}
                          className={cn(
                            "p-2 rounded-lg",
                            index === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {index === 0 && standing.holesPlayed > 0 && (
                                <Trophy className="w-3 h-3 text-primary" />
                              )}
                              <span className="font-medium text-sm">{standing.teamName}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-sm tabular-nums">
                                {standing.totalScore}
                              </span>
                              <span className={cn(
                                "ml-2 text-xs",
                                standing.relativeToPar < 0 && "text-success",
                                standing.relativeToPar > 0 && "text-danger",
                                standing.relativeToPar === 0 && "text-muted-foreground"
                              )}>
                                ({formatBestBallStatus(standing.relativeToPar)})
                              </span>
                            </div>
                          </div>
                          
                          {/* Show top contributor */}
                          {standing.playerContributions.length > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Top: {standing.playerContributions
                                .sort((a, b) => b.holesContributed - a.holesContributed)[0]?.playerName} 
                              ({standing.playerContributions
                                .sort((a, b) => b.holesContributed - a.holesContributed)[0]?.holesContributed} holes)
                  </div>
                )}
                
                {/* Divider before Wolf */}
                {(skinsGame || nassauGame || stablefordGame || bestBallGame) && wolfGame && (
                  <div className="border-t border-border/50" />
                )}
                
                {/* Wolf Section */}
                {wolfGame && wolfResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Crown className="w-4 h-4 text-warning" />
                        WOLF (${wolfGame.stakes}/pt)
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Thru {wolfResult.holesPlayed}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {wolfResult.standings.map((standing, index) => (
                        <div
                          key={standing.playerId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {index === 0 && wolfResult.holesPlayed > 0 && (
                              <Trophy className="w-3 h-3 text-warning" />
                            )}
                            <span>{standing.playerName.split(' ')[0]}</span>
                            {standing.loneWolfWins > 0 && (
                              <span className="text-xs text-warning">
                                🐺{standing.loneWolfWins}
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            "font-medium",
                            standing.earnings > 0 && "text-success",
                            standing.earnings < 0 && "text-danger",
                            standing.earnings === 0 && "text-muted-foreground"
                          )}>
                            {standing.earnings >= 0 ? '+' : ''}${standing.earnings}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {wolfResult.carryover > 0 && (
                      <div className="text-xs text-warning px-2 py-1 bg-warning/10 rounded-lg">
                        {wolfResult.carryover} points carrying over
                      </div>
                    )}
                  </div>
                )}
              </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Press Confirmation Dialog */}
      <AlertDialog open={!!pressConfirmPlayer} onOpenChange={() => setPressConfirmPlayer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Press</AlertDialogTitle>
            <AlertDialogDescription>
              {pressConfirmPlayer?.name} wants to press for ${nassauGame?.stakes} starting from hole {currentHole}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPress}>
              Press
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
