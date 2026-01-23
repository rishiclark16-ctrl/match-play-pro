import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useRoundSharing } from '@/hooks/useRoundSharing';
import { useSettings } from '@/hooks/useSettings';
import { usePropBets } from '@/hooks/usePropBets';
import { useSettlementTracking } from '@/hooks/useSettlementTracking';
import { useRoundData } from '@/hooks/useRoundData';
import { useGameResults } from '@/hooks/useGameResults';
import { useRoundHighlights } from '@/hooks/useRoundHighlights';
import { Player, PlayerWithScores } from '@/types/golf';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { shareResults, shareText } from '@/lib/shareResults';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { StrokesPerHoleMap } from '@/lib/games/skins';
import { calculateSettlement } from '@/lib/games/settlement';
import { calculateMatchPlay, MatchPlayResult } from '@/lib/games/matchPlay';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { ShareRoundResultsSheet } from '@/components/golf/ShareRoundResultsSheet';
import {
  calculateMatchPlayStrokes,
  buildMatchPlayStrokesMap,
  calculatePlayingHandicap,
  calculateTotalNetStrokes,
} from '@/lib/handicapUtils';

// Components
import { RoundCompleteHeader } from '@/components/golf/RoundCompleteHeader';
import { WinnerCard } from '@/components/golf/WinnerCard';
import { FinalStandings } from '@/components/golf/FinalStandings';
import { SettlementsSection } from '@/components/golf/SettlementsSection';
import { GameResultsSection } from '@/components/golf/GameResultsSection';
import { HighlightsSection } from '@/components/golf/HighlightsSection';
import { RoundCompleteActions } from '@/components/golf/RoundCompleteActions';

