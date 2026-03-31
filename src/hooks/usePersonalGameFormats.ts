import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PersonalGameFormat, ActivePrimitive, ParsedPrimitive } from '@/types/houseGame';
import { parseHouseGameDescription } from '@/lib/houseGame/parseDescription';

interface SaveFormatInput {
  id?: string;
  name: string;
  description: string;
  activePrimitives: ActivePrimitive[];
}

function transformFormat(db: any): PersonalGameFormat {
  return {
    id: db.id,
    ownerId: db.owner_id,
    name: db.name,
    description: db.description,
    activePrimitives: (db.active_primitives as ActivePrimitive[]) ?? [],
    version: db.version,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function usePersonalGameFormats() {
  const { user } = useAuth();
  const [formats, setFormats] = useState<PersonalGameFormat[]>([]);
  const [loading, setLoading] = useState(true); // true until first fetch resolves
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFormats = useCallback(async () => {
    if (!user) { setFormats([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('personal_game_formats')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setFormats((data ?? []).map(transformFormat));
    } catch (err: any) {
      setError(err.message ?? 'Failed to load formats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchFormats(); }, [fetchFormats]);

  // Returns the new/updated format id on success, null on failure
  const saveFormat = useCallback(async (input: SaveFormatInput): Promise<string | null> => {
    if (!user) return null;
    setSaving(true);
    setError(null);
    try {
      if (input.id) {
        const existing = formats.find(f => f.id === input.id);
        const { error: updateError } = await supabase
          .from('personal_game_formats')
          .update({
            name: input.name,
            description: input.description,
            active_primitives: input.activePrimitives,
            version: (existing?.version ?? 0) + 1,
          })
          .eq('id', input.id)
          .eq('owner_id', user.id);
        if (updateError) throw updateError;
        setFormats(prev => prev.map(f =>
          f.id === input.id
            ? { ...f, name: input.name, description: input.description, activePrimitives: input.activePrimitives, version: f.version + 1 }
            : f
        ));
        return input.id;
      } else {
        const { data, error: insertError } = await supabase
          .from('personal_game_formats')
          .insert({
            owner_id: user.id,
            name: input.name,
            description: input.description,
            active_primitives: input.activePrimitives,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        if (data) {
          const newFormat = transformFormat(data);
          setFormats(prev => [newFormat, ...prev]);
          return newFormat.id;
        }
        return null;
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to save format');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, formats]);

  const deleteFormat = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('personal_game_formats')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);
      if (error) throw error;
      setFormats(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete format');
      return false;
    }
  }, [user]);

  const parseDescription = useCallback(async (description: string): Promise<ParsedPrimitive[] | null> => {
    setParsing(true);
    try {
      return await parseHouseGameDescription(description);
    } finally {
      setParsing(false);
    }
  }, []);

  return { formats, loading, saving, parsing, error, saveFormat, deleteFormat, parseDescription, refetch: fetchFormats };
}
