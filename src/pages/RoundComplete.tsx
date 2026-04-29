import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Loader2, CloudRain, Shuffle, Coins, Zap, Plus, Share2, Sparkles } from 'lucide-react';
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
import { getPropBetLabel, getPropBetIcon } from '@/types/betting';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
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
        colors: ['#F0EE3A', '#ffffff', '#22C55E', '#0A0A0A'],
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
        <div className="text-center px-6 space-y-4">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto">
            <span className="text-3xl">🏌️</span>
          </div>
          <h2 className="text-xl font-bold">Round not found</h2>
          <p className="text-muted-foreground text-sm">
            This round may have been deleted or doesn't exist
          </p>
          <Button onClick={() => navigate('/')} className="mt-4">
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
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/3 to-transparent" />
      </div>

      {/* Fixed Header Section */}
      <RoundCompleteHeader round={round} />

      {/* Scrollable Content */}
      <main
        className="flex-1 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-48"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Winner Card */}
        {winner && (
          <WinnerCard
            winner={winner}
            hasTie={hasTie}
            sortedPlayers={sortedPlayers}
            round={round}
            matchPlayResult={matchPlayResult}
            useNetScoring={settings.useNetScoring}
          />
        )}

        {/* Match Play Result */}
        {matchPlayResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mx-4 mb-4"
          >
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Match Play
                  </span>
                  <span className="font-bold text-sm">{matchPlayResult.statusText}</span>
                </div>
            </div>
          </motion.div>
        )}

        {/* Rain-shortened banner */}
        {isRainShortened && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-4 mb-3 bg-[#1E3A5F] rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <CloudRain className="w-5 h-5 text-[#60A5FA] flex-shrink-0" />
            <div>
              <p className="text-white text-[13px] font-bold">Rain-shortened settlement applied</p>
              <p className="text-white/60 text-[11px]">Front 9 settled normally · Back 9 and overall not scored</p>
            </div>
          </motion.div>
        )}

        {/* Net-out banner */}
        {houseGameConfig?.settlementConfig.netOut && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mx-4 mb-3 bg-[#F0EE3A] rounded-2xl px-4 py-2.5 flex items-center gap-3"
          >
            <Shuffle className="w-4 h-4 text-[#0A0A0A] flex-shrink-0" />
            <p className="text-[#0A0A0A] text-[12px] font-bold">Net-out applied — all debts combined into minimum payments</p>
          </motion.div>
        )}

        {/* Watch Party Reveal */}
        {id && <WatchPartyRevealCard roundId={id} />}

        {/* Settlements Section */}
        <SettlementsSection
          trackedSettlements={trackedSettlements}
          settlementStats={settlementStats}
          isOpen={showSettlements}
          onToggle={() => setShowSettlements(!showSettlements)}
          markAsPaid={markAsPaid}
          markAsForgiven={markAsForgiven}
          markAsPending={markAsPending}
        />

        {/* Ghost Pot */}
        {ghostPotAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="mx-4 mb-4"
          >
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                <span className="text-base leading-none">👻</span>
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">Ghost Pot</span>
                <span className="ml-auto text-[14px] font-black text-foreground">${ghostPotAmount.toFixed(0)}</span>
              </div>
              {ghostPotEntries.map((s) => (
                <div key={`${s.fromPlayerId}-${s.toPlayerId}`} className="flex items-center justify-between px-4 py-2.5 border-b border-border/10 last:border-b-0">
                  <span className="text-[13px] text-muted-foreground">
                    {s.fromPlayerName.split(' ')[0]} → pot
                  </span>
                  <span className="text-[13px] font-bold text-foreground">${s.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* House Game Settlement */}
        {houseGameSettlements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="mx-4 mb-4"
          >
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                <div className="w-5 h-5 rounded-md bg-[#F0EE3A] flex items-center justify-center">
                  <Coins className="w-3 h-3 text-[#0A0A0A]" />
                </div>
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">House Game</span>
              </div>
              {houseGameSettlements.map((s) => (
                <div key={`${s.fromPlayerId}-${s.toPlayerId}`} className="flex items-center justify-between px-4 py-3 border-b border-border/10 last:border-b-0">
                  <span className="text-[13px] font-semibold text-foreground">
                    {s.fromPlayerName.split(' ')[0]} → {s.toPlayerName.split(' ')[0]}
                  </span>
                  <span className="text-[14px] font-black text-foreground">${s.amount.toFixed(0)}</span>
                </div>
              ))}
              <button
                onClick={handleShareHouseGame}
                className="w-full flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold text-muted-foreground"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share House Game Results
              </button>
            </div>
          </motion.div>
        )}

        {/* Custom Rules (manual settlement reminders) */}
        {(() => {
          const customRules = (houseGameEntry?.activePrimitives ?? []).filter(isCustomPrimitive);
          if (customRules.length === 0) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.40 }}
              className="mx-4 mb-4"
            >
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                  <div className="w-5 h-5 rounded-md bg-[#F0EE3A] flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-[#0A0A0A]" />
                  </div>
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">Custom Rules</span>
                  <span className="ml-auto text-[10px] font-bold text-muted-foreground">Settle manually</span>
                </div>
                {customRules.map((rule, i) => {
                  const label = rule.label ?? rule.id.replace('custom_', '').replace(/_/g, ' ');
                  const desc = rule.description ?? '';
                  const val = rule.value;
                  return (
                    <div key={rule.id} className="px-4 py-3 border-b border-border/10 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-semibold text-foreground block">{label}</span>
                          {desc && <span className="text-[11px] text-muted-foreground leading-snug">{desc}</span>}
                        </div>
                        {val != null && (
                          <span className="text-[13px] font-black text-foreground flex-shrink-0">${val}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* Junk Bets Settlement */}
        {wonJunkBets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="mx-4 mb-4"
          >
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                <div className="w-5 h-5 rounded-md bg-[#F0EE3A] flex items-center justify-center">
                  <Zap className="w-3 h-3 text-[#0A0A0A]" />
                </div>
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">Junk Bets</span>
                <span className="ml-auto text-[11px] font-bold text-muted-foreground">{wonJunkBets.length} logged</span>
              </div>
              {/* Per-hole line items */}
              {wonJunkBets.map((bet, i) => {
                const winner = rawPlayers.find(p => p.id === bet.winnerId);
                return (
                  <div key={bet.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/10 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getPropBetIcon(bet.type)}</span>
                      <div>
                        <span className="text-[13px] font-semibold text-foreground">{getPropBetLabel(bet.type)}</span>
                        <span className="text-[11px] text-muted-foreground ml-1.5">H{bet.holeNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-muted-foreground">{winner?.name.split(' ')[0]}</span>
                      <span className="text-[13px] font-black text-[#22C55E]">+${bet.stakes}</span>
                    </div>
                  </div>
                );
              })}
              {/* Net summary */}
              {junkSummary.length > 0 && (
                <div className="px-4 py-3 bg-muted/30 space-y-1">
                  {junkSummary.map(entry => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">{entry.name.split(' ')[0]}</span>
                      <span className={`text-[12px] font-black ${entry.net >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {entry.net >= 0 ? '+' : ''}${entry.net.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Game Results */}
        {gameResults && (
          <GameResultsSection
            gameResults={gameResults}
            players={rawPlayers}
            isOpen={showGames}
            onToggle={() => setShowGames(!showGames)}
          />
        )}

        {/* Highlights Section */}
        <HighlightsSection
          highlights={highlights}
          isOpen={showHighlights}
          onToggle={() => setShowHighlights(!showHighlights)}
        />

        {/* Final Standings */}
        <FinalStandings
          sortedPlayers={sortedPlayers}
          settlements={settlements}
          useNetScoring={settings.useNetScoring}
        />
      </main>

      {/* Add to Group Tab */}
      {groups.length > 0 && settlements.length > 0 && (
        <div className="mx-4 mb-4">
          {!addedToGroupId ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {!showGroupPicker ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { hapticLight(); if (groups.length === 1) { handleAddToTab(groups[0].id); } else { setShowGroupPicker(true); } }}
                  disabled={addingToTab}
                  className="w-full bg-white border-2 border-foreground/10 rounded-2xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingToTab ? (
                    <span className="text-[13px] font-bold text-muted-foreground animate-pulse">Adding…</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-foreground" />
                      <span className="text-[13px] font-bold text-foreground">Add to Group Tab</span>
                    </>
                  )}
                </motion.button>
              ) : (
                <div className="bg-white border-2 border-foreground/10 rounded-2xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">Select group</p>
                  <div className="space-y-2">
                    {groups.map(g => (
                      <motion.button
                        key={g.id}
                        whileTap={{ scale: 0.97 }}
                        disabled={addingToTab}
                        onClick={() => handleAddToTab(g.id)}
                        className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 disabled:opacity-50"
                      >
                        <span className="text-[13px] font-bold text-foreground">{g.name}</span>
                        <span className="text-[11px] text-muted-foreground">{g.members.length} members</span>
                      </motion.button>
                    ))}
                  </div>
                  <button onClick={() => setShowGroupPicker(false)} className="mt-3 w-full text-[12px] text-muted-foreground font-bold py-1">Cancel</button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#F0FFF4] border border-[#22C55E]/30 rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <span className="text-base">✓</span>
              <div>
                <p className="text-[13px] font-bold text-[#15803D]">Added to {groups.find(g => g.id === addedToGroupId)?.name} tab</p>
                <p className="text-[11px] text-[#15803D]/70">Visible in group ledger</p>
              </div>
            </motion.div>
          )}
        </div>
      )}

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
        winner={winner}
        hasTie={hasTie}
        useNetScoring={settings.useNetScoring}
        matchPlayResult={matchPlayResult}
        skinsResult={gameResults?.skinsResult}
        nassauResult={gameResults?.nassauResult}
      />
    </div>
  );
}
