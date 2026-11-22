import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Share2 } from 'lucide-react';
import { PlayerWithScores, Round, formatRelativeToPar } from '@/types/golf';
import { shareText } from '@/lib/shareResults';
import { cn } from '@/lib/utils';
import { calcScoreBreakdown, calcBestHole } from '@/lib/soloStats';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { ScoreMarkShape as ScoreMark, type ScoreMarkKind } from '@/components/ui/score-mark';
import { toParClass } from '@/components/golf/results/resultsFormat';

interface Props {
  round: Round;
  player: PlayerWithScores;
}

function markFor(diff: number): ScoreMarkKind {
  if (diff <= -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  return 'double';
}

/**
 * Stripped-down /complete view for solo rounds: scoring-only stats,
 * no settlements, no game results, no Final Standings.
 */
export function SoloRoundSummary({ round, player }: Props) {
  const navigate = useNavigate();

  const par = useMemo(
    () => round.holeInfo.reduce((sum, h) => sum + h.par, 0),
    [round.holeInfo],
  );

  const scoreTypeCounts = useMemo(
    () => calcScoreBreakdown(player, round.holeInfo),
    [player, round.holeInfo],
  );

  const bestHole = useMemo(
    () => calcBestHole(player, round.holeInfo),
    [player, round.holeInfo],
  );

  const handleShare = async () => {
    hapticLight();
    try {
      await shareText(round, [player]);
      hapticSuccess();
    } catch {
      hapticError();
      toast.error('Could not share');
    }
  };

  const toPar = player.totalRelativeToPar;
  const nines = [round.holeInfo.slice(0, 9), round.holeInfo.slice(9, 18)].filter(n => n.length > 0);

  const breakdown: { label: string; value: number; kind: ScoreMarkKind; glyph: string }[] = [
    { label: 'Eagles+', value: scoreTypeCounts.eagle + scoreTypeCounts.albatross + scoreTypeCounts.ace, kind: 'eagle', glyph: '−2' },
    { label: 'Birdies', value: scoreTypeCounts.birdie, kind: 'birdie', glyph: '−1' },
    { label: 'Pars', value: scoreTypeCounts.par, kind: 'par', glyph: 'E' },
    { label: 'Bogeys', value: scoreTypeCounts.bogey, kind: 'bogey', glyph: '+1' },
    { label: 'Doubles', value: scoreTypeCounts.double, kind: 'double', glyph: '+2' },
    { label: 'Triple+', value: scoreTypeCounts.triple + scoreTypeCounts.worse, kind: 'double', glyph: '+3' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Header */}
      <header className="flex-shrink-0 relative z-10 px-5 pt-safe-content pb-3">
        <p className="text-[13px] font-semibold text-[#14532D]">Solo round</p>
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] leading-tight text-foreground truncate">
          {round.courseName}
        </h1>
      </header>

      {/* Scrollable Content */}
      <main
        className="flex-1 overflow-y-auto overscroll-y-contain relative z-10 px-5 pb-36 pt-1 space-y-3.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Forest hero */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="bg-[#14532D] rounded-[28px] p-5 text-white"
        >
          <p className="text-[13px] font-semibold text-[#CFE3D6]">Final score</p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-[52px] font-extrabold tracking-[-0.04em] leading-none tabular-nums">
              {player.totalStrokes}
            </span>
            <span className={cn('text-[24px] font-extrabold', toPar < 0 ? 'text-[#BEF264]' : 'text-white')}>
              {formatRelativeToPar(toPar)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="rounded-[16px] bg-[#BEF264] text-[#14532D] px-3 py-2.5">
              <p className="text-[11px] font-semibold">Birdies+</p>
              <p className="text-[22px] font-extrabold leading-tight tabular-nums">
                {scoreTypeCounts.birdie + scoreTypeCounts.eagle + scoreTypeCounts.albatross + scoreTypeCounts.ace}
              </p>
            </div>
            <div className="rounded-[16px] bg-white/10 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-[#CFE3D6]">Holes</p>
              <p className="text-[22px] font-extrabold leading-tight tabular-nums">
                {player.holesPlayed}<span className="text-[13px] text-[#CFE3D6]">/{round.holes}</span>
              </p>
            </div>
            <div className="rounded-[16px] bg-white/10 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-[#CFE3D6]">Par</p>
              <p className="text-[22px] font-extrabold leading-tight tabular-nums">{par}</p>
            </div>
          </div>
        </motion.section>

        {/* Hole by hole */}
        {player.scores.length > 0 && (
          <section className="bg-card rounded-[20px] border border-border p-4">
            <h2 className="text-[13px] font-semibold text-muted-foreground mb-3">Hole by hole</h2>
            <div className="space-y-3">
              {nines.map((holes, n) => (
                <div key={n} className="grid grid-cols-9 gap-y-1 text-center">
                  {holes.map(h => (
                    <span key={`n${h.number}`} className="text-[11px] font-medium text-muted-foreground">{h.number}</span>
                  ))}
                  {holes.map(h => {
                    const s = player.scores.find(sc => sc.holeNumber === h.number);
                    if (!s) {
                      return <span key={h.number} className="text-[15px] font-bold text-[#B4BDB7] leading-[28px]">–</span>;
                    }
                    return (
                      <span key={h.number} className="flex justify-center">
                        <ScoreMark kind={markFor(s.strokes - h.par)} size={28}>{s.strokes}</ScoreMark>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Score breakdown */}
        <section className="bg-card rounded-[20px] border border-border overflow-hidden">
          <h2 className="text-[13px] font-semibold text-muted-foreground px-4 pt-3.5">Score breakdown</h2>
          <div className="grid grid-cols-3">
            {breakdown.map((b, i) => (
              <div
                key={b.label}
                className={cn(
                  'px-3 py-3 flex flex-col items-center gap-1.5',
                  i % 3 !== 0 && 'border-l border-border',
                  i >= 3 && 'border-t border-border',
                )}
              >
                <ScoreMark kind={b.kind} size={32}>{b.glyph}</ScoreMark>
                <p className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground leading-none tabular-nums">{b.value}</p>
                <p className="text-[12px] font-medium text-muted-foreground">{b.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Best hole */}
        {bestHole && (
          <section className="bg-card rounded-[20px] border border-border p-4 flex items-center gap-3">
            <ScoreMark kind={markFor(bestHole.diff)} size={40}>{bestHole.strokes}</ScoreMark>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-muted-foreground">Best hole</p>
              <p className="text-[17px] font-bold text-foreground">
                Hole {bestHole.hole}
                <span className="text-[14px] font-normal text-muted-foreground"> · {bestHole.strokes} on a par {bestHole.par}</span>
              </p>
            </div>
            <span className={cn('text-[17px] font-extrabold', toParClass(bestHole.diff))}>
              {formatRelativeToPar(bestHole.diff)}
            </span>
          </section>
        )}
      </main>

      {/* Bottom Actions */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background px-5 pt-3 flex gap-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/')}
          aria-label="Home"
          className="w-[60px] h-[60px] rounded-[20px] bg-muted flex items-center justify-center shrink-0 text-foreground"
        >
          <HomeIcon className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleShare}
          className="flex-1 bg-[#0F1F17] text-white rounded-[20px] h-[60px] font-semibold text-[16px] flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share round
        </motion.button>
      </div>
    </div>
  );
}
