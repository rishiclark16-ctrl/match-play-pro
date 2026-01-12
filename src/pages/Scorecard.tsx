import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MoreVertical, BarChart3 } from 'lucide-react';
import { HoleNavigator } from '@/components/golf/HoleNavigator';
import { PlayerCard } from '@/components/golf/PlayerCard';
import { ScoreInputSheet } from '@/components/golf/ScoreInputSheet';
import { VoiceButton } from '@/components/golf/VoiceButton';
import { useRounds } from '@/hooks/useRounds';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function Scorecard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getRoundById, 
    getPlayersWithScores, 
    setPlayerScore, 
    completeRound 
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

  const currentHoleInfo = round.holeInfo.find(h => h.number === currentHole) || { number: currentHole, par: 4 };
  const selectedPlayer = playersWithScores.find(p => p.id === selectedPlayerId);
  
  // Determine leading player
  const leadingPlayerId = playersWithScores.length > 0
    ? playersWithScores.reduce((leading, player) => 
        player.totalRelativeToPar < leading.totalRelativeToPar ? player : leading
      ).id
    : null;

  const allHolesScored = playersWithScores.every(p => p.holesPlayed === round.holes);
  const isLastHole = currentHole === round.holes;

  const handleScoreSelect = (score: number) => {
    if (selectedPlayerId && round) {
      setPlayerScore(round.id, selectedPlayerId, currentHole, score);
    }
  };

  const handleFinishRound = () => {
    if (round) {
      completeRound(round.id);
      navigate(`/round/${round.id}/complete`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-2 px-6 safe-top flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowExitDialog(true)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </motion.button>
        
        <h1 className="text-lg font-semibold truncate max-w-[200px]">{round.courseName}</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEndDialog(true)}>
              End Round Early
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Join Code */}
      <div className="text-center pb-2">
        <p className="text-xs text-muted-foreground">
          Join code: <span className="font-mono font-bold">{round.joinCode}</span>
        </p>
      </div>

      {/* Hole Navigator */}
      <HoleNavigator
        currentHole={currentHole}
        totalHoles={round.holes}
        holeInfo={currentHoleInfo}
        onPrevious={() => setCurrentHole(h => Math.max(1, h - 1))}
        onNext={() => setCurrentHole(h => Math.min(round.holes, h + 1))}
      />

      {/* Player Cards */}
      <main className="flex-1 px-6 pb-32 overflow-auto">
        <div className="space-y-3">
          <AnimatePresence>
            {playersWithScores.map((player) => {
              const holeScore = player.scores.find(s => s.holeNumber === currentHole)?.strokes;
              
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  currentHoleScore={holeScore}
                  currentHolePar={currentHoleInfo.par}
                  isLeading={player.id === leadingPlayerId && player.holesPlayed > 0}
                  onScoreTap={() => setSelectedPlayerId(player.id)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-6 pt-4 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
        <div className="flex items-center justify-between">
          {/* Leaderboard */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/round/${round.id}/leaderboard`)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Leaderboard</span>
          </motion.button>

          {/* Voice Button */}
          <VoiceButton />

          {/* Hole Counter / Finish */}
          {isLastHole && allHolesScored ? (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button onClick={handleFinishRound} className="px-6 py-3 rounded-xl">
                Finish
              </Button>
            </motion.div>
          ) : (
            <div className="px-4 py-3 rounded-xl bg-card border border-border">
              <span className="font-medium tabular-nums">{currentHole} of {round.holes}</span>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is saved. You can continue this round anytime from the home screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/')}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Round Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Round Early?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the round as complete with current scores. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishRound}>End Round</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
