import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MoreVertical, BarChart3, RotateCcw, Flag } from 'lucide-react';
import { HoleNavigator } from '@/components/golf/HoleNavigator';
import { PlayerCard } from '@/components/golf/PlayerCard';
import { ScoreInputSheet } from '@/components/golf/ScoreInputSheet';
import { VoiceButton } from '@/components/golf/VoiceButton';
import { VoiceConfirmationModal } from '@/components/golf/VoiceConfirmationModal';
import { GamesSection } from '@/components/golf/GamesSection';
import { useRounds } from '@/hooks/useRounds';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceInput, ParseResult, ParsedScore } from '@/lib/voiceParser';
import { Press } from '@/types/golf';
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
    addPress,
  } = useRounds();

  const [currentHole, setCurrentHole] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  
  // Voice recognition state
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  
  const {
    isListening,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
    transcript,
    error: voiceError,
    reset: resetVoice,
  } = useVoiceRecognition();

  const round = getRoundById(id || '');

  const playersWithScores = useMemo(() => {
    if (!round) return [];
    return getPlayersWithScores(round.id, round.holeInfo, round.slope, round.holes);
  }, [round, getPlayersWithScores]);

  // Calculate how many holes have been fully scored
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

  // Determine leading player
  const leadingPlayerId = useMemo(() => {
    if (playersWithScores.length === 0) return null;
    const playersWithHoles = playersWithScores.filter(p => p.holesPlayed > 0);
    if (playersWithHoles.length === 0) return null;
    
    return playersWithHoles.reduce((leading, player) => 
      player.totalRelativeToPar < leading.totalRelativeToPar ? player : leading
    ).id;
  }, [playersWithScores]);

  // Process voice transcript when it arrives
  useEffect(() => {
    if (transcript && round) {
      const currentHoleInfo = round.holeInfo.find(h => h.number === currentHole);
      const par = currentHoleInfo?.par || 4;
      
      const players = playersWithScores.map(p => ({ id: p.id, name: p.name }));
      const result = parseVoiceInput(transcript, players, par);
      
      setParseResult(result);
      setShowVoiceModal(true);
      resetVoice();
    }
  }, [transcript, round, currentHole, playersWithScores, resetVoice]);

  // Show voice errors
  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
      resetVoice();
    }
  }, [voiceError, resetVoice]);

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

  const handleVoicePress = () => {
    if (isListening) {
      stopListening();
    } else if (!isSupported) {
      toast.error('Voice not supported. Use Chrome or Safari.', {
        description: 'Or tap players to enter scores manually.',
      });
    } else {
      startListening();
    }
  };

  const handleVoiceConfirm = (scores: ParsedScore[]) => {
    scores.forEach(({ playerId, score }) => {
      setPlayerScore(round.id, playerId, currentHole, score);
    });
    
    setShowVoiceModal(false);
    setParseResult(null);
    
    toast.success(`${scores.length} score${scores.length > 1 ? 's' : ''} saved!`, {
      duration: 2000,
    });

    // Check if all players now have scores for current hole
    const allScored = playersWithScores.every(player => {
      const hasExisting = player.scores.some(s => s.holeNumber === currentHole);
      const wasJustScored = scores.some(s => s.playerId === player.id);
      return hasExisting || wasJustScored;
    });

    // Auto-advance to next hole if all scored and not on last hole
    if (allScored && currentHole < round.holes) {
      setTimeout(() => {
        setCurrentHole(h => h + 1);
        toast.info(`Moving to Hole ${currentHole + 1}`, { duration: 1500 });
      }, 500);
    }
  };

  const handleVoiceRetry = () => {
    setShowVoiceModal(false);
    setParseResult(null);
    setTimeout(() => {
      startListening();
    }, 300);
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
              <DropdownMenuItem onClick={() => toast.info('Reset feature coming soon')}>
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
      <main className="flex-1 px-4 pb-36 overflow-auto">
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
                    currentHoleNumber={currentHole}
                    isLeading={player.id === leadingPlayerId}
                    onScoreTap={() => setSelectedPlayerId(player.id)}
                    showNetScores={true}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Games Section (Skins, Nassau) */}
          {round.games && round.games.length > 0 && (
            <GamesSection
              round={round}
              players={playersWithScores}
              scores={getScoresForRound(round.id)}
              currentHole={currentHole}
              onAddPress={(press: Press) => addPress(round.id, press)}
            />
          )}
        </div>
        
        {/* Voice hint */}
        {isSupported && playersWithScores.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            💡 Tap the mic and say "{playersWithScores[0]?.name.split(' ')[0]} 5, {playersWithScores[1]?.name.split(' ')[0] || 'Tim'} 4"
          </motion.p>
        )}
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
          <VoiceButton
            isListening={isListening}
            isProcessing={isProcessing}
            isSupported={isSupported}
            onPress={handleVoicePress}
          />

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

      {/* Voice Confirmation Modal */}
      <VoiceConfirmationModal
        isOpen={showVoiceModal}
        onClose={() => {
          setShowVoiceModal(false);
          setParseResult(null);
        }}
        onConfirm={handleVoiceConfirm}
        onRetry={handleVoiceRetry}
        parseResult={parseResult}
        players={playersWithScores}
        holeNumber={currentHole}
        par={currentHoleInfo.par}
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
