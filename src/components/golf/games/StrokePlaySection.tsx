import { motion } from 'framer-motion';
import { PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';
import { LiveDot, SPRING } from './shared';

export function StrokePlaySection({ players }: { players: PlayerWithScores[] }) {
  const sorted = [...players].sort((a, b) => a.totalRelativeToPar - b.totalRelativeToPar);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-0">
        <LiveDot />
        <span className="text-[12px] font-bold tracking-[0.08em] text-muted-foreground">
          Stroke Play
        </span>
      </div>
      <div className="space-y-1.5">
        {sorted.map((player, index) => {
          const rel = player.totalRelativeToPar;
          const label = rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`;
          const isFirst = index === 0;

          return (
            <motion.div
              key={player.id}
              layout
              transition={SPRING}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl',
                isFirst ? 'bg-[#14532D] text-white' : 'bg-[#FAFAF7]',
              )}
            >
              <span className={cn('text-[11px] font-bold w-4 text-center', isFirst ? 'text-white/50' : 'text-[#5A6B61]')}>
                {index + 1}
              </span>
              <span className={cn('text-sm font-semibold flex-1 truncate', isFirst ? 'text-white' : 'text-[#0F1F17]')}>
                {player.name}
              </span>
              <span className="text-[10px] text-[#5A6B61] tabular-nums">
                {player.totalStrokes}
              </span>
              <span
                className={cn(
                  'text-sm font-black tabular-nums w-8 text-right',
                  isFirst && 'text-[#BEF264]',
                  !isFirst && rel < 0 && 'text-[#14532D]',
                  !isFirst && rel > 0 && 'text-[#B42318]',
                  !isFirst && rel === 0 && 'text-[#5A6B61]',
                )}
              >
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
