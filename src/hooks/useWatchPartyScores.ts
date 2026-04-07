import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player, Score, Round, GameConfig, HoleInfo, Press } from '@/types/golf';
import {
  transformRound,
  transformPlayer,
  transformScore,
  transformPress,
  DbRound,
  DbPlayer,
  DbScore,
  DbPress,
} from '@/lib/transformers';

export interface PlayerScoreInfo {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  totalStrokes: number;
  holesPlayed: number;
  scoreVsPar: number;
  lastUpdatedAt: Date | null;
}

export function useWatchPartyScores(roundId: string | null, isMember?: boolean) {
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateMap, setLastUpdateMap] = useState<Map<string, Date>>(new Map());
  const [, setTick] = useState(0); // force re-render for recency

  // Fetch initial data
  useEffect(() => {
    if (!roundId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const [roundRes, playersRes, scoresRes, pressesRes] = await Promise.all([
          supabase.from('rounds').select('*').eq('id', roundId!).single(),
          supabase.from('players').select('*, profiles:profile_id(avatar_url)').eq('round_id', roundId!).order('order_index'),
          supabase.from('scores').select('*').eq('round_id', roundId!),
          supabase.from('presses').select('*').eq('round_id', roundId!),
        ]);

        if (roundRes.data) {
          const transformedPresses = (pressesRes.data || []).map(p => transformPress(p));
          setRound({ ...transformRound(roundRes.data), presses: transformedPresses });
          setPresses(transformedPresses);
        }
        if (playersRes.data) setPlayers(playersRes.data.map(p => transformPlayer(p)));
        if (scoresRes.data) {
          setScores(scoresRes.data.map(s => transformScore(s)));
          // Initialize last update timestamps
          const updateMap = new Map<string, Date>();
          for (const s of scoresRes.data) {
            const existing = updateMap.get(s.player_id);
            const updated = new Date(s.updated_at || s.created_at || Date.now());
            if (!existing || updated > existing) {
              updateMap.set(s.player_id, updated);
            }
          }
          setLastUpdateMap(updateMap);
        }
      } catch {
        // Error handled by loading state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [roundId, isMember]);

  // Real-time score subscription
  useEffect(() => {
    if (!roundId) return;

    const channel = supabase
      .channel(`watch_scores:${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScore = transformScore(payload.new as DbScore);
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
            // Update recency timestamp
            setLastUpdateMap(prev => {
              const next = new Map(prev);
              next.set(newScore.playerId, new Date());
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldScore = payload.old as { id?: string };
            setScores(prev => prev.filter(s => s.id !== oldScore.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presses', filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPress = transformPress(payload.new as DbPress);
            setPresses(prev => [...prev, newPress]);
            setRound(prev => prev ? { ...prev, presses: [...prev.presses, newPress] } : prev);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roundId]);

  // 15-second tick for recency badge refresh
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  // Computed: player score info with recency
  const playerScores: PlayerScoreInfo[] = players.map(player => {
    const playerScoresList = scores.filter(s => s.playerId === player.id);
    const totalStrokes = playerScoresList.reduce((sum, s) => sum + s.strokes, 0);
    const holesPlayed = playerScoresList.length;
    const holeInfo = round?.holeInfo ?? [];
    const parTotal = playerScoresList.reduce((sum, s) => {
      const hole = holeInfo.find(h => h.number === s.holeNumber);
      return sum + (hole?.par ?? 0);
    }, 0);

    return {
      playerId: player.id,
      name: player.name,
      avatarUrl: player.avatarUrl ?? null,
      totalStrokes,
      holesPlayed,
      scoreVsPar: parTotal > 0 ? totalStrokes - parTotal : 0,
      lastUpdatedAt: lastUpdateMap.get(player.id) ?? null,
    };
  });

  const currentHole = scores.length > 0
    ? Math.max(...scores.map(s => s.holeNumber))
    : 0;

  return {
    round,
    players,
    scores,
    presses,
    playerScores,
    currentHole,
    loading,
    lastUpdateMap,
  };
}
