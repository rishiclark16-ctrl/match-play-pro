import { Round, PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';

interface DashboardScorecardProps {
  round: Round;
  playersWithScores: PlayerWithScores[];
}

function scoreCellColor(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -2) return 'bg-amber-100 text-amber-800 font-black';
  if (diff === -1) return 'bg-emerald-100 text-emerald-700 font-bold';
  if (diff === 0) return 'text-foreground';
  if (diff === 1) return 'bg-red-50 text-red-600';
  return 'bg-red-100 text-red-700 font-bold';
}

function formatRelPar(n: number): string {
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

export function DashboardScorecard({ round, playersWithScores }: DashboardScorecardProps) {
  const holes = round.holeInfo.sort((a, b) => a.number - b.number);
  const is18 = round.holes >= 18;
  const front9 = holes.filter(h => h.number <= 9);
  const back9 = holes.filter(h => h.number > 9 && h.number <= 18);
  const frontPar = front9.reduce((s, h) => s + h.par, 0);
  const backPar = back9.reduce((s, h) => s + h.par, 0);
  const totalPar = frontPar + (is18 ? backPar : 0);

  const cellBase = 'min-w-[38px] h-[36px] flex items-center justify-center text-[12px] border-r border-b border-border/30';
  const headerCell = cn(cellBase, 'bg-[#0A0A0A] text-white/70 font-bold text-[11px]');
  const labelCell = 'min-w-[80px] h-[36px] flex items-center px-3 text-[12px] font-semibold border-r border-b border-border/30 bg-white sticky left-0 z-10';
  const subtotalCell = cn(cellBase, 'bg-muted/50 font-black text-[12px] min-w-[44px]');

  const getPlayerHoleScore = (p: PlayerWithScores, holeNum: number) =>
    p.scores.find(s => s.holeNumber === holeNum)?.strokes;

  const getPlayerSubtotal = (p: PlayerWithScores, holeRange: number[]) =>
    holeRange.reduce((sum, h) => sum + (getPlayerHoleScore(p, h) ?? 0), 0);

  const frontHoles = front9.map(h => h.number);
  const backHoles = back9.map(h => h.number);

  return (
    <div className="px-4 pb-6">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">
        Scorecard
      </h3>

      <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div
          className="overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          <div className="inline-flex flex-col min-w-full">
            {/* ── Front 9 ── */}
            {/* Hole numbers */}
            <div className="flex">
              <div className={cn(labelCell, 'bg-[#0A0A0A] text-white/50 font-bold text-[10px] uppercase tracking-wider')}>Hole</div>
              {front9.map(h => (
                <div key={h.number} className={headerCell}>{h.number}</div>
              ))}
              <div className={cn(headerCell, 'min-w-[44px]')}>OUT</div>
              {is18 && back9.map(h => (
                <div key={h.number} className={headerCell}>{h.number}</div>
              ))}
              {is18 && <div className={cn(headerCell, 'min-w-[44px]')}>IN</div>}
              <div className={cn(headerCell, 'min-w-[48px]')}>TOT</div>
            </div>

            {/* Par row */}
            <div className="flex">
              <div className={cn(labelCell, 'text-muted-foreground text-[11px]')}>Par</div>
              {front9.map(h => (
                <div key={h.number} className={cn(cellBase, 'text-muted-foreground bg-muted/20')}>{h.par}</div>
              ))}
              <div className={cn(subtotalCell, 'text-muted-foreground')}>{frontPar}</div>
              {is18 && back9.map(h => (
                <div key={h.number} className={cn(cellBase, 'text-muted-foreground bg-muted/20')}>{h.par}</div>
              ))}
              {is18 && <div className={cn(subtotalCell, 'text-muted-foreground')}>{backPar}</div>}
              <div className={cn(subtotalCell, 'text-muted-foreground min-w-[48px]')}>{totalPar}</div>
            </div>

            {/* Yardage row */}
            {holes[0]?.yardage != null && (
              <div className="flex">
                <div className={cn(labelCell, 'text-muted-foreground/60 text-[10px]')}>Yds</div>
                {front9.map(h => (
                  <div key={h.number} className={cn(cellBase, 'text-[10px] text-muted-foreground/50')}>{h.yardage}</div>
                ))}
                <div className={cn(subtotalCell, 'text-[10px] text-muted-foreground/50')}>
                  {front9.reduce((s, h) => s + (h.yardage ?? 0), 0)}
                </div>
                {is18 && back9.map(h => (
                  <div key={h.number} className={cn(cellBase, 'text-[10px] text-muted-foreground/50')}>{h.yardage}</div>
                ))}
                {is18 && (
                  <div className={cn(subtotalCell, 'text-[10px] text-muted-foreground/50')}>
                    {back9.reduce((s, h) => s + (h.yardage ?? 0), 0)}
                  </div>
                )}
                <div className={cn(subtotalCell, 'text-[10px] text-muted-foreground/50 min-w-[48px]')}>
                  {holes.reduce((s, h) => s + (h.yardage ?? 0), 0)}
                </div>
              </div>
            )}

            {/* Hdcp row */}
            {holes[0]?.handicap != null && (
              <div className="flex">
                <div className={cn(labelCell, 'text-muted-foreground/60 text-[10px]')}>Hdcp</div>
                {front9.map(h => (
                  <div key={h.number} className={cn(cellBase, 'text-[10px] text-muted-foreground/50')}>{h.handicap}</div>
                ))}
                <div className={cn(subtotalCell, 'text-[10px]')} />
                {is18 && back9.map(h => (
                  <div key={h.number} className={cn(cellBase, 'text-[10px] text-muted-foreground/50')}>{h.handicap}</div>
                ))}
                {is18 && <div className={cn(subtotalCell, 'text-[10px]')} />}
                <div className={cn(subtotalCell, 'text-[10px] min-w-[48px]')} />
              </div>
            )}

            {/* Player rows */}
            {playersWithScores.map((p, pi) => {
              const frontTotal = getPlayerSubtotal(p, frontHoles);
              const backTotal = getPlayerSubtotal(p, backHoles);
              const total = frontTotal + (is18 ? backTotal : 0);
              const relPar = total - totalPar;
              const scoredHoles = p.scores.length;

              return (
                <div key={p.id} className="flex">
                  <div className={cn(labelCell, pi % 2 === 0 ? 'bg-white' : 'bg-muted/10')}>
                    <span className="truncate max-w-[72px]">{p.name}</span>
                  </div>
                  {front9.map(h => {
                    const score = getPlayerHoleScore(p, h.number);
                    return (
                      <div
                        key={h.number}
                        className={cn(
                          cellBase,
                          score != null ? scoreCellColor(score, h.par) : 'text-muted-foreground/30',
                          pi % 2 === 0 ? '' : 'bg-muted/5'
                        )}
                      >
                        {score ?? '-'}
                      </div>
                    );
                  })}
                  <div className={subtotalCell}>{frontTotal || '-'}</div>
                  {is18 && back9.map(h => {
                    const score = getPlayerHoleScore(p, h.number);
                    return (
                      <div
                        key={h.number}
                        className={cn(
                          cellBase,
                          score != null ? scoreCellColor(score, h.par) : 'text-muted-foreground/30',
                          pi % 2 === 0 ? '' : 'bg-muted/5'
                        )}
                      >
                        {score ?? '-'}
                      </div>
                    );
                  })}
                  {is18 && <div className={subtotalCell}>{backTotal || '-'}</div>}
                  <div className={cn(subtotalCell, 'min-w-[48px] flex-col gap-0 leading-none')}>
                    <span>{scoredHoles > 0 ? total : '-'}</span>
                    {scoredHoles > 0 && (
                      <span className={cn(
                        'text-[9px]',
                        relPar < 0 ? 'text-emerald-600' : relPar > 0 ? 'text-red-500' : 'text-muted-foreground'
                      )}>
                        {formatRelPar(relPar)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
