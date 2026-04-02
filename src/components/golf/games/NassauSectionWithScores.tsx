import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Round, Player, Score, PlayerWithScores } from '@/types/golf';
import { NassauResult } from '@/lib/games/nassau';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge, HoleDot, SPRING } from './shared';

export function NassauSectionWithScores({
  nassauGame,
  nassauResult,
  players,
  round,
  scores,
  currentHole,
  pressablePlayer,
  onPressClick,
}: {
  nassauGame: NonNullable<Round['games']>[number];
  nassauResult: NassauResult;
  players: PlayerWithScores[];
  round: Round;
  scores: Score[];
  currentHole: number;
  pressablePlayer: { player: Player; standing: number } | null;
  onPressClick: (player: Player) => void;
}) {
  const [p1, p2] = players;

  // Build per-hole W/L/H for player 1 perspective
  const holeDots: ('W' | 'L' | 'H' | null)[] = Array.from({ length: round.holes }, (_, i) => {
    const h = i + 1;
    const s1 = scores.find(s => s.playerId === p1?.id && s.holeNumber === h);
    const s2 = scores.find(s => s.playerId === p2?.id && s.holeNumber === h);
    if (!s1 || !s2) return null;
    if (s1.strokes < s2.strokes) return 'W';
    if (s1.strokes > s2.strokes) return 'L';
    return 'H';
  });

  const hasAnyDots = holeDots.some(d => d !== null);

  const segments = [
    { label: 'Front 9', segment: nassauResult.front9, show: true },
    { label: 'Overall', segment: nassauResult.overall, show: true },
    { label: 'Back 9', segment: nassauResult.back9, show: round.holes === 18 },
  ].filter(s => s.show);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-0">
        <LiveDot />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Nassau ${nassauGame.stakes}
        </span>
        {nassauGame.useNet && <NetBadge />}
      </div>

      {/* Three status cards */}
      <div className="grid grid-cols-3 gap-2">
        {segments.map(({ label, segment }) => {
          const isAllSquare = segment.margin === 0 || segment.winnerId === null;
          const leaderName = segment.winnerId
            ? players.find(p => p.id === segment.winnerId)?.name?.split(' ')[0] ?? ''
            : '';

          return (
            <motion.div
              key={label}
              layout
              transition={SPRING}
              className={cn(
                'rounded-xl p-2.5 text-center border',
                isAllSquare
                  ? 'bg-white border-slate-100'
                  : 'bg-[#DCFCE7] border-[#22C55E]/30',
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                {label}
              </p>
              <p className="text-[12px] font-bold text-[#0A0A0A] leading-tight truncate">
                {isAllSquare ? 'AS' : leaderName}
              </p>
              {!isAllSquare && (
                <p className="text-[11px] font-semibold text-[#22C55E]">+{segment.margin}</p>
              )}
              {isAllSquare && (
                <p className="text-[10px] text-slate-400">All Square</p>
              )}
              <p className="text-[9px] text-slate-400 mt-0.5">
                {segment.holesPlayed > 0 ? `Thru ${segment.holesPlayed}` : '—'}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Hole-by-hole dots */}
      {hasAnyDots && p1 && p2 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            {p1.name.split(' ')[0]} hole-by-hole
          </p>
          <div className="flex flex-wrap gap-1">
            {holeDots.map((dot, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <HoleDot result={dot} />
                <span className="text-[8px] text-slate-300">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presses */}
      {(round.presses?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {round.presses?.map((press, i) => (
            <span
              key={press.id}
              className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200"
            >
              Press #{i + 1} · h{press.startHole} · ${press.stakes}
            </span>
          ))}
        </div>
      )}

      {/* Press CTA */}
      {pressablePlayer && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-xl border border-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-800 font-medium">
              {pressablePlayer.player.name.split(' ')[0]} is {Math.abs(pressablePlayer.standing)} down
            </span>
          </div>
          <Button
            size="sm"
            className="h-7 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-lg px-3"
            onClick={() => onPressClick(pressablePlayer.player)}
          >
            Press ${nassauGame.stakes}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
