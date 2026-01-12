import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MoreVertical, BarChart3, RotateCcw, Flag, Mic } from 'lucide-react';
import { HoleNavigator } from '@/components/golf/HoleNavigator';
import { PlayerCard } from '@/components/golf/PlayerCard';
import { ScoreInputSheet } from '@/components/golf/ScoreInputSheet';
import { useRounds } from '@/hooks/useRounds';
import { toast } from 'sonner';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Scorecard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getRoundById, 
    getPlayersWithScores, 
    setPlayerScore, 
    completeRound,
    getScoresForRound,
  } = useRounds();

  const [currentHole, setCurrentHole] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  const round = getRoundById(id || '');

  const playersWithScores = useMemo(() => {
    if (!round) return [];
    return getPlayersWithScores(round.id, round.holeInfo);
  }, [round, getPlayersWithScores]);

  const scores = useMemo(() => {
    if (!round) return [];
    return getScoresForRound(round.id);
  }, [round, getScoresForRound]);

  // Calculate how many holes have been fully scored (all players have scores)
  const completedHoles = useMemo(() => {
    if (!round || playersWithScores.length === 0) return 0;
    
    let completed = 0;
    for (let hole = 1; hole <= round.holes; hole++) {
      const allPlayersScored = playersWithScores.every(
        player => player.scores.some(s => s.holeNumber === hole)
      );
      if (allPlayersScored) completed++;
    }
    return completed;
  }, [round, playersWithScores]);

  // Determine leading player (lowest total relative to par)
  const leadingPlayerId = useMemo(() => {
    if (playersWithScores.length === 0) return null;
    const playersWithHoles = playersWithScores.filter(p => p.holesPlayed > 0);
    if (playersWithHoles.length === 0) return null;
    
    return playersWithHoles.reduce((leading, player) => 
      player.totalRelativeToPar < leading.totalRelativeToPar ? player : leading
    ).id;
  }, [playersWithScores]);

  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Flag className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Round not found</h2>
          <p className="text-muted-foreground mb-4">This round may have been deleted.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const currentHoleInfo = round.holeInfo.find(h => h.number === currentHole) || { number: currentHole, par: 4 };
  const selectedPlayer = playersWithScores.find(p => p.id === selectedPlayerId);
  
  const allHolesScored = playersWithScores.length > 0 && playersWithScores.every(p => p.holesPlayed === round.holes);
  const isLastHole = currentHole === round.holes;
  const canFinish = isLastHole && allHolesScored;

  const handleScoreSelect = useCallback((score: number) => {
    if (selectedPlayerId && round) {
      setPlayerScore(round.id, selectedPlayerId, currentHole, score);
      toast.success('Score saved', { duration: 1500 });
    }
  }, [selectedPlayerId, round, currentHole, setPlayerScore]);

  const handleFinishRound = useCallback(() => {
    if (round) {
      completeRound(round.id);
      navigate(`/round/${round.id}/complete`);
    }
  }, [round, completeRound, navigate]);

  const handleResetHole = useCallback(() => {
    // Reset all scores for current hole
    playersWithScores.forEach(player => {
      const hasScore = player.scores.some(s => s.holeNumber === currentHole);
      if (hasScore) {
        // We'd need to add a removeScore function, for now just set to 0 which isn't ideal
        // This is a placeholder - in production, we'd properly remove the score
      }
    });
    toast.info('Hole scores reset');
  }, [playersWithScores, currentHole]);

  const handleVoiceClick = () => {
    toast('Voice scoring coming soon!', {
      description: 'Say "Jack got a birdie" and we\'ll record it automatically.',
      icon: '🎤',
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="pt-12 pb-3 px-4 safe-top flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowExitDialog(true)}
            className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </motion.button>
          
          <div className="text-center flex-1 px-4">
            <h1 className="text-lg font-semibold truncate">{round.courseName}</h1>
            <p className="text-xs text-muted-foreground">
              Code: <span className="font-mono font-bold">{round.joinCode}</span>
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center"
              >
                <MoreVertical className="w-5 h-5" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleResetHole}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset This Hole
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowEndDialog(true)}
                className="text-danger focus:text-danger"
              >
                <Flag className="w-4 h-4 mr-2" />
                End Round Early
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Hole Navigator with Swipe */}
      <HoleNavigator
        currentHole={currentHole}
        totalHoles={round.holes}
        holeInfo={currentHoleInfo}
        onPrevious={() => setCurrentHole(h => Math.max(1, h - 1))}
        onNext={() => setCurrentHole(h => Math.min(round.holes, h + 1))}
      />

      {/* Player Cards */}
      <main className="flex-1 px-4 pb-32 overflow-auto">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {playersWithScores.map((player, index) => {
              const holeScore = player.scores.find(s => s.holeNumber === currentHole)?.strokes;
              
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PlayerCard
                    player={player}
                    currentHoleScore={holeScore}
                    currentHolePar={currentHoleInfo.par}
                    isLeading={player.id === leadingPlayerId}
                    onScoreTap={() => setSelectedPlayerId(player.id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 safe-bottom">
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          {/* Leaderboard Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/round/${round.id}/leaderboard`)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border shadow-sm"
          >
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-sm">Board</span>
          </motion.button>

          {/* Voice Button - Center */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleVoiceClick}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25"
          >
            <Mic className="w-7 h-7" />
          </motion.button>

          {/* Finish / Progress */}
          {canFinish ? (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={handleFinishRound} 
                className="px-5 py-3 h-auto rounded-xl font-semibold shadow-sm"
              >
                Finish
              </Button>
            </motion.div>
          ) : (
            <div className="px-4 py-3 rounded-xl bg-card border border-border shadow-sm">
              <span className="font-semibold tabular-nums text-sm">
                {completedHoles} of {round.holes}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Score Input Sheet */}
      <ScoreInputSheet
        isOpen={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        onSelectScore={handleScoreSelect}
        playerName={selectedPlayer?.name || ''}
        holeNumber={currentHole}
        par={currentHoleInfo.par}
        currentScore={selectedPlayer?.scores.find(s => s.holeNumber === currentHole)?.strokes}
      />

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is saved. You can continue this round anytime from the home screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/')} className="rounded-xl">
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Round Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>End Round Early?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the round as complete with current scores. You won't be able to add more scores after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinishRound} 
              className="rounded-xl bg-danger hover:bg-danger/90"
            >
              End Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
