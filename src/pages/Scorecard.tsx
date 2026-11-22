import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Mic } from 'lucide-react';
import { HoleNavigator } from '@/components/golf/HoleNavigator';
import { PlayerCard } from '@/components/golf/PlayerCard';
import { GamesSection } from '@/components/golf/GamesSection';
import { HoleSummary } from '@/components/golf/HoleSummary';
import { LiveLeaderboard } from '@/components/golf/LiveLeaderboard';
import { ScorecardBanners } from '@/components/golf/ScorecardBanners';
import { MoneyTracker } from '@/components/golf/MoneyTracker';
import { PlayoffMode } from '@/components/golf/PlayoffMode';
import { FinishOptionsOverlay } from '@/components/golf/FinishOptionsOverlay';
import { ScorecardBottomBar } from '@/components/golf/ScorecardBottomBar';
import { ScorecardHeader } from '@/components/golf/ScorecardHeader';
import { ScorecardModals } from '@/components/golf/ScorecardModals';
import { HandicapStrokesSheet } from '@/components/golf/HandicapStrokesSheet';
import { ScorecardTutorial } from '@/components/golf/ScorecardTutorial';
import { BingoBangoSheet } from '@/components/golf/BingoBangoSheet';
import { PropBetSheet } from '@/components/golf/PropBetSheet';
import { useRounds } from '@/hooks/useRounds';
import { useSupabaseRound } from '@/hooks/useSupabaseRound';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { usePropBets } from '@/hooks/usePropBets';
import { useScorekeeper } from '@/hooks/useScorekeeper';
import { useAutoAdvance } from '@/hooks/useAutoAdvance';
import { usePlayoff } from '@/hooks/usePlayoff';
import { useScorecardVoice } from '@/hooks/useScorecardVoice';
import { useSettings } from '@/hooks/useSettings';
import { usePlayersWithScores } from '@/hooks/usePlayersWithScores';
import { useSettlementPreview } from '@/hooks/useSettlementPreview';
import { isSoloRound } from '@/lib/soloRound';
import { Press, PlayerWithScores, GameConfig, BingoBangoHoleResult } from '@/types/golf';
import { sendPushToProfiles } from '@/lib/pushUtils';
import { sendRoundCompletionNotifications as sendRoundCompletionNotificationsImpl } from '@/lib/roundCompletionNotifier';
import { useScoreEntry } from '@/hooks/useScoreEntry';
import { useNassauAutoPress } from '@/hooks/useNassauAutoPress';
import { useBirdiePress } from '@/hooks/useBirdiePress';
import { useFinishRound } from '@/hooks/useFinishRound';
import { ScorecardLoading, ScorecardNotFound } from '@/components/golf/ScorecardEmptyStates';
import { useAuth } from '@/hooks/useAuth';
import { useHouseGameDerivations } from '@/hooks/useHouseGameDerivations';
import { setStatusBarDefault } from '@/lib/statusBar';
import { broadcastWatchPartyNotification } from '@/lib/watchPartyNotification';

