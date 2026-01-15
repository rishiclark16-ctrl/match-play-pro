import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MoreVertical, Flag, Share2, RotateCcw } from 'lucide-react';
import { HoleNavigator } from '@/components/golf/HoleNavigator';
import { PlayerCard } from '@/components/golf/PlayerCard';
import { ScoreInputSheet } from '@/components/golf/ScoreInputSheet';
import { VoiceConfirmationModal } from '@/components/golf/VoiceConfirmationModal';
import { GamesSection } from '@/components/golf/GamesSection';
import { HoleSummary } from '@/components/golf/HoleSummary';
import { LiveLeaderboard } from '@/components/golf/LiveLeaderboard';
import { GameSettingsSheet } from '@/components/golf/GameSettingsSheet';
import { ShareJoinCodeModal } from '@/components/golf/ShareJoinCodeModal';
import { SpectatorBanner } from '@/components/golf/SpectatorBanner';
import { MoneyTracker } from '@/components/golf/MoneyTracker';
import { ManageScorekeepersSheet } from '@/components/golf/ManageScorekeepersSheet';
import { PlayoffMode } from '@/components/golf/PlayoffMode';
import { PlayoffWinnerModal } from '@/components/golf/PlayoffWinnerModal';
import { FinishOptionsOverlay } from '@/components/golf/FinishOptionsOverlay';
import { ScorecardBottomBar } from '@/components/golf/ScorecardBottomBar';
import { useRounds } from '@/hooks/useRounds';
import { useSupabaseRound } from '@/hooks/useSupabaseRound';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { usePropBets } from '@/hooks/usePropBets';
import { useScorekeeper } from '@/hooks/useScorekeeper';
import { useAutoAdvance } from '@/hooks/useAutoAdvance';
import { usePlayoff } from '@/hooks/usePlayoff';
import { useVoiceScoring } from '@/hooks/useVoiceScoring';
import { Press, PlayerWithScores, GameConfig } from '@/types/golf';
import { 
  calculatePlayingHandicap, 
  getStrokesPerHole, 
  calculateTotalNetStrokes, 
  getManualStrokesPerHole,
  calculateMatchPlayStrokes,
  buildMatchPlayStrokesMap,
} from '@/lib/handicapUtils';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { setStatusBarDefault } from '@/lib/statusBar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function Scorecard() {
  const { id } = useParams<{ id: string }>();
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
    saveScore: saveScoreToSupabase,
    addPress: addPressToSupabase,
    completeRound: completeRoundSupabase,
    updateGames: updateGamesSupabase,
    loading: supabaseLoading,
  } = useSupabaseRound(id || null);

  // Prop bets hook for side bets
  const { propBets, addPropBet, updatePropBet } = usePropBets(id);

  // Scorekeeper permissions hook
  const {
    isScorekeeper,
    isCreator,
    scorekeeperIds,
    addScorekeeper,
    removeScorekeeper,
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
    addPress: addPressLocal,
  } = useRounds();

  const [currentHole, setCurrentHole] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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
    
    // Check if this is a 2-player match play scenario for differential strokes
    const isMatchPlay = round.matchPlay || round.games?.some(g => g.type === 'match' || g.type === 'nassau');
    const isTwoPlayerMatch = isMatchPlay && supabasePlayers.length === 2;
    const isManualMode = round.handicapMode === 'manual';
    
    // For 2-player match play, calculate differential strokes
    let matchPlayStrokesMap: Map<string, Map<number, number>> | undefined;
    
    if (isTwoPlayerMatch) {
      const [p1, p2] = supabasePlayers;
      const matchInfo = calculateMatchPlayStrokes(
        { id: p1.id, name: p1.name, handicap: p1.handicap, manualStrokes: p1.manualStrokes },
        { id: p2.id, name: p2.name, handicap: p2.handicap, manualStrokes: p2.manualStrokes },
        round.slope || 113,
        round.holes,
        isManualMode ? 'manual' : 'auto'
      );
      matchPlayStrokesMap = buildMatchPlayStrokesMap(matchInfo, round.holeInfo);
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

      // Use match play differential strokes if applicable
      if (matchPlayStrokesMap) {
        strokesPerHole = matchPlayStrokesMap.get(player.id);
        // Calculate the effective handicap (sum of strokes received)
        playingHandicap = strokesPerHole
          ? Array.from(strokesPerHole.values()).reduce((sum, s) => sum + s, 0)
          : 0;
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      } else if (isManualMode) {
        // Manual mode for non-match-play: use manually entered strokes
        playingHandicap = player.manualStrokes ?? 0;
        strokesPerHole = getManualStrokesPerHole(playingHandicap, round.holeInfo);
        totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = round.holeInfo.find(h => h.number === s.holeNumber);
          return sum + (hole?.par || 4);
        }, 0);
        netRelativeToPar = totalNetStrokes - totalPar;
      } else if (player.handicap !== undefined && player.handicap !== null) {
        // Auto mode for non-match-play: calculate from handicap index and course slope
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
        netRelativeToPar,
        manualStrokes: player.manualStrokes,
      };
    });
  }, [round, supabasePlayers, supabaseLoading, supabaseRound, roundScores, getPlayersWithScores]);

  // Calculate how many holes have been fully scored
  const completedHoles = useMemo(() => {
    if (!round || playersWithScores.length === 0) return 0;
    let completed = 0;
    for (let hole = 1; hole <= round.holes; hole++) {
      const allPlayersScored = playersWithScores.every(player =>
        player.scores.some(s => s.holeNumber === hole)
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

  // Check if all players have scored current hole
  const allCurrentHoleScored = useMemo(() => {
    if (!round || playersWithScores.length === 0) return false;
    return playersWithScores.every(player =>
      player.scores.some(s => s.holeNumber === currentHole)
    );
  }, [round, playersWithScores, currentHole]);

  // Check if hole 18 specifically is fully scored
  const hole18FullyScored = useMemo(() => {
    if (!round || playersWithScores.length === 0) return false;
    return playersWithScores.every(player =>
      player.scores.some(s => s.holeNumber === round.holes)
    );
  }, [round, playersWithScores]);

  const currentHoleInfo = round?.holeInfo.find(h => h.number === currentHole) || {
    number: currentHole,
    par: 4,
  };
  const selectedPlayer = playersWithScores.find(p => p.id === selectedPlayerId);
  const allHolesScored = round && playersWithScores.length > 0 &&
    playersWithScores.every(p => p.holesPlayed === round.holes);
  const canFinish = allHolesScored;

  // Auto-advance hook
  const { countdown: autoAdvanceCountdown, advanceToNextHole } = useAutoAdvance({
    allCurrentHoleScored,
    currentHole,
    totalHoles: round?.holes || 18,
    onAdvance: setCurrentHole,
  });

  // Playoff hook
  const {
    playoffHole,
    playoffWinner,
    showFinishOptions,
    showWinnerModal,
    allPlayoffScored,
    setShowFinishOptions,
    setShowWinnerModal,
    getPlayoffScore,
    handleStartPlayoff,
    handlePlayoffScore,
    handleNextPlayoffHole,
    clearPlayoffScore,
  } = usePlayoff({
    players: playersWithScores,
    hole18FullyScored,
  });

  // Score saving callback for voice
  const handleSaveScore = useCallback((playerId: string, score: number) => {
    if (!round) return;
    saveScoreToSupabase(playerId, currentHole, score);
    setPlayerScore(round.id, playerId, currentHole, score);
  }, [round, currentHole, saveScoreToSupabase, setPlayerScore]);

  // Voice scoring hook
  const {
    isListening,
    isProcessing,
    isSupported,
    showVoiceModal,
    parseResult,
    voiceSuccessPlayerIds,
    handleVoicePress,
    handleVoiceConfirm,
    handleVoiceRetry,
    closeVoiceModal,
  } = useVoiceScoring({
    players: playersWithScores,
    currentHole,
    totalHoles: round?.holes || 18,
    par: currentHoleInfo.par,
    games: round?.games || [],
    onScoreSaved: handleSaveScore,
    onNavigateToHole: setCurrentHole,
  });

  // Handle quick score from +/- buttons
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
      toast.success('Score saved', { duration: 1500 });
    }
  }, [selectedPlayerId, round, currentHole, saveScoreToSupabase, setPlayerScore]);

  const handleFinishRound = useCallback(() => {
    if (round) {
      completeRoundSupabase();
      completeRoundLocal(round.id);
      navigate(`/round/${round.id}/complete`);
    }
  }, [round, completeRoundSupabase, completeRoundLocal, navigate]);

  const handleFinishWithWinner = useCallback(() => {
    if (round) {
      setShowWinnerModal(false);
      completeRoundSupabase();
      completeRoundLocal(round.id);
      navigate(`/round/${round.id}/complete`);
    }
  }, [round, completeRoundSupabase, completeRoundLocal, navigate, setShowWinnerModal]);

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

  // Loading state
  if (supabaseLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Flag className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Loading round...</p>
        </div>
      </div>
    );
  }

  // Round not found
  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Flag className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold mb-2">Round not found</h2>
          <p className="text-muted-foreground text-sm mb-4">This round may have been deleted.</p>
          <Button onClick={() => navigate('/')} className="rounded-lg">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Spectator/View-Only Banner */}
      {(isSpectator || !isScorekeeper) && (
        <SpectatorBanner isSpectator={isSpectator} isScorekeeper={isScorekeeper} />
      )}

      {/* Fixed Header */}
      <header
        className="flex-shrink-0 z-30 bg-background border-b border-border"
        style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
      >
        <div className="pt-2 pb-2 px-4 flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              hapticLight();
              setShowExitDialog(true);
            }}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"
            aria-label="Exit round"
          >
            <X className="w-4 h-4" />
          </motion.button>

          <div className="text-center flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">{round.courseName}</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
              {round.joinCode}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCreator && !isSpectator && (
              <ManageScorekeepersSheet
                players={playersWithScores.map(p => ({
                  id: p.id,
                  name: p.name,
                  profile_id: (p as any).profile_id,
                  order_index: (p as any).order_index,
                }))}
                scorekeeperIds={scorekeeperIds}
                isCreator={isCreator}
                onAddScorekeeper={addScorekeeper}
                onRemoveScorekeeper={removeScorekeeper}
              />
            )}

            {canEditScores && (
              <GameSettingsSheet
                round={round}
                onUpdateGames={handleUpdateGames}
                playerCount={playersWithScores.length}
              />
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform touch-manipulation cursor-pointer"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onClick={e => e.stopPropagation()}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 z-50">
                <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Round
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Reset feature coming soon')}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset This Hole
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowEndDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  End Round Early
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Hole Navigator - Fixed, hide during playoff */}
      {playoffHole === 0 && (
        <div
          className="flex-shrink-0"
          style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
        >
          <HoleNavigator
            currentHole={currentHole}
            totalHoles={round.holes}
            holeInfo={currentHoleInfo}
            onPrevious={() => setCurrentHole(h => Math.max(1, h - 1))}
            onNext={() => setCurrentHole(h => Math.min(round.holes, h + 1))}
          />
        </div>
      )}

      {/* Playoff Mode Header and Scoring */}
      {playoffHole > 0 && (
        <PlayoffMode
          playoffHole={playoffHole}
          currentHolePar={currentHoleInfo.par}
          players={playersWithScores}
          allPlayoffScored={allPlayoffScored}
          playoffWinnerId={playoffWinner?.id}
          getPlayoffScore={getPlayoffScore}
          onPlayoffScore={handlePlayoffScore}
          onNextPlayoffHole={handleNextPlayoffHole}
          onClearPlayoffScore={clearPlayoffScore}
        />
      )}

      {/* Scrollable Content Area */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain relative z-10 px-3 pb-32"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Live Leaderboard - hide during playoff */}
        {playoffHole === 0 && playersWithScores.some(p => p.holesPlayed > 0) && (
          <LiveLeaderboard
            players={playersWithScores}
            useNetScoring={round.games?.some((g: any) => g.useNet) || false}
            isMatchPlay={round.matchPlay}
            holeInfo={round.holeInfo}
            scores={roundScores}
          />
        )}

        {/* Live Money Tracker */}
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

        <div className="space-y-2">
          {/* Hole Summary - hide during playoff */}
          {playoffHole === 0 &&
            (round.games?.length > 0 || playersWithScores.some(p => p.handicap !== undefined)) && (
              <HoleSummary
                round={round}
                players={playersWithScores}
                scores={roundScores}
                currentHole={currentHole}
                currentHoleInfo={currentHoleInfo}
              />
            )}

          {/* Regular scoring mode */}
          {playoffHole === 0 && (
            <>
              <AnimatePresence mode="popLayout">
                {playersWithScores.map((player, index) => {
                  const holeScore = player.scores.find(s => s.holeNumber === currentHole)?.strokes;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <PlayerCard
                        player={player}
                        currentHoleScore={holeScore}
                        currentHolePar={currentHoleInfo.par}
                        currentHoleNumber={currentHole}
                        isLeading={player.id === leadingPlayerId}
                        onScoreTap={canEditScores ? () => setSelectedPlayerId(player.id) : undefined}
                        onQuickScore={canEditScores ? score => handleQuickScore(player.id, score) : undefined}
                        showNetScores={true}
                        voiceHighlight={isListening}
                        voiceSuccess={voiceSuccessPlayerIds.has(player.id)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Next Hole Button */}
              <AnimatePresence>
                {allCurrentHoleScored && currentHole < round.holes && !isSpectator && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4"
                  >
                    <Button
                      onClick={advanceToNextHole}
                      className="w-full py-6 text-lg font-bold rounded-xl relative overflow-hidden"
                      size="lg"
                    >
                      <div className="flex items-center gap-3">
                        <Flag className="w-5 h-5" />
                        <span>Next Hole</span>
                      </div>

                      {/* Countdown progress bar */}
                      {autoAdvanceCountdown !== null && (
                        <motion.div
                          className="absolute bottom-0 left-0 h-1 bg-primary-foreground/30"
                          initial={{ width: '100%' }}
                          animate={{ width: `${(autoAdvanceCountdown / 20) * 100}%` }}
                          transition={{ duration: 1, ease: 'linear' }}
                        />
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Tap to continue or wait for auto-advance
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Games Section - hide during playoff */}
          {playoffHole === 0 && round.games && round.games.length > 0 && (
            <GamesSection
              round={round}
              players={playersWithScores}
              scores={roundScores}
              currentHole={currentHole}
              onAddPress={handleAddPress}
            />
          )}
        </div>

        {/* Voice hint */}
        {playoffHole === 0 && !isSpectator && isSupported && playersWithScores.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-[10px] text-muted-foreground mt-4 font-medium"
          >
            💡 Tap mic: "{playersWithScores[0]?.name.split(' ')[0]} 5,{' '}
            {playersWithScores[1]?.name.split(' ')[0] || 'Tim'} 4"
          </motion.p>
        )}
      </main>

      {/* Finish/Playoff Options Overlay */}
      {!isSpectator && (
        <FinishOptionsOverlay
          isOpen={showFinishOptions}
          onFinishRound={() => {
            setShowFinishOptions(false);
            handleFinishRound();
          }}
          onStartPlayoff={handleStartPlayoff}
          onContinue={() => setShowFinishOptions(false)}
        />
      )}

      {/* Bottom Bar */}
      <ScorecardBottomBar
        roundId={id || ''}
        players={playersWithScores}
        currentHole={currentHole}
        holeInfo={round.holeInfo}
        completedHoles={completedHoles}
        totalHoles={round.holes}
        playoffHole={playoffHole}
        canFinish={canFinish || false}
        hole18FullyScored={hole18FullyScored}
        isSpectator={isSpectator}
        canEditScores={canEditScores}
        showFinishOptions={showFinishOptions}
        isListening={isListening}
        isProcessing={isProcessing}
        isSupported={isSupported}
        propBets={propBets}
        onNavigateToLeaderboard={() => navigate(`/round/${round.id}/leaderboard`)}
        onVoicePress={handleVoicePress}
        onShowFinishOptions={() => setShowFinishOptions(true)}
        onFinishRound={handleFinishRound}
        onPropBetAdded={addPropBet}
        onPropBetUpdated={updatePropBet}
      />

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
        onClose={closeVoiceModal}
        onConfirm={handleVoiceConfirm}
        onRetry={handleVoiceRetry}
        parseResult={parseResult}
        players={playersWithScores}
        holeNumber={currentHole}
        par={currentHoleInfo.par}
      />

      {/* Share Join Code Modal */}
      <ShareJoinCodeModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        joinCode={round.joinCode}
        courseName={round.courseName}
        roundId={round.id}
      />

      {/* Playoff Winner Modal */}
      <PlayoffWinnerModal
        isOpen={showWinnerModal}
        winner={playoffWinner}
        onFinish={handleFinishWithWinner}
      />

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
              This will mark the round as complete with current scores. You won't be able to add
              more scores after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinishRound}
              className="rounded-lg bg-destructive hover:bg-destructive/90"
            >
              End Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
