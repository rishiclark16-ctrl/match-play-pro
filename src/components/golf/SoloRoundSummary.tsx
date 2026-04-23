import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Share2, Target } from 'lucide-react';
import { PlayerWithScores, Round, formatRelativeToPar, getScoreColor, getScoreType } from '@/types/golf';
import { shareText } from '@/lib/shareResults';
import { cn } from '@/lib/utils';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';

interface Props {
  round: Round;
  player: PlayerWithScores;
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

  const scoreTypeCounts = useMemo(() => {
    const counts = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, worse: 0, ace: 0, albatross: 0 };
    for (const s of player.scores) {
      const hole = round.holeInfo.find(h => h.number === s.holeNumber);
      if (!hole) continue;
      const type = getScoreType(s.strokes, hole.par);
      counts[type]++;
    }
    return counts;
  }, [player.scores, round.holeInfo]);

  const bestHole = useMemo(() => {
    if (player.scores.length === 0) return null;
    let best: { hole: number; diff: number; strokes: number; par: number } | null = null;
    for (const s of player.scores) {
      const hole = round.holeInfo.find(h => h.number === s.holeNumber);
      if (!hole) continue;
      const diff = s.strokes - hole.par;
      if (!best || diff < best.diff) {
        best = { hole: s.holeNumber, diff, strokes: s.strokes, par: hole.par };
      }
    }
    return best;
  }, [player.scores, round.holeInfo]);

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

  // getScoreColor wants (strokes, par); build equivalent diff-based call.
  const toPar = player.totalRelativeToPar;
  const toParColorClass = getScoreColor(par + toPar, par);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/3 to-transparent" />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 relative z-10 px-5 pt-safe-content pb-3 border-b-2 border-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Solo Round</span>
        </div>
        <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">{round.courseName}</h1>
      </header>

      {/* Scrollable Content */}
      <main
        className="flex-1 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-32 pt-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Hero score card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="mx-0 mb-4 bg-[#0A0A0A] rounded-2xl p-5 text-white"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 mb-1">Final Score</p>
          <div className="flex items-baseline gap-3">
            <span className="text-[56px] font-black tracking-[-0.04em] leading-none">{player.totalStrokes}</span>
            <span className={cn('text-[22px] font-black', toParColorClass)}>
              {formatRelativeToPar(toPar)}
            </span>
          </div>
          <p className="text-[12px] text-white/55 mt-2">
            {player.holesPlayed} of {round.holes} holes · par {par}
          </p>
        </motion.div>

        {/* Score distribution */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border/30">
            <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">Score Breakdown</span>
          </div>
          <div className="grid grid-cols-3 gap-0 divide-x divide-border/20">
            <StatCell label="Eagles+" value={scoreTypeCounts.eagle + scoreTypeCounts.albatross + scoreTypeCounts.ace} />
            <StatCell label="Birdies" value={scoreTypeCounts.birdie} />
            <StatCell label="Pars" value={scoreTypeCounts.par} />
          </div>
          <div className="grid grid-cols-3 gap-0 divide-x divide-border/20 border-t border-border/20">
            <StatCell label="Bogeys" value={scoreTypeCounts.bogey} />
            <StatCell label="Doubles" value={scoreTypeCounts.double} />
            <StatCell label="Triple+" value={scoreTypeCounts.triple + scoreTypeCounts.worse} />
          </div>
        </div>

        {/* Best hole */}
        {bestHole && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Best Hole</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[17px] font-black text-foreground">Hole {bestHole.hole}</span>
              <span className="text-[13px] text-muted-foreground">
                · {bestHole.strokes} on par {bestHole.par}
              </span>
              <span className={cn('text-[13px] font-bold ml-auto', getScoreColor(bestHole.strokes, bestHole.par))}>
                {formatRelativeToPar(bestHole.diff)}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Actions */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-[rgba(0,0,0,0.06)] bg-background px-4 py-3 flex gap-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          className="flex-1 bg-muted rounded-2xl h-[48px] font-bold text-[14px] flex items-center justify-center gap-2 text-foreground"
        >
          <HomeIcon className="w-4 h-4" />
          Home
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          className="flex-1 bg-foreground text-background rounded-2xl h-[48px] font-bold text-[14px] flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </motion.button>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
