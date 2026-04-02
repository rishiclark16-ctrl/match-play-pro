import { motion } from 'framer-motion';
import { Round } from '@/types/golf';
import { BestBallResult, formatBestBallStatus } from '@/lib/games/bestball';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge, SPRING } from './shared';

export function BestBallSection({
  bestBallGame,
  bestBallResult,
}: {
  bestBallGame: NonNullable<Round['games']>[number];
  bestBallResult: BestBallResult;
}) {
  const [teamA, teamB] = bestBallResult.standings;
  const aWinning = teamA && teamB && teamA.relativeToPar < teamB.relativeToPar;
  const bWinning = teamA && teamB && teamB.relativeToPar < teamA.relativeToPar;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-0">
        <LiveDot />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Best Ball
        </span>
        {bestBallGame.useNet && <NetBadge />}
        <span className="ml-auto text-[10px] text-slate-400">
          Thru {bestBallResult.holesPlayed}
        </span>
      </div>

      {/* Team cards side by side */}
      <div className="grid grid-cols-2 gap-2">
        {bestBallResult.standings.map((standing, index) => {
          const isWinning =
            index === 0 ? aWinning : bWinning;
          const isEven = !aWinning && !bWinning;

          return (
            <motion.div
              key={standing.teamId}
              layout
              transition={SPRING}
              className={cn(
                'rounded-2xl p-3 text-center border',
                isWinning
                  ? 'bg-[#DCFCE7] border-[#22C55E]/30'
                  : isEven
                  ? 'bg-slate-50 border-slate-100'
                  : 'bg-white border-slate-100',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mb-1">
                {standing.teamName}
              </p>
              <p className="text-2xl font-black text-[#0A0A0A] tabular-nums">
                {standing.totalScore}
              </p>
              <p
                className={cn(
                  'text-xs font-semibold mt-0.5',
                  standing.relativeToPar < 0 && 'text-[#22C55E]',
                  standing.relativeToPar > 0 && 'text-red-500',
                  standing.relativeToPar === 0 && 'text-slate-400',
                )}
              >
                {formatBestBallStatus(standing.relativeToPar)}
              </p>
              {standing.playerContributions?.length > 0 && (
                <p className="text-[9px] text-slate-400 mt-1 truncate">
                  {standing.playerContributions
                    .slice()
                    .sort((a, b) => b.holesContributed - a.holesContributed)[0]?.playerName?.split(' ')[0]}
                  {' '}leading
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Recent hole winners */}
      {bestBallResult.holeWinners.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            Recent holes
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {bestBallResult.holeWinners.slice(-6).map(hw => {
              const winner = bestBallResult.standings.find(s => s.teamId === hw.winningTeamId);
              const isPush = !hw.winningTeamId;
              return (
                <div
                  key={hw.holeNumber}
                  className={cn(
                    'flex flex-col items-center rounded-lg px-2 py-1 shrink-0',
                    isPush ? 'bg-slate-100' : 'bg-[#DCFCE7]',
                  )}
                >
                  <span className="text-[8px] text-slate-400 font-bold">H{hw.holeNumber}</span>
                  <span className="text-[9px] font-bold text-[#0A0A0A] truncate max-w-[36px]">
                    {isPush ? 'Push' : winner?.teamName?.split(' ')[0] ?? '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
