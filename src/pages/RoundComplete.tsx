import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useRoundSharing } from '@/hooks/useRoundSharing';
import { useSettings } from '@/hooks/useSettings';
import { usePropBets } from '@/hooks/usePropBets';
import { useSettlementTracking } from '@/hooks/useSettlementTracking';
import { useRoundData } from '@/hooks/useRoundData';
import { useGameResults } from '@/hooks/useGameResults';
import { useRoundHighlights } from '@/hooks/useRoundHighlights';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { shouldPromptForPush, requestPushPermission } from '@/lib/pushUtils';
import { isCustomPrimitive } from '@/types/houseGame';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { useScorekeeper } from '@/hooks/useScorekeeper';
import { useRoundLedgerSync } from '@/hooks/useRoundLedgerSync';
import { ShareRoundResultsSheet } from '@/components/golf/ShareRoundResultsSheet';

// Components
import { RoundCompleteHeader } from '@/components/golf/RoundCompleteHeader';
import { WinnerCard } from '@/components/golf/WinnerCard';
import { FinalStandings } from '@/components/golf/FinalStandings';
import { SettlementsSection } from '@/components/golf/SettlementsSection';
import { GameResultsSection } from '@/components/golf/GameResultsSection';
import { HighlightsSection } from '@/components/golf/HighlightsSection';
import { RoundCompleteActions } from '@/components/golf/RoundCompleteActions';
import { WatchPartyRevealCard } from '@/components/golf/WatchPartyRevealCard';
import { SoloRoundSummary } from '@/components/golf/SoloRoundSummary';
import { isSoloRound } from '@/lib/soloRound';
import { useBigSettlementNotifier } from '@/hooks/useBigSettlementNotifier';
import { useRoundCompletePlayers, useRoundCompleteSettlements } from '@/hooks/useRoundCompleteState';
import { useAddToTab } from '@/hooks/useAddToTab';
import { useRoundShareHandlers } from '@/hooks/useRoundShareHandlers';
import { buildHouseGameShareText } from '@/lib/shareHouseGameText';
import { RoundNotices, GhostPotCard, HouseGameCard, CustomRulesCard, JunkBetsCard } from '@/components/golf/results/RoundExtras';
import { AddToGroupTab } from '@/components/golf/results/AddToGroupTab';

