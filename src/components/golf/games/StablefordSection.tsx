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
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Stableford {stablefordResult.modified && '· Modified'}
        </span>
        {stablefordGame.useNet && <NetBadge />}
        <span className="ml-auto text-[10px] text-slate-400">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                isFirst ? 'bg-[#0A0A0A] text-white' : 'bg-slate-50',
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-bold w-4 text-center',
                  isFirst ? 'text-white/60' : 'text-slate-400',
                )}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', isFirst ? 'text-white' : 'text-[#0A0A0A]')}>
                  {standing.playerName}
                </p>
                {!isFirst && gap > 0 && stablefordResult.holesScored > 0 && (
                  <p className="text-[10px] text-slate-400">-{gap} pts back</p>
                )}
              </div>
              <span
                className={cn(
                  'text-base font-black tabular-nums',
                  getStablefordPointsColor(standing.totalPoints),
                  isFirst && 'text-[#F0EE3A]',
                )}
              >
                {standing.totalPoints}
                <span className={cn('text-[10px] font-semibold ml-0.5', isFirst ? 'text-white/60' : 'text-slate-400')}>
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
