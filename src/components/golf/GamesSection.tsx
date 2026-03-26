import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertCircle,
  Star,
  Users,
  Crown,
  Dog,
  Swords,
  Dices,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Round, Player, Score, Press, PlayerWithScores } from '@/types/golf';
import { PropBet, getPropBetIcon, getPropBetLabel } from '@/types/betting';
import { calculateSkins, SkinsResult, StrokesPerHoleMap } from '@/lib/games/skins';
import { calculateNassau, NassauResult, formatNassauStatus, canPress, createPress } from '@/lib/games/nassau';
import { calculateStableford, StablefordResult, getStablefordPointsColor } from '@/lib/games/stableford';
import { calculateBestBall, BestBallResult, formatBestBallStatus } from '@/lib/games/bestball';
import { calculateWolf, WolfResult, getWolfForHole } from '@/lib/games/wolf';
import { calculateMatchPlay, MatchPlayResult, getMatchPlayStatusColor } from '@/lib/games/matchPlay';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Design tokens ──────────────────────────────────────────────────────────
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 28 };
const ACCENT = '#F0EE3A';

// ─── Tiny shared sub-components ─────────────────────────────────────────────

function LiveDot() {
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function GameCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

function NetBadge() {
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0A0A0A]/10 text-[#0A0A0A] uppercase tracking-wide">
      Net
    </span>
  );
}

