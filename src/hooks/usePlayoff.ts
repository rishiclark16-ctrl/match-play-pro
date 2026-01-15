import { useState, useCallback, useEffect, useMemo } from 'react';
import { hapticSuccess } from '@/lib/haptics';
import { toast } from 'sonner';
import { PlayerWithScores } from '@/types/golf';

export interface PlayoffWinner {
  id: string;
  name: string;
  holeNumber: number;
}

interface UsePlayoffOptions {
  players: PlayerWithScores[];
  hole18FullyScored: boolean;
}

interface UsePlayoffReturn {
  playoffHole: number;
  playoffScores: Map<string, Map<number, number>>;
  playoffWinner: PlayoffWinner | null;
  showFinishOptions: boolean;
  showWinnerModal: boolean;
  allPlayoffScored: boolean;
  setShowFinishOptions: (show: boolean) => void;
  setShowWinnerModal: (show: boolean) => void;
  getPlayoffScore: (playerId: string, holeNum: number) => number | undefined;
  handleStartPlayoff: () => void;
  handlePlayoffScore: (playerId: string, score: number) => void;
  handleNextPlayoffHole: () => void;
  clearPlayoffScore: (playerId: string) => void;
}

export function usePlayoff({
  players,
  hole18FullyScored,
}: UsePlayoffOptions): UsePlayoffReturn {
  const [playoffHole, setPlayoffHole] = useState(0);
  const [showFinishOptions, setShowFinishOptions] = useState(false);
  const [playoffScores, setPlayoffScores] = useState<Map<string, Map<number, number>>>(new Map());
  const [playoffWinner, setPlayoffWinner] = useState<PlayoffWinner | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Auto-show finish options when hole 18 is scored
  useEffect(() => {
    if (hole18FullyScored && !playoffHole && !playoffWinner) {
      setShowFinishOptions(true);
    }
  }, [hole18FullyScored, playoffHole, playoffWinner]);

  // Get playoff score for a player on a specific playoff hole
  const getPlayoffScore = useCallback((playerId: string, holeNum: number) => {
    return playoffScores.get(playerId)?.get(holeNum);
  }, [playoffScores]);

  // Check if all players have scored current playoff hole
  const allPlayoffScored = useMemo(() => {
    if (playoffHole === 0) return false;
    return players.every(player => getPlayoffScore(player.id, playoffHole) !== undefined);
  }, [playoffHole, players, getPlayoffScore]);

  // Check for playoff winner after all scores are in
  useEffect(() => {
    if (!allPlayoffScored || playoffHole === 0) return;

    // Get all scores for current playoff hole
    const holeScores = players.map(player => ({
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
  }, [allPlayoffScored, playoffHole, players, getPlayoffScore]);

  const handleStartPlayoff = useCallback(() => {
    setPlayoffHole(1);
    setPlayoffScores(new Map());
    setPlayoffWinner(null);
    setShowFinishOptions(false);
    toast.success('Playoff Hole #1 - Lowest score wins!', { duration: 3000 });
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
    toast.success('Playoff score saved', { duration: 1500 });
  }, [playoffHole]);

  const handleNextPlayoffHole = useCallback(() => {
    setPlayoffHole(h => h + 1);
    toast.info(`Playoff Hole #${playoffHole + 1} - Still tied!`, { duration: 2000 });
  }, [playoffHole]);

  const clearPlayoffScore = useCallback((playerId: string) => {
    setPlayoffScores(prev => {
      const newScores = new Map(prev);
      const playerScores = newScores.get(playerId);
      if (playerScores) {
        const newPlayerScores = new Map(playerScores);
        newPlayerScores.delete(playoffHole);
        newScores.set(playerId, newPlayerScores);
      }
      return newScores;
    });
  }, [playoffHole]);

  return {
    playoffHole,
    playoffScores,
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
  };
}