export default function Scorecard() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSpectator = searchParams.get('spectator') === 'true';

  // Keep screen awake during active round
  useKeepAwake(true);

  // Voice settings and tutorial tracking
  const { settings, updateSettings, loaded: settingsLoaded } = useSettings();

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
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHandicapSheet, setShowHandicapSheet] = useState(false);
  const [preferredLiesDismissed, setPreferredLiesDismissed] = useState(false);

  // Tutorial refs
  const voiceButtonRef = useRef<HTMLDivElement>(null);
  const playerCardRef = useRef<HTMLDivElement>(null);
  const holeNavRef = useRef<HTMLDivElement>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  // Use Supabase round if available, otherwise fall back to local
  const localRound = getRoundById(id || '');
  const round = supabaseRound || localRound;

  // Show tutorial for first 3 rounds (must be after round is defined)
  useEffect(() => {
    if (!settingsLoaded || !round || isSpectator) return;
    if (settings.tutorialDismissed) return;
    if (settings.tutorialViewCount >= 3) return;

    // Delay to let scorecard render first
    const timer = setTimeout(() => setShowTutorial(true), 800);
    return () => clearTimeout(timer);
  }, [settingsLoaded, round, isSpectator, settings.tutorialDismissed, settings.tutorialViewCount]);

  // Handle tutorial completion
  const handleTutorialComplete = useCallback((dontShowAgain: boolean) => {
    setShowTutorial(false);
    updateSettings({
      tutorialViewCount: settings.tutorialViewCount + 1,
      ...(dontShowAgain && { tutorialDismissed: true }),
    });
  }, [settings.tutorialViewCount, updateSettings]);

  // Get scores - prefer Supabase data
  const roundScores = supabaseScores.length > 0 ? supabaseScores : getScoresForRound(round?.id || '');

  // Use Supabase players when available
  const useSupabaseData = supabasePlayers.length > 0 || supabaseLoading || supabaseRound !== null;

  // Build players with scores using hook for Supabase data
  const supabasePlayersWithScores = usePlayersWithScores({
    round,
    players: supabasePlayers,
    scores: roundScores,
    isLoading: supabaseLoading,
  });

  // Fall back to local storage if not using Supabase
  const localPlayersWithScores = useMemo(() => {
    if (!round || useSupabaseData) return [];
    return getPlayersWithScores(round.id, round.holeInfo, round.slope, round.holes, round.rating);
  }, [round, useSupabaseData, getPlayersWithScores]);

  // Use appropriate players list
  const playersWithScores: PlayerWithScores[] = useSupabaseData ? supabasePlayersWithScores : localPlayersWithScores;

  // Detect solo rounds (1 real player, 0 games) so we can strip the multiplayer UI.
  const isSolo = useMemo(
    () => isSoloRound(round, playersWithScores),
    [round, playersWithScores],
  );

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

  // Watch Party: broadcast notification on first score
  const watchPartyBroadcastRef = useRef(false);
  useEffect(() => {
    if (watchPartyBroadcastRef.current || !round || !id || isSpectator) return;
    if (roundScores.length === 0) return;
    watchPartyBroadcastRef.current = true;
    const playerNames = playersWithScores.map(p => p.name.split(' ')[0]);
    broadcastWatchPartyNotification(id, round.courseName, playerNames);
  }, [roundScores.length, round, id, isSpectator, playersWithScores]);

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

  // Calculate settlements preview for finish overlay
  const settlementsPreview = useSettlementPreview({
    round,
    playersWithScores,
    scores: roundScores,
    propBets,
  });

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

  // Score-entry handlers (voice save, quick +/- buttons, score-input modal).
  const { handleSaveScore, handleQuickScore, handleScoreSelect } = useScoreEntry({
    round,
    user,
    playersWithScores,
    currentHole,
    currentHolePar: currentHoleInfo.par,
    selectedPlayerId,
    saveScoreToSupabase,
    setPlayerScore,
  });

  // Voice orchestration (speech feedback sync, nicknames, voice scoring,
  // hands-free) is encapsulated in useScorecardVoice.
  const {
    isListening,
    isProcessing,
    isSupported,
    showVoiceModal,
    parseResult,
    voiceSuccessPlayerIds,
    interimTranscript,
    audioLevel,
    isNoisy,
    isHandsFreeActive,
    handleVoicePress,
    handleVoiceConfirm,
    handleVoiceRetry,
    closeVoiceModal,
  } = useScorecardVoice({
    round,
    currentHole,
    currentHolePar: currentHoleInfo.par,
    playersWithScores,
    settings,
    onSaveScore: handleSaveScore,
    onNavigateToHole: setCurrentHole,
    onFinishRound: () => setShowFinishOptions(true),
    onOpenLeaderboard: () => round && navigate(`/round/${round.id}/leaderboard`),
  });

  // Send match result notifications to friends after round completion
  const sendRoundCompletionNotifications = useCallback(async () => {
    if (!round || !user) return;
    await sendRoundCompletionNotificationsImpl({
      round,
      userId: user.id,
      playersWithScores,
      roundScores,
      updateGames: updateGamesSupabase,
    });
  }, [round, user, playersWithScores, roundScores, updateGamesSupabase]);

  const { handleFinishRound, handleFinishWithWinner } = useFinishRound({
    round,
    playerCount: playersWithScores.length,
    completeRoundSupabase,
    completeRoundLocal,
    sendRoundCompletionNotifications,
    setShowWinnerModal,
  });

  const handleAddPress = useCallback((press: Press) => {
    if (round) {
      addPressToSupabase(press);
      addPressLocal(round.id, press);
    }
  }, [round, addPressToSupabase, addPressLocal]);

  // Manual press wrapper — same as handleAddPress but also sends a "pressedBack"
  // notification to the opponent. Used from the press modal UI so that
  // auto/birdie press side effects don't double-notify.
  const handleManualPress = useCallback((press: Press) => {
    handleAddPress(press);
    if (!round) return;
    const initiator = playersWithScores.find(p => p.id === press.initiatedBy);
    const initiatorName = (initiator?.name || 'A player').split(' ')[0];
    const opponentProfileIds = playersWithScores
      .filter(p => p.id !== press.initiatedBy && p.profileId)
      .map(p => p.profileId as string);
    if (opponentProfileIds.length === 0) return;
    sendPushToProfiles({
      profileIds: opponentProfileIds,
      title: "You've been pressed ⛳",
      body: `${initiatorName} wants more of your money. Bold.`,
      data: { roundId: round.id, route: `/round/${round.id}` },
      type: 'pressedBack',
    });
  }, [handleAddPress, round, playersWithScores]);

  // Auto-press check for Nassau
  useNassauAutoPress({ round, roundScores, playersWithScores, onAddPress: handleAddPress });

  const handleUpdateGames = useCallback(async (games: GameConfig[]) => {
    if (round) {
      await updateGamesSupabase(games);
    }
  }, [round, updateGamesSupabase]);

  // House-game derivations: active entry, compiled config, pickup score,
  // and Bingo Bango Bongo entry-sheet visibility.
  const {
    houseGameEntry,
    houseGameConfig,
    rawHouseScoringConfig,
    pickupScore,
    handlePickup,
    showBBBSheet,
    bbbHole,
    closeBBBSheet,
  } = useHouseGameDerivations({
    round,
    selectedPlayerId,
    playersWithScores,
    currentHole,
    currentHolePar: currentHoleInfo.par,
    allCurrentHoleScored,
    saveScoreToSupabase,
    setPlayerScore,
    setSelectedPlayerId,
  });

  // Auto-press on net birdie (press_auto_birdie)
  useBirdiePress({
    round,
    roundScores,
    currentHole,
    currentHolePar: currentHoleInfo.par,
    playersWithScores,
    houseGameConfig,
    onAddPress: handleAddPress,
  });

  if (supabaseLoading) return <ScorecardLoading />;
  if (!round) return <ScorecardNotFound onGoHome={() => navigate('/')} />;

  return (
    <div className="bg-[#FAFAF7] h-screen flex flex-col overflow-hidden relative">
      <ScorecardBanners
        isSpectator={isSpectator}
        isScorekeeper={isScorekeeper}
        preferredLiesActive={rawHouseScoringConfig?.preferredLies ?? false}
        preferredLiesDismissed={preferredLiesDismissed}
        onDismissPreferredLies={() => setPreferredLiesDismissed(true)}
      />

      {/* Fixed Header */}
      <ScorecardHeader
        round={round}
        playersWithScores={playersWithScores}
        isCreator={isCreator}
        isSpectator={isSpectator}
        canEditScores={canEditScores}
        scorekeeperIds={scorekeeperIds}
        onShowExitDialog={() => setShowExitDialog(true)}
        onShowShareModal={() => setShowShareModal(true)}
        onShowEndDialog={() => setShowEndDialog(true)}
        onAddScorekeeper={addScorekeeper}
        onRemoveScorekeeper={removeScorekeeper}
        onUpdateGames={handleUpdateGames}
        isSolo={isSolo}
        completedHoles={completedHoles}
        onNavigateToLeaderboard={() => navigate(`/round/${round.id}/leaderboard`)}
        sideBets={!isSolo && !isSpectator && playoffHole === 0 ? (
          <PropBetSheet roundId={round.id} players={playersWithScores} currentHole={currentHole}
            holeInfo={round.holeInfo} propBets={propBets} onPropBetAdded={addPropBet} onPropBetUpdated={updatePropBet} />
        ) : undefined}
      />

      {/* Hole Navigator — hide during playoff */}
      {playoffHole === 0 && (
        <div
          className="flex-shrink-0"
          style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
        >
          <HoleNavigator
            ref={holeNavRef}
            currentHole={currentHole}
            totalHoles={round.holes}
            holeInfo={currentHoleInfo}
            onPrevious={() => setCurrentHole(h => Math.max(1, h - 1))}
            onNext={() => setCurrentHole(h => Math.min(round.holes, h + 1))}
          >
            <HoleSummary
              round={round}
              players={playersWithScores}
              scores={roundScores}
              currentHole={currentHole}
              currentHoleInfo={currentHoleInfo}
              onShowStrokes={() => setShowHandicapSheet(true)}
            />
          </HoleNavigator>
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
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain relative z-10 px-3.5 pt-1 pb-40"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        <div className="space-y-2">
          {/* Regular scoring mode */}
          {playoffHole === 0 && (
            <>
              <LayoutGroup>
                <AnimatePresence mode="popLayout">
                  {playersWithScores.map((player, index) => {
                    const holeScore = player.scores.find(s => s.holeNumber === currentHole)?.strokes;
                    return (
                      <motion.div
                        key={player.id}
                        ref={index === 0 ? playerCardRef : undefined}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 },
                        }}
                      >
                        <PlayerCard
                          player={player}
                          currentHoleScore={holeScore}
                          currentHolePar={currentHoleInfo.par}
                          currentHoleNumber={currentHole}
                          isLeading={player.id === leadingPlayerId}
                          onScoreTap={canEditScores && !player.isGhost ? () => setSelectedPlayerId(player.id) : undefined}
                          onQuickScore={canEditScores && !player.isGhost ? score => handleQuickScore(player.id, score) : undefined}
                          showNetScores={true}
                          voiceHighlight={isListening}
                          voiceSuccess={voiceSuccessPlayerIds.has(player.id)}
                          isGhost={player.isGhost}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </LayoutGroup>
            </>
          )}

          {/* Live Leaderboard — hide during playoff and for solo rounds (nothing to rank) */}
          {!isSolo && playoffHole === 0 && playersWithScores.some(p => p.holesPlayed > 0) && (
            <div className="pt-3">
              <LiveLeaderboard
                ref={leaderboardRef}
                players={playersWithScores}
                useNetScoring={
                  round.matchPlay || round.games?.some(g => g.useNet) || false
                }
                isMatchPlay={round.matchPlay}
                holeInfo={round.holeInfo}
                scores={roundScores}
                matchPlayFormat={round.games?.find(g => g.type === 'match')?.matchPlayFormat}
                matchPlayTeams={round.games?.find(g => g.type === 'match')?.matchPlayTeams}
              />
            </div>
          )}

          {/* Live Money Tracker */}
          {playoffHole === 0 && (round.games?.length > 0 || propBets.some(pb => pb.winnerId)) && (
            <div className="pt-3">
              <MoneyTracker
                players={playersWithScores}
                scores={roundScores}
                games={round.games || []}
                holeInfo={round.holeInfo}
                presses={round.presses || []}
                currentHole={currentHole}
                propBets={propBets}
              />
            </div>
          )}

          {/* LIVE GAMES section label + Games Section — hide during playoff */}
          {playoffHole === 0 && (round.games?.length > 0 || propBets.length > 0) && (
            <>
              <div className="pt-3" />
              <GamesSection
                round={round}
                players={playersWithScores}
                scores={roundScores}
                currentHole={currentHole}
                onAddPress={handleManualPress}
                propBets={propBets}
              />
            </>
          )}
        </div>

        {/* Voice hint — clean, no emoji */}
        {playoffHole === 0 && !isSpectator && isSupported && playersWithScores.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-1.5 mt-6"
          >
            <Mic className="w-3.5 h-3.5 text-[#5A6B61]" />
            <p className="text-[13px] text-[#5A6B61] font-medium">
              {isSolo
                ? `Say "I made a 4 on ${currentHole}" to score`
                : <>Say "{(playersWithScores[0]?.name || 'Mike').split(' ')[0]} 5,{' '}
                    {(playersWithScores[1]?.name || 'Tim').split(' ')[0]} 4" to score</>
              }
            </p>
          </motion.div>
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
          settlements={settlementsPreview}
        />
      )}

      {/* Bottom Bar */}
      <ScorecardBottomBar
        roundId={id || ''}
        players={playersWithScores}
        currentHole={currentHole}
        holeInfo={round.holeInfo}
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
        audioLevel={audioLevel}
        interimTranscript={interimTranscript}
        isNoisy={isNoisy}
        isHandsFree={isHandsFreeActive}
        propBets={propBets}
        autoAdvanceCountdown={autoAdvanceCountdown}
        allCurrentHoleScored={allCurrentHoleScored}
        voiceButtonRef={voiceButtonRef}
        onVoicePress={handleVoicePress}
        onShowFinishOptions={() => setShowFinishOptions(true)}
        onFinishRound={handleFinishRound}
        onNextHole={advanceToNextHole}
        isSolo={isSolo}
      />

      {/* Tutorial Overlay */}
      <ScorecardTutorial
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
        playerNames={playersWithScores.map(p => p.name)}
        voiceButtonRef={voiceButtonRef}
        playerCardRef={playerCardRef}
        holeNavRef={holeNavRef}
        leaderboardRef={leaderboardRef}
      />

      {/* All Modals and Dialogs */}
      {/* Handicap Stroke Allocation Sheet */}
      <HandicapStrokesSheet
        open={showHandicapSheet}
        onClose={() => setShowHandicapSheet(false)}
        players={playersWithScores}
        holeInfo={round.holeInfo}
        totalHoles={round.holes}
        handicapMode={round.handicapMode ?? 'auto'}
      />

      {/* Bingo Bango Bongo Sheet */}
      {showBBBSheet && round && (
        <BingoBangoSheet
          isOpen={showBBBSheet}
          onClose={() => closeBBBSheet()}
          holeNumber={bbbHole}
          players={playersWithScores}
          existingResults={houseGameEntry?.bbbResults ?? []}
          onSave={async (result: BingoBangoHoleResult) => {
            const games = round.games.map(g => {
              if (g.type !== 'house') return g;
              return {
                ...g,
                bbbResults: [...(g.bbbResults ?? []).filter(r => r.holeNumber !== result.holeNumber), result],
              };
            });
            await handleUpdateGames(games);
            closeBBBSheet();
          }}
        />
      )}

      <ScorecardModals
        selectedPlayerId={selectedPlayerId}
        selectedPlayer={selectedPlayer ? {
          name: selectedPlayer.name,
          currentHoleScore: selectedPlayer.scores.find(s => s.holeNumber === currentHole)?.strokes,
        } : undefined}
        currentHole={currentHole}
        currentHolePar={currentHoleInfo.par}
        onCloseScoreInput={() => setSelectedPlayerId(null)}
        onSelectScore={handleScoreSelect}
        pickupScore={pickupScore}
        onPickup={handlePickup}
        showVoiceModal={showVoiceModal}
        parseResult={parseResult}
        players={playersWithScores}
        onCloseVoiceModal={closeVoiceModal}
        onVoiceConfirm={handleVoiceConfirm}
        onVoiceRetry={handleVoiceRetry}
        showShareModal={showShareModal}
        joinCode={round.joinCode}
        courseName={round.courseName}
        roundId={round.id}
        onCloseShareModal={() => setShowShareModal(false)}
        showWinnerModal={showWinnerModal}
        playoffWinner={playoffWinner}
        onFinishWithWinner={handleFinishWithWinner}
        showExitDialog={showExitDialog}
        onSetShowExitDialog={setShowExitDialog}
        showEndDialog={showEndDialog}
        onSetShowEndDialog={setShowEndDialog}
        onFinishRound={handleFinishRound}
      />
    </div>
  );
}
