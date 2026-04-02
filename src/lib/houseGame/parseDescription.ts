import { supabase } from '@/integrations/supabase/client';
import { ParsedPrimitive } from '@/types/houseGame';

export async function parseHouseGameDescription(description: string): Promise<ParsedPrimitive[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-house-game', {
      body: { description },
    });
    if (error) {
      // Extract actual response body from FunctionsHttpError (context is a Response object)
      let detail = '';
      try {
        const ctx = (error as Record<string, unknown>).context;
        if (ctx instanceof Response) {
          detail = await ctx.clone().text();
        } else if (ctx && typeof ctx === 'object') {
          detail = JSON.stringify(ctx);
        }
      } catch { /* ignore */ }
      console.error('parse-house-game error:', error.message, detail || '(no body)');
      throw error;
    }
    if (!data?.primitives || !Array.isArray(data.primitives)) return [];
    return data.primitives as ParsedPrimitive[];
  } catch (err) {
    console.error('parseHouseGameDescription failed:', String(err));
    return null;
  }
}
