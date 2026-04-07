import { motion } from 'framer-motion';
import { PlayerWithScores } from '@/types/golf';
import { VegasResult } from '@/lib/games/vegas';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge, SPRING } from './shared';

export function VegasSection({
  vegasGame,
  vegasResult,
  players,
}: {
  vegasGame: { stakes: number; useNet?: boolean };
  vegasResult: VegasResult;
  players: PlayerWithScores[];
}) {
  const teamA = [players[0], players[1]];
  const teamB = [players[2], players[3]];
  const teamAName = `${teamA[0]?.name.split(' ')[0]} & ${teamA[1]?.name.split(' ')[0]}`;
  const teamBName = `${teamB[0]?.name.split(' ')[0]} & ${teamB[1]?.name.split(' ')[0]}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Vegas ${vegasGame.stakes}/pt
          </span>
          {vegasGame.useNet && <NetBadge />}
        </div>
        <span className="text-[10px] text-slate-400">Thru {vegasResult.holesPlayed}</span>
      </div>

      {/* Team scores summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn(
          'rounded-xl p-3 text-center border',
          vegasResult.teamATotal > 0 ? 'bg-[#DCFCE7] border-[#22C55E]/30' : 'bg-white border-slate-100',
        )}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{teamAName}</p>
          <p className={cn(
            'text-lg font-black tabular-nums',
            vegasResult.teamATotal > 0 ? 'text-[#22C55E]' : vegasResult.teamATotal < 0 ? 'text-red-500' : 'text-slate-400',
          )}>
            {vegasResult.teamATotal >= 0 ? '+' : ''}{vegasResult.teamATotal}
          </p>
          <p className={cn(
            'text-[11px] font-bold tabular-nums',
            vegasResult.teamAEarnings >= 0 ? 'text-[#22C55E]' : 'text-red-500',
          )}>
            {vegasResult.teamAEarnings >= 0 ? '+' : ''}${Math.abs(vegasResult.teamAEarnings).toFixed(2)}
          </p>
        </div>
        <div className={cn(
          'rounded-xl p-3 text-center border',
          vegasResult.teamBTotal > 0 ? 'bg-[#DCFCE7] border-[#22C55E]/30' : 'bg-white border-slate-100',
        )}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{teamBName}</p>
          <p className={cn(
            'text-lg font-black tabular-nums',
            vegasResult.teamBTotal > 0 ? 'text-[#22C55E]' : vegasResult.teamBTotal < 0 ? 'text-red-500' : 'text-slate-400',
          )}>
            {vegasResult.teamBTotal >= 0 ? '+' : ''}{vegasResult.teamBTotal}
          </p>
          <p className={cn(
            'text-[11px] font-bold tabular-nums',
            vegasResult.teamBEarnings >= 0 ? 'text-[#22C55E]' : 'text-red-500',
          )}>
            {vegasResult.teamBEarnings >= 0 ? '+' : ''}${Math.abs(vegasResult.teamBEarnings).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Hole-by-hole paired scores */}
      {vegasResult.holeResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            Hole results
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vegasResult.holeResults.map(result => {
              const teamAWins = result.pointDiff > 0;
              const teamBWins = result.pointDiff < 0;
              const tied = result.pointDiff === 0;

              return (
                <div
                  key={result.holeNumber}
                  className={cn(
                    'flex flex-col items-center rounded-lg px-2 py-1.5 min-w-[52px] border',
                    tied && 'bg-amber-50 border-amber-200',
                    teamAWins && 'bg-[#DCFCE7] border-[#22C55E]/20',
                    teamBWins && 'bg-blue-50 border-blue-200',
                  )}
                >
                  <span className="text-[8px] font-bold text-slate-400">H{result.holeNumber}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn(
                      'text-[11px] font-black tabular-nums',
                      result.teamAFlipped && 'text-red-500',
                    )}>
                      {result.teamAScore}
                    </span>
                    <span className="text-[8px] text-slate-300">vs</span>
                    <span className={cn(
                      'text-[11px] font-black tabular-nums',
                      result.teamBFlipped && 'text-red-500',
                    )}>
                      {result.teamBScore}
                    </span>
                  </div>
                  {/* Indicators */}
                  <div className="flex gap-0.5 mt-0.5">
                    {(result.teamAFlipped || result.teamBFlipped) && (
                      <span className="text-[7px] font-bold text-red-400">FLIP</span>
                    )}
                    {(result.teamAEagle || result.teamBEagle) && (
                      <span className="text-[7px] font-bold text-purple-500">2×</span>
                    )}
                    {result.carryoverMultiplier > 1 && (
                      <span className="text-[7px] font-bold text-amber-600">{result.carryoverMultiplier}×</span>
                    )}
                  </div>
                  {!tied && (
                    <span className={cn(
                      'text-[9px] font-bold',
                      teamAWins ? 'text-[#22C55E]' : 'text-blue-500',
                    )}>
                      {teamAWins ? '+' : ''}{result.pointDiff}
                    </span>
                  )}
                  {tied && <span className="text-[9px] font-bold text-amber-600">→</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
