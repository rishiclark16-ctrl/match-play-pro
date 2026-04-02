import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Round, Player, Score, PlayerWithScores } from '@/types/golf';
import { NassauResult } from '@/lib/games/nassau';
import { cn } from '@/lib/utils';
import { LiveDot, SectionLabel, NetBadge, HoleDot, SPRING } from './shared';

export function NassauSection({
  nassauGame,
  nassauResult,
  players,
  round,
  currentHole,
  pressablePlayer,
  onPressClick,
}: {
  nassauGame: NonNullable<Round['games']>[number];
  nassauResult: NassauResult;
  players: PlayerWithScores[];
  round: Round;
  currentHole: number;
  pressablePlayer: { player: Player; standing: number } | null;
  onPressClick: (player: Player) => void;
}) {
  const segments = [
    {
      label: 'Front 9',
      segment: nassauResult.front9,
      show: true,
    },
    {
      label: 'Overall',
      segment: nassauResult.overall,
      show: true,
    },
    {
      label: 'Back 9',
      segment: nassauResult.back9,
      show: round.holes === 18,
    },
  ].filter(s => s.show);

  function getSegmentBg(winnerId: string | null, margin: number) {
    if (margin === 0 || winnerId === null) return 'bg-white';
    return 'bg-[#DCFCE7]'; // light green — one player leading
  }

  function getStatusLabel(segment: NassauResult['front9']) {
    if (segment.margin === 0 || segment.winnerId === null) return 'AS';
    const name = players.find(p => p.id === segment.winnerId)?.name?.split(' ')[0] ?? '';
    return `${name} +${segment.margin}`;
  }

  // Build hole-by-hole dot data using holeResults from front9/back9
  // We derive W/L/H per hole from per-player hole scores
  const [p1, p2] = players;
  const holeDots: ('W' | 'L' | 'H' | null)[] = [];
  for (let h = 1; h <= round.holes; h++) {
    const p1Score = scores => scores.find((s: Score) => s.playerId === p1?.id && s.holeNumber === h);
    const p2Score = scores => scores.find((s: Score) => s.playerId === p2?.id && s.holeNumber === h);
    // We get these in the parent, but here we derive from nassauResult segment scores
    // Using overall segment scores (accumulated) is not per-hole, so we mark null for unplayed
    holeDots.push(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LiveDot />
        <SectionLabel>Nassau ${nassauGame.stakes}</SectionLabel>
        {nassauGame.useNet && <NetBadge />}
      </div>

      {/* Three status cards */}
      <div className="grid grid-cols-3 gap-2">
        {segments.map(({ label, segment }) => {
          const isAllSquare = segment.margin === 0 || segment.winnerId === null;
          const leaderName = segment.winnerId
            ? players.find(p => p.id === segment.winnerId)?.name?.split(' ')[0] ?? ''
            : '';
          const bg = isAllSquare ? 'bg-white' : 'bg-[#DCFCE7]';

          return (
            <motion.div
              key={label}
              layout
              transition={SPRING}
              className={cn(
                'rounded-xl p-2.5 text-center border',
                isAllSquare ? 'border-slate-100' : 'border-[#22C55E]/30',
                bg,
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                {label}
              </p>
              <p className="text-[13px] font-bold text-[#0A0A0A] leading-tight">
                {isAllSquare ? 'AS' : leaderName}
              </p>
              {!isAllSquare && (
                <p className="text-[11px] font-semibold text-[#22C55E]">
                  +{segment.margin}
                </p>
              )}
              {isAllSquare && (
                <p className="text-[11px] text-slate-400">All Square</p>
              )}
              <p className="text-[9px] text-slate-400 mt-0.5">
                {segment.holesPlayed > 0 ? `Thru ${segment.holesPlayed}` : '—'}
              </p>
            </motion.div>
          );
        })}
      </div>

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
