import { Shield } from 'lucide-react';
import { PlayerWithScores } from '@/types/golf';
import { DefenderResult, getDefenderForHole } from '@/lib/games/defender';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge } from './shared';

export function DefenderSection({
  defenderGame,
  defenderResult,
  players,
  currentHole,
}: {
  defenderGame: { stakes: number; useNet?: boolean };
  defenderResult: DefenderResult;
  players: PlayerWithScores[];
  currentHole: number;
}) {
  const currentDefender = getDefenderForHole(players, currentHole);
  const lastResult = defenderResult.holeResults[defenderResult.holeResults.length - 1];

  const outcomeLabel = (outcome: string) => {
    switch (outcome) {
      case 'defender_wins': return 'Defender wins (+3)';
      case 'defender_ties': return 'Defender ties (+1)';
      case 'defender_loses_one': return 'Attacker wins (+1 each)';
      case 'defender_loses_all': return 'All beat defender (+2 each)';
      default: return '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Defender ${defenderGame.stakes}/pt
          </span>
          {defenderGame.useNet && <NetBadge />}
        </div>
        <span className="text-[10px] text-slate-400">Thru {defenderResult.holesScored}</span>
      </div>

      {/* Current defender */}
      {currentDefender && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0A0A0A] text-white">
          <Shield className="w-4 h-4 text-[#F0EE3A] shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Defending · H{currentHole}
            </p>
            <p className="text-sm font-bold">{currentDefender.name}</p>
          </div>
        </div>
      )}

      {/* Last hole result */}
      {lastResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-xs text-slate-600">
          <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            H{lastResult.holeNumber}: {lastResult.defenderName} defended · {outcomeLabel(lastResult.outcome)}
          </span>
        </div>
      )}

      {/* Standings */}
      <div className="space-y-1.5">
        {defenderResult.standings.map((standing, index) => (
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
                {standing.totalPoints} pts · Def {standing.timesDefender}× · W{standing.defenderWins}
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
