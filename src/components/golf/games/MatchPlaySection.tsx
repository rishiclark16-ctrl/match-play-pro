import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Round, PlayerWithScores } from '@/types/golf';
import { MatchPlayResult, getMatchPlayStatusColor } from '@/lib/games/matchPlay';
import { cn } from '@/lib/utils';
import { LiveDot, HoleDot, SPRING } from './shared';

export function MatchPlaySection({
  matchGame,
  matchPlayResult,
  players,
}: {
  matchGame?: NonNullable<Round['games']>[number];
  matchPlayResult: MatchPlayResult;
  players: PlayerWithScores[];
}) {
  const [p1, p2] = players;
  const isOver = matchPlayResult.matchStatus === 'won' || matchPlayResult.matchStatus === 'halved';
  const isDormie = matchPlayResult.matchStatus === 'dormie';
  const isAllSquare = matchPlayResult.holesUp === 0 && !isOver;
  const notStarted = matchPlayResult.matchStatus === 'not_started';

  // Build hole dots from holeResults
  const holeDots: ('W' | 'L' | 'H' | null)[] = matchPlayResult.holeResults.map(hr => {
    if (hr.winnerId === null) return 'H';
    if (hr.winnerId === p1?.id) return 'W';
    return 'L';
  });

  const leaderName = matchPlayResult.leaderId
    ? players.find(p => p.id === matchPlayResult.leaderId)?.name?.split(' ')[0] ?? ''
    : '';

  const statusBg = isOver
    ? 'bg-[#DCFCE7] border-[#22C55E]/30'
    : isDormie
    ? 'bg-amber-50 border-amber-200'
    : isAllSquare
    ? 'bg-slate-50 border-slate-200'
    : 'bg-[#0A0A0A]/5 border-[#0A0A0A]/10';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Match Play
          </span>
          {matchGame?.stakes && matchGame.stakes > 0 && (
            <span className="text-[10px] text-muted-foreground">(${matchGame.stakes})</span>
          )}
        </div>
        {matchPlayResult.holesPlayed > 0 && (
          <span className="text-[10px] text-slate-400 font-medium">
            Thru {matchPlayResult.holesPlayed}
          </span>
        )}
      </div>

      {/* Big status card */}
      <div className={cn('rounded-2xl border px-4 py-4 text-center', statusBg)}>
        <motion.p
          key={matchPlayResult.statusText}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          className={cn(
            'text-xl font-black tracking-tight leading-tight',
            isOver && 'text-[#22C55E]',
            isDormie && 'text-amber-700',
            isAllSquare && 'text-[#0A0A0A]',
            !isOver && !isDormie && !isAllSquare && !notStarted && 'text-[#0A0A0A]',
            notStarted && 'text-slate-400',
          )}
        >
          {matchPlayResult.statusText}
        </motion.p>
        {matchPlayResult.holesRemaining > 0 && !isOver && (
          <p className="text-[11px] text-slate-400 mt-1">
            {matchPlayResult.holesRemaining} hole{matchPlayResult.holesRemaining !== 1 ? 's' : ''} to play
          </p>
        )}
        {isOver && matchPlayResult.winMargin && (
          <p className="text-xs font-semibold text-[#22C55E] mt-1">{matchPlayResult.winMargin}</p>
        )}
      </div>

      {/* Player rows */}
      <div className="space-y-1.5">
        {players.map(player => {
          const isLeader = matchPlayResult.leaderId === player.id;
          const isWinner = matchPlayResult.winnerId === player.id;
          const strokesReceived = player.strokesPerHole
            ? Array.from(player.strokesPerHole.values()).reduce((s, v) => s + v, 0)
            : 0;

          return (
            <div
              key={player.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
            >
              <div className="flex items-center gap-2">
                {isWinner && <Trophy className="w-3 h-3 text-[#22C55E]" />}
                <span className={cn('text-sm', isLeader && !isOver && 'font-bold text-[#0A0A0A]', (!isLeader || isOver) && 'font-medium text-slate-600')}>
                  {player.name}
                </span>
                {strokesReceived > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F0EE3A]/60 text-[#5A5700]">
                    +{strokesReceived}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  getMatchPlayStatusColor(matchPlayResult, player.id),
                )}
              >
                {isLeader && matchPlayResult.holesUp > 0
                  ? `${matchPlayResult.holesUp} UP`
                  : matchPlayResult.holesUp === 0
                  ? 'AS'
                  : `${matchPlayResult.holesUp} DN`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hole-by-hole dots */}
      {holeDots.length > 0 && p1 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            {p1.name.split(' ')[0]} result per hole
          </p>
          <div className="flex flex-wrap gap-1">
            {holeDots.map((dot, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <HoleDot result={dot} />
                <span className="text-[8px] text-slate-300">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