// Small W / L / H dot for hole-by-hole rows
function HoleDot({ result }: { result: 'W' | 'L' | 'H' | null }) {
  if (!result) {
    return <span className="w-4 h-4 rounded-full bg-muted/40 inline-block" />;
  }
  return (
    <span
      className={cn(
        'w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-bold text-white',
        result === 'W' && 'bg-[#22C55E]',
        result === 'L' && 'bg-red-400',
        result === 'H' && 'bg-slate-300 text-slate-600',
      )}
    >
      {result}
    </span>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface GamesSectionProps {
  round: Round;
  players: PlayerWithScores[];
  scores: Score[];
  currentHole: number;
  onAddPress: (press: Press) => void;
  propBets?: PropBet[];
}

// ─── NASSAU ──────────────────────────────────────────────────────────────────

function NassauSection({
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

// We need scores in Nassau section for hole dots — pass them down
function NassauSectionWithScores({
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

// ─── SKINS ───────────────────────────────────────────────────────────────────

function SkinsSection({
  skinsGame,
  skinsResult,
  players,
}: {
  skinsGame: NonNullable<Round['games']>[number];
  skinsResult: SkinsResult;
  players: PlayerWithScores[];
}) {
  const currentPot = skinsResult.carryover > 0
    ? skinsResult.potPerSkin * (skinsResult.carryover + 1)
    : skinsResult.potPerSkin;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Skins ${skinsGame.stakes}/hole
          </span>
          {skinsGame.useNet && <NetBadge />}
        </div>
        {skinsResult.carryover > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 animate-pulse">
            {skinsResult.carryover} carrying
          </span>
        )}
      </div>

      {/* Current pot highlight */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F0EE3A]/20 border border-[#F0EE3A]/60">
        <DollarSign className="w-4 h-4 text-[#9A9500] shrink-0" />
        <span className="text-sm font-bold text-[#0A0A0A]">
          Current Pot: ${currentPot}
        </span>
        {skinsResult.carryover > 0 && (
          <span className="text-[10px] text-amber-700 ml-auto font-semibold">
            {skinsResult.carryover + 1} skins
          </span>
        )}
      </div>

      {/* Standings */}
      <div className="space-y-1.5">
        {skinsResult.standings
          .slice()
          .sort((a, b) => b.skins - a.skins)
          .map(standing => {
            const isLeader = standing.skins === Math.max(...skinsResult.standings.map(s => s.skins)) && standing.skins > 0;
            return (
              <div
                key={standing.playerId}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  {isLeader && <Trophy className="w-3 h-3 text-[#F0EE3A] fill-[#F0EE3A]" />}
                  <span className="text-sm font-medium text-[#0A0A0A]">
                    {standing.playerName.split(' ')[0]}
                  </span>
                  {standing.skins > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#0A0A0A] text-white">
                      {standing.skins} skin{standing.skins !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    standing.earnings > 0 && 'text-[#22C55E]',
                    standing.earnings < 0 && 'text-red-500',
                    standing.earnings === 0 && 'text-slate-400',
                  )}
                >
                  {standing.earnings >= 0 ? '+' : ''}${standing.earnings}
                </span>
              </div>
            );
          })}
      </div>

      {/* Hole-by-hole skin results */}
      {skinsResult.results.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            Hole results
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skinsResult.results.map(result => {
              const winner = result.winnerId
                ? players.find(p => p.id === result.winnerId)
                : null;
              const isCarry = !result.winnerId;
              return (
                <div
                  key={result.holeNumber}
                  className={cn(
                    'flex flex-col items-center rounded-lg px-1.5 py-1 min-w-[32px]',
                    isCarry && 'bg-amber-50 border border-amber-200',
                    !isCarry && 'bg-[#DCFCE7] border border-[#22C55E]/20',
                  )}
                >
                  <span className="text-[8px] font-bold text-slate-400">H{result.holeNumber}</span>
                  {result.value > 1 && (
                    <span className="text-[8px] font-bold text-amber-600">${result.value * skinsGame.stakes}</span>
                  )}
                  <span
                    className={cn(
                      'text-[9px] font-bold truncate max-w-[36px]',
                      isCarry ? 'text-amber-700' : 'text-[#22C55E]',
                    )}
                  >
                    {isCarry ? '→' : winner?.name?.split(' ')[0] ?? '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MATCH PLAY ──────────────────────────────────────────────────────────────

function MatchPlaySection({
  matchGame,
  matchPlayResult,
  players,
}: {
  matchGame?: NonNullable<Round['games']>[number];
  matchPlayResult: MatchPlayResult;
  players: PlayerWithScores[];
}) {
  const [p1, p2] = players;
  const isOver = matchPlayResult.matchStatus === 'won' || matchPlayResult.matchStatus === 'halved';
  const isDormie = matchPlayResult.matchStatus === 'dormie';
  const isAllSquare = matchPlayResult.holesUp === 0 && !isOver;
  const notStarted = matchPlayResult.matchStatus === 'not_started';

  // Build hole dots from holeResults
  const holeDots: ('W' | 'L' | 'H' | null)[] = matchPlayResult.holeResults.map(hr => {
    if (hr.winnerId === null) return 'H';
    if (hr.winnerId === p1?.id) return 'W';
    return 'L';
  });

  const leaderName = matchPlayResult.leaderId
    ? players.find(p => p.id === matchPlayResult.leaderId)?.name?.split(' ')[0] ?? ''
    : '';

  const statusBg = isOver
    ? 'bg-[#DCFCE7] border-[#22C55E]/30'
    : isDormie
    ? 'bg-amber-50 border-amber-200'
    : isAllSquare
    ? 'bg-slate-50 border-slate-200'
    : 'bg-[#0A0A0A]/5 border-[#0A0A0A]/10';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Match Play
          </span>
          {matchGame?.stakes && matchGame.stakes > 0 && (
            <span className="text-[10px] text-muted-foreground">(${matchGame.stakes})</span>
          )}
        </div>
        {matchPlayResult.holesPlayed > 0 && (
          <span className="text-[10px] text-slate-400 font-medium">
            Thru {matchPlayResult.holesPlayed}
          </span>
        )}
      </div>

      {/* Big status card */}
      <div className={cn('rounded-2xl border px-4 py-4 text-center', statusBg)}>
        <motion.p
          key={matchPlayResult.statusText}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          className={cn(
            'text-xl font-black tracking-tight leading-tight',
            isOver && 'text-[#22C55E]',
            isDormie && 'text-amber-700',
            isAllSquare && 'text-[#0A0A0A]',
            !isOver && !isDormie && !isAllSquare && !notStarted && 'text-[#0A0A0A]',
            notStarted && 'text-slate-400',
          )}
        >
          {matchPlayResult.statusText}
        </motion.p>
        {matchPlayResult.holesRemaining > 0 && !isOver && (
          <p className="text-[11px] text-slate-400 mt-1">
            {matchPlayResult.holesRemaining} hole{matchPlayResult.holesRemaining !== 1 ? 's' : ''} to play
          </p>
        )}
        {isOver && matchPlayResult.winMargin && (
          <p className="text-xs font-semibold text-[#22C55E] mt-1">{matchPlayResult.winMargin}</p>
        )}
      </div>

      {/* Player rows */}
      <div className="space-y-1.5">
        {players.map(player => {
          const isLeader = matchPlayResult.leaderId === player.id;
          const isWinner = matchPlayResult.winnerId === player.id;
          const strokesReceived = player.strokesPerHole
            ? Array.from(player.strokesPerHole.values()).reduce((s, v) => s + v, 0)
            : 0;

          return (
            <div
              key={player.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
            >
              <div className="flex items-center gap-2">
                {isWinner && <Trophy className="w-3 h-3 text-[#22C55E]" />}
                <span className={cn('text-sm', isLeader && !isOver && 'font-bold text-[#0A0A0A]', (!isLeader || isOver) && 'font-medium text-slate-600')}>
                  {player.name}
                </span>
                {strokesReceived > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F0EE3A]/60 text-[#5A5700]">
                    +{strokesReceived}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-bold tabular-nums',
                  getMatchPlayStatusColor(matchPlayResult, player.id),
                )}
              >
                {isLeader && matchPlayResult.holesUp > 0
                  ? `${matchPlayResult.holesUp} UP`
                  : matchPlayResult.holesUp === 0
                  ? 'AS'
                  : `${matchPlayResult.holesUp} DN`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hole-by-hole dots */}
      {holeDots.length > 0 && p1 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            {p1.name.split(' ')[0]} result per hole
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
    </div>
  );
}

// ─── STABLEFORD ──────────────────────────────────────────────────────────────

function StablefordSection({
  stablefordGame,
  stablefordResult,
}: {
  stablefordGame: NonNullable<Round['games']>[number];
  stablefordResult: StablefordResult;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-0">
        <LiveDot />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Stableford {stablefordResult.modified && '· Modified'}
        </span>
        {stablefordGame.useNet && <NetBadge />}
        <span className="ml-auto text-[10px] text-slate-400">
          {stablefordResult.holesScored} holes
        </span>
      </div>

      <div className="space-y-1.5">
        {stablefordResult.standings.map((standing, index) => {
          const isFirst = index === 0 && stablefordResult.holesScored > 0;
          const gap = index > 0
            ? stablefordResult.standings[0].totalPoints - standing.totalPoints
            : 0;

          return (
            <motion.div
              key={standing.playerId}
              layout
              transition={SPRING}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                isFirst ? 'bg-[#0A0A0A] text-white' : 'bg-slate-50',
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-bold w-4 text-center',
                  isFirst ? 'text-white/60' : 'text-slate-400',
                )}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', isFirst ? 'text-white' : 'text-[#0A0A0A]')}>
                  {standing.playerName}
                </p>
                {!isFirst && gap > 0 && stablefordResult.holesScored > 0 && (
                  <p className="text-[10px] text-slate-400">-{gap} pts back</p>
                )}
              </div>
              <span
                className={cn(
                  'text-base font-black tabular-nums',
                  getStablefordPointsColor(standing.totalPoints),
                  isFirst && 'text-[#F0EE3A]',
                )}
              >
                {standing.totalPoints}
                <span className={cn('text-[10px] font-semibold ml-0.5', isFirst ? 'text-white/60' : 'text-slate-400')}>
                  pts
                </span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BEST BALL ───────────────────────────────────────────────────────────────

function BestBallSection({
  bestBallGame,
  bestBallResult,
}: {
  bestBallGame: NonNullable<Round['games']>[number];
  bestBallResult: BestBallResult;
}) {
  const [teamA, teamB] = bestBallResult.standings;
  const aWinning = teamA && teamB && teamA.relativeToPar < teamB.relativeToPar;
  const bWinning = teamA && teamB && teamB.relativeToPar < teamA.relativeToPar;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-0">
        <LiveDot />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Best Ball
        </span>
        {bestBallGame.useNet && <NetBadge />}
        <span className="ml-auto text-[10px] text-slate-400">
          Thru {bestBallResult.holesPlayed}
        </span>
      </div>

      {/* Team cards side by side */}
      <div className="grid grid-cols-2 gap-2">
        {bestBallResult.standings.map((standing, index) => {
          const isWinning =
            index === 0 ? aWinning : bWinning;
          const isEven = !aWinning && !bWinning;

          return (
            <motion.div
              key={standing.teamId}
              layout
              transition={SPRING}
              className={cn(
                'rounded-2xl p-3 text-center border',
                isWinning
                  ? 'bg-[#DCFCE7] border-[#22C55E]/30'
                  : isEven
                  ? 'bg-slate-50 border-slate-100'
                  : 'bg-white border-slate-100',
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mb-1">
                {standing.teamName}
              </p>
              <p className="text-2xl font-black text-[#0A0A0A] tabular-nums">
                {standing.totalScore}
              </p>
              <p
                className={cn(
                  'text-xs font-semibold mt-0.5',
                  standing.relativeToPar < 0 && 'text-[#22C55E]',
                  standing.relativeToPar > 0 && 'text-red-500',
                  standing.relativeToPar === 0 && 'text-slate-400',
                )}
              >
                {formatBestBallStatus(standing.relativeToPar)}
              </p>
              {standing.playerContributions?.length > 0 && (
                <p className="text-[9px] text-slate-400 mt-1 truncate">
                  {standing.playerContributions
                    .slice()
                    .sort((a, b) => b.holesContributed - a.holesContributed)[0]?.playerName?.split(' ')[0]}
                  {' '}leading
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Recent hole winners */}
      {bestBallResult.holeWinners.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            Recent holes
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {bestBallResult.holeWinners.slice(-6).map(hw => {
              const winner = bestBallResult.standings.find(s => s.teamId === hw.winningTeamId);
              const isPush = !hw.winningTeamId;
              return (
                <div
                  key={hw.holeNumber}
                  className={cn(
                    'flex flex-col items-center rounded-lg px-2 py-1 shrink-0',
                    isPush ? 'bg-slate-100' : 'bg-[#DCFCE7]',
                  )}
                >
                  <span className="text-[8px] text-slate-400 font-bold">H{hw.holeNumber}</span>
                  <span className="text-[9px] font-bold text-[#0A0A0A] truncate max-w-[36px]">
                    {isPush ? 'Push' : winner?.teamName?.split(' ')[0] ?? '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WOLF ────────────────────────────────────────────────────────────────────

function WolfSection({
  wolfGame,
  wolfResult,
  players,
  currentHole,
}: {
  wolfGame: NonNullable<Round['games']>[number];
  wolfResult: WolfResult;
  players: PlayerWithScores[];
  currentHole: number;
}) {
  const currentWolf = getWolfForHole(players, currentHole);
  const lastHoleResult = wolfResult.results[wolfResult.results.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Wolf ${wolfGame.stakes}/pt
          </span>
          {wolfGame.useNet && <NetBadge />}
        </div>
        <span className="text-[10px] text-slate-400">Thru {wolfResult.holesPlayed}</span>
      </div>

      {/* Current wolf */}
      {currentWolf && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0A0A0A] text-white">
          <Crown className="w-4 h-4 text-[#F0EE3A] shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Current Wolf · H{currentHole}
            </p>
            <p className="text-sm font-bold">{currentWolf.name}</p>
          </div>
          {wolfResult.carryover > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F0EE3A] text-[#0A0A0A] rounded-full">
              {wolfResult.carryover} carry
            </span>
          )}
        </div>
      )}

      {/* Last hole context */}
      {lastHoleResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-xs text-slate-600">
          <Dog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            H{lastHoleResult.holeNumber}:
            {lastHoleResult.isBlindWolf
              ? ' Blind Wolf'
              : lastHoleResult.partnerId === null
              ? ' Lone Wolf'
              : ' Wolf + Partner'}
            {' '}· {lastHoleResult.winningTeam === 'wolf' ? 'Wolf wins' : lastHoleResult.winningTeam === 'hunters' ? 'Hunters win' : 'Push'}
            {' '}· {lastHoleResult.points} pt{lastHoleResult.points !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Standings */}
      <div className="space-y-1.5">
        {wolfResult.standings
          .slice()
          .sort((a, b) => b.earnings - a.earnings)
          .map((standing, index) => {
            const isFirst = index === 0;
            return (
              <motion.div
                key={standing.playerId}
                layout
                transition={SPRING}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50"
              >
                <span className="text-[11px] font-bold w-4 text-center text-slate-400">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                    {standing.playerName?.split(' ')[0] ?? standing.playerName}
                    {standing.loneWolfWins > 0 && (
                      <span className="ml-1 text-[9px] font-bold text-amber-600">
                        🐺{standing.loneWolfWins}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {standing.totalPoints} pts · Wolf {standing.timesAsWolf}×
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
                  {standing.earnings >= 0 ? '+' : ''}${standing.earnings}
                </span>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}

// ─── STROKE PLAY ─────────────────────────────────────────────────────────────

function StrokePlaySection({ players }: { players: PlayerWithScores[] }) {
  const sorted = [...players].sort((a, b) => a.totalRelativeToPar - b.totalRelativeToPar);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-0">
        <LiveDot />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Stroke Play
        </span>
      </div>
      <div className="space-y-1.5">
        {sorted.map((player, index) => {
          const rel = player.totalRelativeToPar;
          const label = rel === 0 ? 'E' : rel > 0 ? `+${rel}` : `${rel}`;
          const isFirst = index === 0;

          return (
            <motion.div
              key={player.id}
              layout
              transition={SPRING}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl',
                isFirst ? 'bg-[#0A0A0A] text-white' : 'bg-slate-50',
              )}
            >
              <span className={cn('text-[11px] font-bold w-4 text-center', isFirst ? 'text-white/50' : 'text-slate-400')}>
                {index + 1}
              </span>
              <span className={cn('text-sm font-semibold flex-1 truncate', isFirst ? 'text-white' : 'text-[#0A0A0A]')}>
                {player.name}
              </span>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {player.totalStrokes}
              </span>
              <span
                className={cn(
                  'text-sm font-black tabular-nums w-8 text-right',
                  isFirst && 'text-[#F0EE3A]',
                  !isFirst && rel < 0 && 'text-[#22C55E]',
                  !isFirst && rel > 0 && 'text-red-500',
                  !isFirst && rel === 0 && 'text-slate-600',
                )}
              >
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PROP BETS ───────────────────────────────────────────────────────────────

function PropBetsSection({
  propBets,
  propBetsSummary,
  players,
}: {
  propBets: PropBet[];
  propBetsSummary: { totalBets: number; playerStats: Map<string, { count: number; earnings: number; types: string[] }> };
  players: PlayerWithScores[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Side Bets
          </span>
        </div>
        <span className="text-[10px] text-slate-400">{propBetsSummary.totalBets} won</span>
      </div>
      <div className="space-y-1.5">
        {players.map(player => {
          const stats = propBetsSummary.playerStats.get(player.id);
          if (!stats) return null;
          return (
            <div
              key={player.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#0A0A0A]">
                  {player.name?.split(' ')[0] ?? player.name}
                </span>
                <div className="flex gap-0.5">
                  {stats.types.slice(0, 4).map((type, i) => (
                    <span key={i} className="text-xs" title={getPropBetLabel(type as PropBet['type'])}>
                      {getPropBetIcon(type as PropBet['type'])}
                    </span>
                  ))}
                  {stats.types.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{stats.types.length - 4}</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold text-[#22C55E]">+${stats.earnings}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DIVIDER ─────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-slate-100" />;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function GamesSection({ round, players, scores, currentHole, onAddPress, propBets = [] }: GamesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [pressConfirmPlayer, setPressConfirmPlayer] = useState<Player | null>(null);

  // Build the strokesPerHole map for net scoring
  // Always build if players have strokes data - individual games decide whether to use it
  // Match play always uses differential strokes (standard golf rules)
  const buildStrokesMap = useMemo((): StrokesPerHoleMap | undefined => {
    const map = new Map<string, Map<number, number>>();
    for (const player of players) {
      if (player.strokesPerHole) {
        map.set(player.id, player.strokesPerHole);
      }
    }
    return map.size > 0 ? map : undefined;
  }, [players]);

  const skinsGame = round.games?.find(g => g.type === 'skins');
  const nassauGame = round.games?.find(g => g.type === 'nassau');
  const stablefordGame = round.games?.find(g => g.type === 'stableford');
  const bestBallGame = round.games?.find(g => g.type === 'bestball');
  const wolfGame = round.games?.find(g => g.type === 'wolf');
  const matchGame = round.games?.find(g => g.type === 'match');

  // Also check round.matchPlay for legacy support
  const hasMatchPlay = matchGame || round.matchPlay;

  // Calculate the highest hole with all players scored
  const holesPlayed = useMemo(() => {
    let maxHole = 0;
    for (let hole = 1; hole <= round.holes; hole++) {
      const holeScores = scores.filter(s => s.holeNumber === hole);
      if (holeScores.length === players.length) {
        maxHole = hole;
      } else {
        break;
      }
    }
    return maxHole;
  }, [scores, players.length, round.holes]);

  // Calculate skins results
  const skinsResult: SkinsResult | null = useMemo(() => {
    if (!skinsGame || players.length < 2) return null;
    const useStrokesMap = skinsGame.useNet ? buildStrokesMap : undefined;
    return calculateSkins(
      scores,
      players,
      holesPlayed,
      skinsGame.stakes,
      skinsGame.carryover ?? true,
      useStrokesMap,
    );
  }, [skinsGame, scores, players, holesPlayed, buildStrokesMap]);

  // Calculate Nassau results
  const nassauResult: NassauResult | null = useMemo(() => {
    if (!nassauGame || players.length !== 2) return null;
    const useStrokesMap = nassauGame.useNet ? buildStrokesMap : undefined;
    return calculateNassau(
      scores,
      players,
      nassauGame.stakes,
      round.presses || [],
      round.holes,
      useStrokesMap,
    );
  }, [nassauGame, scores, players, round.presses, round.holes, buildStrokesMap]);

  // Calculate Stableford results
  const stablefordResult: StablefordResult | null = useMemo(() => {
    if (!stablefordGame || players.length < 2) return null;
    const useStrokesMap = stablefordGame.useNet ? buildStrokesMap : undefined;
    return calculateStableford(
      scores,
      players,
      round.holeInfo,
      stablefordGame.modifiedStableford ?? false,
      useStrokesMap,
    );
  }, [stablefordGame, scores, players, round.holeInfo, buildStrokesMap]);

  // Calculate Best Ball results
  const bestBallResult: BestBallResult | null = useMemo(() => {
    if (!bestBallGame?.teams || bestBallGame.teams.length < 2) return null;
    const useStrokesMap = bestBallGame.useNet ? buildStrokesMap : undefined;
    return calculateBestBall(
      scores,
      players,
      bestBallGame.teams,
      round.holeInfo,
      holesPlayed,
      useStrokesMap,
    );
  }, [bestBallGame, scores, players, round.holeInfo, holesPlayed, buildStrokesMap]);

  // Calculate Wolf results
  const wolfResult: WolfResult | null = useMemo(() => {
    if (!wolfGame || players.length !== 4) return null;
    return calculateWolf(
      scores,
      players,
      wolfGame.wolfResults || [],
      wolfGame.stakes,
      wolfGame.carryover ?? true,
      round.holes,
    );
  }, [wolfGame, scores, players, round.holes]);

  // Calculate Match Play results (2 players only)
  const matchPlayResult: MatchPlayResult | null = useMemo(() => {
    if (!hasMatchPlay || players.length !== 2) return null;
    return calculateMatchPlay(
      scores,
      players,
      round.holeInfo,
      buildStrokesMap,
      round.holes,
    );
  }, [hasMatchPlay, scores, players, round.holeInfo, buildStrokesMap, round.holes]);

  // Check if any player can press
  const pressablePlayer = useMemo(() => {
    if (!nassauResult || players.length !== 2) return null;

    const [p1, p2] = players;
    const p1Standing = nassauResult.overall.margin * (nassauResult.overall.winnerId === p1.id ? 1 : -1);
    const p2Standing = nassauResult.overall.margin * (nassauResult.overall.winnerId === p2.id ? 1 : -1);

    if (canPress(currentHole, p1Standing, round.presses || [], round.holes)) {
      return { player: p1, standing: p1Standing };
    }
    if (canPress(currentHole, p2Standing, round.presses || [], round.holes)) {
      return { player: p2, standing: p2Standing };
    }
    return null;
  }, [nassauResult, players, currentHole, round.presses, round.holes]);

  // Calculate prop bets summary (junk bets)
  const propBetsSummary = useMemo(() => {
    if (!propBets || propBets.length === 0) return null;

    const wonBets = propBets.filter(pb => pb.winnerId);
    if (wonBets.length === 0) return null;

    // Group by player
    const playerStats = new Map<string, { count: number; earnings: number; types: string[] }>();

    wonBets.forEach(bet => {
      const stats = playerStats.get(bet.winnerId!) || { count: 0, earnings: 0, types: [] };
      stats.count++;
      stats.earnings += bet.stakes * (players.length - 1); // Winner gets stakes from each other player
      stats.types.push(bet.type);
      playerStats.set(bet.winnerId!, stats);
    });

    return {
      totalBets: wonBets.length,
      playerStats,
    };
  }, [propBets, players.length]);

  const hasPropBets = propBets.length > 0;
  const hasStrokePlay = round.strokePlay;

  if (
    !skinsGame &&
    !nassauGame &&
    !stablefordGame &&
    !bestBallGame &&
    !wolfGame &&
    !hasMatchPlay &&
    !hasPropBets &&
    !hasStrokePlay
  )
    return null;

  const handleConfirmPress = () => {
    if (pressConfirmPlayer && nassauGame) {
      const press = createPress(pressConfirmPlayer.id, currentHole, nassauGame.stakes);
      onAddPress(press);
      setPressConfirmPlayer(null);
    }
  };

  // Collect visible sections to know where to insert dividers
  const sections: React.ReactNode[] = [];

  if (hasMatchPlay && matchPlayResult && players.length === 2) {
    sections.push(
      <MatchPlaySection
        key="match"
        matchGame={matchGame}
        matchPlayResult={matchPlayResult}
        players={players}
      />,
    );
  }

  if (nassauGame && nassauResult) {
    sections.push(
      <NassauSectionWithScores
        key="nassau"
        nassauGame={nassauGame}
        nassauResult={nassauResult}
        players={players}
        round={round}
        scores={scores}
        currentHole={currentHole}
        pressablePlayer={pressablePlayer}
        onPressClick={setPressConfirmPlayer}
      />,
    );
  }

  if (skinsGame && skinsResult) {
    sections.push(
      <SkinsSection
        key="skins"
        skinsGame={skinsGame}
        skinsResult={skinsResult}
        players={players}
      />,
    );
  }

  if (stablefordGame && stablefordResult) {
    sections.push(
      <StablefordSection
        key="stableford"
        stablefordGame={stablefordGame}
        stablefordResult={stablefordResult}
      />,
    );
  }

  if (bestBallGame && bestBallResult) {
    sections.push(
      <BestBallSection
        key="bestball"
        bestBallGame={bestBallGame}
        bestBallResult={bestBallResult}
      />,
    );
  }

  if (wolfGame && wolfResult) {
    sections.push(
      <WolfSection
        key="wolf"
        wolfGame={wolfGame}
        wolfResult={wolfResult}
        players={players}
        currentHole={currentHole}
      />,
    );
  }

  if (hasStrokePlay && players.length > 0) {
    sections.push(<StrokePlaySection key="stroke" players={players} />);
  }

  if (hasPropBets && propBetsSummary) {
    sections.push(
      <PropBetsSection
        key="props"
        propBets={propBets}
        propBetsSummary={propBetsSummary}
        players={players}
      />,
    );
  }

  return (
    <>
      <GameCard className="overflow-hidden p-0">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <LiveDot />
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#0A0A0A]">
              Games
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {sections.length} active
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-0">
                {sections.map((section, i) => (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    <div className={i > 0 ? 'pt-4' : 'pt-1'}>{section}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GameCard>

      {/* Press Confirmation Dialog */}
      <AlertDialog open={!!pressConfirmPlayer} onOpenChange={() => setPressConfirmPlayer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Press</AlertDialogTitle>
            <AlertDialogDescription>
              {pressConfirmPlayer?.name} wants to press for ${nassauGame?.stakes} starting from hole {currentHole}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPress}>Press</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
