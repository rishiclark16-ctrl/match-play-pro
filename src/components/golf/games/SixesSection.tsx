import { Users } from 'lucide-react';
import { PlayerWithScores } from '@/types/golf';
import { SixesResult } from '@/lib/games/sixes';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge } from './shared';
import { signedMoney } from './money';

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
          <span className="text-[15px] font-semibold text-[#0F1F17]">
            Sixes ${sixesGame.stakes}/pt
          </span>
          {sixesGame.useNet && <NetBadge />}
        </div>
        <span className="text-[12px] text-[#5A6B61]">Thru {sixesResult.holesScored}</span>
      </div>

      {/* Segments */}
      <div className="space-y-2">
        {sixesResult.segments.map(seg => {
          const isTeam1Winning = seg.team1HolesWon > seg.team2HolesWon;
          const isTeam2Winning = seg.team2HolesWon > seg.team1HolesWon;
          const isTied = seg.team1HolesWon === seg.team2HolesWon;
          const totalPlayed = seg.team1HolesWon + seg.team2HolesWon + seg.halved;

          return (
            <div key={seg.segmentIndex} className="rounded-[14px] border border-[#E7E9E3] bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-[#5A6B61]" />
                  <span className="text-[12px] font-bold text-[#5A6B61]">
                    H{seg.holeRange[0]}–{seg.holeRange[1]}
                  </span>
                </div>
                {totalPlayed > 0 && (
                  <span className="text-[12px] text-[#5A6B61]">{totalPlayed} holes</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className={cn(
                  'text-center rounded-[10px] py-1.5',
                  isTeam1Winning ? 'bg-[#DCFCE7]' : 'bg-[#FAFAF7]',
                )}>
                  <p className="text-[11px] font-bold text-[#5A6B61] truncate px-1">{seg.team1Name}</p>
                  <p className={cn(
                    'text-lg font-extrabold tabular-nums',
                    isTeam1Winning ? 'text-[#14532D]' : 'text-[#5A6B61]',
                  )}>
                    {seg.team1HolesWon}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-bold text-[#B4BDB7]">vs</p>
                  {seg.halved > 0 && (
                    <p className="text-[10px] text-[#5A6B61]">{seg.halved} halved</p>
                  )}
                </div>
                <div className={cn(
                  'text-center rounded-[10px] py-1.5',
                  isTeam2Winning ? 'bg-[#DCFCE7]' : 'bg-[#FAFAF7]',
                )}>
                  <p className="text-[11px] font-bold text-[#5A6B61] truncate px-1">{seg.team2Name}</p>
                  <p className={cn(
                    'text-lg font-extrabold tabular-nums',
                    isTeam2Winning ? 'text-[#14532D]' : 'text-[#5A6B61]',
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
            className="flex items-center gap-3 px-3 py-2 rounded-[14px] bg-[#FAFAF7]"
          >
            <span className="text-[11px] font-bold w-4 text-center text-[#5A6B61]">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0F1F17] truncate">
                {standing.playerName.split(' ')[0]}
              </p>
              <p className="text-[12px] text-[#5A6B61]">
                {standing.segmentsWon} seg · {standing.totalHolesWon} holes
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
              {signedMoney(standing.earnings)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
