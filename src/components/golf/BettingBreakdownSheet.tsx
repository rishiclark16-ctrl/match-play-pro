import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, DollarSign, Target, Flag, Users, Trophy, Sparkles, Swords } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatMoney, getMoneyColor } from '@/lib/games/moneyTracker';

interface MoneyBreakdown {
  skins: number;
  nassau: number;
  match: number;
  wolf: number;
  houseGame: number;
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
  { key: 'match', label: 'Match Play', icon: Swords, color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
  { key: 'wolf', label: 'Wolf', icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  { key: 'houseGame', label: 'House Game', icon: Sparkles, color: 'text-pink-500', bgColor: 'bg-pink-500/20' },
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
      Math.abs(p.breakdown.match),
      Math.abs(p.breakdown.wolf),
      Math.abs(p.breakdown.houseGame),
      Math.abs(p.breakdown.propBets),
    ]),
    1 // minimum to prevent division by zero
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] bg-[#F8F8F6] rounded-t-3xl p-0 border-0 [&>button]:hidden"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3" />

        {/* Header */}
        <div className="px-6 pb-3 flex items-center justify-between">
          <SheetTitle className="text-[20px] font-black tracking-[-0.04em] text-foreground">
            Money Breakdown
          </SheetTitle>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-0 space-y-4 overflow-y-auto h-[calc(100%-80px)] pb-8">
          {/* Player Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 px-6">
            {players.map((player, index) => (
              <motion.button
                key={player.playerId}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActivePlayerId(player.playerId)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  activePlayerId === player.playerId
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 && player.currentBalance > 0
                      ? "bg-[#22C55E] text-white"
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
                className="space-y-3"
              >
                {/* Total Balance Card */}
                <div className="mx-6">
                  <div className={cn(
                    "bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4",
                  )}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          Total Balance
                        </p>
                        <p className={cn(
                          "text-3xl font-black tabular-nums mt-1 tracking-[-0.04em]",
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
                          ? "bg-[#22C55E]/15"
                          : activePlayer.currentBalance < 0
                          ? "bg-[#EF4444]/15"
                          : "bg-muted"
                      )}>
                        {activePlayer.currentBalance > 0 ? (
                          <TrendingUp className="w-7 h-7 text-[#22C55E]" />
                        ) : activePlayer.currentBalance < 0 ? (
                          <TrendingDown className="w-7 h-7 text-[#EF4444]" />
                        ) : (
                          <Sparkles className="w-7 h-7 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Breakdown */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-6">
                    By Game
                  </p>

                  <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden divide-y divide-border/40">
                    {GAME_CONFIG.map(({ key, label, icon: Icon, color, bgColor }, index) => {
                      const value = activePlayer.breakdown[key as keyof MoneyBreakdown];
                      if (typeof value !== 'number') return null;

                      const barWidth = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0;
                      const hasValue = value !== 0;

                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm">
                                <Icon className={cn("w-4 h-4", color)} />
                              </div>
                              <span className="text-[14px] font-medium text-foreground">{label}</span>
                            </div>
                            <span className={cn(
                              "font-black tabular-nums text-[14px]",
                              hasValue
                                ? value > 0
                                  ? "text-[#22C55E]"
                                  : "text-[#EF4444]"
                                : "text-muted-foreground"
                            )}>
                              {hasValue ? formatMoney(value) : '--'}
                            </span>
                          </div>

                          {/* Progress bar */}
                          {hasValue && (
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${barWidth}%` }}
                                transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                                className={cn(
                                  "h-full rounded-full",
                                  value > 0 ? "bg-[#22C55E]" : "bg-[#EF4444]"
                                )}
                              />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Standings Summary */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-6">
                    All Players
                  </p>

                  <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden divide-y divide-border/40">
                    {players.map((player, index) => (
                      <motion.div
                        key={player.playerId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setActivePlayerId(player.playerId)}
                        className={cn(
                          "px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all",
                          player.playerId === activePlayerId
                            ? "bg-[#F0EE3A]/20"
                            : ""
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0 && player.currentBalance > 0
                              ? "bg-[#22C55E] text-white"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {index + 1}
                          </span>
                          <span className="text-[14px] font-medium text-foreground">
                            {player.playerName}
                          </span>
                        </div>
                        <span className={cn(
                          "font-black tabular-nums text-[14px]",
                          player.currentBalance > 0
                            ? "text-[#22C55E]"
                            : player.currentBalance < 0
                            ? "text-[#EF4444]"
                            : "text-muted-foreground"
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
