import { supabase } from '@/integrations/supabase/client';
import type { CourseCandidate } from './courseMatch';
import type { CourseDetails } from './buildDraft';

/**
 * Thin clients for the golf-course-lookup edge function, shaped for buildDraft's
 * injected dependencies. Same endpoint and auth as useGolfCourseSearch.
 */
async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { Authorization: `Bearer ${token}` };
}

const base = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/golf-course-lookup`;

export async function searchCoursesApi(query: string): Promise<CourseCandidate[]> {
  if (query.trim().length < 3) return [];
  const res = await fetch(`${base()}?action=search&query=${encodeURIComponent(query)}`, { headers: await authHeader() });
  if (!res.ok) throw new Error(`Course search failed: ${res.status}`);
  const data = await res.json();
  return (data.courses ?? []).map((c: CourseCandidate) => ({ ...c, id: String(c.id) }));
}

export async function getCourseDetailsApi(id: string): Promise<CourseDetails | null> {
  const res = await fetch(`${base()}?action=details&id=${encodeURIComponent(id)}`, { headers: await authHeader() });
  if (!res.ok) return null;
  const data = await res.json();
  const c = data.course ?? data;
  return c ? { ...c, id: String(c.id) } : null;
}
