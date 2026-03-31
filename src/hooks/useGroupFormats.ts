import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PersonalGameFormat } from '@/types/houseGame';
import { ActivePrimitive } from '@/types/houseGame';

export interface GroupFormatAssignment {
  id: string;
  groupId: string;
  formatId: string;
  assignedBy: string;
  assignedAt: string;
  format: PersonalGameFormat;
}

function transformFormat(db: any): PersonalGameFormat {
  return {
    id: db.id,
    ownerId: db.owner_id,
    name: db.name,
    description: db.description,
    activePrimitives: (db.active_primitives as ActivePrimitive[]) ?? [],
    isPublic: db.is_public ?? false,
    version: db.version,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function useGroupFormats(groupId: string | null) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<GroupFormatAssignment | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAssignment = useCallback(async () => {
    if (!groupId || !user) { setAssignment(null); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('group_format_assignments')
        .select(`
          id, group_id, format_id, assigned_by, assigned_at,
          personal_game_formats (
            id, owner_id, name, description, active_primitives,
            is_public, version, created_at, updated_at
          )
        `)
        .eq('group_id', groupId)
        .maybeSingle();
      if (!data || !data.personal_game_formats) {
        setAssignment(null);
      } else {
        const fmt = data.personal_game_formats as any;
        setAssignment({
          id: data.id,
          groupId: data.group_id,
          formatId: data.format_id,
          assignedBy: data.assigned_by,
          assignedAt: data.assigned_at,
          format: transformFormat(fmt),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => { fetchAssignment(); }, [fetchAssignment]);

  const assignFormat = useCallback(async (formatId: string): Promise<boolean> => {
    if (!groupId || !user) return false;
    try {
      const { error } = await supabase
        .from('group_format_assignments')
        .upsert(
          { group_id: groupId, format_id: formatId, assigned_by: user.id },
          { onConflict: 'group_id' }
        );
      if (error) throw error;
      await fetchAssignment();
      return true;
    } catch {
      return false;
    }
  }, [groupId, user, fetchAssignment]);

  const removeAssignment = useCallback(async (): Promise<boolean> => {
    if (!assignment) return false;
    try {
      const { error } = await supabase
        .from('group_format_assignments')
        .delete()
        .eq('id', assignment.id);
      if (error) throw error;
      setAssignment(null);
      return true;
    } catch {
      return false;
    }
  }, [assignment]);

  return { assignment, loading, assignFormat, removeAssignment, refetch: fetchAssignment };
}
