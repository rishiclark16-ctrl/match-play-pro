import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, DollarSign, Target, Flag, Users, Trophy, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatMoney, getMoneyColor } from '@/lib/games/moneyTracker';

interface MoneyBreakdown {
  skins: number;
  nassau: number;
  wolf: number;
  propBets: number;
  total: number;
}

interface PlayerBreakdown {
  playerId: string;
  playerName: string;
  breakdown: MoneyBreakdown;
  currentBalance: number;
  rank: number;
}

interface BettingBreakdownSheetProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerBreakdown[];
  selectedPlayerId?: string;
}

const GAME_CONFIG = [
  { key: 'skins', label: 'Skins', icon: Target, color: 'text-amber-500', bgColor: 'bg-amber-500/20' },
  { key: 'nassau', label: 'Nassau', icon: Flag, color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
  { key: 'wolf', label: 'Wolf', icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  { key: 'propBets', label: 'Side Bets', icon: Trophy, color: 'text-emerald-500', bgColor: 'bg-emerald-500/20' },
] as const;

export function BettingBreakdownSheet({
  isOpen,
  onClose,
  players,
  selectedPlayerId,
}: BettingBreakdownSheetProps) {
  const [activePlayerId, setActivePlayerId] = useState<string | undefined>(selectedPlayerId);

  // Reset active player when sheet opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    } else if (selectedPlayerId) {
      setActivePlayerId(selectedPlayerId);
    }
  };

  const activePlayer = players.find(p => p.playerId === activePlayerId) || players[0];

  // Calculate the max absolute value for bar scaling
  const maxValue = Math.max(
    ...players.flatMap(p => [
      Math.abs(p.breakdown.skins),
      Math.abs(p.breakdown.nassau),
      Math.abs(p.breakdown.wolf),
      Math.abs(p.breakdown.propBets),
    ]),
    1 // minimum to prevent division by zero
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <span>Money Breakdown</span>
            </SheetTitle>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="pt-4 space-y-6 overflow-y-auto h-[calc(100%-80px)] pb-8">
          {/* Player Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {players.map((player, index) => (
              <motion.button
                key={player.playerId}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActivePlayerId(player.playerId)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  activePlayerId === player.playerId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 && player.currentBalance > 0
                      ? "bg-success text-success-foreground"
                      : "bg-background/50 text-current"
                  )}>
                    {index + 1}
                  </span>
                  <span>{player.playerName.split(' ')[0]}</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Active Player Detail */}
          {activePlayer && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activePlayer.playerId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Total Balance Card */}
                <div className={cn(
                  "p-4 rounded-2xl border",
                  activePlayer.currentBalance > 0
                    ? "bg-success/10 border-success/30"
                    : activePlayer.currentBalance < 0
                    ? "bg-danger/10 border-danger/30"
                    : "bg-muted border-border"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        Total Balance
                      </p>
                      <p className={cn(
                        "text-3xl font-black tabular-nums mt-1",
                        getMoneyColor(activePlayer.currentBalance)
                      )}>
                        {activePlayer.currentBalance === 0
                          ? 'EVEN'
                          : formatMoney(activePlayer.currentBalance)}
                      </p>
                    </div>
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center",
                      activePlayer.currentBalance > 0
                        ? "bg-success/20"
                        : activePlayer.currentBalance < 0
                        ? "bg-danger/20"
                        : "bg-muted"
                    )}>
                      {activePlayer.currentBalance > 0 ? (
                        <TrendingUp className="w-7 h-7 text-success" />
                      ) : activePlayer.currentBalance < 0 ? (
                        <TrendingDown className="w-7 h-7 text-danger" />
                      ) : (
                        <Sparkles className="w-7 h-7 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Game Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    By Game
                  </h3>

                  {GAME_CONFIG.map(({ key, label, icon: Icon, color, bgColor }) => {
                    const value = activePlayer.breakdown[key as keyof MoneyBreakdown];
                    if (typeof value !== 'number') return null;

                    const barWidth = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0;
                    const hasValue = value !== 0;

                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: GAME_CONFIG.findIndex(g => g.key === key) * 0.05 }}
                        className={cn(
                          "p-3 rounded-xl border",
                          hasValue ? "bg-card border-border" : "bg-muted/30 border-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgColor)}>
                              <Icon className={cn("w-4 h-4", color)} />
                            </div>
                            <span className="font-semibold text-sm">{label}</span>
                          </div>
                          <span className={cn(
                            "font-bold tabular-nums text-base",
                            hasValue ? getMoneyColor(value) : "text-muted-foreground"
                          )}>
                            {hasValue ? formatMoney(value) : '--'}
                          </span>
                        </div>

                        {/* Progress bar */}
                        {hasValue && (
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                              className={cn(
                                "h-full rounded-full",
                                value > 0 ? "bg-success" : "bg-danger"
                              )}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Standings Summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    All Players
                  </h3>

                  <div className="space-y-2">
                    {players.map((player, index) => (
                      <motion.div
                        key={player.playerId}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setActivePlayerId(player.playerId)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                          player.playerId === activePlayerId
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-muted/50 hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0 && player.currentBalance > 0
                              ? "bg-success text-success-foreground"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-semibold text-sm">
                            {player.playerName}
                          </span>
                        </div>
                        <span className={cn(
                          "font-bold tabular-nums",
                          getMoneyColor(player.currentBalance)
                        )}>
                          {player.currentBalance === 0 ? 'E' : formatMoney(player.currentBalance)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
