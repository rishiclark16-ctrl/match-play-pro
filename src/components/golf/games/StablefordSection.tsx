import { motion } from 'framer-motion';
import { Round } from '@/types/golf';
import { StablefordResult, getStablefordPointsColor } from '@/lib/games/stableford';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge, SPRING } from './shared';

export function StablefordSection({
  stablefordGame,
  stablefordResult,
}: {
  stablefordGame: NonNullable<Round['games']>[number];
  stablefordResult: StablefordResult;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-0">
        <LiveDot />
        <span className="text-[15px] font-semibold text-[#0F1F17]">
          Stableford {stablefordResult.modified && '· modified'}
        </span>
        {stablefordGame.useNet && <NetBadge />}
        <span className="ml-auto text-[12px] text-[#5A6B61]">
          {stablefordResult.holesScored} holes
        </span>
      </div>

      <div className="space-y-1.5">
        {stablefordResult.standings.map((standing, index) => {
          const isFirst = index === 0 && stablefordResult.holesScored > 0;
          const gap = index > 0
            ? stablefordResult.standings[0].totalPoints - standing.totalPoints
            : 0;

          return (
            <motion.div
              key={standing.playerId}
              layout
              transition={SPRING}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[14px]',
                isFirst ? 'bg-[#14532D] text-white' : 'bg-[#FAFAF7]',
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-bold w-4 text-center',
                  isFirst ? 'text-white/60' : 'text-[#5A6B61]',
                )}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', isFirst ? 'text-white' : 'text-[#0F1F17]')}>
                  {standing.playerName}
                </p>
                {!isFirst && gap > 0 && stablefordResult.holesScored > 0 && (
                  <p className="text-[12px] text-[#5A6B61]">-{gap} pts back</p>
                )}
              </div>
              <span
                className={cn(
                  'text-base font-extrabold tabular-nums',
                  getStablefordPointsColor(standing.totalPoints),
                  isFirst && 'text-[#BEF264]',
                )}
              >
                {standing.totalPoints}
                <span className={cn('text-[12px] font-semibold ml-0.5', isFirst ? 'text-white/60' : 'text-[#5A6B61]')}>
                  pts
                </span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
