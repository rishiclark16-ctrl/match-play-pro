import { cn } from '@/lib/utils';
import { Player } from '@/types/golf';
import { GameResults } from '@/hooks/useGameResults';
import { CollapsibleResults, ResultsCard } from './results/resultsUi';
import { formatMoney, moneyClass } from './results/resultsFormat';

interface GameResultsSectionProps {
  gameResults: GameResults;
  players: Player[];
  isOpen: boolean;
  onToggle: () => void;
}

function GameCard({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <ResultsCard>
      <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
        <h3 className="text-[16px] font-semibold text-foreground">{title}</h3>
        {meta && <span className="text-[12px] text-muted-foreground">{meta}</span>}
      </div>
      <div className="pb-1.5">{children}</div>
    </ResultsCard>
  );
}

function Line({ label, detail, value, valueClass }: { label: string; detail?: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 min-h-[40px]">
      <span className="text-[14px] font-medium text-foreground truncate flex-1">{label}</span>
      {detail && <span className="text-[13px] text-muted-foreground tabular-nums">{detail}</span>}
      <span className={cn('text-[15px] font-bold tabular-nums w-16 text-right', valueClass)}>{value}</span>
    </div>
  );
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

  const nameOf = (id: string | null | undefined) =>
    id ? players.find(p => p.id === id)?.name ?? 'Unknown' : 'Tied';

  return (
    <CollapsibleResults title="Games" isOpen={isOpen} onToggle={onToggle}>
      {gameResults.skinsResult && (
        <GameCard title="Skins" meta="Skins won · money">
          {gameResults.skinsResult.standings.map((s) => (
            <Line
              key={s.playerId}
              label={s.playerName}
              detail={`${s.skins} ${s.skins === 1 ? 'skin' : 'skins'}`}
              value={s.earnings === 0 ? 'Even' : formatMoney(s.earnings)}
              valueClass={moneyClass(s.earnings)}
            />
          ))}
        </GameCard>
      )}

      {gameResults.nassauResult && (
        <GameCard title="Nassau" meta="Winner">
          {([
            ['Front 9', gameResults.nassauResult.front9.winnerId],
            ['Back 9', gameResults.nassauResult.back9.winnerId],
            ['Overall', gameResults.nassauResult.overall.winnerId],
          ] as const).map(([label, winnerId]) => (
            <div key={label} className="flex items-center gap-3 px-4 min-h-[40px]">
              <span className="text-[14px] text-muted-foreground flex-1">{label}</span>
              <span
                className={cn(
                  'text-[14px] font-semibold',
                  winnerId ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {nameOf(winnerId)}
              </span>
            </div>
          ))}
        </GameCard>
      )}

      {gameResults.wolfStandings && (
        <GameCard title="Wolf" meta="Points · money">
          {gameResults.wolfStandings.map((s) => (
            <Line
              key={s.playerId}
              label={s.playerName}
              detail={`${s.totalPoints} pts`}
              value={s.earnings === 0 ? 'Even' : formatMoney(s.earnings)}
              valueClass={moneyClass(s.earnings)}
            />
          ))}
        </GameCard>
      )}
    </CollapsibleResults>
  );
}
