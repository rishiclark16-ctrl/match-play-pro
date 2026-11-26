import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeToPar, PlayerWithScores, Round } from '@/types/golf';
import { MatchPlayResult } from '@/lib/games/matchPlay';
import { NetSettlement, getTotalWinnings } from '@/lib/games/settlement';
import { formatMoney, firstName } from '@/components/golf/results/resultsFormat';

interface WinnerCardProps {
  winner: PlayerWithScores;
  hasTie: boolean;
  sortedPlayers: PlayerWithScores[];
  round: Round;
  matchPlayResult: MatchPlayResult | null;
  useNetScoring: boolean;
  /** Net settlements for the round; used only to read totals for display. */
  settlements?: NetSettlement[];
  /** The viewer's player id in this round, if they played. */
  myPlayerId?: string;
}

function displayScore(p: PlayerWithScores, useNet: boolean) {
  return useNet ? (p.totalNetStrokes ?? p.totalStrokes) : p.totalStrokes;
}

function displayToPar(p: PlayerWithScores, useNet: boolean) {
  return useNet ? (p.netRelativeToPar ?? p.totalRelativeToPar) : p.totalRelativeToPar;
}

interface Tile {
  label: string;
  value: string;
  sub?: string;
}

/**
 * Forest hero card for the round result: who won, the viewer's net money as
 * the big numeral, and three sub-tiles (one lime tile for the hottest number).
 */
export function WinnerCard({
  winner,
  hasTie,
  sortedPlayers,
  round,
  matchPlayResult,
  useNetScoring,
  settlements = [],
  myPlayerId,
}: WinnerCardProps) {
  const winnerScore = displayScore(winner, useNetScoring);
  const tiedPlayers = hasTie
    ? sortedPlayers.filter(p => displayScore(p, useNetScoring) === winnerScore)
    : [winner];
  const title = hasTie
    ? tiedPlayers.map(p => firstName(p.name)).join(' & ')
    : winner.name;
  const scoreSuffix = useNetScoring && winner.playingHandicap ? ' net' : '';

  const isMatch = !!(round?.matchPlay && matchPlayResult);
  const matchLine = isMatch
    ? matchPlayResult!.winMargin ||
      (matchPlayResult!.holesUp > 0 ? `${matchPlayResult!.holesUp} up` : 'All square')
    : null;

  const me = myPlayerId ? sortedPlayers.find(p => p.id === myPlayerId) : undefined;
  const hasMoney = settlements.length > 0;
  const myNet = me && hasMoney ? getTotalWinnings(me.id, settlements) : null;

  // Top earner across the round (display only).
  let top: { name: string; amount: number } | null = null;
  if (hasMoney) {
    for (const p of sortedPlayers) {
      const amt = getTotalWinnings(p.id, settlements);
      if (amt > 0 && (!top || amt > top.amount)) top = { name: p.name, amount: amt };
    }
  }

  const lowTile: Tile = {
    label: hasTie ? 'Low score' : 'Winning score',
    value: String(winnerScore),
    sub: `${formatRelativeToPar(displayToPar(winner, useNetScoring))}${scoreSuffix}`,
  };
  const meTile: Tile | null = me && displayScore(me, useNetScoring) !== winnerScore
    ? {
        label: 'Your score',
        value: String(displayScore(me, useNetScoring)),
        sub: `${formatRelativeToPar(displayToPar(me, useNetScoring))}${useNetScoring && me.playingHandicap ? ' net' : ''}`,
      }
    : null;
  const fieldTile: Tile = { label: 'Players', value: String(sortedPlayers.length), sub: 'in the round' };

  const hot: Tile = top
    ? { label: 'Top payout', value: formatMoney(top.amount), sub: firstName(top.name) }
    : lowTile;
  const totalPar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
  const parTile: Tile = { label: 'Course par', value: String(totalPar), sub: `${round.holes} holes` };
  const rest = [lowTile, meTile, fieldTile, parTile]
    .filter((t): t is Tile => !!t && t !== hot)
    .slice(0, 2);

  // Headline numeral: the viewer's money if there's money on the round,
  // otherwise the winning score (or match margin).
  let heroLabel: string;
  let heroValue: string;
  let heroCaption: string;
  let heroLime = false;
  if (myNet !== null) {
    heroLabel = 'Your money';
    heroValue = myNet === 0 ? '$0' : formatMoney(myNet);
    heroCaption = myNet > 0 ? 'You won' : myNet < 0 ? 'You owe' : 'All square';
    heroLime = myNet > 0;
  } else if (isMatch) {
    heroLabel = 'Match result';
    heroValue = matchLine!;
    heroCaption = `${firstName(winner.name)} wins`;
  } else {
    heroLabel = hasTie ? 'Tied at' : 'Winning score';
    heroValue = String(winnerScore);
    heroCaption = `${formatRelativeToPar(displayToPar(winner, useNetScoring))}${scoreSuffix}`;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.15 }}
      className="mb-3.5"
      aria-label="Round result"
    >
      <div className="bg-[#14532D] rounded-[28px] p-5 text-white">
        {/* Winner */}
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-[14px] bg-[#BEF264] flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-[#14532D]" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#CFE3D6]">
              {hasTie ? 'Tied for the win' : 'Winner'}
            </p>
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em] leading-tight truncate">
              {title}
            </h2>
            <p className="text-[13px] text-[#CFE3D6] mt-0.5">
              {isMatch && myNet !== null
                ? `${matchLine} · ${round.holes} holes`
                : `${winnerScore}${scoreSuffix} · ${formatRelativeToPar(displayToPar(winner, useNetScoring))}`}
            </p>
          </div>
        </div>

        <div className="h-px bg-white/10 my-4" />

        {/* Headline numeral */}
        <p className="text-[13px] font-semibold text-[#CFE3D6]">{heroLabel}</p>
        <div className="flex items-baseline gap-3 mt-1">
          <span
            data-testid="round-hero-number"
            className={cn(
              'text-[52px] font-extrabold leading-none tracking-[-0.04em] tabular-nums',
              heroLime ? 'text-[#BEF264]' : 'text-white',
            )}
          >
            {heroValue}
          </span>
          <span className="text-[15px] font-semibold text-[#CFE3D6]">{heroCaption}</span>
        </div>

        {/* Sub-tiles: one lime tile for the hottest number */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[hot, ...rest].map((t, i) => (
            <div
              key={t.label}
              className={cn(
                'rounded-[16px] px-3 py-2.5 min-w-0',
                i === 0 ? 'bg-[#BEF264] text-[#14532D]' : 'bg-white/10 text-white',
              )}
            >
              <p className={cn('text-[11px] font-semibold truncate', i === 0 ? 'text-[#14532D]' : 'text-[#CFE3D6]')}>
                {t.label}
              </p>
              <p className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] tabular-nums truncate">
                {t.value}
              </p>
              {t.sub && (
                <p className={cn('text-[11px] font-medium truncate', i === 0 ? 'text-[#14532D]' : 'text-[#CFE3D6]')}>
                  {t.sub}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
