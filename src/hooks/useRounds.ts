import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Round, Player, Score, PlayerWithScores, generateId, generateJoinCode, HoleInfo } from '@/types/golf';
import { calculatePlayingHandicap, getStrokesPerHole, calculateTotalNetStrokes } from '@/lib/handicapUtils';

const ROUNDS_KEY = 'match_rounds';
const PLAYERS_KEY = 'match_players';
const SCORES_KEY = 'match_scores';

export function useRounds() {
  const [rounds, setRounds] = useLocalStorage<Round[]>(ROUNDS_KEY, []);
  const [players, setPlayers] = useLocalStorage<Player[]>(PLAYERS_KEY, []);
  const [scores, setScores] = useLocalStorage<Score[]>(SCORES_KEY, []);

  const createRound = useCallback((
    courseId: string,
    courseName: string,
    holes: 9 | 18,
    holeInfo: HoleInfo[],
    strokePlay: boolean,
    matchPlay: boolean,
    stakes?: number,
    slope?: number,
    rating?: number
  ): Round => {
    const newRound: Round = {
      id: generateId(),
      courseId,
      courseName,
      holes,
      holeInfo,
      strokePlay,
      matchPlay,
      stakes,
      slope,
      rating,
      status: 'active',
      createdAt: new Date(),
      joinCode: generateJoinCode(),
    };
    setRounds(prev => [newRound, ...prev]);
    return newRound;
  }, [setRounds]);

  const addPlayerToRound = useCallback((roundId: string, name: string, handicap?: number): Player => {
    const roundPlayers = players.filter(p => p.roundId === roundId);
    const newPlayer: Player = {
      id: generateId(),
      roundId,
      name,
      handicap,
      orderIndex: roundPlayers.length,
    };
    setPlayers(prev => [...prev, newPlayer]);
    return newPlayer;
  }, [players, setPlayers]);

  const removePlayerFromRound = useCallback((playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    setScores(prev => prev.filter(s => s.playerId !== playerId));
  }, [setPlayers, setScores]);

  const getRoundById = useCallback((roundId: string): Round | undefined => {
    return rounds.find(r => r.id === roundId);
  }, [rounds]);

  const getRoundByJoinCode = useCallback((joinCode: string): Round | undefined => {
    return rounds.find(r => r.joinCode.toUpperCase() === joinCode.toUpperCase() && r.status === 'active');
  }, [rounds]);

  const getPlayersForRound = useCallback((roundId: string): Player[] => {
    return players.filter(p => p.roundId === roundId).sort((a, b) => a.orderIndex - b.orderIndex);
  }, [players]);

  const getScoresForRound = useCallback((roundId: string): Score[] => {
    return scores.filter(s => s.roundId === roundId);
  }, [scores]);

  const setPlayerScore = useCallback((roundId: string, playerId: string, holeNumber: number, strokes: number) => {
    setScores(prev => {
      const existingIndex = prev.findIndex(
        s => s.roundId === roundId && s.playerId === playerId && s.holeNumber === holeNumber
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], strokes };
        return updated;
      }
      
      return [...prev, {
        id: generateId(),
        roundId,
        playerId,
        holeNumber,
        strokes,
      }];
    });
  }, [setScores]);

  const getPlayersWithScores = useCallback((
    roundId: string, 
    holeInfo: HoleInfo[],
    slope?: number,
    holes: 9 | 18 = 18
  ): PlayerWithScores[] => {
    const roundPlayers = getPlayersForRound(roundId);
    const roundScores = getScoresForRound(roundId);

    return roundPlayers.map(player => {
      const playerScores = roundScores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);
      
      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);

      // Calculate handicap-adjusted scores if player has a handicap
      let playingHandicap: number | undefined;
      let strokesPerHole: Map<number, number> | undefined;
      let totalNetStrokes: number | undefined;
      let netRelativeToPar: number | undefined;

      if (player.handicap !== undefined && player.handicap !== null) {
        playingHandicap = calculatePlayingHandicap(player.handicap, slope || 113, holes);
        strokesPerHole = getStrokesPerHole(playingHandicap, holeInfo);
        
        // Calculate net strokes
        totalNetStrokes = calculateTotalNetStrokes(
          totalStrokes,
          playingHandicap,
          playerScores.length,
          holes
        );
        
        // Calculate net relative to par
        const totalPar = playerScores.reduce((sum, s) => {
          const hole = holeInfo.find(h => h.number === s.holeNumber);
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
      };
    });
  }, [getPlayersForRound, getScoresForRound]);

  const completeRound = useCallback((roundId: string) => {
    setRounds(prev => prev.map(r => 
      r.id === roundId ? { ...r, status: 'complete' as const } : r
    ));
  }, [setRounds]);

  const deleteRound = useCallback((roundId: string) => {
    setRounds(prev => prev.filter(r => r.id !== roundId));
    setPlayers(prev => prev.filter(p => p.roundId !== roundId));
    setScores(prev => prev.filter(s => s.roundId !== roundId));
  }, [setRounds, setPlayers, setScores]);

  const getRecentRounds = useCallback((limit: number = 10): Round[] => {
    return [...rounds]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [rounds]);

  return {
    rounds,
    createRound,
    addPlayerToRound,
    removePlayerFromRound,
    getRoundById,
    getRoundByJoinCode,
    getPlayersForRound,
    getScoresForRound,
    setPlayerScore,
    getPlayersWithScores,
    completeRound,
    deleteRound,
    getRecentRounds,
  };
}
