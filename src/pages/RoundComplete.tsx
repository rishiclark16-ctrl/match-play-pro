import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Share2, Plus } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { formatRelativeToPar, getScoreColor, PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function RoundComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRoundById, getPlayersWithScores } = useRounds();

  const round = getRoundById(id || '');

  const playersWithScores = useMemo(() => {
    if (!round) return [];
    return getPlayersWithScores(round.id, round.holeInfo);
  }, [round, getPlayersWithScores]);

  // Sort by total strokes (lowest first)
  const sortedPlayers = useMemo(() => {
    return [...playersWithScores].sort((a, b) => a.totalStrokes - b.totalStrokes);
  }, [playersWithScores]);

  const winner = sortedPlayers[0];

  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Round not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const totalPar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
  const dateStr = format(new Date(round.createdAt), 'MMMM d, yyyy');

  const getPlayerRow = (player: PlayerWithScores, rank: number) => {
    const isWinner = rank === 0;
    
    return (
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + rank * 0.1 }}
        className={cn(
          "flex items-center gap-4 p-4 rounded-xl",
          isWinner ? "bg-primary-light" : "bg-card"
        )}
      >
        {/* Rank */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center font-bold",
          isWinner ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {rank + 1}
        </div>

        {/* Name */}
        <div className="flex-1">
          <h4 className="font-medium">{player.name}</h4>
        </div>

        {/* Score */}
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums">{player.totalStrokes}</p>
          <p className={cn("text-sm font-medium", getScoreColor(player.totalStrokes, totalPar))}>
            {formatRelativeToPar(player.totalRelativeToPar)}
          </p>
        </div>
      </motion.div>
    );
  };

  const handleShare = () => {
    // Placeholder for share functionality
    const text = `🏌️ MATCH Round Complete!\n\n📍 ${round.courseName}\n🏆 Winner: ${winner?.name}\n\n${sortedPlayers.map((p, i) => `${i + 1}. ${p.name}: ${p.totalStrokes} (${formatRelativeToPar(p.totalRelativeToPar)})`).join('\n')}`;
    
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-16 pb-6 px-6 safe-top text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
        >
          <Trophy className="w-10 h-10 text-primary" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold"
        >
          Round Complete
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-muted-foreground mt-1"
        >
          {round.courseName} • {round.holes} holes
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {dateStr}
        </motion.p>
      </header>

      {/* Winner Card */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="mx-6 mb-6 card-premium p-6 bg-gradient-to-br from-primary-light to-background border-2 border-primary/20"
        >
          <div className="text-center">
            <p className="text-sm font-medium text-primary uppercase tracking-wide mb-1">Winner</p>
            <h2 className="text-2xl font-bold">{winner.name}</h2>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="text-3xl font-bold tabular-nums">{winner.totalStrokes}</span>
              <span className={cn("text-lg font-semibold", getScoreColor(winner.totalStrokes, totalPar))}>
                {formatRelativeToPar(winner.totalRelativeToPar)}
              </span>
            </div>
            {round.stakes && sortedPlayers.length > 1 && (
              <p className="mt-3 text-primary font-medium">
                Wins ${round.stakes * (sortedPlayers.length - 1)}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Final Standings */}
      <main className="flex-1 px-6 pb-32 overflow-auto">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Final Standings
        </h3>
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => getPlayerRow(player, index))}
        </div>
      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
        <div className="space-y-3">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handleShare}
              className="w-full py-6 text-lg font-semibold rounded-xl border-primary text-primary"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share Results
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => navigate('/new-round')}
              className="w-full py-6 text-lg font-semibold rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Round
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
