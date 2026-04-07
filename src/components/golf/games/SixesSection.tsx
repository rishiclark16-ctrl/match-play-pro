import { Users } from 'lucide-react';
import { PlayerWithScores } from '@/types/golf';
import { SixesResult } from '@/lib/games/sixes';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge } from './shared';

export function SixesSection({
  sixesGame,
  sixesResult,
  players,
}: {
  sixesGame: { stakes: number; useNet?: boolean };
  sixesResult: SixesResult;
  players: PlayerWithScores[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Sixes ${sixesGame.stakes}/pt
          </span>
          {sixesGame.useNet && <NetBadge />}
        </div>
        <span className="text-[10px] text-slate-400">Thru {sixesResult.holesScored}</span>
      </div>

      {/* Segments */}
      <div className="space-y-2">
        {sixesResult.segments.map(seg => {
          const isTeam1Winning = seg.team1HolesWon > seg.team2HolesWon;
          const isTeam2Winning = seg.team2HolesWon > seg.team1HolesWon;
          const isTied = seg.team1HolesWon === seg.team2HolesWon;
          const totalPlayed = seg.team1HolesWon + seg.team2HolesWon + seg.halved;

          return (
            <div key={seg.segmentIndex} className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    H{seg.holeRange[0]}–{seg.holeRange[1]}
                  </span>
                </div>
                {totalPlayed > 0 && (
                  <span className="text-[10px] text-slate-400">{totalPlayed} holes</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className={cn(
                  'text-center rounded-lg py-1.5',
                  isTeam1Winning ? 'bg-[#DCFCE7]' : 'bg-slate-50',
                )}>
                  <p className="text-[9px] font-bold text-slate-400 truncate px-1">{seg.team1Name}</p>
                  <p className={cn(
                    'text-lg font-black tabular-nums',
                    isTeam1Winning ? 'text-[#22C55E]' : 'text-slate-600',
                  )}>
                    {seg.team1HolesWon}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-300">vs</p>
                  {seg.halved > 0 && (
                    <p className="text-[8px] text-slate-400">{seg.halved} halved</p>
                  )}
                </div>
                <div className={cn(
                  'text-center rounded-lg py-1.5',
                  isTeam2Winning ? 'bg-[#DCFCE7]' : 'bg-slate-50',
                )}>
                  <p className="text-[9px] font-bold text-slate-400 truncate px-1">{seg.team2Name}</p>
                  <p className={cn(
                    'text-lg font-black tabular-nums',
                    isTeam2Winning ? 'text-[#22C55E]' : 'text-slate-600',
                  )}>
                    {seg.team2HolesWon}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player standings */}
      <div className="space-y-1.5">
        {sixesResult.standings.map((standing, index) => (
          <div
            key={standing.playerId}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50"
          >
            <span className="text-[11px] font-bold w-4 text-center text-slate-400">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                {standing.playerName.split(' ')[0]}
              </p>
              <p className="text-[10px] text-slate-400">
                {standing.segmentsWon} seg · {standing.totalHolesWon} holes
              </p>
            </div>
            <span
              className={cn(
                'text-sm font-bold tabular-nums',
                standing.earnings > 0 && 'text-[#22C55E]',
                standing.earnings < 0 && 'text-red-500',
                standing.earnings === 0 && 'text-slate-400',
              )}
            >
              {standing.earnings >= 0 ? '+' : ''}${Math.abs(standing.earnings).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