export default function RoundComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { completeRound } = useRounds();
  const { shareRoundWithFriends } = useRoundSharing();
  const { settings } = useSettings();
  const { propBets } = usePropBets(id);

  // UI state
  const [isSharing, setIsSharing] = useState(false);
  const [shareMode, setShareMode] = useState<'image' | 'text' | null>(null);
  const [sharedWithFriends, setSharedWithFriends] = useState(false);
  const [showSettlements, setShowSettlements] = useState(true);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showGames, setShowGames] = useState(true);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Fetch round data
  const { round, players: rawPlayers, scores: rawScores, presses, loading, isLocalData } = useRoundData(id);

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

  // Calculate players with scores (including net scores)
  const playersWithScores = useMemo((): PlayerWithScores[] => {
    if (!round || rawPlayers.length === 0) return [];

    return rawPlayers.map(player => {
      const playerScores = rawScores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);

      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);

      // Calculate net scores
      const playingHandicap =
        player.handicap !== undefined
          ? calculatePlayingHandicap(player.handicap, round.slope || 113, round.holes)
          : 0;
      const totalNetStrokes = calculateTotalNetStrokes(
        totalStrokes,
        playingHandicap,
        playerScores.length,
        round.holes
      );
      const parTotal = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
      const netRelativeToPar = totalNetStrokes - parTotal;

      return {
        ...player,
        scores: playerScores,
        totalStrokes,
        totalRelativeToPar,
        holesPlayed: playerScores.length,
        playingHandicap,
        totalNetStrokes,
        netRelativeToPar,
      };
    });
  }, [round, rawPlayers, rawScores]);

  // Build strokes map for match play net scoring
  const strokesPerHoleMap = useMemo((): StrokesPerHoleMap | undefined => {
    if (!round || rawPlayers.length !== 2) return undefined;

    const [p1, p2] = rawPlayers;
    const matchInfo = calculateMatchPlayStrokes(
      { id: p1.id, name: p1.name, handicap: p1.handicap, manualStrokes: p1.manualStrokes },
      { id: p2.id, name: p2.name, handicap: p2.handicap, manualStrokes: p2.manualStrokes },
      round.slope || 113,
      round.holes,
      round.handicapMode || 'auto'
    );
    return buildMatchPlayStrokesMap(matchInfo, round.holeInfo);
  }, [round, rawPlayers]);

  // Calculate match play result using proper net scoring
  const matchPlayResult = useMemo((): MatchPlayResult | null => {
    if (!round?.matchPlay || playersWithScores.length !== 2) return null;
    return calculateMatchPlay(
      rawScores,
      playersWithScores,
      round.holeInfo,
      settings.useNetScoring ? strokesPerHoleMap : undefined,
      round.holes
    );
  }, [round, playersWithScores, rawScores, strokesPerHoleMap, settings.useNetScoring]);

  // Sort by net or gross strokes based on settings (lowest first)
  const sortedPlayers = useMemo(() => {
    return [...playersWithScores].sort((a, b) => {
      if (settings.useNetScoring) {
        return (a.totalNetStrokes ?? a.totalStrokes) - (b.totalNetStrokes ?? b.totalStrokes);
      }
      return a.totalStrokes - b.totalStrokes;
    });
  }, [playersWithScores, settings.useNetScoring]);

  // Determine winner - use match play result if match play is enabled
  const winner = useMemo(() => {
    if (round?.matchPlay && matchPlayResult?.winnerId) {
      return playersWithScores.find(p => p.id === matchPlayResult.winnerId) || sortedPlayers[0];
    }
    return sortedPlayers[0];
  }, [round, matchPlayResult, playersWithScores, sortedPlayers]);

  const hasTie = useMemo(() => {
    if (round?.matchPlay && matchPlayResult) {
      return matchPlayResult.matchStatus === 'halved';
    }
    if (sortedPlayers.length < 2) return false;
    if (settings.useNetScoring) {
      return (sortedPlayers[0]?.totalNetStrokes ?? 0) === (sortedPlayers[1]?.totalNetStrokes ?? 0);
    }
    return sortedPlayers[0]?.totalStrokes === sortedPlayers[1]?.totalStrokes;
  }, [round, matchPlayResult, sortedPlayers, settings.useNetScoring]);

  // Calculate game results
  const gameResults = useGameResults({
    round,
    players: rawPlayers,
    scores: rawScores,
    presses,
    playersWithScores,
  });

  // Calculate settlements
  const settlements = useMemo(() => {
    if (!round || playersWithScores.length === 0) return [];

    const matchPlayWinnerId = matchPlayResult?.winnerId || null;
    const wolfGame = round.games?.find(g => g.type === 'wolf');

    return calculateSettlement(
      rawPlayers,
      gameResults?.skinsResult,
      gameResults?.nassauResult,
      matchPlayWinnerId,
      round.stakes,
      wolfGame?.wolfResults,
      wolfGame?.stakes,
      propBets
    );
  }, [round, playersWithScores, rawPlayers, gameResults, matchPlayResult, propBets]);

  // Settlement payment tracking
  const {
    trackedSettlements,
    markAsPaid,
    markAsForgiven,
    markAsPending,
    stats: settlementStats,
  } = useSettlementTracking(id, settlements);

  // Calculate highlights
  const highlights = useRoundHighlights({
    round,
    players: rawPlayers,
    scores: rawScores,
    gameResults,
  });

  // Share handlers
  const handleShareImage = async () => {
    hapticLight();
    setIsSharing(true);
    setShareMode('image');

    const players: Player[] = playersWithScores.map(p => ({
      id: p.id,
      roundId: round!.id,
      name: p.name,
      handicap: p.handicap,
      orderIndex: 0,
    }));

    try {
      await shareResults(round!, players, rawScores);
      hapticSuccess();
      toast.success('Results shared!');
    } catch {
      hapticError();
      toast.error('Failed to share. Trying text instead...');
      try {
        await shareText(round!, playersWithScores);
        hapticSuccess();
        toast.success('Results copied to clipboard!');
      } catch {
        toast.error('Share failed. Please try again.');
      }
    } finally {
      setIsSharing(false);
      setShareMode(null);
    }
  };

  const handleShareText = async () => {
    hapticLight();
    setIsSharing(true);
    setShareMode('text');

    try {
      await shareText(round!, playersWithScores);
      hapticSuccess();
      toast.success(navigator.share ? 'Results shared!' : 'Results copied to clipboard!');
    } catch {
      hapticError();
      toast.error('Failed to share');
    } finally {
      setIsSharing(false);
      setShareMode(null);
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
        className="flex-1 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-52"
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
            <TechCard>
              <TechCardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Match Play
                  </span>
                  <span className="font-bold text-sm">{matchPlayResult.statusText}</span>
                </div>
              </TechCardContent>
            </TechCard>
          </motion.div>
        )}

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

      {/* Bottom Buttons */}
      <RoundCompleteActions
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
