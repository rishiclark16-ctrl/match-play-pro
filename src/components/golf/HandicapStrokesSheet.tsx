import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PlayerWithScores, HoleInfo } from '@/types/golf';
import { getStrokeHoles, formatHandicap } from '@/lib/handicapUtils';
import { cn } from '@/lib/utils';

interface HandicapStrokesSheetProps {
  open: boolean;
  onClose: () => void;
  players: PlayerWithScores[];
  holeInfo: HoleInfo[];
  totalHoles: 9 | 18;
  handicapMode: 'auto' | 'manual';
}

export function HandicapStrokesSheet({
  open,
  onClose,
  players,
  holeInfo,
  totalHoles,
  handicapMode,
}: HandicapStrokesSheetProps) {
  // Only show players who actually have handicap strokes
  const activePlayers = players.filter(p =>
    p.strokesPerHole && Array.from(p.strokesPerHole.values()).some(s => s > 0)
  );

  const getPlayerStrokeHoles = (player: PlayerWithScores): number[] => {
    if (!player.strokesPerHole) return [];
    return Array.from(player.strokesPerHole.entries())
      .filter(([, s]) => s > 0)
      .map(([h]) => h)
      .sort((a, b) => a - b);
  };

  const getPlayerHandicapForHole = (player: PlayerWithScores, holeNum: number): number => {
    return player.strokesPerHole?.get(holeNum) ?? 0;
  };

  const holeNumbers = Array.from({ length: totalHoles }, (_, i) => i + 1);

  // Avatar color palette
  const avatarColors = [
    { bg: 'bg-[#FEF9C3]', text: 'text-[#854D0E]' },
    { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]' },
    { bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]' },
    { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
  ];

  const getInitials = (name: string) =>
    name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[88vh] bg-[#F8F8F6] rounded-t-3xl p-0 border-0 [&>button]:hidden"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-4" />

        {/* Header */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-black tracking-[-0.04em] text-foreground leading-none">
              Stroke Allocation
            </h2>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-0.5">
              By hole · stroke index
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(88vh-100px)] px-6 space-y-4 pb-8">

          {activePlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Info className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground mb-1">No strokes allocated</p>
              <p className="text-[13px] text-muted-foreground max-w-[220px]">
                All players are playing scratch or handicaps aren't enabled for this round.
              </p>
            </div>
          ) : (
            <>
              {/* Per-player summary cards */}
              <div className="space-y-3">
                {activePlayers.map((player, i) => {
                  const strokeHoles = getPlayerStrokeHoles(player);
                  const colors = avatarColors[i % avatarColors.length];
                  const playingHcp = player.playingHandicap ?? 0;

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                      className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden"
                    >
                      {/* Player header */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center font-black text-[12px]', colors.bg, colors.text)}>
                          {getInitials(player.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-foreground text-[14px]">{player.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {handicapMode === 'manual'
                              ? `${playingHcp} manual stroke${playingHcp !== 1 ? 's' : ''}`
                              : `Hcp ${formatHandicap(player.handicap)} → ${playingHcp} stroke${playingHcp !== 1 ? 's' : ''}`
                            }
                          </p>
                        </div>
                        <div className="bg-[#F0EE3A] rounded-lg px-2.5 py-1">
                          <span className="text-[13px] font-black text-[#0A0A0A]">
                            +{playingHcp}
                          </span>
                        </div>
                      </div>

                      {/* Stroke holes list */}
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                          Receives a stroke on:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {strokeHoles.map(holeNum => {
                            const si = holeInfo.find(h => h.number === holeNum)?.handicap;
                            const extraStrokes = getPlayerHandicapForHole(player, holeNum);
                            return (
                              <div
                                key={holeNum}
                                className="flex flex-col items-center bg-[#0A0A0A] rounded-lg px-2.5 py-1.5 min-w-[36px]"
                              >
                                <span className="text-[13px] font-black text-white leading-none">
                                  {holeNum}
                                </span>
                                {si !== undefined && (
                                  <span className="text-[8px] font-bold text-white/50 mt-0.5 leading-none">
                                    SI {si}
                                  </span>
                                )}
                                {extraStrokes > 1 && (
                                  <span className="text-[8px] font-black text-[#F0EE3A] leading-none">
                                    ×{extraStrokes}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {strokeHoles.length === 0 && (
                            <span className="text-[13px] text-muted-foreground">No strokes (scratch)</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Full hole grid — who gets a stroke where */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                  Hole-by-hole grid
                </p>
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                  {/* Column headers: player names */}
                  <div className="grid border-b border-border/50" style={{ gridTemplateColumns: `64px repeat(${activePlayers.length}, 1fr)` }}>
                    <div className="px-3 py-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Hole</span>
                    </div>
                    {activePlayers.map((player, i) => {
                      const colors = avatarColors[i % avatarColors.length];
                      return (
                        <div key={player.id} className="py-2 px-1 flex justify-center">
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px]', colors.bg, colors.text)}>
                            {getInitials(player.name)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rows: one per hole */}
                  {holeNumbers.map((holeNum, idx) => {
                    const si = holeInfo.find(h => h.number === holeNum)?.handicap;
                    const par = holeInfo.find(h => h.number === holeNum)?.par;
                    const isEven = idx % 2 === 0;
                    const anyStroke = activePlayers.some(p => getPlayerHandicapForHole(p, holeNum) > 0);

                    return (
                      <div
                        key={holeNum}
                        className={cn(
                          'grid border-b border-border/30 last:border-0',
                          anyStroke ? 'bg-[#FAFFF6]' : isEven ? 'bg-white' : 'bg-[#FAFAFA]'
                        )}
                        style={{ gridTemplateColumns: `64px repeat(${activePlayers.length}, 1fr)` }}
                      >
                        {/* Hole info */}
                        <div className="px-3 py-2.5 flex flex-col justify-center">
                          <span className="text-[13px] font-black text-foreground leading-none">
                            {holeNum}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {par && <span className="text-[9px] font-bold text-muted-foreground">P{par}</span>}
                            {si !== undefined && (
                              <span className="text-[9px] text-muted-foreground/60">SI{si}</span>
                            )}
                          </div>
                        </div>

                        {/* Stroke cells per player */}
                        {activePlayers.map(player => {
                          const strokes = getPlayerHandicapForHole(player, holeNum);
                          return (
                            <div key={player.id} className="flex items-center justify-center py-2.5">
                              {strokes > 0 ? (
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: Math.min(strokes, 2) }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-2 h-2 rounded-full bg-[#F0EE3A] border border-[#0A0A0A]/20"
                                    />
                                  ))}
                                  {strokes > 2 && (
                                    <span className="text-[9px] font-black text-foreground">+{strokes - 2}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-border/40" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer explanation */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
                <div className="flex gap-3">
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-[12px] font-bold text-foreground">How stroke allocation works</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      Strokes are assigned to holes from the hardest (SI 1) to easiest (SI 18) — not subtracted from the total at the end. A 10-handicap gets one stroke on each of the 10 hardest holes.
                    </p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      In match play, only the <span className="font-bold text-foreground">difference</span> in handicaps is allocated — the lower-handicap player gives strokes to the higher.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
