import { useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRoundData } from '@/hooks/useRoundData';
import { useGameResults } from '@/hooks/useGameResults';
import { useRoundHighlights } from '@/hooks/useRoundHighlights';
import { useRoundStats } from '@/hooks/useRoundStats';
import { useSettings } from '@/hooks/useSettings';
import { usePropBets } from '@/hooks/usePropBets';
import { Player, PlayerWithScores } from '@/types/golf';
import { StrokesPerHoleMap } from '@/lib/games/skins';
import { calculateMatchPlay, MatchPlayResult } from '@/lib/games/matchPlay';
import { calculateSettlement, NetSettlement } from '@/lib/games/settlement';
import {
  calculateMatchPlayStrokes,
  buildMatchPlayStrokesMap,
  calculatePlayingHandicap,
  calculateTotalNetStrokes,
} from '@/lib/handicapUtils';
import { hapticLight } from '@/lib/haptics';

import { DashboardTabBar } from '@/components/golf/dashboard/DashboardTabBar';
import { DashboardScorecard } from '@/components/golf/dashboard/DashboardScorecard';
import { DashboardGames } from '@/components/golf/dashboard/DashboardGames';
import { DashboardMoney } from '@/components/golf/dashboard/DashboardMoney';
import { DashboardStats } from '@/components/golf/dashboard/DashboardStats';
import { DashboardHighlights } from '@/components/golf/dashboard/DashboardHighlights';

const TABS = ['Scorecard', 'Games', 'Money', 'Stats', 'Highlights'];
const SWIPE_THRESHOLD = 60;

export default function RoundDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { propBets } = usePropBets(id);

  const [activeTab, setActiveTab] = useState(0);

  // Data loading — same pattern as RoundComplete
  const { round, players: rawPlayers, scores: rawScores, presses, loading } = useRoundData(id);

  // Build playersWithScores
  const playersWithScores = useMemo((): PlayerWithScores[] => {
    if (!round || rawPlayers.length === 0) return [];

    const parTotal = round.holeInfo.reduce((sum, h) => sum + h.par, 0);

    return rawPlayers.map(player => {
      const playerScores = rawScores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);
      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);

      const playingHandicap =
        player.handicap !== undefined
          ? calculatePlayingHandicap(player.handicap, round.slope || 113, round.holes, round.rating, parTotal)
          : 0;

      const totalNetStrokes = calculateTotalNetStrokes(totalStrokes, playingHandicap, playerScores.length, round.holes);
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

  // Match play strokes map
  const strokesPerHoleMap = useMemo((): StrokesPerHoleMap | undefined => {
    if (!round || rawPlayers.length !== 2) return undefined;
    const [p1, p2] = rawPlayers;
    const totalCoursePar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
    const matchInfo = calculateMatchPlayStrokes(
      { id: p1.id, name: p1.name, handicap: p1.handicap, manualStrokes: p1.manualStrokes },
      { id: p2.id, name: p2.name, handicap: p2.handicap, manualStrokes: p2.manualStrokes },
      round.slope || 113,
      round.holes,
      round.handicapMode || 'auto',
      round.rating,
      totalCoursePar
    );
    return buildMatchPlayStrokesMap(matchInfo, round.holeInfo);
  }, [round, rawPlayers]);

  // Match play result
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

  // Game results
  const gameResults = useGameResults({
    round,
    players: rawPlayers,
    scores: rawScores,
    presses,
    playersWithScores,
  });

  // Settlements
  const settlements = useMemo((): NetSettlement[] => {
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
      propBets,
      gameResults?.houseGameResult,
    );
  }, [round, playersWithScores, rawPlayers, gameResults, matchPlayResult, propBets]);

  // Highlights
  const highlights = useRoundHighlights({
    round,
    players: rawPlayers,
    scores: rawScores,
    gameResults,
  });

  // Stats
  const roundStats = useRoundStats(round, playersWithScores);

  const totalPar = useMemo(() => {
    if (!round) return 0;
    const is18 = round.holes >= 18;
    const front = round.holeInfo.filter(h => h.number <= 9).reduce((s, h) => s + h.par, 0);
    const back = round.holeInfo.filter(h => h.number > 9 && h.number <= 18).reduce((s, h) => s + h.par, 0);
    return front + (is18 ? back : 0);
  }, [round]);

  // Touch-based swipe detection that doesn't block normal scrolling
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const dt = Date.now() - touchStart.current.time;
    touchStart.current = null;

    // Only trigger swipe if horizontal movement dominates vertical
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx) * 0.7) return;
    if (dt > 500) return; // too slow

    if (dx < -SWIPE_THRESHOLD && activeTab < TABS.length - 1) {
      hapticLight();
      setActiveTab(prev => prev + 1);
    } else if (dx > SWIPE_THRESHOLD && activeTab > 0) {
      hapticLight();
      setActiveTab(prev => prev - 1);
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F6]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F6] px-6">
        <p className="text-muted-foreground mb-4">Round not found</p>
        <button onClick={() => navigate('/')} className="text-sm font-medium underline">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6] overflow-hidden">
      {/* Header — respects iOS safe area (pt-safe-content = 59px for Dynamic Island) */}
      <div className="flex-shrink-0 bg-[#F8F8F6]/95 backdrop-blur-md border-b border-border/30 pt-safe-content">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white border border-border/40 flex items-center justify-center mr-3 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold truncate">{round.courseName}</h1>
            <p className="text-[11px] text-muted-foreground">
              {round.holes} holes · {playersWithScores.length} player{playersWithScores.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0">
        <DashboardTabBar tabs={TABS} activeIndex={activeTab} onChange={setActiveTab} />
      </div>

      {/* Scrollable content — full vertical + horizontal scroll, swipe changes tabs */}
      <main
        className="flex-1 overflow-y-auto overscroll-y-contain pb-nav"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="pt-4 pb-8"
          >
            {activeTab === 0 && (
              <DashboardScorecard round={round} playersWithScores={playersWithScores} />
            )}
            {activeTab === 1 && (
              <DashboardGames
                round={round}
                players={rawPlayers}
                gameResults={gameResults}
                matchPlayResult={matchPlayResult}
              />
            )}
            {activeTab === 2 && (
              <DashboardMoney settlements={settlements} players={rawPlayers} />
            )}
            {activeTab === 3 && roundStats && (
              <DashboardStats stats={roundStats} totalPar={totalPar} />
            )}
            {activeTab === 4 && (
              <DashboardHighlights highlights={highlights} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
