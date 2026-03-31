import { supabase } from '@/integrations/supabase/client';
import { ParsedPrimitive } from '@/types/houseGame';

export async function parseHouseGameDescription(description: string): Promise<ParsedPrimitive[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-house-game', {
      body: { description },
    });
    if (error) throw error;
    if (!data?.primitives || !Array.isArray(data.primitives)) return [];
    return data.primitives as ParsedPrimitive[];
  } catch {
    return null;
  }
}
