import { Shield } from 'lucide-react';
import { PlayerWithScores } from '@/types/golf';
import { DefenderResult, getDefenderForHole } from '@/lib/games/defender';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge } from './shared';
import { signedMoney } from './money';

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
          <span className="text-[15px] font-semibold text-[#0F1F17]">
            Defender ${defenderGame.stakes}/pt
          </span>
          {defenderGame.useNet && <NetBadge />}
        </div>
        <span className="text-[12px] text-[#5A6B61]">Thru {defenderResult.holesScored}</span>
      </div>

      {/* Current defender */}
      {currentDefender && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[14px] bg-[#0F1F17] text-white">
          <Shield className="w-4 h-4 text-[#14532D] shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-white/50">
              Defending · H{currentHole}
            </p>
            <p className="text-sm font-bold">{currentDefender.name}</p>
          </div>
        </div>
      )}

      {/* Last hole result */}
      {lastResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[14px] bg-[#FAFAF7] text-xs text-[#5A6B61]">
          <Shield className="w-3.5 h-3.5 text-[#5A6B61] shrink-0" />
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
                {standing.totalPoints} pts · Def {standing.timesDefender}× · W{standing.defenderWins}
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
