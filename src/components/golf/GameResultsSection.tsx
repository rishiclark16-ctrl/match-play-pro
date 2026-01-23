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
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🎯</span>
            <span className="font-bold text-xs uppercase tracking-wider">Skins</span>
          </div>
          <div className="space-y-1">
            {gameResults.skinsResult.standings.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{s.playerName}</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    s.earnings > 0
                      ? 'text-success'
                      : s.earnings < 0
                      ? 'text-destructive'
                      : ''
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
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🏌️</span>
            <span className="font-bold text-xs uppercase tracking-wider">Nassau</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Front 9</span>
              <span className="font-semibold">
                {gameResults.nassauResult.front9.winnerId
                  ? players.find(p => p.id === gameResults.nassauResult!.front9.winnerId)?.name
                  : 'Tied'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Back 9</span>
              <span className="font-semibold">
                {gameResults.nassauResult.back9.winnerId
                  ? players.find(p => p.id === gameResults.nassauResult!.back9.winnerId)?.name
                  : 'Tied'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overall</span>
              <span className="font-semibold">
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
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🐺</span>
            <span className="font-bold text-xs uppercase tracking-wider">Wolf</span>
          </div>
          <div className="space-y-1">
            {gameResults.wolfStandings.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{s.playerName}</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    s.earnings > 0
                      ? 'text-success'
                      : s.earnings < 0
                      ? 'text-destructive'
                      : ''
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
