import { motion } from 'framer-motion';
import { Crown, Dog } from 'lucide-react';
import { Round, PlayerWithScores } from '@/types/golf';
import { WolfResult, getWolfForHole } from '@/lib/games/wolf';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge, SPRING } from './shared';

export function WolfSection({
  wolfGame,
  wolfResult,
  players,
  currentHole,
}: {
  wolfGame: NonNullable<Round['games']>[number];
  wolfResult: WolfResult;
  players: PlayerWithScores[];
  currentHole: number;
}) {
  const currentWolf = getWolfForHole(players, currentHole);
  const lastHoleResult = wolfResult.results[wolfResult.results.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[12px] font-bold tracking-[0.08em] text-muted-foreground">
            Wolf ${wolfGame.stakes}/pt
          </span>
          {wolfGame.useNet && <NetBadge />}
        </div>
        <span className="text-[10px] text-[#5A6B61]">Thru {wolfResult.holesPlayed}</span>
      </div>

      {/* Current wolf */}
      {currentWolf && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0F1F17] text-white">
          <Crown className="w-4 h-4 text-[#14532D] shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-white/50">
              Current Wolf · H{currentHole}
            </p>
            <p className="text-sm font-bold">{currentWolf.name}</p>
          </div>
          {wolfResult.carryover > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#BEF264] text-[#0F1F17] rounded-full">
              {wolfResult.carryover} carry
            </span>
          )}
        </div>
      )}

      {/* Last hole context */}
      {lastHoleResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAFAF7] text-xs text-[#5A6B61]">
          <Dog className="w-3.5 h-3.5 text-[#5A6B61] shrink-0" />
          <span>
            H{lastHoleResult.holeNumber}:
            {lastHoleResult.isBlindWolf
              ? ' Blind Wolf'
              : lastHoleResult.partnerId === null
              ? ' Lone Wolf'
              : ' Wolf + Partner'}
            {' '}· {lastHoleResult.winningTeam === 'wolf' ? 'Wolf wins' : lastHoleResult.winningTeam === 'hunters' ? 'Hunters win' : 'Push'}
            {' '}· {lastHoleResult.points} pt{lastHoleResult.points !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Standings */}
      <div className="space-y-1.5">
        {wolfResult.standings
          .slice()
          .sort((a, b) => b.earnings - a.earnings)
          .map((standing, index) => {
            const isFirst = index === 0;
            return (
              <motion.div
                key={standing.playerId}
                layout
                transition={SPRING}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#FAFAF7]"
              >
                <span className="text-[11px] font-bold w-4 text-center text-[#5A6B61]">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F1F17] truncate">
                    {standing.playerName?.split(' ')[0] ?? standing.playerName}
                    {standing.loneWolfWins > 0 && (
                      <span className="ml-1 text-[9px] font-bold text-[#14532D]">
                        🐺{standing.loneWolfWins}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-[#5A6B61]">
                    {standing.totalPoints} pts · Wolf {standing.timesAsWolf}×
                  </p>
                </div>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    standing.earnings > 0 && 'text-[#14532D]',
                    standing.earnings < 0 && 'text-[#B42318]',
                    standing.earnings === 0 && 'text-[#5A6B61]',
                  )}
                >
                  {standing.earnings >= 0 ? '+' : ''}${standing.earnings}
                </span>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}
