import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, DollarSign, Flame, Sparkles } from 'lucide-react';
import { PlayerWithScores, GameConfig, HoleInfo, Score, Press } from '@/types/golf';
import { calculateLiveMoney, formatMoney, getMoneyColor } from '@/lib/games/moneyTracker';
import { cn } from '@/lib/utils';

interface MoneyTrackerProps {
  players: PlayerWithScores[];
  scores: Score[];
  games: GameConfig[];
  holeInfo: HoleInfo[];
  presses: Press[];
  currentHole: number;
}

export function MoneyTracker({
  players,
  scores,
  games,
  holeInfo,
  presses,
  currentHole,
}: MoneyTrackerProps) {
  // Calculate money state for current hole
  const currentMoney = useMemo(() => {
    if (games.length === 0) return null;
    
    // Get previous hole's money state for comparison
    const previousMoney = currentHole > 1 
      ? new Map(
          calculateLiveMoney(players, scores, games, holeInfo, presses, currentHole - 1)
            .players.map(p => [p.playerId, p.currentBalance])
        )
      : undefined;
    
    return calculateLiveMoney(players, scores, games, holeInfo, presses, currentHole, previousMoney);
  }, [players, scores, games, holeInfo, presses, currentHole]);

  // Don't render if no games configured
  if (!currentMoney || games.length === 0) {
    return null;
  }

  const hasAnyMoney = currentMoney.players.some(p => p.currentBalance !== 0);
  
  // Find the leader and their margin
  const leader = currentMoney.players[0];
  const secondPlace = currentMoney.players[1];
  const leadMargin = leader && secondPlace 
    ? leader.currentBalance - secondPlace.currentBalance 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-success/20 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-success" />
          </div>
          <span className="text-sm font-bold text-foreground">Live Money</span>
        </div>
        
        {/* Biggest Swing Badge */}
        <AnimatePresence mode="wait">
          {currentMoney.biggestSwing && Math.abs(currentMoney.biggestSwing.amount) >= 5 && (
            <motion.div
              key={`swing-${currentMoney.biggestSwing.holeNumber}`}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
                currentMoney.biggestSwing.amount > 0 
                  ? "bg-success/20 text-success" 
                  : "bg-danger/20 text-danger"
              )}
            >
              {currentMoney.biggestSwing.amount > 0 ? (
                <Flame className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>
                {currentMoney.biggestSwing.playerName.split(' ')[0]} {formatMoney(currentMoney.biggestSwing.amount)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player Money Grid */}
      <div className="space-y-2">
        {currentMoney.players.map((player, index) => {
          const isLeader = index === 0 && player.currentBalance > 0;
          const isLast = index === currentMoney.players.length - 1 && player.currentBalance < 0;
          
          return (
            <motion.div
              key={player.playerId}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                isLeader && "bg-success/10 border border-success/30",
                isLast && "bg-danger/5 border border-danger/20",
                !isLeader && !isLast && "bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2">
                {/* Position indicator */}
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  isLeader ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </span>
                
                <span className="text-sm font-semibold text-foreground truncate max-w-[100px]">
                  {player.playerName.split(' ')[0]}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Change indicator */}
                <AnimatePresence mode="wait">
                  {player.change !== 0 && (
                    <motion.div
                      key={`change-${currentHole}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-medium",
                        player.change > 0 ? "text-success" : "text-danger"
                      )}
                    >
                      {player.change > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{formatMoney(player.change)}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Current balance */}
                <motion.span
                  key={player.currentBalance}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "text-base font-black tabular-nums min-w-[60px] text-right",
                    getMoneyColor(player.currentBalance)
                  )}
                >
                  {player.currentBalance === 0 ? 'E' : formatMoney(player.currentBalance)}
                </motion.span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lead margin callout */}
      {hasAnyMoney && leadMargin > 0 && currentMoney.players.length >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 pt-2 border-t border-border/50 flex items-center justify-center gap-1 text-xs text-muted-foreground"
        >
          <span className="font-medium text-foreground">{leader.playerName.split(' ')[0]}</span>
          <span>leads by</span>
          <span className="font-bold text-success">${leadMargin.toFixed(0)}</span>
        </motion.div>
      )}

      {/* No money message */}
      {!hasAnyMoney && (
        <div className="text-center py-2 text-xs text-muted-foreground">
          All even so far
        </div>
      )}
    </motion.div>
  );
}
