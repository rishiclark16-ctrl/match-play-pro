import { useRef, useEffect } from 'react';
import { Trophy, AlertCircle, Swords, Dices, Sparkles } from 'lucide-react';
import { Round, Player, Press, PlayerWithScores } from '@/types/golf';
import { HouseGameResult } from '@/lib/games/houseGame';
import { createPress } from '@/lib/games/nassau';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function HouseGameSection({
  result,
  players,
  holeInfo,
  currentHole,
  pressThreshold,
  existingPresses,
  totalHoles,
  onAutoPress,
}: {
  result: HouseGameResult;
  players: PlayerWithScores[];
  holeInfo: Round['holeInfo'];
  currentHole: number;
  pressThreshold: number | null;
  existingPresses: Press[];
  totalHoles: 9 | 18;
  onAutoPress: (press: Press) => void;
}) {
  const leader = result.standings[0];
  const prevMarginRef = useRef<number>(0);

  // Auto-press detection: fires only on the transition to X-down, starts on next hole, max 3 presses
  useEffect(() => {
    if (!pressThreshold || !result.nassauResult) return;
    const nassau = result.nassauResult;
    const currentMargin = nassau.overall.margin;
    const wasBelow = prevMarginRef.current < pressThreshold;
    prevMarginRef.current = currentMargin;

    const isXDown = currentMargin >= pressThreshold && !!nassau.overall.winnerId;
    const underPressLimit = existingPresses.length < 3;
    const notLastHole = currentHole < totalHoles;

    if (isXDown && wasBelow && underPressLimit && notLastHole) {
      const loser = players.find(p => p.id !== nassau.overall.winnerId);
      if (loser) {
        const press = createPress(loser.id, currentHole + 1, 1);
        onAutoPress(press);
        toast.success(`Auto-press triggered — new sub-match starts hole ${currentHole + 1}`, {
          icon: '⚡',
        });
      }
    }
  }, [result.nassauResult, currentHole, pressThreshold, existingPresses, players, totalHoles, onAutoPress]);

  // Pretty label for bonus tags
  const bonusLabel = (b: string): string => {
    const labels: Record<string, string> = {
      'bonus_par5_double': '2× Par 5',
      'bonus_birdie_unit': 'Birdie Bonus',
      'bonus_eagle_unit': 'Eagle Bonus',
      'bonus_last_hole_double': '2× Last Hole',
      'bonus_greenie': 'Greenie',
      'bonus_sandie': 'Sandie',
      'bonus_barkie': 'Barkie',
    };
    return labels[b] || b.replace(/^bonus_/, '').replace(/_/g, ' ');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#F0EE3A] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#0A0A0A]" />
          </div>
          <span className="text-[13px] font-bold text-foreground">House Game</span>
        </div>
        {leader && leader.netEarnings !== 0 && (
          <span className={cn(
            'text-[12px] font-black',
            leader.netEarnings > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
          )}>
            {leader.playerName.split(' ')[0]} {leader.netEarnings > 0 ? '+' : ''}${leader.netEarnings.toFixed(0)}
          </span>
        )}
      </div>

      {/* Standings */}
      <div className="space-y-1.5">
        {result.standings.map(standing => (
          <div key={standing.playerId} className="flex items-center justify-between">
            <span className="text-[13px] text-foreground">{standing.playerName.split(' ')[0]}</span>
            <div className="flex items-center gap-3">
              {standing.holesWon > 0 && (
                <span className="text-[11px] text-muted-foreground font-medium">{standing.holesWon}W</span>
              )}
              {standing.eagles > 0 && (
                <span className="text-[11px] text-amber-500 font-bold">{standing.eagles}🦅</span>
              )}
              {standing.birdies > 0 && (
                <span className="text-[11px] text-[#22C55E] font-bold">{standing.birdies}🐦</span>
              )}
              <span className={cn(
                'text-[13px] font-black tabular-nums',
                standing.netEarnings > 0 ? 'text-[#22C55E]' :
                standing.netEarnings < 0 ? 'text-[#EF4444]' :
                'text-muted-foreground'
              )}>
                {standing.netEarnings > 0 ? '+' : ''}{standing.netEarnings === 0 ? 'E' : `$${standing.netEarnings.toFixed(0)}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Per-hole earnings timeline */}
      {result.holeResults.length > 0 && (
        <div className="mt-3 overflow-x-auto -mx-1 px-1">
          <div className="flex gap-0.5">
            {result.holeResults.map(hr => {
              const playerEarning = hr.earnings[result.standings[0]?.playerId] ?? 0;
              return (
                <div
                  key={hr.holeNumber}
                  className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-black',
                    hr.holeNumber === currentHole && 'ring-1 ring-[#F0EE3A]',
                    playerEarning > 0 ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                    playerEarning < 0 ? 'bg-[#EF4444]/15 text-[#EF4444]' :
                    'bg-muted/40 text-muted-foreground'
                  )}
                  title={`Hole ${hr.holeNumber}`}
                >
                  {hr.holeNumber}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-game breakdowns */}
      {result.skinsResult && (
        <div className="mt-3 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-bold text-muted-foreground">Skins</span>
            {result.skinsResult.carryover > 0 && (
              <span className="text-[10px] text-amber-500 font-bold ml-auto">
                {result.skinsResult.carryover} carry
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-0.5">
            {result.skinsResult.results.map(r => (
              <div
                key={r.holeNumber}
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black',
                  r.winnerId ? 'bg-amber-500/20 text-amber-500' : 'bg-muted/30 text-muted-foreground'
                )}
                title={r.winnerId ? `Hole ${r.holeNumber}: ${r.value} skin${r.value > 1 ? 's' : ''}` : `Hole ${r.holeNumber}: carry`}
              >
                {r.winnerId ? r.value : '·'}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.nassauResult && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Swords className="w-3 h-3 text-blue-500" />
            <span className="text-[11px] font-bold text-muted-foreground">Nassau</span>
          </div>
          <div className="flex gap-3 text-[11px]">
            {([['front9', 'F'], ['back9', 'B'], ['overall', 'O']] as const).map(([key, label]) => {
              const s = result.nassauResult![key];
              if (!s) return null;
              const winnerName = players.find(p => p.id === s.winnerId)?.name?.split(' ')[0] ?? '—';
              return (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-bold text-foreground">
                    {s.margin === 0 ? 'AS' : `${winnerName} ${s.margin}UP`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.quotaResult && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Dices className="w-3 h-3 text-purple-500" />
            <span className="text-[11px] font-bold text-muted-foreground">Quota</span>
          </div>
          <div className="space-y-0.5">
            {result.quotaResult.standings.slice(0, 4).map(s => (
              <div key={s.playerId} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{s.playerName.split(' ')[0]}</span>
                <span className={cn('font-bold', s.overUnder > 0 ? 'text-[#22C55E]' : s.overUnder < 0 ? 'text-[#EF4444]' : 'text-muted-foreground')}>
                  {s.totalPoints}pts ({s.overUnder > 0 ? '+' : ''}{s.overUnder} quota)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.rabbitResult && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[12px]">🐇</span>
            <span className="text-[11px] font-bold text-muted-foreground">Rabbit</span>
            {result.rabbitResult.holeResults.length > 0 && (() => {
              const lastResult = result.rabbitResult!.holeResults[result.rabbitResult!.holeResults.length - 1];
              const holderName = lastResult.holderId ? players.find(p => p.id === lastResult.holderId)?.name?.split(' ')[0] : null;
              return holderName ? (
                <span className="text-[10px] text-[#EF4444] font-bold ml-auto">
                  {holderName} has it
                </span>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {result.vegasResult && result.vegasResult.holeResults.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Dices className="w-3 h-3 text-emerald-500" />
            <span className="text-[11px] font-bold text-muted-foreground">Vegas</span>
            <div className="flex items-center gap-2 text-[10px] font-bold ml-auto">
              <span className={cn(result.vegasResult.teamATotal > 0 ? 'text-[#22C55E]' : result.vegasResult.teamATotal < 0 ? 'text-[#EF4444]' : 'text-muted-foreground')}>
                A: {result.vegasResult.teamATotal > 0 ? '+' : ''}{result.vegasResult.teamATotal}
              </span>
              <span className={cn(result.vegasResult.teamBTotal > 0 ? 'text-[#22C55E]' : result.vegasResult.teamBTotal < 0 ? 'text-[#EF4444]' : 'text-muted-foreground')}>
                B: {result.vegasResult.teamBTotal > 0 ? '+' : ''}{result.vegasResult.teamBTotal}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active bonuses this hole */}
      {(() => {
        const active = result.holeResults.find(r => r.holeNumber === currentHole);
        if (!active) return null;
        const bonuses = active.activeBonuses;
        if (bonuses.length === 0) return null;

        // Calculate dollar amounts for display
        const otherCount = players.length - 1;
        return (
          <div className="mt-2 flex flex-wrap gap-1">
            {bonuses.map((b, idx) => {
              let dollarText = '';
              if (b === 'bonus_birdie_unit' || b === 'bonus_greenie') {
                const earnings = Object.entries(active.earnings).find(([_, v]) => v > 0);
                if (earnings) {
                  const winnerName = players.find(p => p.id === earnings[0])?.name?.split(' ')[0];
                  dollarText = winnerName ? ` +$${earnings[1].toFixed(0)} ${winnerName}` : '';
                }
              }
              return (
                <span key={`${b}-${idx}`} className="text-[10px] font-bold bg-[#F0EE3A] text-[#0A0A0A] px-2 py-0.5 rounded-full">
                  {bonusLabel(b)}{dollarText}
                </span>
              );
            })}
          </div>
        );
      })()}

      {/* Loss cap indicator */}
      {result.cappedPlayerIds.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] text-amber-500 font-medium">Loss cap applied</span>
        </div>
      )}

      {/* Stubs notice */}
      {result.stubbedPrimitives.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2">
          {result.stubbedPrimitives.length} rule{result.stubbedPrimitives.length > 1 ? 's' : ''} coming soon
        </p>
      )}
    </div>
  );
}
