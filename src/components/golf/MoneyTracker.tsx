import { useMemo, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Flame, Sparkles, ChevronRight } from 'lucide-react';
import { PlayerWithScores, GameConfig, HoleInfo, Score, Press } from '@/types/golf';
import { PropBet } from '@/types/betting';
import { calculateLiveMoney, formatMoney, getMoneyColor } from '@/lib/games/moneyTracker';
import { liveMoneyThroughHole } from '@/lib/scorecardProgress';
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

    // Live money is the round's money right now, through the latest scored hole,
    // not just up to the hole being viewed (otherwise reviewing hole 1 showed
    // "All even" while the games below showed real winnings).
    const throughHole = liveMoneyThroughHole(scores, currentHole, holeInfo.length || 18);

    // Previous hole's money state, for the per-hole change arrows
    const previousMoney = throughHole > 1
      ? new Map(
          calculateLiveMoney(players, scores, games, holeInfo, presses, throughHole - 1, undefined, propBets)
            .players.map(p => [p.playerId, p.currentBalance])
        )
      : undefined;

    return calculateLiveMoney(players, scores, games, holeInfo, presses, throughHole, previousMoney, propBets);
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
      data-testid="money-tracker"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-white rounded-[20px] border border-[#E7E9E3] overflow-hidden"
    >
      {/* Header row */}
      <div className="px-4 pt-3.5 pb-1 flex items-center justify-between min-h-[40px]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#5A6B61]">
            Live money
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
                "flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold",
                currentMoney.biggestSwing.amount > 0
                  ? "bg-[#ECFCCB] text-[#14532D]"
                  : "bg-[#FEF3F2] text-[#B42318]"
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
      <div className="pb-1">
        {currentMoney.players.map((player, index) => {
          const isLeader = index === 0 && player.currentBalance > 0;
          const isLast = index === currentMoney.players.length - 1 && player.currentBalance < 0;

          const balanceColor =
            player.currentBalance > 0
              ? '#14532D'
              : player.currentBalance < 0
              ? '#B42318'
              : '#0F1F17';

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
                "w-full px-4 min-h-[52px] py-2 flex items-center gap-3 cursor-pointer touch-manipulation active:bg-[#F0F2EC]",
                index > 0 && "border-t border-[#E7E9E3]",
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Position circle */}
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 tabular-nums",
                isLeader ? "bg-[#14532D] text-white" : "bg-[#F0F2EC] text-[#5A6B61]"
              )}>
                {index + 1}
              </span>

              {/* Player name */}
              <span className="text-[15px] font-semibold text-[#0F1F17] flex-1 truncate text-left">
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
                        "flex items-center gap-0.5 text-[12px] font-semibold tabular-nums",
                        player.change > 0 ? "text-[#14532D]" : "text-[#B42318]"
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
                  className="text-[20px] font-extrabold tabular-nums min-w-[64px] text-right"
                  style={{ color: balanceColor }}
                >
                  {player.currentBalance === 0 ? (
                    <span className="text-[15px] font-semibold text-[#5A6B61]">Even</span>
                  ) : (
                    <NumberFlow
                      value={Math.abs(player.currentBalance)}
                      prefix={player.currentBalance < 0 ? '-$' : '$'}
                    />
                  )}
                </motion.span>

                {/* Tap indicator */}
                <ChevronRight className="w-4 h-4 text-[#B4BDB7]" />
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
          className="px-4 pb-3 pt-1 text-[12px] font-medium text-[#5A6B61] border-t border-[#E7E9E3]"
        >
          <span className="text-[#0F1F17] font-semibold">{leader.playerName.split(' ')[0]}</span>
          {' '}leads by{' '}
          <span className="text-[#14532D] font-bold">${leadMargin.toFixed(0)}</span>
        </motion.p>
      )}

      {/* No money message */}
      {!hasAnyMoney && (
        <p className="px-4 py-3 text-[13px] font-medium text-[#5A6B61] text-center border-t border-[#E7E9E3]">
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
