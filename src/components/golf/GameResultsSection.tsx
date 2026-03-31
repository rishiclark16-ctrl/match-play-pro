import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Player } from '@/types/golf';
import { CollapsibleSection } from './CollapsibleSection';
import { GameResults } from '@/hooks/useGameResults';

interface GameResultsSectionProps {
  gameResults: GameResults;
  players: Player[];
  isOpen: boolean;
  onToggle: () => void;
}

export function GameResultsSection({
  gameResults,
  players,
  isOpen,
  onToggle,
}: GameResultsSectionProps) {
  const hasResults =
    gameResults.skinsResult || gameResults.nassauResult || gameResults.wolfStandings;

  if (!hasResults) return null;

  return (
    <CollapsibleSection
      title="Games"
      icon={Target}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* Skins Results */}
      {gameResults.skinsResult && (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">
              🎯
            </div>
            <span className="font-bold text-xs uppercase tracking-wider">Skins</span>
          </div>
          <div className="space-y-1">
            {gameResults.skinsResult.standings.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-semibold text-sm text-foreground">{s.playerName}</span>
                <span
                  className={cn(
                    'font-black tabular-nums',
                    s.earnings > 0
                      ? 'text-[#22C55E]'
                      : s.earnings < 0
                      ? 'text-[#EF4444]'
                      : 'text-muted-foreground'
                  )}
                >
                  {s.skins} ({s.earnings > 0 ? '+' : ''}${s.earnings.toFixed(0)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nassau Results */}
      {gameResults.nassauResult && (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">
              🏌️
            </div>
            <span className="font-bold text-xs uppercase tracking-wider">Nassau</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Front 9</span>
              <span className="font-semibold text-sm text-foreground">
                {gameResults.nassauResult.front9.winnerId
                  ? players.find(p => p.id === gameResults.nassauResult!.front9.winnerId)?.name
                  : 'Tied'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Back 9</span>
              <span className="font-semibold text-sm text-foreground">
                {gameResults.nassauResult.back9.winnerId
                  ? players.find(p => p.id === gameResults.nassauResult!.back9.winnerId)?.name
                  : 'Tied'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overall</span>
              <span className="font-semibold text-sm text-foreground">
                {gameResults.nassauResult.overall.winnerId
                  ? players.find(p => p.id === gameResults.nassauResult!.overall.winnerId)?.name
                  : 'Tied'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Wolf Results */}
      {gameResults.wolfStandings && (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">
              🐺
            </div>
            <span className="font-bold text-xs uppercase tracking-wider">Wolf</span>
          </div>
          <div className="space-y-1">
            {gameResults.wolfStandings.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="font-semibold text-sm text-foreground">{s.playerName}</span>
                <span
                  className={cn(
                    'font-black tabular-nums',
                    s.earnings > 0
                      ? 'text-[#22C55E]'
                      : s.earnings < 0
                      ? 'text-[#EF4444]'
                      : 'text-muted-foreground'
                  )}
                >
                  {s.totalPoints}pts ({s.earnings > 0 ? '+' : ''}${s.earnings.toFixed(0)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
