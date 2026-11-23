import { motion } from 'framer-motion';
import { Trophy, Circle } from 'lucide-react';
import { Round, PlayerWithScores } from '@/types/golf';
import { MatchPlayResult, MatchPlayHoleResult, getMatchPlayStatusColor } from '@/lib/games/matchPlay';
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
  const isFourball = matchPlayResult.format === 'fourball' && matchPlayResult.teams?.length === 2;
  const [p1, p2] = players;
  const isOver = matchPlayResult.matchStatus === 'won' || matchPlayResult.matchStatus === 'halved';
  const isDormie = matchPlayResult.matchStatus === 'dormie';
  const isAllSquare = matchPlayResult.holesUp === 0 && !isOver;
  const notStarted = matchPlayResult.matchStatus === 'not_started';

  const firstEntityId = isFourball ? matchPlayResult.teams![0].id : p1?.id;

  const holeDots: ('W' | 'L' | 'H' | null)[] = matchPlayResult.holeResults.map(hr => {
    if (hr.winnerId === null) return 'H';
    if (hr.winnerId === firstEntityId) return 'W';
    return 'L';
  });

  const getTeamPlayerNames = (teamId: string) => {
    const team = matchPlayResult.teams?.find(t => t.id === teamId);
    if (!team) return '';
    return team.playerIds
      .map(pid => players.find(p => p.id === pid)?.name?.split(' ')[0] ?? '')
      .filter(Boolean)
      .join(' & ');
  };

  const getTeamBestNet = (hr: MatchPlayHoleResult, teamId: string): number | null => {
    const team = matchPlayResult.teams?.find(t => t.id === teamId);
    if (!team) return null;
    let best = Infinity;
    for (const pid of team.playerIds) {
      if (hr.netScores[pid] != null) best = Math.min(best, hr.netScores[pid]);
    }
    return best === Infinity ? null : best;
  };

  const statusBg = isOver
    ? 'bg-[#DCFCE7] border-[#14532D]/30'
    : isDormie
    ? 'bg-[#ECFCCB] border-[#BEF264]'
    : isAllSquare
    ? 'bg-[#FAFAF7] border-[#E7E9E3]'
    : 'bg-[#0F1F17]/5 border-[#0F1F17]/10';

  // Build running match score per hole for the table
  const runningScores: { holeNum: number; teamANet: number | null; teamBNet: number | null; winnerId: string | null; runningText: string }[] = [];
  if (isFourball) {
    const [tA, tB] = matchPlayResult.teams!;
    let aWins = 0;
    let bWins = 0;
    for (const hr of matchPlayResult.holeResults) {
      const teamANet = getTeamBestNet(hr, tA.id);
      const teamBNet = getTeamBestNet(hr, tB.id);
      if (hr.winnerId === tA.id) aWins++;
      else if (hr.winnerId === tB.id) bWins++;
      const diff = aWins - bWins;
      let runningText = 'AS';
      if (diff > 0) runningText = `${tA.name} ${diff} UP`;
      else if (diff < 0) runningText = `${tB.name} ${Math.abs(diff)} UP`;
      runningScores.push({ holeNum: hr.holeNumber, teamANet, teamBNet, winnerId: hr.winnerId, runningText });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[15px] font-semibold text-[#0F1F17]">
            {isFourball ? 'Fourball match play' : 'Match play'}
          </span>
          {matchGame?.stakes && matchGame.stakes > 0 && (
            <span className="text-[12px] text-muted-foreground">(${matchGame.stakes})</span>
          )}
        </div>
        {matchPlayResult.holesPlayed > 0 && (
          <span className="text-[12px] text-[#5A6B61] font-medium">
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
            'text-xl font-extrabold tracking-tight leading-tight',
            isOver && 'text-[#14532D]',
            isDormie && 'text-[#14532D]',
            isAllSquare && 'text-[#0F1F17]',
            !isOver && !isDormie && !isAllSquare && !notStarted && 'text-[#0F1F17]',
            notStarted && 'text-[#5A6B61]',
          )}
        >
          {matchPlayResult.statusText}
        </motion.p>
        {matchPlayResult.holesRemaining > 0 && !isOver && (
          <p className="text-[11px] text-[#5A6B61] mt-1">
            {matchPlayResult.holesRemaining} hole{matchPlayResult.holesRemaining !== 1 ? 's' : ''} to play
          </p>
        )}
        {isOver && matchPlayResult.winMargin && (
          <p className="text-xs font-semibold text-[#14532D] mt-1">{matchPlayResult.winMargin}</p>
        )}
      </div>

      {/* Team/Player rows */}
      <div className="space-y-1.5">
        {isFourball ? (
          matchPlayResult.teams!.map(team => {
            const isLeader = matchPlayResult.leaderId === team.id;
            const isWinner = matchPlayResult.winnerId === team.id;
            return (
              <div
                key={team.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-[14px]',
                  isWinner ? 'bg-[#DCFCE7]' : isLeader && !isOver ? 'bg-[#F0F2EC]' : 'bg-[#FAFAF7]',
                )}
              >
                <div className="flex items-center gap-2">
                  {isWinner && <Trophy className="w-3.5 h-3.5 text-[#14532D]" />}
                  <div>
                    <span className={cn('text-sm', isLeader && !isOver && 'font-bold text-[#0F1F17]', (!isLeader || isOver) && 'font-medium text-[#5A6B61]')}>
                      {team.name}
                    </span>
                    <p className="text-[12px] text-[#5A6B61]">{getTeamPlayerNames(team.id)}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    getMatchPlayStatusColor(matchPlayResult, team.id),
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
          })
        ) : (
          players.map(player => {
            const isLeader = matchPlayResult.leaderId === player.id;
            const isWinner = matchPlayResult.winnerId === player.id;
            const strokesReceived = player.strokesPerHole
              ? Array.from(player.strokesPerHole.values()).reduce((s, v) => s + v, 0)
              : 0;

            return (
              <div
                key={player.id}
                className="flex items-center justify-between px-3 py-2 rounded-[14px] bg-[#FAFAF7]"
              >
                <div className="flex items-center gap-2">
                  {isWinner && <Trophy className="w-3 h-3 text-[#14532D]" />}
                  <span className={cn('text-sm', isLeader && !isOver && 'font-bold text-[#0F1F17]', (!isLeader || isOver) && 'font-medium text-[#5A6B61]')}>
                    {player.name}
                  </span>
                  {strokesReceived > 0 && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#BEF264]/60 text-[#5A5700]">
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
          })
        )}
      </div>

      {/* Fourball hole-by-hole table */}
      {isFourball && runningScores.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-[#5A6B61]">
            Best Ball Per Hole
          </p>
          <div className="rounded-[14px] overflow-hidden border border-[#E7E9E3]">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_1fr] bg-[#F0F2EC] text-[12px] font-bold text-[#5A6B61]">
              <span className="px-2 py-1.5 text-center">Hole</span>
              <span className="px-2 py-1.5 text-center">{matchPlayResult.teams![0].name}</span>
              <span className="px-2 py-1.5 text-center">{matchPlayResult.teams![1].name}</span>
              <span className="px-2 py-1.5 text-center">Match</span>
            </div>
            {/* Rows */}
            {runningScores.map((row) => {
              const tAId = matchPlayResult.teams![0].id;
              const tBId = matchPlayResult.teams![1].id;
              const aWon = row.winnerId === tAId;
              const bWon = row.winnerId === tBId;
              return (
                <div
                  key={row.holeNum}
                  className={cn(
                    'grid grid-cols-[40px_1fr_1fr_1fr] text-xs border-t border-slate-50',
                    aWon && 'bg-[#ECFCCB]/50',
                    bWon && 'bg-[#FEF3F2]/30',
                    !aWon && !bWon && 'bg-white',
                  )}
                >
                  <span className="px-2 py-1.5 text-center font-bold text-[#5A6B61] tabular-nums">
                    {row.holeNum}
                  </span>
                  <span className={cn(
                    'px-2 py-1.5 text-center tabular-nums font-semibold',
                    aWon ? 'text-[#14532D] font-bold' : 'text-[#5A6B61]',
                  )}>
                    {row.teamANet ?? '–'}
                  </span>
                  <span className={cn(
                    'px-2 py-1.5 text-center tabular-nums font-semibold',
                    bWon ? 'text-[#B42318] font-bold' : 'text-[#5A6B61]',
                  )}>
                    {row.teamBNet ?? '–'}
                  </span>
                  <span className="px-2 py-1.5 text-center text-[12px] font-medium text-[#5A6B61] truncate">
                    {row.runningText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hole-by-hole dots (singles) */}
      {!isFourball && holeDots.length > 0 && p1 && (
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-[#5A6B61]">
            {p1.name.split(' ')[0]} result per hole
          </p>
          <div className="flex flex-wrap gap-1">
            {holeDots.map((dot, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <HoleDot result={dot} />
                <span className="text-[10px] text-[#B4BDB7]">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