export default function RoundComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { completeRound } = useRounds();
  const { shareRoundWithFriends } = useRoundSharing();
  const { settings } = useSettings();
  const { propBets } = usePropBets(id);

  // UI state
  const [sharedWithFriends, setSharedWithFriends] = useState(false);
  const [showSettlements, setShowSettlements] = useState(true);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showGames, setShowGames] = useState(true);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Fetch round data
  const { round, players: rawPlayers, scores: rawScores, presses, loading, isLocalData } = useRoundData(id);
  const { groups } = useGroups();
  const { user } = useAuth();
  const { isScorekeeper } = useScorekeeper(id, rawPlayers);
  const { syncRoundToLedger } = useRoundLedgerSync();

  // Contextual push permission prompt — shown once after first completed round
  useEffect(() => {
    if (!round) return;
    if (!shouldPromptForPush()) return;
    // Small delay so round results render first
    const timer = setTimeout(() => {
      requestPushPermission();
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!round]);

  // Confetti celebration on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.3 },
        colors: ['#BEF264', '#ffffff', '#14532D', '#0F1F17'],
        disableForReducedMotion: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Ensure round is marked complete and share with friends
  useEffect(() => {
    if (round && round.status !== 'complete' && isLocalData) {
      completeRound(round.id);
    }
  }, [round, completeRound, isLocalData]);

  // Auto-share with friends who were in the round
  useEffect(() => {
    const autoShare = async () => {
      if (!round || sharedWithFriends) return;

      const { data: dbPlayers } = await supabase
        .from('players')
        .select('profile_id')
        .eq('round_id', round.id)
        .not('profile_id', 'is', null);

      if (dbPlayers && dbPlayers.length > 0) {
        const profileIds = dbPlayers
          .map(p => p.profile_id)
          .filter((profileId): profileId is string => profileId !== null);

        const sharedCount = await shareRoundWithFriends(round.id, profileIds);
        if (sharedCount > 0) {
          toast.success(`Shared with ${sharedCount} friend${sharedCount > 1 ? 's' : ''}`);
        }
      }
      setSharedWithFriends(true);
    };

    autoShare();
  }, [round, sharedWithFriends, shareRoundWithFriends]);

  // Derived player state (scores, sort, winner, tie, ghost ids).
  const {
    playersWithScores,
    matchPlayResult,
    sortedPlayers,
    winner,
    hasTie,
    ghostPlayerIds,
  } = useRoundCompletePlayers({
    round,
    rawPlayers,
    rawScores,
    useNetScoring: settings.useNetScoring,
  });

  // Calculate game results (depends on playersWithScores)
  const gameResults = useGameResults({
    round,
    players: rawPlayers,
    scores: rawScores,
    presses,
    playersWithScores,
  });

  // Settlements + ghost pot + house game + junk summary (depends on gameResults)
  const {
    settlements,
    ghostPotEntries,
    ghostPotAmount,
    nonGhostSettlements,
    houseGameConfig,
    houseGameSettlements,
    isRainShortened,
    wonJunkBets,
    junkSummary,
  } = useRoundCompleteSettlements({
    round,
    rawPlayers,
    rawScores,
    playersWithScores,
    matchPlayResult,
    ghostPlayerIds,
    gameResults,
    propBets,
  });

  // Big win/loss push — fires once from scorekeeper's device when a player is up/down ≥ $20 net
  useBigSettlementNotifier({
    round,
    user,
    isScorekeeper,
    nonGhostSettlements,
    rawPlayers,
    ghostPlayerIds,
  });

  // App Store review prompt — only for a returning player who just won money
  useReviewPrompt({ round, rawPlayers, settlements: nonGhostSettlements, userId: user?.id });

  // The `houseGameEntry` is needed below for the custom-rules manual-settlement
  // reminder section (which inspects activePrimitives for `isCustomPrimitive`).
  const houseGameEntry = round?.games?.find(g => g.type === 'house');

  // Settlement payment tracking
  const {
    trackedSettlements,
    markAsPaid,
    markAsForgiven,
    markAsPending,
    stats: settlementStats,
  } = useSettlementTracking(id, nonGhostSettlements);

  // Calculate highlights
  const highlights = useRoundHighlights({
    round,
    players: rawPlayers,
    scores: rawScores,
    gameResults,
  });

  // Add round results to a group's running tab
  const {
    addingToTab,
    addedToGroupId,
    showGroupPicker,
    setShowGroupPicker,
    handleAddToTab,
  } = useAddToTab({ round, id, settlements, rawPlayers, syncRoundToLedger });

  // Image / text share handlers
  const {
    isSharing,
    shareMode,
    handleShareImage,
    handleShareText,
  } = useRoundShareHandlers({ round, playersWithScores, rawScores });

  const handleShareHouseGame = async () => {
    if (!round) return;
    hapticLight();
    const text = buildHouseGameShareText({
      courseName: round.courseName,
      date: round.date,
      standings: gameResults?.houseGameResult?.standings ?? [],
      junkSummary,
    });
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Results copied to clipboard!');
      }
      hapticSuccess();
    } catch {
      hapticError();
      toast.error('Could not share results');
    }
  };

  // Viewer's own player row, for "your money" and "You pay" phrasing.
  const myPlayerId = user ? rawPlayers.find(p => p.profileId === user.id)?.id : undefined;
  const customRules = (houseGameEntry?.activePrimitives ?? []).filter(isCustomPrimitive);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground font-medium">Loading round...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6 space-y-3">
          <div className="w-16 h-16 rounded-[20px] bg-card border border-border flex items-center justify-center mx-auto">
            <span className="text-3xl">🏌️</span>
          </div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">Round not found</h2>
          <p className="text-muted-foreground text-sm">
            This round may have been deleted or doesn't exist
          </p>
          <Button onClick={() => navigate('/')} className="mt-4 h-12 px-6 rounded-[14px]">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Solo rounds: render a stripped-down summary — no settlements, no game
  // results, no Final Standings (only 1 player). Short-circuits the whole
  // multiplayer tree below.
  if (isSoloRound(round, rawPlayers) && playersWithScores.length === 1) {
    return <SoloRoundSummary round={round} player={playersWithScores[0]} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      <RoundCompleteHeader round={round} />

      {/* Scrollable Content */}
      <main
        className="flex-1 overflow-y-auto overscroll-y-contain relative z-10 px-5 pt-1 pb-48"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {winner && (
          <WinnerCard
            winner={winner}
            hasTie={hasTie}
            sortedPlayers={sortedPlayers}
            round={round}
            matchPlayResult={matchPlayResult}
            useNetScoring={settings.useNetScoring}
            settlements={settlements}
            myPlayerId={myPlayerId}
          />
        )}

        <RoundNotices
          matchPlayResult={round.matchPlay ? null : matchPlayResult}
          isRainShortened={isRainShortened}
          netOut={!!houseGameConfig?.settlementConfig.netOut}
        />

        {id && <WatchPartyRevealCard roundId={id} />}

        <SettlementsSection
          trackedSettlements={trackedSettlements}
          settlementStats={settlementStats}
          isOpen={showSettlements}
          onToggle={() => setShowSettlements(!showSettlements)}
          markAsPaid={markAsPaid}
          markAsForgiven={markAsForgiven}
          markAsPending={markAsPending}
          myPlayerId={myPlayerId}
          footer={
            groups.length > 0 && settlements.length > 0 ? (
              <AddToGroupTab
                groups={groups}
                addingToTab={addingToTab}
                addedToGroupId={addedToGroupId}
                showGroupPicker={showGroupPicker}
                setShowGroupPicker={setShowGroupPicker}
                onAdd={handleAddToTab}
              />
            ) : null
          }
        />

        <FinalStandings
          sortedPlayers={sortedPlayers}
          settlements={settlements}
          useNetScoring={settings.useNetScoring}
          myPlayerId={myPlayerId}
        />

        <GhostPotCard entries={ghostPotEntries} total={ghostPotAmount} />
        <HouseGameCard settlements={houseGameSettlements} onShare={handleShareHouseGame} />
        <CustomRulesCard rules={customRules} />
        <JunkBetsCard bets={wonJunkBets} players={rawPlayers} summary={junkSummary} />

        {gameResults && (
          <GameResultsSection
            gameResults={gameResults}
            players={rawPlayers}
            isOpen={showGames}
            onToggle={() => setShowGames(!showGames)}
          />
        )}

        <HighlightsSection
          highlights={highlights}
          isOpen={showHighlights}
          onToggle={() => setShowHighlights(!showHighlights)}
        />
      </main>

      {/* Bottom Buttons */}
      <RoundCompleteActions
        roundId={id}
        isSharing={isSharing}
        shareMode={shareMode}
        onShareImage={handleShareImage}
        onShareText={handleShareText}
        onShowShareSheet={() => setShowShareSheet(true)}
      />

      {/* Share Results Sheet */}
      <ShareRoundResultsSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        round={round}
        players={playersWithScores}
        settlements={settlements}
        winner={winner ?? null}
        hasTie={hasTie}
        useNetScoring={settings.useNetScoring}
        matchPlayResult={matchPlayResult}
        skinsResult={gameResults?.skinsResult}
        nassauResult={gameResults?.nassauResult}
      />
    </div>
  );
}
