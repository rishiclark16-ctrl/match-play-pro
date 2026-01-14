import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MoreVertical, BarChart3, RotateCcw, Flag, Share2, Trophy, Swords } from 'lucide-react';
import { HoleNavigator } from '@/components/golf/HoleNavigator';
import { PlayerCard } from '@/components/golf/PlayerCard';
import { ScoreInputSheet } from '@/components/golf/ScoreInputSheet';
import { VoiceButton } from '@/components/golf/VoiceButton';
import { VoiceConfirmationModal } from '@/components/golf/VoiceConfirmationModal';
import { GamesSection } from '@/components/golf/GamesSection';
import { HoleSummary } from '@/components/golf/HoleSummary';
import { LiveLeaderboard } from '@/components/golf/LiveLeaderboard';
import { GameSettingsSheet } from '@/components/golf/GameSettingsSheet';
import { ShareJoinCodeModal } from '@/components/golf/ShareJoinCodeModal';
import { ConnectionStatus } from '@/components/golf/ConnectionStatus';
import { SpectatorBanner } from '@/components/golf/SpectatorBanner';
import { MoneyTracker } from '@/components/golf/MoneyTracker';
import { PropBetSheet } from '@/components/golf/PropBetSheet';
import { ManageScorekeepersSheet } from '@/components/golf/ManageScorekeepersSheet';
import { useRounds } from '@/hooks/useRounds';
import { useSupabaseRound } from '@/hooks/useSupabaseRound';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { usePropBets } from '@/hooks/usePropBets';
import { useScorekeeper } from '@/hooks/useScorekeeper';
import { parseVoiceInput, ParseResult, ParsedScore } from '@/lib/voiceParser';
import { parseVoiceCommands, hasScoreContent } from '@/lib/voiceCommands';
import { feedbackListeningStart, feedbackListeningStop, feedbackVoiceSuccess, feedbackVoiceError, feedbackAllScored, feedbackNextHole } from '@/lib/voiceFeedback';
import { Press, PlayerWithScores, GameConfig } from '@/types/golf';
import { calculatePlayingHandicap, getStrokesPerHole, calculateTotalNetStrokes } from '@/lib/handicapUtils';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { setStatusBarDefault } from '@/lib/statusBar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export default function Scorecard() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSpectator = searchParams.get('spectator') === 'true';

  // Keep screen awake during active round
  useKeepAwake(true);

  // Set status bar style for native apps
  useEffect(() => {
    setStatusBarDefault();
  }, []);

  // Use Supabase for live sync
  const {
    round: supabaseRound,
    players: supabasePlayers,
    scores: supabaseScores,
    isOnline,
    saveScore: saveScoreToSupabase,
    addPress: addPressToSupabase,
    completeRound: completeRoundSupabase,
    updateGames: updateGamesSupabase,
    loading: supabaseLoading
  } = useSupabaseRound(id || null);

  // Prop bets hook for side bets
  const {
    propBets,
    addPropBet,
    updatePropBet,
    getPropBetsForHole
  } = usePropBets(id);

  // Scorekeeper permissions hook
  const {
    isScorekeeper,
    isCreator,
    scorekeeperIds,
    addScorekeeper,
    removeScorekeeper
  } = useScorekeeper(id, supabasePlayers);

  // Can this user edit scores? Must be scorekeeper and not spectator
  const canEditScores = isScorekeeper && !isSpectator;

  // Fallback to local storage
  const {
    getRoundById,
    getPlayersWithScores,
    setPlayerScore,
    completeRound: completeRoundLocal,
    getScoresForRound,
    addPress: addPressLocal
  } = useRounds();
  const [currentHole, setCurrentHole] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Auto-advance timer state
  const [allScoredTimestamp, setAllScoredTimestamp] = useState<number | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Voice recognition state
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [voiceSuccessPlayerIds, setVoiceSuccessPlayerIds] = useState<Set<string>>(new Set());
  const previousIsListening = useRef(false);
  const {
    isListening,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
    transcript,
    error: voiceError,
    reset: resetVoice
  } = useVoiceRecognition();

  // Track listening state changes for audio feedback
  useEffect(() => {
    if (isListening && !previousIsListening.current) {
      feedbackListeningStart();
    } else if (!isListening && previousIsListening.current && isProcessing) {
      feedbackListeningStop();
    }
    previousIsListening.current = isListening;
  }, [isListening, isProcessing]);

  // Use Supabase round if available, otherwise fall back to local
  const localRound = getRoundById(id || '');
  const round = supabaseRound || localRound;

  // Get scores - prefer Supabase data
  const roundScores = supabaseScores.length > 0 ? supabaseScores : getScoresForRound(round?.id || '');

  // Build players with scores
  const playersWithScores: PlayerWithScores[] = useMemo(() => {
    if (!round) return [];
    const useSupabase = supabasePlayers.length > 0 || supabaseLoading || supabaseRound !== null;
    if (!useSupabase) {
      return getPlayersWithScores(round.id, round.holeInfo, round.slope, round.holes);
    }
    if (supabaseLoading && supabasePlayers.length === 0) {
      return [];
    }
    return supabasePlayers.map(player => {
      const playerScores = roundScores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);
      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);
      let playingHandicap: number | undefined;
      let strokesPerHole: Map<number, number> | undefined;
      let totalNetStrokes: number | undefined;
      let netRelativeToPar: number | undefined;
      if (player.handicap !== undefined && player.handicap !== null) {
        playingHandicap = calculatePlayingHandicap(player.handicap, round.slope || 113, round.holes);
        strokesPerHole = getStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      }
      return {
        ...player,
        scores: playerScores,
        totalStrokes,
        totalRelativeToPar,
        holesPlayed: playerScores.length,
        playingHandicap,
        strokesPerHole,
        totalNetStrokes,
        netRelativeToPar
      };
    });
  }, [round, supabasePlayers, supabaseLoading, supabaseRound, roundScores, getPlayersWithScores]);

  // Calculate how many holes have been fully scored
  const completedHoles = useMemo(() => {
    if (!round || playersWithScores.length === 0) return 0;
    let completed = 0;
    for (let hole = 1; hole <= round.holes; hole++) {
      const allPlayersScored = playersWithScores.every(player => player.scores.some(s => s.holeNumber === hole));
      if (allPlayersScored) completed++;
    }
    return completed;
  }, [round, playersWithScores]);

  // Determine leading player
  const leadingPlayerId = useMemo(() => {
    if (playersWithScores.length === 0) return null;
    const playersWithHoles = playersWithScores.filter(p => p.holesPlayed > 0);
    if (playersWithHoles.length === 0) return null;
    return playersWithHoles.reduce((leading, player) => player.totalRelativeToPar < leading.totalRelativeToPar ? player : leading).id;
  }, [playersWithScores]);

  // Process voice transcript when it arrives
  useEffect(() => {
    if (transcript && round) {
      const currentHoleInfo = round.holeInfo.find(h => h.number === currentHole);
      const par = currentHoleInfo?.par || 4;
      const players = playersWithScores.map(p => ({
        id: p.id,
        name: p.name
      }));
      const commands = parseVoiceCommands(transcript, players, round.games || []);
      const navCommand = commands.find(c => c.type === 'next_hole' || c.type === 'previous_hole');
      if (navCommand) {
        if (navCommand.type === 'next_hole' && navCommand.holeNumber) {
          setCurrentHole(Math.min(round.holes, Math.max(1, navCommand.holeNumber)));
          feedbackNextHole();
          toast.info(`Hole ${navCommand.holeNumber}`, {
            duration: 1500
          });
          resetVoice();
          return;
        } else if (navCommand.type === 'next_hole') {
          if (currentHole < round.holes) {
            setCurrentHole(h => h + 1);
            feedbackNextHole();
            toast.info(`Hole ${currentHole + 1}`, {
              duration: 1500
            });
          }
          resetVoice();
          return;
        } else if (navCommand.type === 'previous_hole') {
          if (currentHole > 1) {
            setCurrentHole(h => h - 1);
            feedbackNextHole();
            toast.info(`Hole ${currentHole - 1}`, {
              duration: 1500
            });
          }
          resetVoice();
          return;
        }
      }
      if (hasScoreContent(transcript)) {
        const result = parseVoiceInput(transcript, players, par);
        if (result.confidence === 'high' && result.scores.length > 0) {
          result.scores.forEach(({
            playerId,
            score
          }) => {
            saveScoreToSupabase(playerId, currentHole, score);
            setPlayerScore(round.id, playerId, currentHole, score);
          });
          setVoiceSuccessPlayerIds(new Set(result.scores.map(s => s.playerId)));
          setTimeout(() => setVoiceSuccessPlayerIds(new Set()), 1500);
          if (result.scores.length === players.length) {
            feedbackAllScored();
            toast.success(`All ${result.scores.length} scores saved! 🎉`, {
              duration: 5000
            });
          } else {
            feedbackVoiceSuccess();
            const scoresSummary = result.scores.map(s => `${s.playerName.split(' ')[0]} ${s.score}`).join(', ');
            toast.success(scoresSummary, {
              duration: 5000
            });
          }

          // Voice scoring will also use the 20s timer via allCurrentHoleScored effect

          resetVoice();
        } else if (result.scores.length > 0) {
          setParseResult(result);
          setShowVoiceModal(true);
          resetVoice();
        } else {
          feedbackVoiceError();
          setParseResult(result);
          setShowVoiceModal(true);
          resetVoice();
        }
      } else {
        feedbackVoiceError();
        setParseResult({
          success: false,
          scores: [],
          unrecognized: [transcript],
          rawTranscript: transcript,
          confidence: 'low',
          confidenceReason: 'No score content detected'
        });
        setShowVoiceModal(true);
        resetVoice();
      }
    }
  }, [transcript, round, currentHole, playersWithScores, resetVoice, saveScoreToSupabase, setPlayerScore]);

  // Show voice errors
  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
      resetVoice();
    }
  }, [voiceError, resetVoice]);
  const currentHoleInfo = round?.holeInfo.find(h => h.number === currentHole) || {
    number: currentHole,
    par: 4
  };
  const selectedPlayer = playersWithScores.find(p => p.id === selectedPlayerId);
  const allHolesScored = round && playersWithScores.length > 0 && playersWithScores.every(p => p.holesPlayed === round.holes);
  const isLastHole = round ? currentHole === round.holes : false;
  const canFinish = allHolesScored;

  // Check if hole 18 specifically is fully scored (for showing finish/playoff options)
  const hole18FullyScored = useMemo(() => {
    if (!round || playersWithScores.length === 0) return false;
    return playersWithScores.every(player => player.scores.some(s => s.holeNumber === round.holes));
  }, [round, playersWithScores]);

  // State for playoff mode
  const [playoffHole, setPlayoffHole] = useState(0);
  const [showFinishOptions, setShowFinishOptions] = useState(false);
  const [playoffScores, setPlayoffScores] = useState<Map<string, Map<number, number>>>(new Map());
  const [playoffWinner, setPlayoffWinner] = useState<{
    id: string;
    name: string;
    holeNumber: number;
  } | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Auto-show finish options when hole 18 is scored
  useEffect(() => {
    if (hole18FullyScored && !playoffHole && !playoffWinner) {
      setShowFinishOptions(true);
    }
  }, [hole18FullyScored, playoffHole, playoffWinner]);

  // Get playoff score for a player on current playoff hole
  const getPlayoffScore = useCallback((playerId: string, holeNum: number) => {
    return playoffScores.get(playerId)?.get(holeNum);
  }, [playoffScores]);

  // Check if all players have scored current playoff hole
  const allPlayoffScored = useMemo(() => {
    if (playoffHole === 0) return false;
    return playersWithScores.every(player => getPlayoffScore(player.id, playoffHole) !== undefined);
  }, [playoffHole, playersWithScores, getPlayoffScore]);

  // Check for playoff winner after all scores are in
  useEffect(() => {
    if (!allPlayoffScored || playoffHole === 0) return;

    // Get all scores for current playoff hole
    const holeScores = playersWithScores.map(player => ({
      id: player.id,
      name: player.name,
      score: getPlayoffScore(player.id, playoffHole) || 0
    }));

    // Find minimum score
    const minScore = Math.min(...holeScores.map(s => s.score));
    const playersWithMinScore = holeScores.filter(s => s.score === minScore);

    // If only one player has the lowest score, they win
    if (playersWithMinScore.length === 1) {
      setPlayoffWinner({
        id: playersWithMinScore[0].id,
        name: playersWithMinScore[0].name,
        holeNumber: playoffHole
      });
      setShowWinnerModal(true);
      hapticSuccess();
    }
  }, [allPlayoffScored, playoffHole, playersWithScores, getPlayoffScore]);
  const handleStartPlayoff = useCallback(() => {
    setPlayoffHole(1);
    setPlayoffScores(new Map());
    setPlayoffWinner(null);
    setShowFinishOptions(false);
    toast.success('Playoff Hole #1 - Lowest score wins!', {
      duration: 3000
    });
  }, []);
  const handlePlayoffScore = useCallback((playerId: string, score: number) => {
    hapticSuccess();
    setPlayoffScores(prev => {
      const newScores = new Map(prev);
      const playerScores = new Map(newScores.get(playerId) || new Map());
      playerScores.set(playoffHole, score);
      newScores.set(playerId, playerScores);
      return newScores;
    });
    toast.success('Playoff score saved', {
      duration: 1500
    });
  }, [playoffHole]);
  const handleNextPlayoffHole = useCallback(() => {
    setPlayoffHole(h => h + 1);
    toast.info(`Playoff Hole #${playoffHole + 1} - Still tied!`, {
      duration: 2000
    });
  }, [playoffHole]);
  const handleFinishWithWinner = useCallback(() => {
    if (round) {
      setShowWinnerModal(false);
      completeRoundSupabase();
      completeRoundLocal(round.id);
      navigate(`/round/${round.id}/complete`);
    }
  }, [round, completeRoundSupabase, completeRoundLocal, navigate]);

  // Check if all players have scored current hole
  const allCurrentHoleScored = useMemo(() => {
    if (!round || playersWithScores.length === 0) return false;
    return playersWithScores.every(player => player.scores.some(s => s.holeNumber === currentHole));
  }, [round, playersWithScores, currentHole]);

  // Manual advance to next hole
  const handleAdvanceToNextHole = useCallback(() => {
    if (!round || currentHole >= round.holes) return;

    // Clear any pending timer
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setAutoAdvanceCountdown(null);
    setAllScoredTimestamp(null);
    setCurrentHole(h => h + 1);
    hapticSuccess();
    toast.info(`Hole ${currentHole + 1}`, {
      duration: 1500
    });
  }, [round, currentHole]);

  // Auto-advance countdown effect
  useEffect(() => {
    // Clear timer when hole changes or conditions change
    if (!allCurrentHoleScored || !round || currentHole >= round.holes) {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      setAutoAdvanceCountdown(null);
      setAllScoredTimestamp(null);
      return;
    }

    // Start countdown when all players scored
    if (allCurrentHoleScored && allScoredTimestamp === null) {
      setAllScoredTimestamp(Date.now());
      setAutoAdvanceCountdown(20);
      autoAdvanceTimerRef.current = setInterval(() => {
        setAutoAdvanceCountdown(prev => {
          if (prev === null || prev <= 1) {
            // Auto-advance
            if (autoAdvanceTimerRef.current) {
              clearInterval(autoAdvanceTimerRef.current);
              autoAdvanceTimerRef.current = null;
            }
            setCurrentHole(h => h + 1);
            setAllScoredTimestamp(null);
            hapticSuccess();
            toast.info(`Hole ${currentHole + 1}`, {
              duration: 1500
            });
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [allCurrentHoleScored, round, currentHole, allScoredTimestamp]);

  // Handle quick score from +/- buttons (no auto-advance - use button instead)
  const handleQuickScore = useCallback((playerId: string, score: number) => {
    if (!round) return;
    hapticSuccess();
    saveScoreToSupabase(playerId, currentHole, score);
    setPlayerScore(round.id, playerId, currentHole, score);
  }, [round, currentHole, saveScoreToSupabase, setPlayerScore]);
  const handleScoreSelect = useCallback((score: number) => {
    if (selectedPlayerId && round) {
      hapticSuccess();
      saveScoreToSupabase(selectedPlayerId, currentHole, score);
      setPlayerScore(round.id, selectedPlayerId, currentHole, score);
      toast.success('Score saved', {
        duration: 1500
      });
    }
  }, [selectedPlayerId, round, currentHole, saveScoreToSupabase, setPlayerScore]);
  const handleFinishRound = useCallback(() => {
    if (round) {
      completeRoundSupabase();
      completeRoundLocal(round.id);
      navigate(`/round/${round.id}/complete`);
    }
  }, [round, completeRoundSupabase, completeRoundLocal, navigate]);
  const handleAddPress = useCallback((press: Press) => {
    if (round) {
      addPressToSupabase(press);
      addPressLocal(round.id, press);
    }
  }, [round, addPressToSupabase, addPressLocal]);
  const handleUpdateGames = useCallback(async (games: GameConfig[]) => {
    if (round) {
      await updateGamesSupabase(games);
    }
  }, [round, updateGamesSupabase]);
  const handleVoicePress = useCallback(() => {
    if (isListening) {
      stopListening();
    } else if (!isSupported) {
      toast.error('Voice not supported. Use Chrome or Safari.', {
        description: 'Or tap players to enter scores manually.'
      });
    } else {
      startListening();
    }
  }, [isListening, isSupported, stopListening, startListening]);
  const handleVoiceConfirm = useCallback((scores: ParsedScore[]) => {
    if (!round) return;
    scores.forEach(({
      playerId,
      score
    }) => {
      saveScoreToSupabase(playerId, currentHole, score);
      setPlayerScore(round.id, playerId, currentHole, score);
    });
    setShowVoiceModal(false);
    setParseResult(null);
    toast.success(`${scores.length} score${scores.length > 1 ? 's' : ''} saved!`, {
      duration: 2000
    });
    const allScored = playersWithScores.every(player => {
      const hasExisting = player.scores.some(s => s.holeNumber === currentHole);
      const wasJustScored = scores.some(s => s.playerId === player.id);
      return hasExisting || wasJustScored;
    });
    if (allScored && currentHole < round.holes) {
      setTimeout(() => {
        setCurrentHole(h => h + 1);
        toast.info(`Moving to Hole ${currentHole + 1}`, {
          duration: 1500
        });
      }, 500);
    }
  }, [round, currentHole, saveScoreToSupabase, setPlayerScore, playersWithScores]);
  const handleVoiceRetry = useCallback(() => {
    setShowVoiceModal(false);
    setParseResult(null);
    setTimeout(() => {
      startListening();
    }, 300);
  }, [startListening]);

  // Early return AFTER all hooks are defined
  // Show loading state while fetching round data
  if (supabaseLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Flag className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Loading round...</p>
        </div>
      </div>;
  }
  if (!round) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Flag className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold mb-2">Round not found</h2>
          <p className="text-muted-foreground text-sm mb-4">This round may have been deleted.</p>
          <Button onClick={() => navigate('/')} className="rounded-lg">Go Home</Button>
        </div>
      </div>;
  }
  return <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Spectator/View-Only Banner */}
      {(isSpectator || !isScorekeeper) && <SpectatorBanner isSpectator={isSpectator} isScorekeeper={isScorekeeper} />}
      
      {/* Fixed Header */}
      <header 
        className="flex-shrink-0 z-30 bg-background border-b border-border"
        style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
      >
        <div className="pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 px-4 flex items-center justify-between gap-3">
          <motion.button whileTap={{
          scale: 0.9
        }} onClick={() => {
          hapticLight();
          setShowExitDialog(true);
        }} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-label="Exit round">
            <X className="w-4 h-4" />
          </motion.button>
          
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">{round.courseName}</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
              {round.joinCode}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Scorekeeper management - only for creator */}
            {isCreator && !isSpectator && (
              <ManageScorekeepersSheet
                players={playersWithScores.map(p => ({ 
                  id: p.id, 
                  name: p.name, 
                  profile_id: (p as any).profile_id,
                  order_index: (p as any).order_index 
                }))}
                scorekeeperIds={scorekeeperIds}
                isCreator={isCreator}
                onAddScorekeeper={addScorekeeper}
                onRemoveScorekeeper={removeScorekeeper}
              />
            )}
            
            {/* Game settings - only for scorekeepers */}
            {canEditScores && <GameSettingsSheet round={round} onUpdateGames={handleUpdateGames} playerCount={playersWithScores.length} />}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button whileTap={{
                scale: 0.9
              }} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <MoreVertical className="w-4 h-4" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Round
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Reset feature coming soon')}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset This Hole
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowEndDialog(true)} className="text-destructive focus:text-destructive">
                  <Flag className="w-4 h-4 mr-2" />
                  End Round Early
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Hole Navigator - hide during playoff */}
      {playoffHole === 0 && <HoleNavigator currentHole={currentHole} totalHoles={round.holes} holeInfo={currentHoleInfo} onPrevious={() => setCurrentHole(h => Math.max(1, h - 1))} onNext={() => setCurrentHole(h => Math.min(round.holes, h + 1))} />}

      {/* Playoff Mode Header */}
      {playoffHole > 0 && <motion.div initial={{
      opacity: 0,
      y: -20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="bg-primary/10 border-b-2 border-primary px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Swords className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="heading-md text-primary">Playoff Hole #{playoffHole}</h2>
                <p className="text-xs text-muted-foreground">Lowest score wins • Par {currentHoleInfo.par}</p>
              </div>
            </div>
            {allPlayoffScored && !playoffWinner && <Button onClick={handleNextPlayoffHole} size="sm" variant="outline" className="border-2 border-primary text-primary">
                Still Tied → Next Hole
              </Button>}
          </div>
        </motion.div>}

      {/* Live Leaderboard - hide during playoff */}
      {playoffHole === 0 && playersWithScores.some(p => p.holesPlayed > 0) && <LiveLeaderboard players={playersWithScores} useNetScoring={round.games?.some((g: any) => g.useNet) || false} isMatchPlay={round.matchPlay} holeInfo={round.holeInfo} scores={roundScores} />}

      {/* Live Money Tracker - show when games configured or prop bets have winners */}
      {playoffHole === 0 && (round.games?.length > 0 || propBets.some(pb => pb.winnerId)) && (
        <MoneyTracker
          players={playersWithScores}
          scores={roundScores}
          games={round.games || []}
          holeInfo={round.holeInfo}
          presses={[]}
          currentHole={currentHole}
          propBets={propBets}
        />
      )}

      {/* Scrollable Player Cards */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain relative z-10 px-3 pb-36" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-2">
          {/* Hole Summary - hide during playoff */}
          {playoffHole === 0 && (round.games?.length > 0 || playersWithScores.some(p => p.handicap !== undefined)) && <HoleSummary round={round} players={playersWithScores} scores={roundScores} currentHole={currentHole} currentHoleInfo={currentHoleInfo} />}
          
          {/* Regular scoring mode */}
          {playoffHole === 0 && <>
              <AnimatePresence mode="popLayout">
                {playersWithScores.map((player, index) => {
              const holeScore = player.scores.find(s => s.holeNumber === currentHole)?.strokes;
              return <motion.div key={player.id} initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: index * 0.03
              }}>
                      <PlayerCard player={player} currentHoleScore={holeScore} currentHolePar={currentHoleInfo.par} currentHoleNumber={currentHole} isLeading={player.id === leadingPlayerId} onScoreTap={canEditScores ? () => setSelectedPlayerId(player.id) : undefined} onQuickScore={canEditScores ? score => handleQuickScore(player.id, score) : undefined} showNetScores={true} voiceHighlight={isListening} voiceSuccess={voiceSuccessPlayerIds.has(player.id)} />
                    </motion.div>;
            })}
              </AnimatePresence>
              
              {/* Next Hole Button - appears when all scored */}
              <AnimatePresence>
                {allCurrentHoleScored && currentHole < (round?.holes || 18) && !isSpectator && <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: -10
            }} className="mt-4">
                    <Button onClick={handleAdvanceToNextHole} className="w-full py-6 text-lg font-bold rounded-xl relative overflow-hidden" size="lg">
                      <div className="flex items-center gap-3">
                        <Flag className="w-5 h-5" />
                        <span>Next Hole</span>
                        {autoAdvanceCountdown !== null}
                      </div>
                      
                      {/* Countdown progress bar */}
                      {autoAdvanceCountdown !== null && <motion.div className="absolute bottom-0 left-0 h-1 bg-primary-foreground/30" initial={{
                  width: '100%'
                }} animate={{
                  width: `${autoAdvanceCountdown / 20 * 100}%`
                }} transition={{
                  duration: 1,
                  ease: 'linear'
                }} />}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Tap to continue or wait for auto-advance
                    </p>
                  </motion.div>}
              </AnimatePresence>
            </>}
          
          {/* Playoff scoring mode */}
          {playoffHole > 0 && <div className="space-y-3 pt-2">
              {playersWithScores.map((player, index) => {
            const playoffScore = getPlayoffScore(player.id, playoffHole);
            const hasScored = playoffScore !== undefined;
            return <motion.div key={player.id} initial={{
              opacity: 0,
              x: -20
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              delay: index * 0.05
            }} className={cn("bg-card border-2 rounded-xl p-4 transition-all", hasScored ? "border-primary/30" : "border-border", playoffWinner?.id === player.id && "border-primary bg-primary/5")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold", hasScored ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          {player.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold">{player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.handicap !== null && player.handicap !== undefined && `HCP ${player.handicap}`}
                          </p>
                        </div>
                      </div>
                      
                      {hasScored ? <div className="flex items-center gap-2">
                          <span className={cn("text-3xl font-black tabular-nums", playoffScore < currentHoleInfo.par && "text-red-600", playoffScore === currentHoleInfo.par && "text-foreground", playoffScore > currentHoleInfo.par && "text-blue-600")}>
                            {playoffScore}
                          </span>
                          <button onClick={() => {
                    // Clear the playoff score to allow re-entry
                    setPlayoffScores(prev => {
                      const updated = {
                        ...prev
                      };
                      delete updated[player.id];
                      return updated;
                    });
                  }} className="text-xs text-muted-foreground hover:text-foreground">
                            Edit
                          </button>
                        </div> : <div className="flex items-center gap-1">
                          {[currentHoleInfo.par - 1, currentHoleInfo.par, currentHoleInfo.par + 1, currentHoleInfo.par + 2].map(score => <motion.button key={score} whileTap={{
                    scale: 0.9
                  }} onClick={() => handlePlayoffScore(player.id, score)} className={cn("w-11 h-11 rounded-lg font-bold text-lg border-2 transition-colors", score < currentHoleInfo.par && "bg-red-100 border-red-300 text-red-700", score === currentHoleInfo.par && "bg-muted border-border text-foreground", score > currentHoleInfo.par && "bg-blue-100 border-blue-300 text-blue-700")}>
                              {score}
                            </motion.button>)}
                        </div>}
                    </div>
                  </motion.div>;
          })}
              
              {/* Playoff summary */}
              {playoffHole > 1 && <div className="bg-muted/50 rounded-xl p-4 mt-4">
                  <h4 className="label-sm mb-2">Playoff History</h4>
                  <div className="space-y-1">
                    {Array.from({
                length: playoffHole
              }).map((_, holeIdx) => {
                const holeNum = holeIdx + 1;
                const scores = playersWithScores.map(p => ({
                  name: p.name.split(' ')[0],
                  score: getPlayoffScore(p.id, holeNum)
                })).filter(s => s.score !== undefined);
                if (scores.length === 0) return null;
                return <div key={holeNum} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Hole {holeNum}:</span>
                          {scores.map((s, i) => <span key={i} className="font-mono">
                              {s.name} {s.score}
                              {i < scores.length - 1 && ', '}
                            </span>)}
                        </div>;
              })}
                  </div>
                </div>}
            </div>}
          
          {/* Games Section - hide during playoff */}
          {playoffHole === 0 && round.games && round.games.length > 0 && <GamesSection round={round} players={playersWithScores} scores={roundScores} currentHole={currentHole} onAddPress={handleAddPress} />}
        </div>
        
        {/* Voice hint - hide during playoff */}
        {playoffHole === 0 && !isSpectator && isSupported && playersWithScores.length > 0 && <motion.p initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.5
      }} className="text-center text-[10px] text-muted-foreground mt-4 font-medium">
            💡 Tap mic: "{playersWithScores[0]?.name.split(' ')[0]} 5, {playersWithScores[1]?.name.split(' ')[0] || 'Tim'} 4"
          </motion.p>}
      </main>

      {/* Finish/Playoff Options Overlay */}
      <AnimatePresence>
        {showFinishOptions && !isSpectator && <motion.div initial={{
        opacity: 0,
        y: 100
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: 100
      }} className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-safe">
            <div className="px-4 space-y-3">
              <div className="text-center mb-4">
                <h3 className="heading-md">Round Complete! 🎉</h3>
                <p className="text-sm text-muted-foreground">All 18 holes scored</p>
              </div>
              
              <motion.div whileTap={{
            scale: 0.98
          }}>
                <Button onClick={() => {
              setShowFinishOptions(false);
              handleFinishRound();
            }} className="w-full py-6 text-lg font-bold rounded-xl" size="lg">
                  <Trophy className="w-5 h-5 mr-2" />
                  Finish Round
                </Button>
              </motion.div>
              
              <motion.div whileTap={{
            scale: 0.98
          }}>
                <Button variant="outline" onClick={handleStartPlayoff} className="w-full py-6 text-lg font-bold rounded-xl border-2" size="lg">
                  <Swords className="w-5 h-5 mr-2" />
                  Playoff Hole #1
                </Button>
              </motion.div>
              
              <button onClick={() => setShowFinishOptions(false)} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Continue Scoring
              </button>
            </div>
          </motion.div>}
      </AnimatePresence>

      {/* Bottom Bar */}
      <div className={cn("fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-bottom transition-opacity", showFinishOptions && "opacity-0 pointer-events-none")}>
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          {/* Leaderboard Button */}
          <motion.button whileTap={{
          scale: 0.95
        }} onClick={() => navigate(`/round/${round.id}/leaderboard`)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-card border border-border">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-xs">Board</span>
          </motion.button>

          {/* Voice Button - centered, only for scorekeepers */}
          {canEditScores ? <VoiceButton isListening={isListening} isProcessing={isProcessing} isSupported={isSupported} onPress={handleVoicePress} /> : <div className="w-14" />}

          {/* Finish / Progress / Playoff */}
          {playoffHole > 0 ? <div className="flex items-center gap-2">
              <div className="px-3 py-2.5 rounded-lg bg-primary/10 border-2 border-primary">
                <span className="font-bold text-xs text-primary">Playoff #{playoffHole}</span>
              </div>
              <Button onClick={handleFinishRound} size="sm" className="px-3 py-2 h-auto rounded-lg font-bold text-xs">
                <Trophy className="w-3 h-3 mr-1" />
                End
              </Button>
            </div> : canFinish && !isSpectator ? <Button onClick={() => setShowFinishOptions(true)} className="px-4 py-2.5 h-auto rounded-lg font-bold text-xs">
              <Trophy className="w-3 h-3 mr-1" />
              Finish
            </Button> : hole18FullyScored && !isSpectator ? <Button onClick={() => setShowFinishOptions(true)} variant="outline" className="px-4 py-2.5 h-auto rounded-lg font-bold text-xs border-2 border-primary text-primary">
              <Flag className="w-3 h-3 mr-1" />
              Done?
            </Button> : !isSpectator && playoffHole === 0 ? (
              <PropBetSheet
                roundId={id || ''}
                players={playersWithScores}
                currentHole={currentHole}
                holeInfo={round.holeInfo}
                propBets={propBets}
                onPropBetAdded={addPropBet}
                onPropBetUpdated={updatePropBet}
              />
            ) : (
              <div className="px-3 py-2.5 rounded-lg bg-card border border-border">
                <span className="font-bold tabular-nums text-xs">
                  {completedHoles}/{round.holes}
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Score Input Sheet */}
      <ScoreInputSheet isOpen={!!selectedPlayerId} onClose={() => setSelectedPlayerId(null)} onSelectScore={handleScoreSelect} playerName={selectedPlayer?.name || ''} holeNumber={currentHole} par={currentHoleInfo.par} currentScore={selectedPlayer?.scores.find(s => s.holeNumber === currentHole)?.strokes} />

      {/* Voice Confirmation Modal */}
      <VoiceConfirmationModal isOpen={showVoiceModal} onClose={() => {
      setShowVoiceModal(false);
      setParseResult(null);
    }} onConfirm={handleVoiceConfirm} onRetry={handleVoiceRetry} parseResult={parseResult} players={playersWithScores} holeNumber={currentHole} par={currentHoleInfo.par} />

      {/* Share Join Code Modal */}
      <ShareJoinCodeModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} joinCode={round.joinCode} courseName={round.courseName} roundId={round.id} />

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is saved. You can continue this round anytime from the home screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/')} className="rounded-lg">
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Round Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>End Round Early?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the round as complete with current scores. You won't be able to add more scores after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishRound} className="rounded-lg bg-destructive hover:bg-destructive/90">
              End Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Playoff Winner Modal */}
      <AnimatePresence>
        {showWinnerModal && playoffWinner && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{
          scale: 0.8,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.8,
          opacity: 0
        }} transition={{
          type: "spring",
          damping: 20,
          stiffness: 300
        }} className="bg-card rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl border-2 border-primary">
              <motion.div initial={{
            scale: 0
          }} animate={{
            scale: 1
          }} transition={{
            delay: 0.2,
            type: "spring",
            damping: 10
          }} className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-primary-foreground" />
              </motion.div>
              
              <motion.h2 initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.3
          }} className="text-2xl font-black mb-2">
                🎉 PLAYOFF WINNER! 🎉
              </motion.h2>
              
              <motion.p initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.4
          }} className="text-3xl font-black text-primary mb-2">
                {playoffWinner.name}
              </motion.p>
              
              <motion.p initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.5
          }} className="text-muted-foreground mb-6">
                Won on playoff hole #{playoffWinner.holeNumber}
              </motion.p>
              
              <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.6
          }}>
                <Button onClick={handleFinishWithWinner} className="w-full py-6 text-lg font-bold rounded-xl" size="lg">
                  <Trophy className="w-5 h-5 mr-2" />
                  Finish Round
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}