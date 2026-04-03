import { useMemo, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Flame, Sparkles, ChevronRight } from 'lucide-react';
import { PlayerWithScores, GameConfig, HoleInfo, Score, Press } from '@/types/golf';
import { PropBet } from '@/types/betting';
import { calculateLiveMoney, formatMoney, getMoneyColor } from '@/lib/games/moneyTracker';
import { BettingBreakdownSheet } from './BettingBreakdownSheet';
import { cn } from '@/lib/utils';

interface MoneyTrackerProps {
  players: PlayerWithScores[];
  scores: Score[];
  games: GameConfig[];
  holeInfo: HoleInfo[];
  presses: Press[];
  currentHole: number;
  propBets?: PropBet[];
}

export function MoneyTracker({
  players,
  scores,
  games,
  holeInfo,
  presses,
  currentHole,
  propBets,
}: MoneyTrackerProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();

  // Calculate money state for current hole
  const currentMoney = useMemo(() => {
    // Show money tracker if there are games OR prop bets with winners
    const hasGames = games.length > 0;
    const hasPropBetWinners = propBets && propBets.some(pb => pb.winnerId);

    if (!hasGames && !hasPropBetWinners) return null;

    // Get previous hole's money state for comparison
    const previousMoney = currentHole > 1
      ? new Map(
          calculateLiveMoney(players, scores, games, holeInfo, presses, currentHole - 1, undefined, propBets)
            .players.map(p => [p.playerId, p.currentBalance])
        )
      : undefined;

    return calculateLiveMoney(players, scores, games, holeInfo, presses, currentHole, previousMoney, propBets);
  }, [players, scores, games, holeInfo, presses, currentHole, propBets]);

  // Prepare breakdown data for the sheet - must be before early return
  const breakdownPlayers = useMemo(() => {
    if (!currentMoney) return [];
    return currentMoney.players.map((player, index) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      breakdown: currentMoney.breakdown.get(player.playerId) || {
        skins: 0,
        nassau: 0,
        match: 0,
        wolf: 0,
        houseGame: 0,
        propBets: 0,
        total: 0,
      },
      currentBalance: player.currentBalance,
      rank: index + 1,
    }));
  }, [currentMoney]);

  // Don't render if no money data
  if (!currentMoney) {
    return null;
  }

  const hasAnyMoney = currentMoney.players.some(p => p.currentBalance !== 0);

  // Find the leader and their margin
  const leader = currentMoney.players[0];
  const secondPlace = currentMoney.players[1];
  const leadMargin = leader && secondPlace
    ? leader.currentBalance - secondPlace.currentBalance
    : 0;

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setShowBreakdown(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-[#0A0A0A] rounded-2xl overflow-hidden"
    >
      {/* Header row */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/60">
            Live Money
          </span>
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
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold",
                currentMoney.biggestSwing.amount > 0
                  ? "bg-[#F0EE3A]/15 text-[#F0EE3A]"
                  : "bg-[#EF4444]/15 text-[#EF4444]"
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
      <div className="space-y-0 pb-1">
        {currentMoney.players.map((player, index) => {
          const isLeader = index === 0 && player.currentBalance > 0;
          const isLast = index === currentMoney.players.length - 1 && player.currentBalance < 0;

          const balanceColor =
            player.currentBalance > 0
              ? '#F0EE3A'
              : player.currentBalance < 0
              ? '#EF4444'
              : '#ffffff';

          return (
            <motion.button
              key={player.playerId}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePlayerClick(player.playerId)}
              className={cn(
                "w-full px-3 py-2.5 flex items-center gap-3 mx-1 mb-1 rounded-xl cursor-pointer touch-manipulation",
                isLeader && "bg-white/[0.06]",
                isLast && "bg-white/[0.03]",
                !isLeader && !isLast && "bg-white/[0.03]"
              )}
              style={{ WebkitTapHighlightColor: 'transparent', width: 'calc(100% - 8px)' }}
            >
              {/* Position circle */}
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0",
                isLeader ? "bg-[#F0EE3A] text-[#0A0A0A]" : "bg-white/10 text-white/40"
              )}>
                {index + 1}
              </span>

              {/* Player name */}
              <span className="text-sm font-semibold text-white/80 flex-1 truncate text-left">
                {player.playerName.split(' ')[0]}
              </span>

              <div className="flex items-center gap-2">
                {/* Change indicator */}
                <AnimatePresence mode="wait">
                  {player.change !== 0 && (
                    <motion.div
                      key={`change-${currentHole}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={cn(
                        "flex items-center gap-0.5 text-[11px] font-semibold",
                        player.change > 0 ? "text-[#F0EE3A]/80" : "text-[#EF4444]/80"
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

                {/* Current balance — large NumberFlow */}
                <motion.span
                  key={player.currentBalance}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-black tabular-nums min-w-[72px] text-right"
                  style={{ color: balanceColor }}
                >
                  {player.currentBalance === 0 ? (
                    <span className="text-white">E</span>
                  ) : (
                    <NumberFlow
                      value={Math.abs(player.currentBalance)}
                      prefix={player.currentBalance < 0 ? '-$' : '$'}
                    />
                  )}
                </motion.span>

                {/* Tap indicator */}
                <ChevronRight className="w-4 h-4 text-white/20" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Lead margin callout */}
      {hasAnyMoney && leadMargin > 0 && currentMoney.players.length >= 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 pb-3 text-[11px] font-semibold text-white/40"
        >
          <span className="text-white/70 font-bold">{leader.playerName.split(' ')[0]}</span>
          {' '}leads by{' '}
          <span className="text-[#F0EE3A] font-bold">${leadMargin.toFixed(0)}</span>
        </motion.p>
      )}

      {/* No money message */}
      {!hasAnyMoney && (
        <p className="px-4 py-3 text-sm text-white/30 text-center">
          All even so far
        </p>
      )}

      {/* Betting Breakdown Sheet */}
      <BettingBreakdownSheet
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        players={breakdownPlayers}
        selectedPlayerId={selectedPlayerId}
      />
    </motion.div>
  );
}
