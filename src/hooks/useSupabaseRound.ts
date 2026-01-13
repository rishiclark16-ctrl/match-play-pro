import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Round, Player, Score, HoleInfo, GameConfig, Press } from '@/types/golf';

// Database types
interface DbRound {
  id: string;
  join_code: string;
  course_name: string;
  course_id: string | null;
  holes: number;
  stroke_play: boolean;
  match_play: boolean;
  stableford: boolean;
  modified_stableford: boolean;
  stakes: number | null;
  slope: number | null;
  rating: number | null;
  status: string;
  games: GameConfig[];
  teams: any;
  hole_info: HoleInfo[];
  created_at: string;
  updated_at: string;
}

interface DbPlayer {
  id: string;
  round_id: string;
  name: string;
  handicap: number | null;
  team_id: string | null;
  order_index: number;
  profile_id: string | null;
  created_at: string;
  profiles?: {
    avatar_url: string | null;
  } | null;
}

interface DbScore {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  strokes: number;
  created_at: string;
  updated_at: string;
}

interface DbPress {
  id: string;
  round_id: string;
  initiated_by: string | null;
  start_hole: number;
  stakes: number;
  status: string;
  winner_id: string | null;
  created_at: string;
}

// Transform functions
function transformRound(db: any): Round {
  return {
    id: db.id,
    courseId: db.course_id || '',
    courseName: db.course_name,
    holes: db.holes as 9 | 18,
    strokePlay: db.stroke_play,
    matchPlay: db.match_play,
    stakes: db.stakes ?? undefined,
    slope: db.slope ?? undefined,
    rating: db.rating ?? undefined,
    status: db.status as 'active' | 'complete',
    games: (db.games as GameConfig[]) || [],
    holeInfo: (db.hole_info as HoleInfo[]) || [],
    joinCode: db.join_code,
    createdAt: new Date(db.created_at),
    presses: [],
  };
}

function transformPlayer(db: any): Player {
  return {
    id: db.id,
    roundId: db.round_id,
    name: db.name,
    handicap: db.handicap ?? undefined,
    orderIndex: db.order_index,
    profileId: db.profile_id ?? undefined,
    avatarUrl: db.profiles?.avatar_url ?? undefined,
  };
}

function transformScore(db: any): Score {
  return {
    id: db.id,
    roundId: db.round_id,
    playerId: db.player_id,
    holeNumber: db.hole_number,
    strokes: db.strokes,
  };
}

function transformPress(db: any): Press {
  return {
    id: db.id,
    startHole: db.start_hole,
    initiatedBy: db.initiated_by || '',
    stakes: db.stakes,
    status: db.status as Press['status'],
  };
}

export function useSupabaseRound(roundId: string | null) {
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Fetch initial data
  useEffect(() => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    async function fetchRound() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch round
        const { data: roundData, error: roundError } = await supabase
          .from('rounds')
          .select('*')
          .eq('id', roundId)
          .maybeSingle();

        if (roundError) throw roundError;
        if (!roundData) {
          setError('Round not found');
          setLoading(false);
          return;
        }

        // Fetch players with profile avatar
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*, profiles:profile_id(avatar_url)')
          .eq('round_id', roundId)
          .order('order_index');

        if (playersError) throw playersError;

        // Fetch scores
        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select('*')
          .eq('round_id', roundId);

        if (scoresError) throw scoresError;

        // Fetch presses
        const { data: pressesData, error: pressesError } = await supabase
          .from('presses')
          .select('*')
          .eq('round_id', roundId);

        if (pressesError) throw pressesError;

        // Transform to app types
        const transformedRound = transformRound(roundData);
        const transformedPresses = (pressesData || []).map(p => transformPress(p));
        
        setRound({ ...transformedRound, presses: transformedPresses });
        setPlayers((playersData || []).map(p => transformPlayer(p)));
        setScores((scoresData || []).map(s => transformScore(s)));
        setPresses(transformedPresses);
        setIsOnline(true);
      } catch (err) {
        console.error('Error fetching round:', err);
        setError('Failed to load round');
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    }

    fetchRound();
  }, [roundId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roundId) return;

    const channel = supabase
      .channel(`round:${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScore = transformScore(payload.new);
            setScores(prev => {
              const existing = prev.findIndex(
                s => s.playerId === newScore.playerId && s.holeNumber === newScore.holeNumber
              );
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newScore;
                return updated;
              }
              return [...prev, newScore];
            });
          } else if (payload.eventType === 'DELETE') {
            setScores(prev => prev.filter(s => s.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPlayer = transformPlayer(payload.new);
            setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.orderIndex - b.orderIndex));
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(p => p.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${roundId}` },
        (payload) => {
          const updated = transformRound(payload.new);
          setRound(prev => prev ? { ...updated, presses: prev.presses } : updated);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presses', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPress = transformPress(payload.new);
            setPresses(prev => [...prev, newPress]);
            setRound(prev => prev ? { ...prev, presses: [...prev.presses, newPress] } : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  // Save score (with optimistic update)
  const saveScore = useCallback(async (playerId: string, holeNumber: number, strokes: number) => {
    if (!roundId) return;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const newScore: Score = {
      id: tempId,
      roundId,
      playerId,
      holeNumber,
      strokes
    };

    setScores(prev => {
      const existing = prev.findIndex(
        s => s.playerId === playerId && s.holeNumber === holeNumber
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], strokes };
        return updated;
      }
      return [...prev, newScore];
    });

    // Sync to Supabase
    try {
      const { error } = await supabase
        .from('scores')
        .upsert({
          round_id: roundId,
          player_id: playerId,
          hole_number: holeNumber,
          strokes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'player_id,hole_number'
        });

      if (error) throw error;
      setIsOnline(true);
    } catch (err) {
      console.error('Error saving score:', err);
      setIsOnline(false);
      // Keep optimistic update - will sync when back online
    }
  }, [roundId]);

  // Add press
  const addPress = useCallback(async (press: Press) => {
    if (!roundId) return;

    try {
      const { error } = await supabase
        .from('presses')
        .insert({
          round_id: roundId,
          initiated_by: press.initiatedBy || null,
          start_hole: press.startHole,
          stakes: press.stakes,
          status: press.status
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error adding press:', err);
    }
  }, [roundId]);

// Complete round
  const completeRound = useCallback(async () => {
    if (!roundId) return;

    try {
      const { error } = await supabase
        .from('rounds')
        .update({ status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', roundId);

      if (error) throw error;
      setRound(prev => prev ? { ...prev, status: 'complete' } : null);
    } catch (err) {
      console.error('Error completing round:', err);
    }
  }, [roundId]);

  // Update games configuration
  const updateGames = useCallback(async (games: GameConfig[]) => {
    if (!roundId) return;

    try {
      const { error } = await supabase
        .from('rounds')
        .update({ 
          games: games as any,
          updated_at: new Date().toISOString() 
        })
        .eq('id', roundId);

      if (error) throw error;
      setRound(prev => prev ? { ...prev, games } : null);
    } catch (err) {
      console.error('Error updating games:', err);
      throw err;
    }
  }, [roundId]);

  return {
    round,
    players,
    scores,
    presses,
    loading,
    error,
    isOnline,
    saveScore,
    addPress,
    completeRound,
    updateGames,
  };
}
