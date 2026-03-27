import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { HouseGame, ActivePrimitive, ParsedPrimitive } from '@/types/houseGame';

function transformHouseGame(db: any): HouseGame {
  return {
    id: db.id,
    groupId: db.group_id,
    ownerId: db.owner_id,
    name: db.name,
    description: db.description,
    activePrimitives: (db.active_primitives as ActivePrimitive[]) ?? [],
    version: db.version,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

interface SaveHouseGameInput {
  groupId: string;
  name: string;
  description: string;
  activePrimitives: ActivePrimitive[];
}

export function useHouseGame(groupId: string | null) {
  const { user } = useAuth();
  const [houseGame, setHouseGame] = useState<HouseGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseGame = useCallback(async () => {
    if (!groupId || !user) {
      setHouseGame(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('house_games')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setHouseGame(data ? transformHouseGame(data) : null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load house game');
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    fetchHouseGame();
  }, [fetchHouseGame]);

  const saveHouseGame = useCallback(async (input: SaveHouseGameInput): Promise<boolean> => {
    if (!user) return false;

    setSaving(true);
    setError(null);

    try {
      const nextVersion = (houseGame?.version ?? 0) + 1;

      const { data, error: upsertError } = await supabase
        .from('house_games')
        .upsert({
          group_id: input.groupId,
          owner_id: user.id,
          name: input.name,
          description: input.description,
          active_primitives: input.activePrimitives,
          version: nextVersion,
        }, { onConflict: 'group_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (data) setHouseGame(transformHouseGame(data));
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Failed to save house game');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, houseGame]);

  const parseDescription = useCallback(async (description: string): Promise<ParsedPrimitive[]> => {
    setParsing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-house-game', {
        body: { description },
      });

      if (fnError) throw fnError;
      if (!data?.primitives || !Array.isArray(data.primitives)) return [];
      return data.primitives as ParsedPrimitive[];
    } catch (err: any) {
      setError(err.message ?? 'Failed to parse game description');
      return [];
    } finally {
      setParsing(false);
    }
  }, []);

  return {
    houseGame,
    loading,
    saving,
    parsing,
    error,
    saveHouseGame,
    parseDescription,
    refetch: fetchHouseGame,
  };
}
